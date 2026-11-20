import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { submitMemo } from '@/lib/edocuments/service';
import { eDocumentsErrorResponse } from '@/lib/edocuments/http';
import { parseBody, submitMemoSchema } from '@/lib/edocuments/schemas';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = parseBody(submitMemoSchema, await request.json().catch(() => ({})));
    const { id } = await params;
    return NextResponse.json(await submitMemo(prisma, {
      memoId: id, actorId: String(session.id), templateId: body.templateId,
      userAddedApproverIds: body.userAddedApproverIds, idempotencyKey: body.idempotencyKey,
    }));
  } catch (error) { return eDocumentsErrorResponse(error); }
}
