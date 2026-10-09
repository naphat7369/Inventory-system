import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isValidEmail } from '@/lib/eapprove/notification-service';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: String(session.id) }, select: { role: true, isActive: true } });
  if (!actor?.isActive || actor.role !== 'ADMIN') return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้น' }, { status: 403 });
  const { id } = await params;
  const delivery = await prisma.emailDelivery.findUnique({ where: { id } });
  if (!delivery) return NextResponse.json({ error: 'ไม่พบรายการอีเมล' }, { status: 404 });
  if (!isValidEmail(delivery.recipient)) return NextResponse.json({ error: 'อีเมลผู้รับไม่ถูกต้อง กรุณาแก้ไขอีเมลผู้ใช้ก่อน Retry' }, { status: 400 });
  if (delivery.status !== 'FAILED') return NextResponse.json({ error: 'Retry ได้เฉพาะรายการ FAILED' }, { status: 409 });
  await prisma.$transaction([
    prisma.emailDelivery.update({ where: { id }, data: { status: 'PENDING', attemptCount: 0, availableAt: new Date(), lockedAt: null, completedAt: null, lastErrorCode: null } }),
    prisma.auditLog.create({ data: { module: 'E_APPROVE', action: 'EMAIL_RETRY_QUEUED', entity: 'EMAIL_DELIVERY', entityId: id, userId: String(session.id) } }),
  ]);
  return NextResponse.json({ id, status: 'PENDING' });
}
