import { NextResponse } from 'next/server'; import prisma from '@/lib/prisma'; import { getSession } from '@/lib/auth';
import { updateUserApprovalConfig } from '@/lib/eapprove/admin-service'; import { parseBody, userApprovalConfigSchema } from '@/lib/eapprove/schemas'; import { eApproveErrorResponse } from '@/lib/eapprove/http';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await getSession(); if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const { id } = await params; const body = parseBody(userApprovalConfigSchema, await request.json().catch(() => ({}))); return NextResponse.json(await updateUserApprovalConfig(prisma, String(session.id), id, body)); }
  catch (error) { return eApproveErrorResponse(error); }
}
