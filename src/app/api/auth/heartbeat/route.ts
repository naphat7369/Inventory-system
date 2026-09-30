import { NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST() {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: String(session.id) },
    include: { department: { select: { name: true } } },
  });
  if (!user?.isActive) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

  await createSession({
    id: user.id,
    username: user.username,
    role: user.role,
    isApprover: user.isApprover,
    fullName: user.fullName,
    department: user.department?.name ?? null,
    departmentId: user.departmentId,
    phone: user.phone,
  });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
