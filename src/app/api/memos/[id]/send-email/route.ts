import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

const requestSchema = z.object({
  recipient: z.string().trim().email().max(254),
  message: z.string().trim().max(5000).optional().default(''),
  memoUrl: z.string().trim().url().max(2000),
  idempotencyKey: z.string().trim().min(8).max(200),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    return NextResponse.json({ error: 'ระบบยังไม่ได้ตั้งค่า SMTP_HOST และ SMTP_FROM กรุณาติดต่อผู้ดูแลระบบ' }, { status: 503 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลผู้รับหรือข้อความไม่ถูกต้อง' }, { status: 400 });
  const { id } = await params;
  const actor = await prisma.user.findUnique({ where: { id: String(session.id) }, select: { id: true, role: true, isActive: true } });
  if (!actor?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const memo = await prisma.memo.findUnique({
    where: { id },
    include: { pdfArtifacts: { where: { kind: 'OFFICIAL' }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!memo || memo.deletedAt) return NextResponse.json({ error: 'ไม่พบ Memo' }, { status: 404 });
  if (actor.role !== 'ADMIN' && memo.createdById !== actor.id) {
    return NextResponse.json({ error: 'เฉพาะผู้สร้าง Memo หรือ Admin เท่านั้นที่ส่ง E-Mail ได้' }, { status: 403 });
  }
  if (memo.pdfStatus !== 'READY' || memo.pdfArtifacts.length === 0) {
    return NextResponse.json({ error: 'Official PDF ยังไม่พร้อม กรุณารอให้ PDF Status เป็น READY' }, { status: 409 });
  }

  const idempotencyKey = `EMAIL:MEMO_SHARE:${memo.id}:${parsed.data.idempotencyKey}`;
  const payload = JSON.stringify({
    actorId: actor.id,
    memoUrl: parsed.data.memoUrl,
    subject: `${memo.documentNo ? `${memo.documentNo} - ` : ''}${memo.subject}`,
    message: parsed.data.message,
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.emailDelivery.create({ data: {
        memoId: memo.id,
        recipient: parsed.data.recipient.toLowerCase(),
        template: 'MEMO_OFFICIAL_PDF',
        payload,
        idempotencyKey,
      } });
      await tx.auditLog.create({ data: {
        module: 'E_APPROVE',
        action: 'MEMO_EMAIL_QUEUED',
        entity: 'EMAIL_DELIVERY',
        entityId: created.id,
        userId: actor.id,
        details: JSON.stringify({ memoId: memo.id, recipient: created.recipient }),
      } });
      const sendCount = await tx.emailDelivery.count({ where: { memoId: memo.id } });
      return { delivery: created, sendCount };
    });
    return NextResponse.json({ deliveryId: result.delivery.id, status: result.delivery.status, sendCount: result.sendCount }, { status: 202 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.emailDelivery.findUnique({ where: { idempotencyKey } });
      if (existing) {
        const sendCount = await prisma.emailDelivery.count({ where: { memoId: memo.id } });
        return NextResponse.json({ deliveryId: existing.id, status: existing.status, sendCount, duplicate: true }, { status: 200 });
      }
    }
    console.error('Queue memo email failed');
    return NextResponse.json({ error: 'ไม่สามารถสร้างงานส่ง E-Mail ได้' }, { status: 500 });
  }
}
