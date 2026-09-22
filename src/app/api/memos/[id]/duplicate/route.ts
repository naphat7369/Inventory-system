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
      where: { id },
      include: { signatures: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    // Duplicate memo but set as DRAFT and reset documentNo
    const newMemo = await prisma.memo.create({
      data: {
        departmentId: existing.departmentId,
        documentDate: new Date(), // Set to today
        recipient: existing.recipient,
        sender: existing.sender,
        subject: `[Copy] ${existing.subject}`,
        subHeader: existing.subHeader,
        logoUrl: existing.logoUrl,
        logoAssetId: existing.logoAssetId,
        reference: existing.reference,
        carbonCopy: existing.carbonCopy,
        content: existing.content,
        status: 'DRAFT',
        createdById: session.id as string,
        updatedById: session.id as string,
        signatures: {
          create: existing.signatures.map(sig => ({
            role: sig.role,
            name: sig.name,
            position: sig.position,
            sortOrder: sig.sortOrder
          }))
        }
      }
    });

    return NextResponse.json(newMemo);
  } catch (error) {
    console.error('Error duplicating memo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
