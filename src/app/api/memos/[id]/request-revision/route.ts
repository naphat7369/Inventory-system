import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requestMemoRevision } from '@/lib/edocuments/service';
import { eDocumentsErrorResponse } from '@/lib/edocuments/http';
import { parseBody, requestRevisionSchema } from '@/lib/edocuments/schemas';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = parseBody(requestRevisionSchema, await request.json().catch(() => ({})));
    const { id } = await params;
    return NextResponse.json(await requestMemoRevision(prisma, {
      memoId: id, actorId: String(session.id), reason: body.reason,
      idempotencyKey: body.idempotencyKey,
    }));
  } catch (error) {
    return eDocumentsErrorResponse(error);
  }
}
