'use client';

import { useMemo, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, Building2, CheckCircle2,
  FilePlus2, FileType2, Loader2, Mail, Plus, Save, Trash2, UserRoundCheck,
} from 'lucide-react';

type Branch = { id: string; name: string; code: string };
type User = {
  id: string; fullName: string | null; username: string; position: string | null;
  branchId: string | null; isAllBranches: boolean;
  branch: { name: string; code: string } | null;
};
type ExistingApprover = User & { isActive: boolean; isApprover: boolean };
type Item = {
  id: string; name: string; code: string; branchId: string | null;
  isActive: boolean; sendPdfToIt: boolean;
  branch: { name: string; code: string } | null;
  requiredApprovers: Array<{ approverId: string; approver: ExistingApprover }>;
};

export function MemoTypesClient({ memoTypes, branches, users }: { memoTypes: Item[]; branches: Branch[]; users: User[] }) {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch('/api/admin/memo-types', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'), code: data.get('code'),
        branchId: data.get('branchId') || null,
        sendPdfToIt: data.get('sendPdfToIt') === 'on',
      }),
    });
    setCreating(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setCreateError(body.error ?? 'ไม่สามารถสร้างประเภท Memo ได้');
      return;
    }
    form.reset();
    location.reload();
  };

  const activeCount = memoTypes.filter((item) => item.isActive).length;
  const ruleCount = memoTypes.reduce((sum, item) => sum + item.requiredApprovers.length, 0);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<FileType2 />} label="ประเภท Memo ทั้งหมด" value={memoTypes.length} />
        <Stat icon={<CheckCircle2 />} label="กำลังใช้งาน" value={activeCount} tone="emerald" />
        <Stat icon={<UserRoundCheck />} label="Required Approver Rules" value={ruleCount} tone="indigo" />
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950"><FilePlus2 className="h-5 w-5"/></span>
          <div><h2 className="font-bold">เพิ่มประเภท Memo</h2><p className="text-xs text-slate-500">กำหนดข้อมูลพื้นฐานก่อน แล้วจึงเพิ่มผู้อนุมัติด้านล่าง</p></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_220px_auto_auto] lg:items-end">
          <Field label="ชื่อประเภท Memo" required><input required name="name" placeholder="เช่น Memo-Clearcard" className={inputClass}/></Field>
          <Field label="รหัส" required><input required name="code" placeholder="เช่น CLEARCARD" className={inputClass}/></Field>
          <Field label="ขอบเขตสาขา"><select name="branchId" className={inputClass}><option value="">ทุกสาขา</option>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name} ({branch.code})</option>)}</select></Field>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-slate-700"><input type="checkbox" name="sendPdfToIt" className="h-4 w-4 accent-blue-600"/><Mail className="h-4 w-4 text-slate-400"/> ส่ง PDF ให้ IT</label>
          <button disabled={creating} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">{creating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}{creating ? 'กำลังเพิ่ม...' : 'เพิ่มประเภท'}</button>
        </div>
        {createError && <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-semibold text-rose-600"><AlertTriangle className="h-4 w-4"/>{createError}</p>}
      </form>

      <div className="space-y-4">
        {memoTypes.map((item) => {
          const eligibleUsers = users.filter((user) => item.branchId
            ? (user.isAllBranches || user.branchId === item.branchId)
            : user.isAllBranches);
          return <ApproverOrder key={item.id} item={item} eligibleUsers={eligibleUsers}/>;
        })}
        {!memoTypes.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"><FileType2 className="mx-auto h-10 w-10 text-slate-300"/><h2 className="mt-3 font-bold">ยังไม่มีประเภท Memo</h2><p className="mt-1 text-sm text-slate-500">เพิ่มประเภทแรกจากแบบฟอร์มด้านบน</p></div>}
      </div>
    </div>
  );
}

function ApproverOrder({ item, eligibleUsers }: { item: Item; eligibleUsers: User[] }) {
  const initialIds = item.requiredApprovers.map((rule) => rule.approverId);
  const [ids, setIds] = useState(initialIds);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const existingById = useMemo(() => new Map(item.requiredApprovers.map((rule) => [rule.approverId, rule.approver])), [item.requiredApprovers]);
  const eligibleById = useMemo(() => new Map(eligibleUsers.map((user) => [user.id, user])), [eligibleUsers]);
  const dirty = ids.join('|') !== initialIds.join('|');

  const move = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    setIds(next);
    setMessage(null);
  };
  const add = () => {
    if (!selectedId || ids.includes(selectedId)) return;
    setIds([...ids, selectedId]);
    setSelectedId('');
    setMessage(null);
  };
  const save = async () => {
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/admin/memo-types/${item.id}/required-approvers`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverIds: ids }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage({ type: 'error', text: body.error ?? 'บันทึกลำดับไม่สำเร็จ' });
      return;
    }
    setMessage({ type: 'success', text: 'บันทึกลำดับผู้อนุมัติเรียบร้อยแล้ว' });
    setTimeout(() => location.reload(), 700);
  };

  const removeMemoType = async () => {
    setDeleting(true);
    setMessage(null);
    const response = await fetch(`/api/admin/memo-types/${item.id}`, { method: 'DELETE' });
    setDeleting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage({ type: 'error', text: body.error ?? 'ไม่สามารถลบประเภท Memo ได้' });
      setConfirmDelete(false);
      return;
    }
    location.reload();
  };

  const available = eligibleUsers.filter((user) => !ids.includes(user.id));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{item.name}</h2><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.code}</span></div><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Building2 className="h-3.5 w-3.5"/>{item.branch ? `${item.branch.name} (${item.branch.code})` : 'ทุกสาขา'}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${item.sendPdfToIt ? 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}><Mail className="h-3.5 w-3.5"/>{item.sendPdfToIt ? 'ส่ง PDF ให้ IT' : 'ไม่ส่ง PDF ให้ IT'}</span></div></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{item.isActive ? '● Active' : 'Inactive'}</span>
          {confirmDelete ? <><button type="button" onClick={() => void removeMemoType()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60">{deleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}{deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}</button><button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">ยกเลิก</button></> : <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950"><Trash2 className="h-4 w-4"/>ลบประเภท</button>}
        </div>
      </header>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold">ลำดับ Required Approvers</h3><p className="text-xs text-slate-500">ระบบจะดำเนินการจากลำดับบนลงล่าง และ Deduplicate กับ HOD/GM อัตโนมัติ</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{ids.length} ขั้นตอน</span></div>
        <div className="space-y-2">
          {ids.map((id, index) => {
            const user = eligibleById.get(id) ?? existingById.get(id);
            const valid = eligibleById.has(id) && Boolean(user);
            return (
              <div key={id} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center ${valid ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'}`}>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-extrabold text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">{index + 1}</span>
                <div className="min-w-0"><div className="truncate font-bold">{user?.fullName ?? user?.username ?? 'ไม่พบข้อมูลผู้ใช้งาน'}</div><div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-500"><span>@{user?.username ?? 'unknown'}</span>{user?.position && <span>· {user.position}</span>}<span>· {user?.isAllBranches ? 'ทุกสาขา' : user?.branch?.name ?? 'ไม่ระบุสาขา'}</span>{!valid && <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5"/>สิทธิ์หรือขอบเขตสาขาไม่ถูกต้อง กรุณาลบหรือแก้ข้อมูล User</span>}</div></div>
                <div className="flex items-center justify-end gap-1"><IconButton label="เลื่อนขึ้น" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp/></IconButton><IconButton label="เลื่อนลง" disabled={index === ids.length - 1} onClick={() => move(index, 1)}><ArrowDown/></IconButton><IconButton label="นำออก" danger onClick={() => { setIds(ids.filter((value) => value !== id)); setMessage(null); }}><Trash2/></IconButton></div>
              </div>
            );
          })}
          {!ids.length && <div className="rounded-xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500 dark:border-slate-700">ยังไม่มี Required Approver กรุณาเลือกผู้อนุมัติด้านล่าง</div>}
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 sm:flex-row sm:items-center"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={`${inputClass} flex-1`}><option value="">เลือกผู้อนุมัติที่ต้องการเพิ่ม</option>{available.map((user) => <option value={user.id} key={user.id}>{user.fullName ?? user.username} — {user.position ?? 'ไม่ระบุตำแหน่ง'} ({user.isAllBranches ? 'ทุกสาขา' : user.branch?.name ?? 'ไม่ระบุสาขา'})</option>)}</select><button type="button" onClick={add} disabled={!selectedId} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"><Plus className="h-4 w-4"/>เพิ่มผู้อนุมัติ</button></div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div className="min-h-5 text-sm">{message && <span className={`inline-flex items-center gap-2 font-semibold ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{message.type === 'success' ? <CheckCircle2 className="h-4 w-4"/> : <AlertTriangle className="h-4 w-4"/>}{message.text}</span>}{!message && dirty && <span className="text-amber-600">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>}</div><button disabled={!ids.length || !dirty || saving} onClick={() => void save()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{saving ? 'กำลังบันทึก...' : 'บันทึกลำดับ'}</button></div>
      </div>
    </section>
  );
}

function Stat({ icon, label, value, tone = 'blue' }: { icon: ReactNode; label: string; value: number; tone?: 'blue' | 'emerald' | 'indigo' }) {
  const colors = { blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950', emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950', indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950' };
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className={`grid h-11 w-11 place-items-center rounded-xl ${colors[tone]}`}>{icon}</span><div><div className="text-2xl font-extrabold">{value}</div><div className="text-xs font-semibold text-slate-500">{label}</div></div></div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>{children}</label>;
}

function IconButton({ label, disabled, danger, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: ReactElement<{ className?: string }> }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`grid h-9 w-9 place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30 ${danger ? 'text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950' : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-900'}`}>{children}</button>;
}

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950';
