'use client';
import { useState, type FormEvent } from 'react';
import { Building2, CheckCircle2, FileType2, Network, Settings2, ShieldCheck, UsersRound, Workflow } from 'lucide-react';

type Branch = { id: string; name: string; code: string; isActive: boolean; generalManagerId: string | null };
type Department = { id: string; name: string; code: string; branchId: string | null; hodId: string | null };
type User = { id: string; username: string; fullName: string | null; position: string | null; role: string; isActive: boolean; isApprover: boolean; branchId: string | null; departmentId: string | null };
type MemoType = { id: string; name: string; code: string; branchId: string | null; isActive: boolean; sendPdfToIt: boolean; requiredApprovers: Array<{ approverId: string }> };
type Props = { initial: { branches: Branch[]; departments: Department[]; users: User[]; memoTypes: MemoType[]; settings: Record<string, unknown> } };

const inputClass = 'min-h-10 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const buttonClass = 'min-h-10 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 transition';
const cardClass = 'scroll-mt-28 p-5 md:p-6 bg-white/95 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm';

export function EApproveAdminClient({ initial }: Props) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const mutate = async (url: string, method: string, body: unknown) => {
    setBusy(true); setMessage('');
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(result.error ?? 'เกิดข้อผิดพลาด'); return false; }
    window.location.reload(); return true;
  };
  const activeApprovers = initial.users.filter((user) => user.isActive && user.isApprover);

  const createBranch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate('/api/admin/branches', 'POST', { name: data.get('name'), code: data.get('code') }); };
  const createMemoType = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate('/api/admin/memo-types', 'POST', { name: data.get('name'), code: data.get('code'), branchId: data.get('branchId') || null, sendPdfToIt: data.get('sendPdfToIt') === 'on' }); };
  const saveSettings = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate('/api/admin/e-approve-settings', 'PATCH', { itEmail: data.get('itEmail') || null, attachmentMaxFileMb: Number(data.get('attachmentMaxFileMb')), attachmentMaxTotalMb: Number(data.get('attachmentMaxTotalMb')) }); };

  return <main className="min-h-full bg-slate-50/60 dark:bg-slate-950 p-4 md:p-8 w-full">
    <div className="max-w-7xl mx-auto space-y-6">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 px-6 py-8 md:px-9 text-white shadow-xl shadow-blue-950/10">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide"><ShieldCheck size={14}/> ADMIN CONTROL CENTER</div><h1 className="text-3xl md:text-4xl font-bold tracking-tight">E‑Approve Administration</h1><p className="text-blue-100 mt-2 max-w-2xl">จัดการโครงสร้างสายอนุมัติ ผู้มีสิทธิ์ และกฎของเอกสารจากศูนย์กลาง</p></div><Workflow size={72} strokeWidth={1.25} className="hidden md:block text-white/30"/></div>
    </header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><StatCard icon={Building2} label="สาขา" value={initial.branches.length}/><StatCard icon={UsersRound} label="ผู้อนุมัติพร้อมใช้" value={activeApprovers.length}/><StatCard icon={Network} label="แผนกที่ตั้งค่าแล้ว" value={initial.departments.filter((item) => item.branchId).length}/><StatCard icon={FileType2} label="ประเภท Memo" value={initial.memoTypes.length}/></div>
    <nav className="sticky top-3 z-20 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 p-1.5 shadow-sm backdrop-blur"><NavItem href="#branches" label="สาขาและ GM"/><NavItem href="#approvers" label="ผู้อนุมัติ"/><NavItem href="#departments" label="แผนกและ HOD"/><NavItem href="#memo-types" label="Memo Type"/><NavItem href="#system" label="ระบบ"/></nav>
    {message && <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{message}</div>}

    <section id="branches" className={cardClass}>
      <SectionTitle icon={Building2} title="สาขาและผู้จัดการทั่วไป" description="กำหนดโครงสร้างสาขาและ GM สำหรับกรณีที่แผนกไม่มี HOD" />
      <form onSubmit={createBranch} className="flex flex-wrap gap-3 mb-5"><input className={inputClass} name="name" required placeholder="ชื่อสาขา"/><input className={inputClass} name="code" required placeholder="รหัสสาขา"/><button disabled={busy} className={buttonClass}>เพิ่มสาขา</button></form>
      <div className="space-y-3">{initial.branches.map((branch) => <div key={branch.id} className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-center p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
        <div><b>{branch.name}</b> <span className="text-gray-500">({branch.code})</span></div>
        <select className={inputClass} value={branch.generalManagerId ?? ''} onChange={(e) => void mutate(`/api/admin/branches/${branch.id}`, 'PATCH', { generalManagerId: e.target.value || null })}><option value="">ยังไม่กำหนด GM</option>{activeApprovers.filter((u) => u.branchId === branch.id).map((u) => <option key={u.id} value={u.id}>{u.fullName ?? u.username}</option>)}</select>
        <button className={branch.isActive ? 'text-green-700' : 'text-gray-500'} onClick={() => void mutate(`/api/admin/branches/${branch.id}`, 'PATCH', { isActive: !branch.isActive })}>{branch.isActive ? 'Active' : 'Inactive'}</button>
      </div>)}</div>
    </section>

    <section id="approvers" className={cardClass}>
      <SectionTitle icon={UsersRound} title="ผู้ใช้งานและสิทธิ์ Approver" description="กำหนดสาขา แผนก ตำแหน่ง และสิทธิ์ในการอนุมัติเอกสาร" />
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="p-2">User</th><th>Branch</th><th>Department</th><th>Position</th><th>Email</th><th>Approver</th><th>Active</th></tr></thead><tbody>{initial.users.map((user) => <tr key={user.id} className="border-b dark:border-slate-700"><td className="p-2">{user.fullName ?? user.username}<div className="text-gray-500">{user.role}</div></td><td><select className={inputClass} value={user.branchId ?? ''} onChange={(e) => void mutate(`/api/admin/users/${user.id}/approval-config`, 'PATCH', { branchId: e.target.value || null, departmentId: null })}><option value="">ไม่ระบุ</option>{initial.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td><td><select className={inputClass} value={user.departmentId ?? ''} onChange={(e) => void mutate(`/api/admin/users/${user.id}/approval-config`, 'PATCH', { departmentId: e.target.value || null })}><option value="">ไม่ระบุ</option>{initial.departments.filter((d) => !user.branchId || d.branchId === user.branchId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td><td><input className={inputClass} defaultValue={user.position ?? ''} onBlur={(e) => { if (e.target.value !== (user.position ?? '')) void mutate(`/api/admin/users/${user.id}/approval-config`, 'PATCH', { position: e.target.value || null }); }}/></td><td><input className={inputClass} type="email" defaultValue="" placeholder="email" onBlur={(e) => { if (e.target.value) void mutate(`/api/admin/users/${user.id}/approval-config`, 'PATCH', { email: e.target.value }); }}/></td><td><input type="checkbox" checked={user.isApprover} onChange={(e) => void mutate(`/api/admin/users/${user.id}/approval-config`, 'PATCH', { isApprover: e.target.checked })}/></td><td><input type="checkbox" checked={user.isActive} onChange={(e) => void mutate(`/api/admin/users/${user.id}/approval-config`, 'PATCH', { isActive: e.target.checked })}/></td></tr>)}</tbody></table></div>
    </section>

    <section id="departments" className={cardClass}>
      <SectionTitle icon={Network} title="แผนกและหัวหน้าแผนก" description="เชื่อม Department เข้ากับ Branch และกำหนด HOD ประจำแผนก" />
      <div className="space-y-3">{initial.departments.map((dept) => <DepartmentConfig key={dept.id} department={dept} branches={initial.branches} users={activeApprovers} mutate={mutate}/>)}</div>
    </section>

    <section id="memo-types" className={cardClass}>
      <SectionTitle icon={FileType2} title="ประเภท Memo และผู้อนุมัติบังคับ" description="กำหนดกฎและลำดับ Required Approvers สำหรับแต่ละประเภทเอกสาร" />
      <form onSubmit={createMemoType} className="flex flex-wrap gap-3 mb-5"><input className={inputClass} name="name" required placeholder="ชื่อประเภท"/><input className={inputClass} name="code" required placeholder="รหัส"/><select className={inputClass} name="branchId"><option value="">ทุกสาขา</option>{initial.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><label className="flex items-center gap-2"><input type="checkbox" name="sendPdfToIt"/> ส่ง PDF ให้ IT</label><button disabled={busy} className={buttonClass}>เพิ่ม Memo Type</button></form>
      <div className="space-y-4">{initial.memoTypes.map((type) => <RequiredApprovers key={type.id} memoType={type} users={activeApprovers} mutate={mutate}/>)}</div>
    </section>

    <section id="system" className={cardClass}><SectionTitle icon={Settings2} title="การตั้งค่าระบบ" description="กำหนดอีเมลส่วนกลางและข้อจำกัดไฟล์แนบ" /><form onSubmit={saveSettings} className="grid md:grid-cols-4 gap-3"><input className={inputClass} name="itEmail" type="email" placeholder="IT Email" defaultValue={String(initial.settings.itEmail ?? '')}/><input className={inputClass} name="attachmentMaxFileMb" type="number" defaultValue={Number(initial.settings.attachmentMaxFileMb ?? 20)}/><input className={inputClass} name="attachmentMaxTotalMb" type="number" defaultValue={Number(initial.settings.attachmentMaxTotalMb ?? 100)}/><button className={buttonClass} disabled={busy}>บันทึก</button></form></section>
    </div>
  </main>;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 dark:bg-blue-950/50 p-2.5 text-blue-600"><Icon size={20}/></div><div><div className="text-2xl font-bold leading-none">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div></div></div>; }
function NavItem({ href, label }: { href: string; label: string }) { return <a href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800 transition">{label}</a>; }
function SectionTitle({ icon: Icon, title, description }: { icon: typeof CheckCircle2; title: string; description: string }) { return <div className="mb-5 flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4"><div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-sm"><Icon size={20}/></div><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2><p className="mt-0.5 text-sm text-slate-500">{description}</p></div></div>; }

function DepartmentConfig({ department, branches, users, mutate }: { department: Department; branches: Branch[]; users: User[]; mutate: (url: string, method: string, body: unknown) => Promise<boolean> }) {
  const [branchId, setBranchId] = useState(department.branchId ?? ''); const [hodId, setHodId] = useState(department.hodId ?? '');
  return <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center"><b>{department.name}</b><select className={inputClass} value={branchId} onChange={(e) => { setBranchId(e.target.value); setHodId(''); }}><option value="">เลือกสาขา</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><select className={inputClass} value={hodId} onChange={(e) => setHodId(e.target.value)}><option value="">ใช้ GM Fallback</option>{users.filter((u) => u.branchId === branchId).map((u) => <option key={u.id} value={u.id}>{u.fullName ?? u.username}</option>)}</select><button disabled={!branchId} className={buttonClass} onClick={() => void mutate(`/api/admin/departments/${department.id}/approval-config`, 'PATCH', { branchId, hodId: hodId || null })}>บันทึก</button></div>;
}

function RequiredApprovers({ memoType, users, mutate }: { memoType: MemoType; users: User[]; mutate: (url: string, method: string, body: unknown) => Promise<boolean> }) {
  const [selected, setSelected] = useState(memoType.requiredApprovers.map((item) => item.approverId)); const candidates = users.filter((u) => !memoType.branchId || u.branchId === memoType.branchId);
  const move = (index: number, delta: number) => { const target = index + delta; if (target < 0 || target >= selected.length) return; const next = [...selected]; [next[index], next[target]] = [next[target], next[index]]; setSelected(next); };
  return <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"><div className="flex justify-between"><b>{memoType.name} ({memoType.code})</b><span>{memoType.isActive ? 'Active' : 'Inactive'}</span></div><div className="space-y-2 my-3">{selected.map((id, index) => { const user = candidates.find((item) => item.id === id); return <div key={id} className="flex items-center gap-2"><span className="w-6">{index + 1}.</span><span className="flex-1">{user?.fullName ?? user?.username ?? id}</span><button onClick={() => move(index, -1)} disabled={index === 0}>↑</button><button onClick={() => move(index, 1)} disabled={index === selected.length - 1}>↓</button><button className="text-red-600" onClick={() => setSelected(selected.filter((item) => item !== id))}>ลบ</button></div>; })}</div><div className="flex flex-wrap gap-3 my-3">{candidates.filter((u) => !selected.includes(u.id)).map((u) => <button className="px-2 py-1 border rounded" key={u.id} onClick={() => setSelected([...selected, u.id])}>+ {u.fullName ?? u.username}</button>)}</div><button className={buttonClass} disabled={selected.length === 0} onClick={() => void mutate(`/api/admin/memo-types/${memoType.id}/required-approvers`, 'PUT', { approverIds: selected })}>บันทึกลำดับที่เลือก</button></div>;
}
