'use client';
import { useState } from 'react';
import { Clock3, Mail, MailCheck, Save } from 'lucide-react';

type Props = { email: string | null; initialEmail: boolean; initialMode: string; initialDigestTime: string };
export function NotificationPreferences({ email, initialEmail, initialMode, initialDigestTime }: Props) {
  const [emailAddress, setEmailAddress] = useState(email ?? '');
  const [enabled, setEnabled] = useState(initialEmail);
  const [mode, setMode] = useState(initialMode === 'DIGEST' ? 'DIGEST' : 'IMMEDIATE');
  const [digestTime, setDigestTime] = useState(initialDigestTime || '16:00');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true); setMessage('');
    const response = await fetch('/api/e-approve/notification-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailAddress, approvalEmailEnabled: enabled, approvalEmailMode: mode, approvalEmailDigestTime: digestTime }) });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? 'บันทึกการแจ้งเตือนแล้ว' : body.error ?? 'บันทึกไม่สำเร็จ'); setSaving(false);
  };
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="space-y-4 p-5 md:p-6">
      <label className="block text-sm font-semibold">อีเมลสำหรับรับการแจ้งเตือน <span className="text-rose-600">*</span><input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="name@company.com" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950"/><span className="mt-1.5 block text-xs font-normal text-slate-500">คุณสามารถกำหนดหรือเปลี่ยนอีเมลรับแจ้งเตือนได้ด้วยตนเอง</span></label>
      <label className="flex items-center justify-between rounded-xl border p-3 text-sm font-semibold dark:border-slate-700"><span className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600"/>เปิดรับอีเมลแจ้งเตือนงานอนุมัติ</span><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-blue-600"/></label>
      <label className={`block rounded-xl border p-3 ${mode === 'DIGEST' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'dark:border-slate-700'}`}><span className="flex items-start gap-3"><input type="radio" checked={mode === 'DIGEST'} onChange={() => setMode('DIGEST')} disabled={!enabled} className="mt-1"/><span><b className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-blue-600"/>สรุปวันละครั้ง</b><span className="mt-1 block text-xs leading-5 text-slate-500">รวม Memo ที่ยังรอคุณอนุมัติเป็นอีเมลเดียว พร้อมจำนวนรายการ ณ เวลาที่เลือก</span></span></span>
        <select value={digestTime} onChange={(e) => setDigestTime(e.target.value)} disabled={!enabled || mode !== 'DIGEST'} className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950">{timeOptions().map((v) => <option key={v} value={v}>{v} น.</option>)}</select>
      </label>
      <label className={`block rounded-xl border p-3 ${mode === 'IMMEDIATE' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'dark:border-slate-700'}`}><span className="flex items-start gap-3"><input type="radio" checked={mode === 'IMMEDIATE'} onChange={() => setMode('IMMEDIATE')} disabled={!enabled} className="mt-1"/><span><b className="flex items-center gap-2 text-sm"><MailCheck className="h-4 w-4 text-blue-600"/>แจ้งทันทีทุกฉบับ</b><span className="mt-1 block text-xs leading-5 text-slate-500">ส่งอีเมลทุกครั้งที่ Memo ถึงคิวของคุณ และเตือนอีกครั้งเวลา 09:00 น. ของวันถัดไปหากยังค้าง</span></span></span></label>
      <p className="text-xs leading-5 text-slate-500">อีเมลไม่มีลิงก์และไม่แสดงรายละเอียดลับ กรุณาเข้าระบบ E‑Approve ผ่านช่องทางภายในองค์กรเพื่อตรวจสอบงาน</p>
      {message && <p className="text-xs font-bold text-blue-600">{message}</p>}
      <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4"/>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
    </div>
  </section>;
}
function timeOptions() { const values: string[] = []; for (let h = 8; h <= 18; h += 1) { values.push(`${String(h).padStart(2, '0')}:00`); if (h < 18) values.push(`${String(h).padStart(2, '0')}:30`); } return values; }
