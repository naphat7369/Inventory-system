import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { eApproveErrorResponse } from '@/lib/eapprove/http';
import { parseBody, withdrawMemoSchema } from '@/lib/eapprove/schemas';
import { withdrawMemo } from '@/lib/eapprove/service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = parseBody(withdrawMemoSchema, await request.json().catch(() => ({})));
    return NextResponse.json(await withdrawMemo(prisma, {
      memoId: id,
      actorId: String(session.id),
      idempotencyKey: body.idempotencyKey,
    }));
  } catch (error) {
    return eApproveErrorResponse(error);
  }
}
