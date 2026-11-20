import { NextResponse } from 'next/server'; import prisma from '@/lib/prisma'; import { getSession } from '@/lib/auth';
import { updateDepartmentApprovalConfig } from '@/lib/edocuments/admin-service'; import { departmentApprovalConfigSchema, parseBody } from '@/lib/edocuments/schemas'; import { eDocumentsErrorResponse } from '@/lib/edocuments/http';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await getSession(); if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const { id } = await params; const body = parseBody(departmentApprovalConfigSchema, await request.json().catch(() => ({}))); return NextResponse.json(await updateDepartmentApprovalConfig(prisma, String(session.id), id, body)); }
  catch (error) { return eDocumentsErrorResponse(error); }
}
