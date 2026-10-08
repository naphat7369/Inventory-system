"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Mail, Send, X } from 'lucide-react';
import { createClientUuid } from '@/lib/uuid';

interface MemoEmailActionProps {
  memoId: string;
  documentNo?: string | null;
  subject: string;
  initialSendCount?: number;
  variant?: 'icon' | 'button';
  disabled?: boolean;
}

interface SendResult {
  recipient: string;
  status: string;
  sendCount: number;
}

const iconButtonClass = 'relative inline-flex h-10 w-10 items-center justify-center overflow-visible rounded-lg text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300 sm:h-8 sm:w-8 sm:rounded-md';
const disabledIconButtonClass = 'relative inline-flex h-10 w-10 cursor-not-allowed items-center justify-center overflow-visible rounded-lg text-slate-300 dark:text-slate-600 sm:h-8 sm:w-8 sm:rounded-md';

export function MemoEmailAction({
  memoId,
  documentNo,
  subject,
  initialSendCount = 0,
  variant = 'icon',
  disabled = false,
}: MemoEmailActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendCount, setSendCount] = useState(initialSendCount);
  const [result, setResult] = useState<SendResult | null>(null);
  const requestKeyRef = useRef('');

  const displayedSendCount = Math.max(sendCount, initialSendCount);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sending) setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, sending]);

  const openDialog = () => {
    if (disabled) return;
    setError('');
    setResult(null);
    setOpen(true);
  };

  const closeDialog = () => {
    if (sending) return;
    setOpen(false);
    setError('');
    setResult(null);
  };

  const sendAnother = () => {
    setResult(null);
    setError('');
    setMessage('');
    requestKeyRef.current = '';
  };

  const sendEmail = async () => {
    const normalizedRecipient = recipient.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRecipient)) {
      setError('กรุณากรอกอีเมลผู้รับให้ถูกต้อง');
      return;
    }

    setSending(true);
    setError('');
    if (!requestKeyRef.current) requestKeyRef.current = createClientUuid();

    try {
      const response = await fetch(`/api/memos/${memoId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: normalizedRecipient,
          message,
          memoUrl: `${window.location.origin}/memos/${memoId}`,
          idempotencyKey: requestKeyRef.current,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ส่ง E-Mail ไม่สำเร็จ');

      const nextCount = typeof body.sendCount === 'number' ? body.sendCount : displayedSendCount + 1;
      setSendCount(nextCount);
      setResult({ recipient: normalizedRecipient, status: body.status || 'PENDING', sendCount: nextCount });
      setMessage('');
      requestKeyRef.current = '';
      router.refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'ส่ง E-Mail ไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  const badge = displayedSendCount > 0 && (
    <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-4.5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-extrabold leading-4 text-white shadow-sm dark:border-slate-900">
      {displayedSendCount > 99 ? '99+' : displayedSendCount}
    </span>
  );
  const title = displayedSendCount > 0 ? `ส่ง E-Mail · ส่งแล้ว ${displayedSendCount} ครั้ง` : 'ส่ง E-Mail';

  return (
    <>
      {variant === 'icon' ? (
        <button type="button" onClick={openDialog} disabled={disabled} className={disabled ? disabledIconButtonClass : iconButtonClass} title={disabled ? 'ไม่สามารถส่ง E-Mail สำหรับ Memo นี้ได้' : title} aria-label={title}>
          <Mail size={18} strokeWidth={1.9} />
          {badge}
        </button>
      ) : (
        <button type="button" onClick={openDialog} disabled={disabled} className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50" title={title}>
          <span className="relative inline-flex">
            <Mail size={18} />
            {badge}
          </span>
          ส่งอีเมล
        </button>
      )}

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby={`email-title-${memoId}`} className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto whitespace-normal rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            {result ? (
              <div className="text-center">
                <button type="button" onClick={closeDialog} className="ml-auto block rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="ปิด">
                  <X className="h-5 w-5" />
                </button>
                <div className="mx-auto mt-1 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-950/40">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h2 id={`email-title-${memoId}`} className="mt-6 text-xl font-extrabold text-slate-900 dark:text-white">รับคำสั่งส่ง E-Mail แล้ว</h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">{documentNo || subject}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">ระบบกำลังส่ง Official PDF ให้ผู้รับโดยอัตโนมัติ คุณสามารถปิดหน้าต่างนี้ได้ทันที</p>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">ส่งถึง</p>
                      <p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-white">{result.recipient}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-sky-700 dark:bg-sky-950 dark:text-sky-300">ครั้งที่ {result.sendCount}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-semibold text-emerald-700 dark:border-slate-700 dark:text-emerald-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    {result.status === 'SENT' ? 'ส่งสำเร็จแล้ว' : 'อยู่ในคิวจัดส่ง'}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={sendAnother} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">ส่งอีกครั้ง</button>
                  <button type="button" onClick={closeDialog} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700">เสร็จสิ้น</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id={`email-title-${memoId}`} className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><Mail className="h-4 w-4 text-sky-600" />ส่ง Memo ทางอีเมล</h2>
                    <p className="mt-1 text-xs text-slate-500">{documentNo || subject} · ระบบจะแนบ Official PDF โดยอัตโนมัติ</p>
                  </div>
                  <button type="button" onClick={closeDialog} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="ปิด"><X className="h-4 w-4" /></button>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor={`email-recipient-${memoId}`} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">อีเมลผู้รับ <span className="text-rose-500">*</span></label>
                    <input id={`email-recipient-${memoId}`} type="email" autoFocus value={recipient} onChange={(event) => { setRecipient(event.target.value); setError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void sendEmail(); } }} placeholder="name@company.com" className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-sky-950" />
                  </div>
                  <div>
                    <label htmlFor={`email-message-${memoId}`} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">ข้อความเพิ่มเติม</label>
                    <textarea id={`email-message-${memoId}`} value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="ระบุข้อความถึงผู้รับ (ถ้ามี)" className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-sky-950" />
                  </div>
                  {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Official PDF จะถูกแนบไปกับ E-Mail โดยอัตโนมัติ และตรวจสอบสถานะได้ที่ Audit Logs & Operations</div>
                </div>

                <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button type="button" disabled={sending} onClick={closeDialog} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">ยกเลิก</button>
                  <button type="button" disabled={sending} onClick={() => void sendEmail()} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? 'กำลังส่ง...' : 'ส่ง E-Mail'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
