import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = String(session.id);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!user?.isActive) return NextResponse.json({ error: 'บัญชีผู้ใช้ไม่ได้เปิดใช้งาน' }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { name?: unknown; isDefault?: unknown };
  const existing = await prisma.approvalSignature.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'ไม่พบลายเซ็น' }, { status: 404 });
  const name = body.name === undefined ? existing.name : typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) return NextResponse.json({ error: 'ชื่อลายเซ็นไม่ถูกต้อง' }, { status: 400 });
  const signature = await prisma.$transaction(async (tx) => {
    if (body.isDefault === true) await tx.approvalSignature.updateMany({ where: { userId }, data: { isDefault: false } });
    const updated = await tx.approvalSignature.update({ where: { id }, data: { name, ...(body.isDefault === true ? { isDefault: true } : {}) } });
    await tx.auditLog.create({ data: { module: 'E_APPROVE', userId, action: 'UPDATED_APPROVAL_SIGNATURE', entity: 'APPROVAL_SIGNATURE', entityId: id, newValue: JSON.stringify({ name: updated.name, type: updated.type, isDefault: updated.isDefault }) } });
    return updated;
  });
  return NextResponse.json(signature);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = String(session.id);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!user?.isActive) return NextResponse.json({ error: 'บัญชีผู้ใช้ไม่ได้เปิดใช้งาน' }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.approvalSignature.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'ไม่พบลายเซ็น' }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.approvalSignature.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.approvalSignature.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } });
      if (next) await tx.approvalSignature.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    await tx.auditLog.create({ data: { module: 'E_APPROVE', userId, action: 'DELETED_APPROVAL_SIGNATURE', entity: 'APPROVAL_SIGNATURE', entityId: id, oldValue: JSON.stringify({ name: existing.name, type: existing.type, isDefault: existing.isDefault }) } });
  });
  return NextResponse.json({ deleted: true });
}
