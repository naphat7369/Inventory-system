"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientUuid } from '@/lib/uuid';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, Eye, Loader2, Mail, Pencil, Printer, Trash2, X } from 'lucide-react';
import { DeleteMemoModal } from './DeleteMemoModal';

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
}: MemoRowActionsProps) {
  const router = useRouter();
  const [emailOpen, setEmailOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [requestingPdf, setRequestingPdf] = useState(false);
  const pdfFrameRef = useRef<HTMLIFrameElement>(null);
  const emailRequestKeyRef = useRef('');

  useEffect(() => {
    if (!emailOpen && !pdfOpen && !deleteOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEmailOpen(false);
        setPdfOpen(false);
        setDeleteOpen(false);
        setError('');
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [emailOpen, pdfOpen, deleteOpen]);

  useEffect(() => {
    if (!canRequestPdf || !['PENDING', 'GENERATING'].includes(pdfStatus)) return;
    const timer = window.setInterval(() => router.refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [canRequestPdf, pdfStatus, router]);

  const sendEmail = async () => {
    const normalizedRecipient = recipient.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRecipient)) {
      setError('กรุณากรอกอีเมลผู้รับให้ถูกต้อง');
      return;
    }
    setSendingEmail(true);
    setError('');
    setEmailSuccess('');
    const memoUrl = `${window.location.origin}/memos/${memoId}`;
    if (!emailRequestKeyRef.current) emailRequestKeyRef.current = createClientUuid();
    try {
      const response = await fetch(`/api/memos/${memoId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: normalizedRecipient,
          message,
          memoUrl,
          idempotencyKey: emailRequestKeyRef.current,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ส่ง E-Mail ไม่สำเร็จ');
      setEmailSuccess(body.status === 'SENT' ? 'ส่ง E-Mail เรียบร้อยแล้ว' : 'รับงานส่ง E-Mail แล้ว ระบบกำลังดำเนินการ');
      setMessage('');
      emailRequestKeyRef.current = '';
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'ส่ง E-Mail ไม่สำเร็จ');
    } finally {
      setSendingEmail(false);
    }
  };

  const requestPdf = async () => {
    setRequestingPdf(true);
    setError('');
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

        {canSendEmail ? (
          <button type="button" onClick={() => setEmailOpen(true)} className={actionClass} title="ส่ง E-Mail" aria-label="ส่ง E-Mail">
            <Mail size={18} strokeWidth={1.9} />
          </button>
        ) : (
          <button type="button" disabled className={disabledActionClass} title="ไม่สามารถส่ง E-Mail สำหรับ Memo นี้ได้" aria-label="ไม่สามารถส่ง E-Mail สำหรับ Memo นี้ได้">
            <Mail size={18} strokeWidth={1.9} />
          </button>
        )}

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

      {emailOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) { setEmailOpen(false); setError(''); } }}>
          <div role="dialog" aria-modal="true" aria-labelledby={`email-title-${memoId}`} className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto whitespace-normal rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`email-title-${memoId}`} className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Mail className="h-4 w-4 text-sky-600" /> ส่ง Memo ทางอีเมล
                </h2>
                <p className="mt-1 text-xs text-slate-500">ระบบจะส่ง E-Mail และแนบ Official PDF ให้ผู้รับโดยอัตโนมัติ</p>
              </div>
              <button type="button" onClick={() => { setEmailOpen(false); setError(''); setEmailSuccess(''); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="ปิด">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="min-w-0">
                <label htmlFor={`email-recipient-${memoId}`} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">อีเมลผู้รับ <span className="text-rose-500">*</span></label>
                <input id={`email-recipient-${memoId}`} type="email" autoFocus value={recipient} onChange={(event) => { setRecipient(event.target.value); setError(''); setEmailSuccess(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void sendEmail(); } }} placeholder="name@company.com" className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-sky-950" />
              </div>
              <div className="min-w-0">
                <label htmlFor={`email-message-${memoId}`} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">ข้อความเพิ่มเติม</label>
                <textarea id={`email-message-${memoId}`} value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="ระบุข้อความถึงผู้รับ (ถ้ามี)" className="mt-2 block w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-normal outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-sky-950" />
              </div>
              {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
              {emailSuccess && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4"/>{emailSuccess}</p>}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Official PDF จะถูกแนบไปกับ E-Mail โดยอัตโนมัติ และสามารถตรวจสอบสถานะได้ที่ Audit Logs & Operations
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="button" disabled={sendingEmail} onClick={() => { setEmailOpen(false); setError(''); setEmailSuccess(''); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">ยกเลิก</button>
              <button type="button" disabled={sendingEmail} onClick={() => void sendEmail()} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60">
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {sendingEmail ? 'กำลังส่ง...' : 'ส่ง E-Mail'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
