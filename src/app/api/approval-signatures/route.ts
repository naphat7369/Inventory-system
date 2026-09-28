import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

const TYPES = new Set(['TYPED', 'DRAWN', 'UPLOADED']);

function validateInput(value: unknown) {
  const body = (value ?? {}) as { name?: unknown; type?: unknown; data?: unknown; isDefault?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const type = typeof body.type === 'string' ? body.type : '';
  const data = typeof body.data === 'string' ? body.data.trim() : '';
  if (!name || name.length > 100) return { error: 'ชื่อลายเซ็นต้องมีความยาว 1-100 ตัวอักษร' };
  if (!TYPES.has(type)) return { error: 'ประเภทลายเซ็นไม่ถูกต้อง' };
  if (!data || data.length > 2_000_000) return { error: 'ข้อมูลลายเซ็นว่างหรือมีขนาดเกิน 1.5 MB' };
  if (type === 'TYPED' && data.length > 150) return { error: 'ข้อความลายเซ็นยาวเกินไป' };
  if (type !== 'TYPED' && !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(data)) return { error: 'ไฟล์ลายเซ็นต้องเป็น PNG, JPG หรือ WebP' };
  return { data: { name, type, data, isDefault: body.isDefault === true } };
}

export async function GET() {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: String(session.id) }, select: { isActive: true } });
  if (!user?.isActive) return NextResponse.json({ error: 'บัญชีผู้ใช้ไม่ได้เปิดใช้งาน' }, { status: 403 });
  const signatures = await prisma.approvalSignature.findMany({
    where: { userId: String(session.id) },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
  return NextResponse.json(signatures);
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = String(session.id);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
    if (!user?.isActive) return NextResponse.json({ error: 'บัญชีผู้ใช้ไม่ได้เปิดใช้งาน' }, { status: 403 });
    const parsed = validateInput(await request.json().catch(() => ({})));
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const count = await prisma.approvalSignature.count({ where: { userId } });
    if (count >= 10) return NextResponse.json({ error: 'สามารถบันทึกลายเซ็นได้สูงสุด 10 แบบ' }, { status: 400 });
    const makeDefault = parsed.data.isDefault || count === 0;
    const signature = await prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.approvalSignature.updateMany({ where: { userId }, data: { isDefault: false } });
      const created = await tx.approvalSignature.create({ data: { userId, ...parsed.data, isDefault: makeDefault } });
      await tx.auditLog.create({ data: { module: 'E_APPROVE', userId, action: 'CREATED_APPROVAL_SIGNATURE', entity: 'APPROVAL_SIGNATURE', entityId: created.id, newValue: JSON.stringify({ name: created.name, type: created.type, isDefault: created.isDefault }) } });
      return created;
    });
    return NextResponse.json(signature, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถบันทึกลายเซ็นได้' }, { status: 500 });
  }
}
