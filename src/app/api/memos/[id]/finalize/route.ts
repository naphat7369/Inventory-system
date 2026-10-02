import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  return NextResponse.json({
    error: 'Memo ทุกฉบับต้องส่งผ่าน E-Approve ก่อนออกเลขเอกสาร',
    memoId: id,
  }, { status: 409 });
}
