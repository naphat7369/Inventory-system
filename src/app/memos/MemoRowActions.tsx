"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Download, Eye, Loader2, Pencil, Printer, Trash2, X } from 'lucide-react';
import { DeleteMemoModal } from './DeleteMemoModal';
import { MemoEmailAction } from './MemoEmailAction';

interface MemoRowActionsProps {
  memoId: string;
  documentNo?: string | null;
  subject: string;
  status: string;
  canDelete: boolean;
  canRequestPdf: boolean;
  pdfStatus: string;
  canSendEmail: boolean;
  officialPdfReady: boolean;
  emailSendCount?: number;
}

const actionClass = 'inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300 sm:h-8 sm:w-8 sm:rounded-md';
const disabledActionClass = 'inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 sm:h-8 sm:w-8 sm:rounded-md';

export function MemoRowActions({
  memoId,
  documentNo,
  subject,
  status,
  canDelete,
  canRequestPdf,
  pdfStatus,
  canSendEmail,
  officialPdfReady,
  emailSendCount = 0,
}: MemoRowActionsProps) {
  const router = useRouter();
  const [pdfOpen, setPdfOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [requestingPdf, setRequestingPdf] = useState(false);
  const pdfFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!pdfOpen && !deleteOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPdfOpen(false);
        setDeleteOpen(false);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [pdfOpen, deleteOpen]);

  useEffect(() => {
    if (!canRequestPdf || !['PENDING', 'GENERATING'].includes(pdfStatus)) return;
    const timer = window.setInterval(() => router.refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [canRequestPdf, pdfStatus, router]);

  const requestPdf = async () => {
    setRequestingPdf(true);
    try {
      const response = await fetch(`/api/memos/${memoId}/request-pdf`, { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ไม่สามารถสร้าง Official PDF ได้');
      router.refresh();
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : 'ไม่สามารถสร้าง Official PDF ได้');
    } finally {
      setRequestingPdf(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-0.5" role="group" aria-label={`การจัดการ Memo ${documentNo || subject}`}>
        <Link href={`/memos/${memoId}`} className={actionClass} title="พรีวิว Memo" aria-label="พรีวิว Memo">
          <Pencil size={17} strokeWidth={1.9} />
        </Link>

        {officialPdfReady ? (
          <button type="button" onClick={() => setPdfOpen(true)} className={actionClass} title="Preview Official PDF" aria-label="Preview Official PDF">
            <Eye size={18} strokeWidth={1.9} />
          </button>
        ) : canRequestPdf && !['PENDING', 'GENERATING'].includes(pdfStatus) ? (
          <button type="button" onClick={() => void requestPdf()} disabled={requestingPdf} className={actionClass} title="สร้าง Official PDF เพื่อพรีวิว" aria-label="สร้าง Official PDF เพื่อพรีวิว">
            {requestingPdf ? <Loader2 size={17} className="animate-spin" /> : <Eye size={18} strokeWidth={1.9} />}
          </button>
        ) : canRequestPdf && ['PENDING', 'GENERATING'].includes(pdfStatus) ? (
          <button type="button" disabled className={disabledActionClass} title="กำลังสร้าง Official PDF" aria-label="กำลังสร้าง Official PDF">
            <Loader2 size={17} className="animate-spin" />
          </button>
        ) : (
          <button type="button" disabled className={disabledActionClass} title="Official PDF ยังไม่พร้อม" aria-label="Official PDF ยังไม่พร้อม">
            <Eye size={18} strokeWidth={1.9} />
          </button>
        )}

        <MemoEmailAction memoId={memoId} documentNo={documentNo} subject={subject} initialSendCount={emailSendCount} disabled={!canSendEmail} />

        {canDelete && (
          <button type="button" onClick={() => setDeleteOpen(true)} className={`${actionClass} hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300`} title="ลบ Memo" aria-label="ลบ Memo">
            <Trash2 size={17} strokeWidth={1.9} />
          </button>
        )}
        {!canDelete && (
          <button type="button" disabled className={disabledActionClass} title="เอกสารที่ออกเลขแล้วไม่สามารถลบได้" aria-label="ไม่สามารถลบ Memo ที่ออกเลขแล้ว">
            <Trash2 size={17} strokeWidth={1.9} />
          </button>
        )}
      </div>

      {deleteOpen && typeof document !== 'undefined' && createPortal(
        <DeleteMemoModal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onSuccess={() => { setDeleteOpen(false); router.refresh(); }}
          onError={(message) => window.alert(message)}
          memoId={memoId}
          documentNo={documentNo}
          status={status}
          subject={subject}
        />,
        document.body,
      )}

      {pdfOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setPdfOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby={`pdf-title-${memoId}`} className="flex h-[calc(100vh-1rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:h-[calc(100vh-2rem)]">
            <header className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <h2 id={`pdf-title-${memoId}`} className="truncate text-base font-bold text-slate-900 dark:text-white">Official PDF Preview</h2>
                <p className="mt-0.5 truncate text-xs text-slate-500">{documentNo || 'ยังไม่ออกเลข'} · {subject}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => pdfFrameRef.current?.contentWindow?.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" title="พิมพ์ PDF">
                  <Printer className="h-4 w-4" /> <span className="hidden sm:inline">พิมพ์</span>
                </button>
                <a href={`/api/memos/${memoId}/official-pdf`} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800" title="ดาวน์โหลด Official PDF">
                  <Download className="h-4 w-4" /> <span className="hidden sm:inline">ดาวน์โหลด PDF</span>
                </a>
                <button type="button" onClick={() => setPdfOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="ปิด Preview PDF">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 bg-slate-700 p-1 sm:p-3">
              <iframe ref={pdfFrameRef} src={`/api/memos/${memoId}/official-pdf?view=1`} title={`Official PDF ${documentNo || subject}`} className="h-full w-full rounded-md border-0 bg-white" />
            </div>
          </section>
        </div>,
        document.body,
      )}

    </>
  );
}
