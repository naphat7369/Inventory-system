import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { approveCurrentStep } from '@/lib/eapprove/service';
import { eApproveErrorResponse } from '@/lib/eapprove/http';
import { approveMemoSchema, parseBody } from '@/lib/eapprove/schemas';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = parseBody(approveMemoSchema, await request.json().catch(() => ({})));
    const { id } = await params;
    return NextResponse.json(await approveCurrentStep(prisma, {
      memoId: id, actorId: String(session.id), signatureId: body.signatureId, idempotencyKey: body.idempotencyKey,
    }));
  } catch (error) { return eApproveErrorResponse(error); }
}
