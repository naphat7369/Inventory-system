import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const result = await prisma.notification.updateMany({ where: { id, userId: String(session.id), readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ updated: result.count });
}
