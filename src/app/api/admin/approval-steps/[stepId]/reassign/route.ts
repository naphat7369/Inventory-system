import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { replacePendingApprover } from '@/lib/eapprove/service';
import { eApproveErrorResponse } from '@/lib/eapprove/http';
import { parseBody, reassignApproverSchema } from '@/lib/eapprove/schemas';

export async function POST(request: Request, { params }: { params: Promise<{ stepId: string }> }) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = parseBody(reassignApproverSchema, await request.json().catch(() => ({})));
    const { stepId } = await params;
    return NextResponse.json(await replacePendingApprover(prisma, { stepId, newApproverId: body.newApproverId, reason: body.reason, actorId: String(session.id), idempotencyKey: body.idempotencyKey }));
  } catch (error) { return eApproveErrorResponse(error); }
}
