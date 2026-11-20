import { NextResponse } from 'next/server'; import prisma from '@/lib/prisma'; import { getSession } from '@/lib/auth';
import { deleteMemoType, updateMemoType } from '@/lib/edocuments/admin-service'; import { parseBody, updateMemoTypeSchema } from '@/lib/edocuments/schemas'; import { eDocumentsErrorResponse } from '@/lib/edocuments/http';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const session = await getSession(); if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const { id } = await params; const body = parseBody(updateMemoTypeSchema, await request.json().catch(() => ({}))); return NextResponse.json(await updateMemoType(prisma, String(session.id), id, body)); } catch (error) { return eDocumentsErrorResponse(error); } }

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    return NextResponse.json(await deleteMemoType(prisma, String(session.id), id));
  } catch (error) {
    return eDocumentsErrorResponse(error);
  }
}
