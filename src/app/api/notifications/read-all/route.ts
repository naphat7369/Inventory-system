import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST() {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await prisma.notification.updateMany({ where: { userId: String(session.id), readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ updated: result.count });
}
