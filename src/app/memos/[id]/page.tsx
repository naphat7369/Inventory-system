import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { MemoDetailActions } from '../MemoDetailActions';
import { MemoDocumentPagination } from './MemoDocumentPagination';
import { DEFAULT_S_HOTEL_LOGO_URL } from '@/lib/constants';
import { ApprovalWorkflowPanel } from './ApprovalWorkflowPanel';
import { MemoBackButton } from './MemoBackButton';
import { AttachmentDocumentPreview } from './AttachmentDocumentPreview';
import { CheckCircle2, Clock3, CircleDashed, RotateCcw, SkipForward } from 'lucide-react';

type StoredSignatureSnapshot = {
  signatureType: 'TYPED' | 'DRAWN' | 'UPLOADED';
  signatureData: string;
  confirmedAt?: string;
};

function readStoredSignatureSnapshot(value: string | null): StoredSignatureSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredSignatureSnapshot>;
    if (!['TYPED', 'DRAWN', 'UPLOADED'].includes(parsed.signatureType ?? '')) return null;
    if (typeof parsed.signatureData !== 'string' || !parsed.signatureData) return null;
    return parsed as StoredSignatureSnapshot;
  } catch {
    return null;
  }
}

function formatBangkokShort(value: Date) {
  const date = new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok',
  }).format(value);
  const time = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok',
  }).format(value);
  return `${date} · ${time} น.`;
}

export default async function MemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id as string },
    include: {
      department: true,
      approvalSignatures: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
    }
  });

  if (!currentUser) {
    redirect('/login');
  }

  const { id } = await params;
  
  const memo = await prisma.memo.findUnique({
    where: { id },
    include: {
      department: true,
      memoType: true,
      signatures: {
        orderBy: { sortOrder: 'asc' }
      },
      attachments: { orderBy: { createdAt: 'asc' } },
      pdfArtifacts: { where: { kind: 'OFFICIAL' }, orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { emailDeliveries: true } },
      approvalRounds: {
        orderBy: { roundNumber: 'desc' },
        take: 1,
        include: {
          steps: { orderBy: { sortOrder: 'asc' } },
          memoVersion: { select: { contentSnapshot: true } },
        },
      },
    }
  });

  if (!memo || memo.deletedAt !== null) {
    notFound();
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const isSameDept = Boolean(currentUser.departmentId) && currentUser.departmentId === memo.departmentId;
  const latestRound = memo.approvalRounds[0] ?? null;
  const isApprovalParticipant = latestRound?.steps.some((step) => step.approverId === currentUser.id) ?? false;
  const isOwner = memo.createdById === currentUser.id;

  if (!isAdmin && !isSameDept && !isApprovalParticipant && !isOwner) {
    redirect('/memos');
  }

  // Format date to Thai format
  const dateObj = new Date(memo.documentDate);
  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const thaiDateStr = `${dateObj.getDate()} ${thaiMonths[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;

  // IMMUTABLE LOGO RULE: Read ONLY from memo.logoUrl (never live department logo or constant)
  const displayLogoUrl = memo.logoUrl || DEFAULT_S_HOTEL_LOGO_URL;
  const displaySubHeader = (memo.subHeader || `${memo.department?.name || ''} DEPARTMENT`).trim().toLocaleUpperCase('en-US');

  let presenterSnapshot: StoredSignatureSnapshot | null = null;
  try {
    const versionContent = JSON.parse(latestRound?.memoVersion.contentSnapshot ?? '{}') as { presenterSignatureSnapshot?: unknown };
    if (versionContent.presenterSignatureSnapshot) {
      presenterSnapshot = readStoredSignatureSnapshot(JSON.stringify(versionContent.presenterSignatureSnapshot));
    }
  } catch {
    presenterSnapshot = null;
  }
  // Compatibility for a memo submitted before presenter signature snapshots were introduced.
  if (!presenterSnapshot && memo.createdById) {
    const currentPresenterSignature = await prisma.approvalSignature.findFirst({
      where: { userId: memo.createdById },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    if (currentPresenterSignature) {
      presenterSnapshot = {
        signatureType: currentPresenterSignature.type as StoredSignatureSnapshot['signatureType'],
        signatureData: currentPresenterSignature.data,
      };
    }
  }

  const approvedSteps = (latestRound?.steps ?? [])
    .filter((step) => step.status === 'APPROVED')
    .map((step) => ({
      approverName: step.approverNameSnapshot.trim().toLocaleLowerCase('th-TH'),
      snapshot: readStoredSignatureSnapshot(step.signatureSnapshot),
      actedAt: step.actedAt,
    }))
    .filter((step) => step.snapshot !== null);
  const usedApprovedSteps = new Set<number>();
  const signatures = memo.signatures.map((signature) => {
    const isPresenter = signature.sortOrder === 0 || signature.role.trim().includes('นำเสนอ');
    if (isPresenter && presenterSnapshot) {
      return {
        ...signature,
        approvalSignatureType: presenterSnapshot.signatureType,
        approvalSignatureData: presenterSnapshot.signatureData,
        approvedAt: presenterSnapshot.confirmedAt ?? null,
      };
    }
    const normalizedName = signature.name?.trim().toLocaleLowerCase('th-TH') ?? '';
    const matchingIndex = approvedSteps.findIndex((step, index) =>
      !usedApprovedSteps.has(index) && normalizedName !== '' && step.approverName === normalizedName,
    );
    if (matchingIndex < 0) return signature;
    usedApprovedSteps.add(matchingIndex);
    const matched = approvedSteps[matchingIndex];
    return {
      ...signature,
      approvalSignatureType: matched.snapshot?.signatureType,
      approvalSignatureData: matched.snapshot?.signatureData,
      approvedAt: matched.actedAt?.toISOString() ?? matched.snapshot?.confirmedAt ?? null,
    };
  });

  const canDelete = isAdmin || isOwner;
  const canEdit = (isAdmin || isOwner) && ['DRAFT', 'REVISION_REQUESTED', 'WITHDRAWN'].includes(memo.approvalStatus);
  const isCurrentApprover = latestRound?.status === 'ACTIVE' && latestRound.steps.some((step) => step.status === 'PENDING' && step.approverId === currentUser.id);
  const canSubmit = isOwner && ['DRAFT', 'REVISION_REQUESTED', 'WITHDRAWN'].includes(memo.approvalStatus);
  const backFallbackHref = isApprovalParticipant && !isOwner ? '/memos/approvals' : '/memos';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 print:p-0 print:bg-white print:min-h-0 print:m-0">
      <div className="max-w-[210mm] mx-auto print:max-w-none print:m-0 print:p-0">
        
        {/* Navigation - Hidden in Print */}
        <div className="mb-4 print:hidden flex justify-between items-center">
          <MemoBackButton fallbackHref={backFallbackHref} />
          <div className="text-xs text-slate-500 font-medium">
            สถานะ: <span className="font-bold text-slate-800 dark:text-slate-200">{memo.status}</span>
          </div>
        </div>

        {/* Actions - Hidden in Print */}
        <MemoDetailActions 
          memoId={memo.id} 
          status={memo.status} 
          documentNo={memo.documentNo}
          subject={memo.subject}
          canDelete={canDelete}
          canEdit={canEdit}
          signatures={signatures}
          isEApprove
          canSendEmail={isAdmin || isOwner}
          officialPdfReady={memo.pdfStatus === 'READY' && memo.pdfArtifacts.length > 0}
          canReuseMemoActions={isAdmin || isOwner}
          emailSendCount={memo._count.emailDeliveries}
        />

        <ApprovalWorkflowPanel
          memoId={memo.id}
          approvalStatus={memo.approvalStatus}
          pdfStatus={memo.pdfStatus}
          canSubmit={canSubmit}
          isCurrentApprover={Boolean(isCurrentApprover)}
          memoTypeName={memo.memoType?.name ?? null}
          approvalSignatures={currentUser.approvalSignatures.map((signature) => ({
            id: signature.id,
            name: signature.name,
            type: signature.type,
            data: signature.data,
            isDefault: signature.isDefault,
          }))}
        />

        {latestRound && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Approval Timeline</h2><p className="text-xs text-slate-500">รอบที่ {latestRound.roundNumber} · Snapshot ผู้อนุมัติของเอกสารฉบับนี้</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{latestRound.status}</span></div>
            <div className="mt-5 space-y-3">{latestRound.steps.map((step, index) => <div key={step.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-start gap-3"><div className={`grid h-9 w-9 place-items-center rounded-full ${step.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : step.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : step.status === 'REVISION_REQUESTED' ? 'bg-violet-100 text-violet-700' : step.status === 'SKIPPED_SELF' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-500'}`}>{step.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4"/> : step.status === 'PENDING' ? <Clock3 className="h-4 w-4"/> : step.status === 'REVISION_REQUESTED' ? <RotateCcw className="h-4 w-4"/> : step.status === 'SKIPPED_SELF' ? <SkipForward className="h-4 w-4"/> : <CircleDashed className="h-4 w-4"/>}</div><div className="pb-3"><div className="font-bold">{index + 1}. {step.approverNameSnapshot}</div><div className="text-xs text-slate-500">{step.approverPositionSnapshot ?? 'ไม่ระบุตำแหน่ง'} · {step.source}</div>{step.actedAt && <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-400"><Clock3 className="h-3 w-3"/><span>{formatBangkokShort(step.actedAt)}</span></div>}{step.decisionReason && <div className="mt-2 rounded-lg bg-violet-50 p-2 text-sm text-violet-800 dark:bg-violet-950/30 dark:text-violet-200">เหตุผล: {step.decisionReason}</div>}</div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{step.status}</span></div>)}</div>
          </section>
        )}

        {/* Status Badge - Hidden in Print */}
        {['DRAFT', 'CANCELLED', 'REVISION_REQUESTED'].includes(memo.status) && (
          <div className={`mb-6 p-4 rounded-lg font-semibold text-sm text-center print:hidden shadow-sm ${
            memo.status === 'DRAFT'
              ? 'bg-amber-50 text-amber-900 border border-amber-300' 
              : memo.status === 'REVISION_REQUESTED'
                ? 'bg-violet-50 text-violet-900 border border-violet-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}>
            {memo.status === 'DRAFT' && (memo.memoTypeId
              ? 'นี่คือเอกสารแบบร่าง — ตรวจสอบความถูกต้องและส่งเข้าสู่ระบบอนุมัติเมื่อพร้อม'
              : 'นี่คือเอกสารแบบร่าง — กำหนดผู้อนุมัติเองใน Signatures แล้วส่งเข้าสู่ระบบอนุมัติเมื่อพร้อม')}
            {memo.status === 'REVISION_REQUESTED' && 'ผู้อนุมัติส่งเอกสารกลับให้แก้ไข กรุณาตรวจเหตุผลใน Approval Timeline แล้วส่งอนุมัติใหม่'}
            {memo.status === 'CANCELLED' && 'เอกสารนี้ถูกยกเลิกแล้ว'}
          </div>
        )}

        {/* Responsive A4 Paper Container with Auto-Pagination */}
        <div className="w-full min-w-0 overflow-visible pb-8 print:pb-0 print:block print:w-auto print:m-0 print:p-0">
          <MemoDocumentPagination
            memo={memo}
            thaiDateStr={thaiDateStr}
            displayLogoUrl={displayLogoUrl}
            displaySubHeader={displaySubHeader}
            signatures={signatures}
          />
        </div>

        {memo.attachments.length > 0 && <AttachmentDocumentPreview memoId={memo.id} attachments={memo.attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
        }))} />}
      </div>
    </div>
  );
}
