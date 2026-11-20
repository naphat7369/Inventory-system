import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireAdmin } from '@/lib/edocuments/authorization';
import { createBranch } from '@/lib/edocuments/admin-service';
import { createBranchSchema, parseBody } from '@/lib/edocuments/schemas';
import { eDocumentsErrorResponse } from '@/lib/edocuments/http';

export async function GET() {
  try {
    const session = await getSession(); if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(prisma, String(session.id));
    return NextResponse.json(await prisma.branch.findMany({ include: { generalManager: { select: { id: true, fullName: true, username: true } }, _count: { select: { users: true, departments: true } } }, orderBy: { name: 'asc' } }));
  } catch (error) { return eDocumentsErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const session = await getSession(); if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = parseBody(createBranchSchema, await request.json().catch(() => ({})));
    return NextResponse.json(await createBranch(prisma, String(session.id), body), { status: 201 });
  } catch (error) { return eDocumentsErrorResponse(error); }
}
