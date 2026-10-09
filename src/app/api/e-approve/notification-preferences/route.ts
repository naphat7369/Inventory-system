import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { approvalCalendarWindow, automaticDeliveryKey, cancelApprovalCalendar, enqueueApprovalAssignment, enqueueEmailDelivery, isValidEmail } from '@/lib/eapprove/notification-service';

const schema = z.object({ approvalEmailEnabled: z.boolean(), approvalCalendarEnabled: z.boolean() }).strict();

export async function GET() {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: String(session.id) }, select: { email: true, approvalEmailEnabled: true, approvalCalendarEnabled: true } });
  return user ? NextResponse.json(user) : NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  const userId = String(session.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isActive || !user.isApprover) return NextResponse.json({ error: 'บัญชีนี้ไม่มีสิทธิ์ Approver' }, { status: 403 });
  if ((parsed.data.approvalEmailEnabled || parsed.data.approvalCalendarEnabled) && !isValidEmail(user.email)) return NextResponse.json({ error: 'ต้องกำหนดอีเมลที่ถูกต้องก่อนเปิดการแจ้งเตือน' }, { status: 400 });
  const pending = await prisma.memoApprovalStep.findMany({ where: { approverId: userId, status: 'PENDING' }, include: { round: { include: { memo: true } } } });
  await prisma.$transaction(async tx => {
    await tx.user.update({ where: { id: userId }, data: parsed.data });
    if (user.approvalCalendarEnabled && !parsed.data.approvalCalendarEnabled) {
      for (const step of pending) await cancelApprovalCalendar(tx, { memoId: step.round.memoId, stepId: step.id, reason: 'USER_DISABLED_CALENDAR' });
    } else if (!user.approvalCalendarEnabled && parsed.data.approvalCalendarEnabled) {
      const updatedUser = { ...user, ...parsed.data };
      for (const step of pending) await enqueueApprovalAssignment(tx, { memo: { id: step.round.memo.id, documentNo: step.round.memo.documentNo, subject: step.round.memo.subject }, step, approver: updatedUser });
    }
    if (user.approvalEmailEnabled && !parsed.data.approvalEmailEnabled) {
      for (const step of pending) {
        const deliveries = await tx.emailDelivery.findMany({ where: { stepId: step.id, template: 'APPROVAL_PENDING', status: { in: ['PENDING', 'RETRY_WAIT', 'PAUSED'] } } });
        for (const delivery of deliveries) {
          let hasCalendar = false;
          try { hasCalendar = Boolean(JSON.parse(delivery.payload).calendar); } catch { hasCalendar = false; }
          await tx.emailDelivery.update({ where: { id: delivery.id }, data: hasCalendar && parsed.data.approvalCalendarEnabled
            ? { template: 'APPROVAL_CALENDAR_REQUEST' }
            : { status: 'CANCELLED', completedAt: new Date(), lastErrorCode: 'USER_DISABLED_EMAIL' } });
        }
      }
      await tx.backgroundJob.updateMany({ where: { type: 'SEND_APPROVAL_REMINDER', payload: { contains: userId }, status: { in: ['PENDING', 'FAILED'] } }, data: { status: 'CANCELLED', completedAt: new Date(), lastErrorCode: 'USER_DISABLED_EMAIL' } });
    } else if (!user.approvalEmailEnabled && parsed.data.approvalEmailEnabled && !( !user.approvalCalendarEnabled && parsed.data.approvalCalendarEnabled)) {
      const reminderAt = approvalCalendarWindow().reminderAt;
      for (const step of pending) {
        await enqueueEmailDelivery(tx, { memoId: step.round.memoId, recipient: user.email!, recipientUserId: userId, memoVersionId: step.memoVersionId, stepId: step.id, template: 'APPROVAL_PENDING', payload: { stepId: step.id, documentNo: step.round.memo.documentNo, subject: step.round.memo.subject, calendar: null }, idempotencyKey: automaticDeliveryKey(['APPROVAL_PENDING', step.round.memoId, step.memoVersionId, step.id, userId, 'EMAIL_ENABLED']) });
        await tx.backgroundJob.upsert({ where: { idempotencyKey: `REMINDER:${step.id}:${step.memoVersionId}:${userId}` }, update: { status: 'PENDING', availableAt: reminderAt, completedAt: null, lastErrorCode: null }, create: { type: 'SEND_APPROVAL_REMINDER', memoId: step.round.memoId, idempotencyKey: `REMINDER:${step.id}:${step.memoVersionId}:${userId}`, payload: JSON.stringify({ stepId: step.id, memoVersionId: step.memoVersionId, approverUserId: userId }), availableAt: reminderAt, maxAttempts: 3 } });
      }
    }
    await tx.auditLog.create({ data: { module: 'E_APPROVE', action: 'UPDATED_NOTIFICATION_PREFERENCES', entity: 'USER', entityId: userId, userId, newValue: JSON.stringify(parsed.data) } });
  });
  return NextResponse.json(parsed.data);
}
