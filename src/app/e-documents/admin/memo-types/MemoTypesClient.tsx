'use client';

import { useMemo, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { canApproveInBranch } from '@/lib/edocuments/chain';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowDown, ArrowUp, Building2, CheckCircle2,
  FilePlus2, FileType2, Loader2, Mail, Pencil, Plus, Save, Trash2, UserRoundCheck,
} from 'lucide-react';

type Branch = { id: string; name: string; code: string };
type User = {
  id: string; fullName: string | null; username: string; position: string | null;
  branchId: string | null; isAllBranches: boolean; approvalBranchIds: string[]; isApprover: boolean; isReviewer: boolean;
  branch: { name: string; code: string } | null;
};
type ExistingApprover = User & { isActive: boolean; isApprover: boolean };
type Item = {
  id: string; name: string; code: string; description: string | null; branchId: string | null;
  isActive: boolean; sendPdfToIt: boolean;
  branch: { name: string; code: string } | null;
  requiredApprovers: Array<{ approverId: string; stepType: string; approver: ExistingApprover }>;
  filterPermissions: Array<{ userId: string; user: { id: string; username: string; fullName: string | null } }>;
};
type SummaryItem = {
  id: string; name: string; code: string; isActive: boolean; sendPdfToIt: boolean;
  branch: { name: string; code: string } | null;
  _count: { requiredApprovers: number; filterPermissions: number; memos: number };
};

export function MemoTypesClient({ memoTypes, branches }: { memoTypes: SummaryItem[]; branches: Branch[] }) {
  const router = useRouter();
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
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCreateError(body.error ?? 'ไม่สามารถสร้างประเภท Memo ได้');
      return;
    }
    router.push(`/e-documents/admin/memo-types/${body.id}`);
  };

  const activeCount = memoTypes.filter((item) => item.isActive).length;
  const ruleCount = memoTypes.reduce((sum, item) => sum + item._count.requiredApprovers, 0);

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
          <div><h2 className="font-bold">เพิ่มประเภท Memo</h2><p className="text-xs text-slate-500">เมื่อสร้างแล้ว ระบบจะเปิดหน้าแก้ไข Workflow ของ Type นั้นทันที</p></div>
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

      <div className="grid gap-4 lg:grid-cols-2">
        {memoTypes.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold">{item.name}</h2><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.code}</span></div><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Building2 className="h-3.5 w-3.5"/>{item.branch ? `${item.branch.name} (${item.branch.code})` : 'ทุกสาขา'}</span><span className={`rounded-full px-2.5 py-1 font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></div></div><Link href={`/e-documents/admin/memo-types/${item.id}`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"><Pencil className="h-4 w-4"/>แก้ไข</Link></div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center dark:border-slate-800"><Summary label="Workflow" value={item._count.requiredApprovers}/><Summary label="สิทธิ์ Filter" value={item._count.filterPermissions}/><Summary label="Memo" value={item._count.memos}/></div></article>)}
        {!memoTypes.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"><FileType2 className="mx-auto h-10 w-10 text-slate-300"/><h2 className="mt-3 font-bold">ยังไม่มีประเภท Memo</h2><p className="mt-1 text-sm text-slate-500">เพิ่มประเภทแรกจากแบบฟอร์มด้านบน</p></div>}
      </div>
    </div>
  );
}

export function MemoTypeEditor({ item, branches, users }: { item: Item; branches: Branch[]; users: User[] }) {
  const eligibleUsers = users.filter((user) => (user.isApprover || user.isReviewer) && (item.branchId
    ? canApproveInBranch(user, item.branchId)
    : true));
  return <div className="mt-6 space-y-5"><MemoTypeSettings item={item} branches={branches}/><ApproverOrder item={item} eligibleUsers={eligibleUsers} allUsers={users}/></div>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div><div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{value}</div><div className="text-[11px] font-semibold text-slate-500">{label}</div></div>;
}

function MemoTypeSettings({ item, branches }: { item: Item; branches: Branch[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/memo-types/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'), code: data.get('code'), description: data.get('description') || null,
        branchId: data.get('branchId') || null, sendPdfToIt: data.get('sendPdfToIt') === 'on',
        isActive: data.get('isActive') === 'on',
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return setMessage({ type: 'error', text: body.error ?? 'บันทึกข้อมูล Memo Type ไม่สำเร็จ' });
    setMessage({ type: 'success', text: 'บันทึกข้อมูล Memo Type แล้ว' });
    router.refresh();
  };
  return <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950"><FileType2 className="h-5 w-5"/></span><div><h2 className="font-bold">ข้อมูล Memo Type</h2><p className="text-xs text-slate-500">ชื่อ รหัส สถานะ และขอบเขตสาขา</p></div></div><div className="grid gap-3 md:grid-cols-2"><Field label="ชื่อประเภท Memo" required><input required name="name" defaultValue={item.name} className={inputClass}/></Field><Field label="รหัส" required><input required name="code" defaultValue={item.code} className={inputClass}/></Field><Field label="ขอบเขตสาขา"><select name="branchId" defaultValue={item.branchId ?? ''} className={inputClass}><option value="">ทุกสาขา</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}</select></Field><Field label="รายละเอียด"><input name="description" defaultValue={item.description ?? ''} className={inputClass}/></Field></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isActive" defaultChecked={item.isActive} className="h-4 w-4 accent-blue-600"/>เปิดใช้งาน</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="sendPdfToIt" defaultChecked={item.sendPdfToIt} className="h-4 w-4 accent-blue-600"/><Mail className="h-4 w-4 text-slate-400"/>ส่ง PDF ให้ IT</label></div><div className="flex items-center gap-3">{message && <span className={`text-sm font-semibold ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{message.text}</span>}<button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button></div></div></form>;
}

function ApproverOrder({ item, eligibleUsers, allUsers }: { item: Item; eligibleUsers: User[]; allUsers: User[] }) {
  const router = useRouter();
  const initialSteps = item.requiredApprovers.map((rule) => ({ userId: rule.approverId, stepType: rule.stepType === 'REVIEWER' ? 'REVIEWER' as const : 'APPROVER' as const }));
  const initialFilterIds = item.filterPermissions.map((permission) => permission.userId);
  const [steps, setSteps] = useState(initialSteps);
  const [filterUserIds, setFilterUserIds] = useState(initialFilterIds);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const existingById = useMemo(() => new Map(item.requiredApprovers.map((rule) => [rule.approverId, rule.approver])), [item.requiredApprovers]);
  const eligibleById = useMemo(() => new Map(eligibleUsers.map((user) => [user.id, user])), [eligibleUsers]);
  const dirty = JSON.stringify(steps) !== JSON.stringify(initialSteps) || filterUserIds.join('|') !== initialFilterIds.join('|');

  const move = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
    setMessage(null);
  };
  const add = () => {
    if (!selectedId || steps.some((step) => step.userId === selectedId)) return;
    const selectedUser = eligibleById.get(selectedId);
    setSteps([...steps, { userId: selectedId, stepType: selectedUser?.isApprover ? 'APPROVER' : 'REVIEWER' }]);
    setSelectedId('');
    setMessage(null);
  };
  const save = async () => {
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/admin/memo-types/${item.id}/required-approvers`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps, filterUserIds }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage({ type: 'error', text: body.error ?? 'บันทึกลำดับไม่สำเร็จ' });
      return;
    }
    setMessage({ type: 'success', text: 'บันทึกลำดับผู้อนุมัติเรียบร้อยแล้ว' });
    router.refresh();
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
    router.push('/e-documents/admin/memo-types');
    router.refresh();
  };

  const available = eligibleUsers.filter((user) => !steps.some((step) => step.userId === user.id));

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
        <div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold">ลำดับผู้อนุมัติและผู้ตรวจสอบ</h3><p className="text-xs text-slate-500">ผู้ตรวจสอบอนุมัติหรือตีกลับได้โดยไม่ลงลายเซ็น</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{steps.length} ขั้นตอน</span></div>
        <div className="space-y-2">
          {steps.map((step, index) => {
            const id = step.userId;
            const user = eligibleById.get(id) ?? existingById.get(id);
            const valid = eligibleById.has(id) && Boolean(user) && (step.stepType === 'REVIEWER' ? Boolean(user?.isReviewer) : Boolean(user?.isApprover));
            return (
              <div key={id} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center ${valid ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'}`}>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-extrabold text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">{index + 1}</span>
                <div className="min-w-0"><div className="truncate font-bold">{user?.fullName ?? user?.username ?? 'ไม่พบข้อมูลผู้ใช้งาน'}</div><div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-500"><span>@{user?.username ?? 'unknown'}</span>{user?.position && <span>· {user.position}</span>}<span>· {user?.isAllBranches ? 'ทุกสาขา' : user?.branch?.name ?? 'ไม่ระบุสาขา'}</span>{!valid && <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5"/>สิทธิ์หรือขอบเขตสาขาไม่ถูกต้อง กรุณาลบหรือแก้ข้อมูล User</span>}</div></div>
                <div className="flex items-center justify-end gap-1"><select aria-label="ประเภทขั้นตอน" value={step.stepType} onChange={(event) => setSteps(steps.map((value, stepIndex) => stepIndex === index ? { ...value, stepType: event.target.value as 'APPROVER' | 'REVIEWER' } : value))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"><option value="APPROVER" disabled={!user?.isApprover}>ผู้อนุมัติ</option><option value="REVIEWER" disabled={!user?.isReviewer}>ผู้ตรวจสอบ</option></select><IconButton label="เลื่อนขึ้น" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp/></IconButton><IconButton label="เลื่อนลง" disabled={index === steps.length - 1} onClick={() => move(index, 1)}><ArrowDown/></IconButton><IconButton label="นำออก" danger onClick={() => { setSteps(steps.filter((value) => value.userId !== id)); setMessage(null); }}><Trash2/></IconButton></div>
              </div>
            );
          })}
          {!steps.length && <div className="rounded-xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500 dark:border-slate-700">ยังไม่มีขั้นตอน กรุณาเลือกผู้ใช้งานด้านล่าง</div>}
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 sm:flex-row sm:items-center"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={`${inputClass} flex-1`}><option value="">เลือกผู้อนุมัติหรือผู้ตรวจสอบ</option>{available.map((user) => <option value={user.id} key={user.id}>{user.fullName ?? user.username} — {user.isApprover && user.isReviewer ? 'Approver / Reviewer' : user.isApprover ? 'Approver' : 'Reviewer'} — {user.position ?? 'ไม่ระบุตำแหน่ง'} ({user.isAllBranches ? 'ทุกสาขา' : user.branch?.name ?? 'ไม่ระบุสาขา'})</option>)}</select><button type="button" onClick={add} disabled={!selectedId} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"><Plus className="h-4 w-4"/>เพิ่มเข้า Workflow</button></div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="font-bold">สิทธิ์ Filter Memo type นี้</h3><p className="mb-3 text-xs text-slate-500">ผู้ใช้ที่เลือกจะเห็น Memo type นี้ในตัวกรองกล่องงานอนุมัติ กด Ctrl เพื่อเลือกหลายคน</p><select multiple value={filterUserIds} onChange={(event) => setFilterUserIds(Array.from(event.target.selectedOptions, (option) => option.value))} className="min-h-36 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950">{allUsers.filter((user) => user.isApprover || user.isReviewer).map((user) => <option key={user.id} value={user.id}>{user.fullName ?? user.username} (@{user.username}) — {user.isApprover && user.isReviewer ? 'Approver / Reviewer' : user.isApprover ? 'Approver' : 'Reviewer'}</option>)}</select></div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div className="min-h-5 text-sm">{message && <span className={`inline-flex items-center gap-2 font-semibold ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{message.type === 'success' ? <CheckCircle2 className="h-4 w-4"/> : <AlertTriangle className="h-4 w-4"/>}{message.text}</span>}{!message && dirty && <span className="text-amber-600">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>}</div><button disabled={!steps.length || !dirty || saving} onClick={() => void save()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{saving ? 'กำลังบันทึก...' : 'บันทึก Workflow และสิทธิ์'}</button></div>
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
