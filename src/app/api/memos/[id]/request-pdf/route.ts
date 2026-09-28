import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { queueOfficialPdfForFinalMemo } from '@/lib/memo-official-pdf';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const [actor, memo] = await Promise.all([
      prisma.user.findUnique({ where: { id: String(session.id) }, select: { id: true, role: true, isActive: true } }),
      prisma.memo.findUnique({ where: { id }, select: { id: true, createdById: true, deletedAt: true } }),
    ]);
    if (!actor?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!memo || memo.deletedAt) return NextResponse.json({ error: 'ไม่พบ Memo' }, { status: 404 });
    if (actor.role !== 'ADMIN' && memo.createdById !== actor.id) {
      return NextResponse.json({ error: 'เฉพาะผู้สร้าง Memo หรือ Admin เท่านั้นที่สร้าง Official PDF ได้' }, { status: 403 });
    }
    return NextResponse.json(await prisma.$transaction((tx) => queueOfficialPdfForFinalMemo(tx, memo.id, actor.id)), { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ไม่สามารถสร้างงาน Official PDF ได้';
    return NextResponse.json({ error: message }, { status: message.includes('only after') ? 409 : 500 });
  }
}
