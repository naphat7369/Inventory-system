import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export type NotificationDb = PrismaClient | Prisma.TransactionClient;
export type ApprovalEmailMode = 'IMMEDIATE' | 'DIGEST';
const BANGKOK_TZ = 'Asia/Bangkok';
const SYSTEM_SETTING_KEYS = ['eapproveEmailEnabled', 'eapproveOfficialPdfAutoSendEnabled', 'emailAttachmentMaxMb'] as const;

export const EMAIL_TEMPLATES = {
  APPROVAL_PENDING: 'APPROVAL_PENDING', APPROVAL_SUMMARY: 'APPROVAL_SUMMARY', APPROVAL_REMINDER: 'APPROVAL_REMINDER',
  REVISION_REQUESTED: 'REVISION_REQUESTED', MEMO_APPROVED_OFFICIAL: 'MEMO_APPROVED_OFFICIAL', MEMO_OFFICIAL_PDF: 'MEMO_OFFICIAL_PDF',
} as const;

export function normalizeEmail(value: string | null | undefined) { return value?.trim().toLowerCase() ?? ''; }
export function isValidEmail(value: string | null | undefined) {
  const email = normalizeEmail(value);
  return email.length <= 254 && !/[\r\n]/.test(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function automaticDeliveryKey(parts: Array<string | number | null | undefined>) {
  const value = parts.map((part) => String(part ?? '-').trim().toLowerCase()).join(':');
  return `AUTO:${createHash('sha256').update(value).digest('hex')}`;
}
export async function getDeliverySettings(db: NotificationDb) {
  const rows = await db.systemSetting.findMany({ where: { key: { in: [...SYSTEM_SETTING_KEYS] } } });
  const values = new Map(rows.map((row) => { try { return [row.key, JSON.parse(row.value)] as const; } catch { return [row.key, null] as const; } }));
  return {
    emailEnabled: process.env.EAPPROVE_EMAIL_DISABLED !== 'true' && values.get('eapproveEmailEnabled') !== false,
    officialAutoSendEnabled: process.env.EAPPROVE_OFFICIAL_PDF_AUTO_SEND_DISABLED !== 'true' && values.get('eapproveOfficialPdfAutoSendEnabled') !== false,
    attachmentMaxMb: Math.max(1, Math.min(100, Number(values.get('emailAttachmentMaxMb') ?? 10) || 10)),
  };
}
export function normalizeDigestTime(value: unknown, fallback = '16:00') {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return /^(?:(?:0[89]|1[0-7]):(?:00|30)|18:00)$/.test(candidate) ? candidate : fallback;
}
export function nextEmailDigestAt(reference = new Date(), notificationTime = '16:00') {
  const localReference = toZonedTime(reference, BANGKOK_TZ);
  const localScheduled = new Date(localReference);
  const [hours, minutes] = normalizeDigestTime(notificationTime).split(':').map(Number);
  localScheduled.setHours(hours, minutes, 0, 0);
  if (localScheduled.getTime() <= localReference.getTime()) localScheduled.setDate(localScheduled.getDate() + 1);
  return fromZonedTime(localScheduled, BANGKOK_TZ);
}
export function nextDayReminderAt(reference = new Date()) {
  const local = toZonedTime(reference, BANGKOK_TZ);
  local.setDate(local.getDate() + 1); local.setHours(9, 0, 0, 0);
  return fromZonedTime(local, BANGKOK_TZ);
}
export function bangkokDateKey(date: Date) {
  const local = toZonedTime(date, BANGKOK_TZ);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}
export async function enqueueInAppNotification(db: NotificationDb, input: { type: string; eventKey: string; memoId: string; userId: string; payload: unknown }) {
  const idempotencyKey = `NOTIFICATION:${input.eventKey}:${input.memoId}:${input.userId}`;
  return db.notification.upsert({ where: { idempotencyKey }, update: {}, create: { userId: input.userId, memoId: input.memoId, type: input.type, payload: JSON.stringify(input.payload), idempotencyKey } });
}
export async function enqueueEmailDelivery(db: NotificationDb, input: { memoId?: string | null; recipient: string; recipientUserId?: string | null; memoVersionId?: string | null; stepId?: string | null; template: string; payload: unknown; idempotencyKey: string; availableAt?: Date }) {
  return db.emailDelivery.upsert({ where: { idempotencyKey: input.idempotencyKey }, update: {}, create: {
    memoId: input.memoId ?? null, recipient: normalizeEmail(input.recipient), recipientUserId: input.recipientUserId ?? null,
    memoVersionId: input.memoVersionId ?? null, stepId: input.stepId ?? null, template: input.template,
    payload: JSON.stringify(input.payload), idempotencyKey: input.idempotencyKey, availableAt: input.availableAt ?? new Date(), maxAttempts: 3,
  } });
}

type EmailApprover = { id: string; email: string | null; isActive: boolean; isApprover?: boolean; approvalEmailEnabled: boolean; approvalEmailMode: string; approvalEmailDigestTime: string };
export async function cancelApprovalDigestJobs(db: NotificationDb, approverId: string, reason: string) {
  return db.backgroundJob.updateMany({ where: { type: 'SEND_APPROVAL_DIGEST', payload: { contains: approverId }, status: { in: ['PENDING', 'FAILED'] } }, data: { status: 'CANCELLED', completedAt: new Date(), lockedAt: null, lastErrorCode: reason } });
}
export async function ensureApprovalDigestJob(db: NotificationDb, approver: EmailApprover, reference = new Date()) {
  const settings = await getDeliverySettings(db);
  if (!settings.emailEnabled || !approver.isActive || approver.isApprover === false || !approver.approvalEmailEnabled || approver.approvalEmailMode !== 'DIGEST' || !isValidEmail(approver.email)) return null;
  const availableAt = nextEmailDigestAt(reference, approver.approvalEmailDigestTime);
  const dateKey = bangkokDateKey(availableAt);
  const idempotencyKey = `APPROVAL_DIGEST:${approver.id}:${dateKey}`;
  return db.backgroundJob.upsert({ where: { idempotencyKey }, update: { status: 'PENDING', availableAt, completedAt: null, lockedAt: null, lastErrorCode: null }, create: { type: 'SEND_APPROVAL_DIGEST', idempotencyKey, payload: JSON.stringify({ approverUserId: approver.id, scheduledDate: dateKey }), availableAt, maxAttempts: 3 } });
}
export async function enqueueApprovalAssignment(db: NotificationDb, input: { memo: { id: string; documentNo: string | null; subject: string }; step: { id: string; approverId: string; memoVersionId: string }; approver: EmailApprover; reference?: Date }) {
  if (!input.approver.isActive || !isValidEmail(input.approver.email)) return { notificationOnly: true };
  const settings = await getDeliverySettings(db);
  if (!settings.emailEnabled || !input.approver.approvalEmailEnabled) return { notificationOnly: true };
  if (input.approver.approvalEmailMode === 'DIGEST') {
    await ensureApprovalDigestJob(db, input.approver, input.reference);
    return { notificationOnly: false, emailEnabled: true, emailMode: 'DIGEST' as const };
  }
  const payload = { stepId: input.step.id, documentNo: input.memo.documentNo, subject: input.memo.subject };
  await enqueueEmailDelivery(db, { memoId: input.memo.id, recipient: input.approver.email!, recipientUserId: input.approver.id, memoVersionId: input.step.memoVersionId, stepId: input.step.id, template: EMAIL_TEMPLATES.APPROVAL_PENDING, payload, idempotencyKey: automaticDeliveryKey([EMAIL_TEMPLATES.APPROVAL_PENDING, input.memo.id, input.step.memoVersionId, input.step.id, input.approver.id]) });
  await db.backgroundJob.upsert({ where: { idempotencyKey: `REMINDER:${input.step.id}:${input.step.memoVersionId}:${input.approver.id}` }, update: {}, create: { type: 'SEND_APPROVAL_REMINDER', memoId: input.memo.id, idempotencyKey: `REMINDER:${input.step.id}:${input.step.memoVersionId}:${input.approver.id}`, payload: JSON.stringify({ stepId: input.step.id, memoVersionId: input.step.memoVersionId, approverUserId: input.approver.id }), availableAt: nextDayReminderAt(input.reference), maxAttempts: 3 } });
  return { notificationOnly: false, emailEnabled: true, emailMode: 'IMMEDIATE' as const };
}
export async function resolveApprovalAssignment(db: NotificationDb, input: { memoId: string; stepId: string; reason: string }) {
  const now = new Date();
  await db.notification.updateMany({ where: { memoId: input.memoId, payload: { contains: input.stepId }, resolvedAt: null }, data: { resolvedAt: now, readAt: now } });
  await db.backgroundJob.updateMany({ where: { type: 'SEND_APPROVAL_REMINDER', payload: { contains: input.stepId }, status: { in: ['PENDING', 'FAILED'] } }, data: { status: 'CANCELLED', completedAt: now, lockedAt: null, lastErrorCode: input.reason } });
  await db.emailDelivery.updateMany({ where: { stepId: input.stepId, template: { in: [EMAIL_TEMPLATES.APPROVAL_PENDING, EMAIL_TEMPLATES.APPROVAL_REMINDER] }, status: { in: ['PENDING', 'RETRY_WAIT', 'PAUSED'] } }, data: { status: 'CANCELLED', completedAt: now, lockedAt: null, lastErrorCode: input.reason } });
  const step = await db.memoApprovalStep.findUnique({ where: { id: input.stepId }, select: { approverId: true } });
  if (!step) return;
  const remaining = await db.memoApprovalStep.count({ where: { approverId: step.approverId, status: 'PENDING', id: { not: input.stepId } } });
  if (remaining === 0) await cancelApprovalDigestJobs(db, step.approverId, input.reason);
}
