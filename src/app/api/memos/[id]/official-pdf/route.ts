import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

function downloadName(documentNo: string | null, subject: string) {
  const value = (documentNo || subject || 'memo').replace(/[\\/:*?"<>|]/g, '-').trim() || 'memo';
  return `${value}-official.pdf`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const [actor, memo] = await Promise.all([
    prisma.user.findUnique({ where: { id: String(session.id) }, select: { id: true, role: true, departmentId: true, isActive: true } }),
    prisma.memo.findUnique({
      where: { id },
      include: {
        pdfArtifacts: { where: { kind: 'OFFICIAL' }, orderBy: { createdAt: 'desc' }, take: 1 },
        approvalRounds: { orderBy: { roundNumber: 'desc' }, take: 1, include: { steps: { select: { approverId: true } } } },
      },
    }),
  ]);
  if (!actor?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!memo || memo.deletedAt) return NextResponse.json({ error: 'ไม่พบ Memo' }, { status: 404 });

  const participates = memo.approvalRounds[0]?.steps.some((step) => step.approverId === actor.id) ?? false;
  const canView = actor.role === 'ADMIN' || memo.createdById === actor.id || actor.departmentId === memo.departmentId || participates;
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const artifact = memo.pdfArtifacts[0];
  if (memo.pdfStatus !== 'READY' || !artifact) {
    return NextResponse.json({ error: 'Official PDF ยังไม่พร้อมใช้งาน' }, { status: 409 });
  }

  const storageRoot = path.resolve(process.cwd(), 'storage', 'eapprove', 'official-pdfs');
  const target = path.resolve(/* turbopackIgnore: true */ process.cwd(), artifact.storageKey);
  if (target !== storageRoot && !target.startsWith(`${storageRoot}${path.sep}`)) {
    return NextResponse.json({ error: 'ตำแหน่งไฟล์ไม่ถูกต้อง' }, { status: 500 });
  }

  try {
    const bytes = await readFile(target);
    const fileName = downloadName(memo.documentNo, memo.subject);
    const disposition = new URL(request.url).searchParams.get('view') === '1' ? 'inline' : 'attachment';
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `${disposition}; filename="memo-official.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'ไม่พบไฟล์ Official PDF ในพื้นที่จัดเก็บ' }, { status: 404 });
  }
}
