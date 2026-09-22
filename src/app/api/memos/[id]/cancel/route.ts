import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.memo.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    if (existing.status !== 'FINAL') {
      return NextResponse.json({ error: 'Only FINAL memos can be cancelled' }, { status: 400 });
    }

    const cancelledMemo = await prisma.memo.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        updatedById: session.id as string
      }
    });

    return NextResponse.json(cancelledMemo);
  } catch (error) {
    console.error('Error cancelling memo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
