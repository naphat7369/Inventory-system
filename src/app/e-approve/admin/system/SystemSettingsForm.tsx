'use client';
import { FormEvent, useState } from 'react';
import { Loader2, Save } from 'lucide-react';

export function SystemSettingsForm({ settings }: { settings: Record<string, unknown> }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setMessage('');
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/e-approve-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      itEmail: data.get('itEmail') || null,
      attachmentMaxFileMb: Number(data.get('attachmentMaxFileMb')),
      attachmentMaxTotalMb: Number(data.get('attachmentMaxTotalMb')),
      emailAttachmentMaxMb: Number(data.get('emailAttachmentMaxMb')),
      eapproveEmailEnabled: data.get('eapproveEmailEnabled') === 'on',
      eapproveCalendarEnabled: data.get('eapproveCalendarEnabled') === 'on',
      eapproveOfficialPdfAutoSendEnabled: data.get('eapproveOfficialPdfAutoSendEnabled') === 'on',
    }) });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? 'บันทึกการตั้งค่าแล้ว' : body.error ?? 'บันทึกไม่สำเร็จ'); setSaving(false);
  };
  return <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
    <section className="space-y-3"><h2 className="font-bold">ช่องทางแจ้งเตือน</h2><Toggle name="eapproveEmailEnabled" label="เปิดใช้งานอีเมล E‑Approve" defaultChecked={settings.eapproveEmailEnabled !== false}/><Toggle name="eapproveCalendarEnabled" label="เปิดใช้งาน Calendar Invitation" defaultChecked={settings.eapproveCalendarEnabled !== false}/><Toggle name="eapproveOfficialPdfAutoSendEnabled" label="ส่ง Official PDF ให้ผู้สร้างอัตโนมัติ" defaultChecked={settings.eapproveOfficialPdfAutoSendEnabled !== false}/><p className="text-xs text-slate-500">Environment kill switch ยังหยุดแต่ละช่องทางฉุกเฉินได้โดยไม่ลบงานออกจากระบบ</p></section>
    <section className="grid gap-4 border-t pt-5 sm:grid-cols-2 dark:border-slate-800"><h2 className="font-bold sm:col-span-2">อีเมลและไฟล์แนบ</h2><label className="block text-sm font-semibold sm:col-span-2">IT Email<input name="itEmail" type="email" defaultValue={String(settings.itEmail ?? '')} className="mt-1 block w-full rounded-lg border px-3 py-2 dark:bg-slate-950"/></label><NumberInput name="emailAttachmentMaxMb" label="ไฟล์แนบอีเมลสูงสุด (MB)" value={Number(settings.emailAttachmentMaxMb ?? 10)} max={100}/><NumberInput name="attachmentMaxFileMb" label="ขนาดเอกสารแนบต่อไฟล์ (MB)" value={Number(settings.attachmentMaxFileMb ?? 20)} max={100}/><NumberInput name="attachmentMaxTotalMb" label="ขนาดเอกสารแนบรวมต่อ Memo (MB)" value={Number(settings.attachmentMaxTotalMb ?? 100)} max={500}/></section>
    {message && <p className="rounded-xl bg-slate-100 p-3 text-sm font-bold dark:bg-slate-800">{message}</p>}<button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}บันทึกการตั้งค่า</button>
  </form>;
}
function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) { return <label className="flex items-center justify-between gap-4 rounded-xl border p-3 text-sm font-semibold dark:border-slate-700"><span>{label}</span><input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 accent-blue-600"/></label>; }
function NumberInput({ name, label, value, max }: { name: string; label: string; value: number; max: number }) { return <label className="block text-sm font-semibold">{label}<input name={name} type="number" min={1} max={max} defaultValue={value} className="mt-1 block w-full rounded-lg border px-3 py-2 dark:bg-slate-950"/></label>; }
