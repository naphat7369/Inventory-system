'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientUuid } from '@/lib/uuid';
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, Loader2, PenLine, RotateCcw, Send, Star } from 'lucide-react';

type Preview = {
  memoType: { name: string; code: string };
  branch: { name: string; code: string };
  chain: Array<{ approverId: string; approverName: string; approverPosition: string | null; source: string; sources: Array<{ source: string }>; status: string }>;
};

type ApprovalSignature = { id: string; name: string; type: string; data: string; isDefault: boolean };

function SignaturePreview({ signature }: { signature: ApprovalSignature }) {
  return <div className="grid h-24 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700">
    {signature.type === 'TYPED'
      ? <span className="max-w-full truncate px-3 font-serif text-2xl italic text-slate-800">{signature.data}</span>
      // eslint-disable-next-line @next/next/no-img-element
      : <img src={signature.data} alt={`ลายเซ็น ${signature.name}`} className="max-h-full max-w-full object-contain p-2" />}
  </div>;
}

export function ApprovalWorkflowPanel({ memoId, approvalStatus, pdfStatus, canSubmit, isCurrentApprover, memoTypeName, approvalSignatures }: {
  memoId: string; approvalStatus: string; pdfStatus: string; canSubmit: boolean;
  isCurrentApprover: boolean; memoTypeName: string | null; approvalSignatures: ApprovalSignature[];
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [dialog, setDialog] = useState<'submit' | 'approve' | 'revision' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSignatureId, setSelectedSignatureId] = useState(approvalSignatures.find((item) => item.isDefault)?.id ?? approvalSignatures[0]?.id ?? '');

  const openSubmit = async () => {
    if (approvalSignatures.length === 0) {
      setError('กรุณาสร้างลายเซ็นของฉันก่อนส่ง Memo เพื่อใช้ในช่อง “นำเสนอโดย”');
      return;
    }
    setLoading(true); setError('');
    const response = await fetch(`/api/memos/${memoId}/approval-preview`);
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setError(body.error ?? 'ไม่สามารถตรวจสอบสายอนุมัติได้');
    setPreview(body); setDialog('submit');
  };
  const perform = async (action: 'submit' | 'approve' | 'revision') => {
    setLoading(true); setError('');
    try {
      const idempotencyKey = `${action}-${memoId}-${createClientUuid()}`;
      const endpoint = action === 'revision' ? 'request-revision' : action;
      const payload = action === 'approve'
        ? { signatureId: selectedSignatureId, idempotencyKey }
        : action === 'revision' ? { reason, idempotencyKey }
        : { userAddedApproverIds: [], idempotencyKey };
      const response = await fetch(`/api/memos/${memoId}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(body.error ?? 'ดำเนินการไม่สำเร็จ'); return; }
      setDialog(null); setPreview(null); setReason(''); router.refresh();
    } catch (err: any) {
      setError(err?.message ?? 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const statusTone = approvalStatus === 'APPROVED' ? 'emerald' : approvalStatus === 'REVISION_REQUESTED' ? 'violet' : approvalStatus === 'DRAFT' ? 'slate' : 'amber';
  const tones = { emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200', violet: 'bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-200', slate: 'bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200', amber: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200' };

  return <>
    <section className={`mb-6 rounded-2xl border p-5 shadow-sm print:hidden ${tones[statusTone]}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 shadow-sm dark:bg-slate-900/60">{approvalStatus === 'APPROVED' ? <CheckCircle2/> : approvalStatus === 'REVISION_REQUESTED' ? <RotateCcw/> : <Clock3/>}</span><div><h2 className="font-bold">สถานะการอนุมัติ: {approvalStatus}</h2><p className="mt-1 text-xs opacity-75">Memo Type: {memoTypeName ?? 'ยังไม่ได้เลือก'} · PDF: {pdfStatus}</p>{error && <div className="mt-2 text-sm font-bold text-rose-600"><p className="flex items-center gap-1"><AlertTriangle className="h-4 w-4"/>{error}</p>{canSubmit && approvalSignatures.length === 0 && <Link href="/memos/signatures" className="mt-1 inline-block text-blue-600 underline">ไปสร้างลายเซ็นของฉัน</Link>}</div>}</div></div><div className="flex flex-wrap gap-2">{canSubmit && <button type="button" onClick={() => void openSubmit()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}ตรวจสอบและส่งอนุมัติ</button>}{isCurrentApprover && <><button type="button" onClick={() => { setError(''); setDialog('revision'); }} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:bg-slate-900"><RotateCcw className="h-4 w-4"/>ส่งกลับแก้ไข</button><button type="button" onClick={() => { setError(''); setDialog('approve'); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"><FileCheck2 className="h-4 w-4"/>อนุมัติ</button></>}</div></div>
    </section>

    {dialog && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"><div className={`w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${dialog === 'approve' ? 'max-w-2xl' : 'max-w-lg'}`}><h2 className="text-lg font-bold">{dialog === 'submit' ? 'ตรวจสอบสายอนุมัติก่อนส่ง' : dialog === 'approve' ? 'ยืนยันการอนุมัติ' : 'ส่ง Memo กลับให้แก้ไข'}</h2>{dialog === 'submit' && preview && <div className="mt-4"><div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-200"><b>{preview.memoType.name}</b> · {preview.branch.name}</div><div className="mt-3 space-y-2">{preview.chain.map((step, index) => <div key={step.approverId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span><div><div className="font-bold">{step.approverName}</div><div className="text-xs text-slate-500">{step.approverPosition ?? 'ไม่ระบุตำแหน่ง'} · {step.sources.map((source) => source.source).join(', ')}</div></div></div>)}</div></div>}{dialog === 'approve' && <div className="mt-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">เลือกลายเซ็นที่ใช้อนุมัติ</p><p className="text-xs text-slate-500">รายการ Default จะถูกเลือกให้อัตโนมัติ แต่เปลี่ยนได้ทุกครั้ง</p></div><Link href="/memos/signatures" className="shrink-0 text-xs font-bold text-blue-600 hover:underline">จัดการลายเซ็น</Link></div>{approvalSignatures.length === 0 ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800"><PenLine className="mx-auto mb-2 h-6 w-6"/><b>ยังไม่มีลายเซ็นสำหรับอนุมัติ</b><p className="mt-1 text-xs">กรุณาสร้างลายเซ็นและตั้งค่า Default ก่อน</p><Link href="/memos/signatures" className="mt-3 inline-flex rounded-lg bg-amber-600 px-3 py-2 font-bold text-white">ไปตั้งค่าลายเซ็น</Link></div> : <div className="mt-3 grid max-h-[340px] gap-3 overflow-y-auto sm:grid-cols-2">{approvalSignatures.map((signature) => <button key={signature.id} type="button" onClick={() => setSelectedSignatureId(signature.id)} className={`rounded-xl border p-3 text-left transition ${selectedSignatureId === signature.id ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100 dark:bg-emerald-950/20 dark:ring-emerald-950' : 'border-slate-200 hover:border-slate-400 dark:border-slate-700'}`}><div className="mb-2 flex items-center justify-between gap-2"><span className="truncate text-sm font-bold">{signature.name}</span>{signature.isDefault && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700"><Star className="h-3 w-3 fill-current"/>Default</span>}</div><SignaturePreview signature={signature}/></button>)}</div>}<p className="mt-3 text-xs text-slate-500">เมื่อยืนยัน ระบบจะเก็บลายเซ็น ชื่อบัญชี และเวลาไว้ใน Snapshot ของ Step นี้อย่างถาวร</p></div>}{dialog === 'revision' && <div className="mt-4"><label className="mb-1 block text-sm font-bold">เหตุผลที่ส่งกลับ <span className="text-rose-500">*</span></label><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="ระบุสิ่งที่ต้องแก้ไขอย่างชัดเจน" className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-950"/></div>}{error && <p className="mt-3 text-sm font-bold text-rose-600">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={loading} onClick={() => { setDialog(null); setError(''); }} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">ยกเลิก</button><button type="button" disabled={loading || (dialog === 'revision' && reason.trim().length < 3) || (dialog === 'approve' && !selectedSignatureId)} onClick={() => void perform(dialog)} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-50 ${dialog === 'revision' ? 'bg-violet-600 hover:bg-violet-700' : dialog === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading && <Loader2 className="h-4 w-4 animate-spin"/>}{dialog === 'submit' ? 'ยืนยันส่งอนุมัติ' : dialog === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันส่งกลับ'}</button></div></div></div>}
  </>;
}
