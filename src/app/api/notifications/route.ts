import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = String(session.id);
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: 20,
      include: { memo: { select: { id: true, documentNo: true, subject: true } } },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return NextResponse.json({ items, unreadCount });
}
