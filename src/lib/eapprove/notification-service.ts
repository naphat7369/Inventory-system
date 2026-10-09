import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export type NotificationDb = PrismaClient | Prisma.TransactionClient;

const BANGKOK_TZ = 'Asia/Bangkok';
const SYSTEM_SETTING_KEYS = [
  'eapproveEmailEnabled',
  'eapproveCalendarEnabled',
  'eapproveOfficialPdfAutoSendEnabled',
  'emailAttachmentMaxMb',
] as const;

export const EMAIL_TEMPLATES = {
  APPROVAL_PENDING: 'APPROVAL_PENDING',
  APPROVAL_CALENDAR_REQUEST: 'APPROVAL_CALENDAR_REQUEST',
  APPROVAL_CALENDAR_CANCEL: 'APPROVAL_CALENDAR_CANCEL',
  APPROVAL_REMINDER: 'APPROVAL_REMINDER',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  MEMO_APPROVED_OFFICIAL: 'MEMO_APPROVED_OFFICIAL',
  MEMO_OFFICIAL_PDF: 'MEMO_OFFICIAL_PDF',
} as const;

export function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

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
  const values = new Map(rows.map((row) => {
    try { return [row.key, JSON.parse(row.value)] as const; }
    catch { return [row.key, null] as const; }
  }));
  return {
    emailEnabled: process.env.EAPPROVE_EMAIL_DISABLED !== 'true' && values.get('eapproveEmailEnabled') !== false,
    calendarEnabled: process.env.EAPPROVE_CALENDAR_DISABLED !== 'true' && values.get('eapproveCalendarEnabled') !== false,
    officialAutoSendEnabled: process.env.EAPPROVE_OFFICIAL_PDF_AUTO_SEND_DISABLED !== 'true' && values.get('eapproveOfficialPdfAutoSendEnabled') !== false,
    attachmentMaxMb: Math.max(1, Math.min(100, Number(values.get('emailAttachmentMaxMb') ?? 10) || 10)),
  };
}

export function approvalCalendarWindow(reference = new Date()) {
  const localReference = toZonedTime(reference, BANGKOK_TZ);
  const localStart = new Date(localReference);
  localStart.setHours(16, 0, 0, 0);
  if (localReference.getTime() >= localStart.getTime()) localStart.setDate(localStart.getDate() + 1);
  const localEnd = new Date(localStart);
  localEnd.setMinutes(localEnd.getMinutes() + 30);
  const localReminder = new Date(localReference);
  localReminder.setDate(localReminder.getDate() + 1);
  localReminder.setHours(9, 0, 0, 0);
  return {
    startAt: fromZonedTime(localStart, BANGKOK_TZ),
    endAt: fromZonedTime(localEnd, BANGKOK_TZ),
    reminderAt: fromZonedTime(localReminder, BANGKOK_TZ),
  };
}

export async function enqueueInAppNotification(db: NotificationDb, input: {
  type: string;
  eventKey: string;
  memoId: string;
  userId: string;
  payload: unknown;
}) {
  const idempotencyKey = `NOTIFICATION:${input.eventKey}:${input.memoId}:${input.userId}`;
  return db.notification.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      userId: input.userId,
      memoId: input.memoId,
      type: input.type,
      payload: JSON.stringify(input.payload),
      idempotencyKey,
    },
  });
}

export async function enqueueEmailDelivery(db: NotificationDb, input: {
  memoId: string;
  recipient: string;
  recipientUserId?: string | null;
  memoVersionId?: string | null;
  stepId?: string | null;
  template: string;
  payload: unknown;
  idempotencyKey: string;
  availableAt?: Date;
}) {
  return db.emailDelivery.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      memoId: input.memoId,
      recipient: normalizeEmail(input.recipient),
      recipientUserId: input.recipientUserId ?? null,
      memoVersionId: input.memoVersionId ?? null,
      stepId: input.stepId ?? null,
      template: input.template,
      payload: JSON.stringify(input.payload),
      idempotencyKey: input.idempotencyKey,
      availableAt: input.availableAt ?? new Date(),
      maxAttempts: 3,
    },
  });
}

export async function enqueueApprovalAssignment(db: NotificationDb, input: {
  memo: { id: string; documentNo: string | null; subject: string };
  step: { id: string; approverId: string; memoVersionId: string; calendarSequence: number };
  approver: { id: string; email: string | null; isActive: boolean; approvalEmailEnabled: boolean; approvalCalendarEnabled: boolean };
  reference?: Date;
}) {
  const payload = { stepId: input.step.id, documentNo: input.memo.documentNo, subject: input.memo.subject };
  await enqueueInAppNotification(db, {
    type: 'APPROVAL_PENDING', eventKey: `APPROVAL_PENDING:${input.step.id}`,
    memoId: input.memo.id, userId: input.approver.id, payload,
  });
  if (!input.approver.isActive || !isValidEmail(input.approver.email)) return { notificationOnly: true };

  const settings = await getDeliverySettings(db);
  const emailEnabled = settings.emailEnabled && input.approver.approvalEmailEnabled;
  const calendarEnabled = settings.calendarEnabled && input.approver.approvalCalendarEnabled;
  if (!emailEnabled && !calendarEnabled) return { notificationOnly: true };

  const recipient = normalizeEmail(input.approver.email);
  const window = approvalCalendarWindow(input.reference);
  let sequence = input.step.calendarSequence;
  let template: string = EMAIL_TEMPLATES.APPROVAL_PENDING;
  let calendar: Record<string, unknown> | null = null;
  if (calendarEnabled) {
    sequence += 1;
    template = emailEnabled ? EMAIL_TEMPLATES.APPROVAL_PENDING : EMAIL_TEMPLATES.APPROVAL_CALENDAR_REQUEST;
    calendar = {
      method: 'REQUEST', uid: `approval-step-${input.step.id}@eapprove`, sequence,
      startAt: window.startAt.toISOString(), endAt: window.endAt.toISOString(),
    };
    await db.memoApprovalStep.update({ where: { id: input.step.id }, data: {
      calendarStatus: 'REQUEST_QUEUED', calendarUid: `approval-step-${input.step.id}@eapprove`,
      calendarRecipient: recipient, calendarStartAt: window.startAt, calendarEndAt: window.endAt,
      calendarSequence: sequence,
    } });
  }

  await enqueueEmailDelivery(db, {
    memoId: input.memo.id, recipient, recipientUserId: input.approver.id,
    memoVersionId: input.step.memoVersionId, stepId: input.step.id, template,
    payload: { ...payload, calendar },
    idempotencyKey: automaticDeliveryKey([template, input.memo.id, input.step.memoVersionId, input.step.id, input.approver.id, sequence]),
  });

  if (emailEnabled) {
    await db.backgroundJob.upsert({
      where: { idempotencyKey: `REMINDER:${input.step.id}:${input.step.memoVersionId}:${input.approver.id}` },
      update: {},
      create: {
        type: 'SEND_APPROVAL_REMINDER', memoId: input.memo.id,
        idempotencyKey: `REMINDER:${input.step.id}:${input.step.memoVersionId}:${input.approver.id}`,
        payload: JSON.stringify({ stepId: input.step.id, memoVersionId: input.step.memoVersionId, approverUserId: input.approver.id }),
        availableAt: window.reminderAt, maxAttempts: 3,
      },
    });
  }
  return { notificationOnly: false, emailEnabled, calendarEnabled };
}

export async function resolveApprovalAssignment(db: NotificationDb, input: {
  memoId: string;
  stepId: string;
  reason: string;
}) {
  const now = new Date();
  await db.notification.updateMany({
    where: { memoId: input.memoId, payload: { contains: input.stepId }, resolvedAt: null },
    data: { resolvedAt: now, readAt: now },
  });
  await db.backgroundJob.updateMany({
    where: { type: 'SEND_APPROVAL_REMINDER', payload: { contains: input.stepId }, status: { in: ['PENDING', 'FAILED'] } },
    data: { status: 'CANCELLED', completedAt: now, lockedAt: null, lastErrorCode: input.reason },
  });

  const step = await db.memoApprovalStep.findUnique({ where: { id: input.stepId } });
  if (!step?.calendarUid || !step.calendarRecipient || !step.calendarStartAt || !step.calendarEndAt) return;
  const settings = await getDeliverySettings(db);
  const pendingRequest = await db.emailDelivery.updateMany({
    where: { stepId: step.id, template: { in: [EMAIL_TEMPLATES.APPROVAL_PENDING, EMAIL_TEMPLATES.APPROVAL_CALENDAR_REQUEST] }, status: { in: ['PENDING', 'RETRY_WAIT'] } },
    data: { status: 'CANCELLED', completedAt: now, lockedAt: null, lastErrorCode: input.reason },
  });
  const sentRequest = await db.emailDelivery.count({
    where: { stepId: step.id, template: { in: [EMAIL_TEMPLATES.APPROVAL_PENDING, EMAIL_TEMPLATES.APPROVAL_CALENDAR_REQUEST] }, status: { in: ['SENT', 'SENDING'] } },
  });
  if (!settings.calendarEnabled || (pendingRequest.count > 0 && sentRequest === 0)) {
    await db.memoApprovalStep.update({ where: { id: step.id }, data: { calendarStatus: 'CANCELLED' } });
    return;
  }
  const sequence = step.calendarSequence + 1;
  await db.memoApprovalStep.update({ where: { id: step.id }, data: { calendarStatus: 'CANCEL_QUEUED', calendarSequence: sequence } });
  await enqueueEmailDelivery(db, {
    memoId: input.memoId, recipient: step.calendarRecipient, recipientUserId: step.approverId,
    memoVersionId: step.memoVersionId, stepId: step.id, template: EMAIL_TEMPLATES.APPROVAL_CALENDAR_CANCEL,
    payload: {
      stepId: step.id, reason: input.reason,
      calendar: { method: 'CANCEL', uid: step.calendarUid, sequence, startAt: step.calendarStartAt.toISOString(), endAt: step.calendarEndAt.toISOString() },
    },
    idempotencyKey: automaticDeliveryKey([EMAIL_TEMPLATES.APPROVAL_CALENDAR_CANCEL, input.memoId, step.memoVersionId, step.id, step.calendarRecipient, sequence]),
  });
}

export async function cancelApprovalCalendar(db: NotificationDb, input: { memoId: string; stepId: string; reason: string; recipientOverride?: string }) {
  const now = new Date();
  const step = await db.memoApprovalStep.findUnique({ where: { id: input.stepId } });
  if (!step?.calendarUid || !step.calendarRecipient || !step.calendarStartAt || !step.calendarEndAt) return;
  const recipient = input.recipientOverride ?? step.calendarRecipient;
  const pending = await db.emailDelivery.updateMany({
    where: { stepId: step.id, template: { in: [EMAIL_TEMPLATES.APPROVAL_PENDING, EMAIL_TEMPLATES.APPROVAL_CALENDAR_REQUEST] }, status: { in: ['PENDING', 'RETRY_WAIT', 'PAUSED'] } },
    data: { status: 'CANCELLED', completedAt: now, lockedAt: null, lastErrorCode: input.reason },
  });
  const sent = await db.emailDelivery.count({ where: { stepId: step.id, template: { in: [EMAIL_TEMPLATES.APPROVAL_PENDING, EMAIL_TEMPLATES.APPROVAL_CALENDAR_REQUEST] }, status: 'SENT' } });
  if (pending.count > 0 && sent === 0) {
    await db.memoApprovalStep.update({ where: { id: step.id }, data: { calendarStatus: 'CANCELLED' } });
    return;
  }
  const sequence = step.calendarSequence + 1;
  await db.memoApprovalStep.update({ where: { id: step.id }, data: { calendarStatus: 'CANCEL_QUEUED', calendarSequence: sequence } });
  await enqueueEmailDelivery(db, {
    memoId: input.memoId, recipient, recipientUserId: step.approverId, memoVersionId: step.memoVersionId, stepId: step.id,
    template: EMAIL_TEMPLATES.APPROVAL_CALENDAR_CANCEL,
    payload: { stepId: step.id, reason: input.reason, calendar: { method: 'CANCEL', uid: step.calendarUid, sequence, startAt: step.calendarStartAt.toISOString(), endAt: step.calendarEndAt.toISOString() } },
    idempotencyKey: automaticDeliveryKey([EMAIL_TEMPLATES.APPROVAL_CALENDAR_CANCEL, input.memoId, step.memoVersionId, step.id, recipient, sequence]),
  });
}
