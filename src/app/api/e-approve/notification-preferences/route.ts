import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cancelApprovalDigestJobs, enqueueApprovalAssignment, ensureApprovalDigestJob, isValidEmail, normalizeEmail } from '@/lib/eapprove/notification-service';

const schema = z.object({ email: z.string().trim().email().max(254), approvalEmailEnabled: z.boolean(), approvalEmailMode: z.enum(['IMMEDIATE', 'DIGEST']), approvalEmailDigestTime: z.string().regex(/^(?:(?:0[89]|1[0-7]):(?:00|30)|18:00)$/) }).strict();

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลการแจ้งเตือนไม่ถูกต้อง' }, { status: 400 });
  const userId = String(session.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isActive || !user.isApprover) return NextResponse.json({ error: 'ไม่มีสิทธิ์ Approver' }, { status: 403 });
  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) return NextResponse.json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
  const usersWithEmail = await prisma.user.findMany({ where: { id: { not: userId }, email: { not: null } }, select: { email: true } });
  if (usersWithEmail.some((item) => normalizeEmail(item.email) === email)) return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว' }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    const pending = await tx.memoApprovalStep.findMany({ where: { approverId: userId, status: 'PENDING' }, include: { round: { include: { memo: true } } } });
    const now = new Date();
    await cancelApprovalDigestJobs(tx, userId, 'EMAIL_PREFERENCE_CHANGED');
    await tx.backgroundJob.updateMany({ where: { type: 'SEND_APPROVAL_REMINDER', payload: { contains: userId }, status: { in: ['PENDING', 'FAILED'] } }, data: { status: 'CANCELLED', completedAt: now, lastErrorCode: 'EMAIL_PREFERENCE_CHANGED' } });
    await tx.emailDelivery.updateMany({ where: { recipientUserId: userId, template: { in: ['APPROVAL_PENDING', 'APPROVAL_REMINDER'] }, status: { in: ['PENDING', 'RETRY_WAIT', 'PAUSED'] } }, data: { status: 'CANCELLED', completedAt: now, lastErrorCode: 'EMAIL_PREFERENCE_CHANGED' } });
    const updated = await tx.user.update({ where: { id: userId }, data: { email, approvalEmailEnabled: parsed.data.approvalEmailEnabled, approvalEmailMode: parsed.data.approvalEmailMode, approvalEmailDigestTime: parsed.data.approvalEmailDigestTime } });
    if (normalizeEmail(user.email) !== email) await tx.auditLog.create({ data: {
      module: 'E_APPROVE', action: 'USER_NOTIFICATION_EMAIL_UPDATED', entity: 'USER', entityId: userId, userId,
      oldValue: JSON.stringify({ email: user.email }), newValue: JSON.stringify({ email }),
    } });
    if (!updated.approvalEmailEnabled) return;
    if (updated.approvalEmailMode === 'DIGEST') {
      if (pending.length > 0) await ensureApprovalDigestJob(tx, updated);
      return;
    }
    for (const step of pending) await enqueueApprovalAssignment(tx, { memo: { id: step.round.memo.id, documentNo: step.round.memo.documentNo, subject: step.round.memo.subject }, step, approver: updated });
  });
  return NextResponse.json({ success: true });
}
