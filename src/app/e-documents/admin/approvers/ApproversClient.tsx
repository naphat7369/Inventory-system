'use client';

import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Search, ShieldCheck, UserRound } from 'lucide-react';

type Branch = { id: string; name: string; code: string };
type ApproverUser = {
  id: string;
  username: string;
  fullName: string | null;
  position: string | null;
  email: string | null;
  isActive: boolean;
  isApprover: boolean;
  isAllBranches: boolean;
  branchId: string | null;
  branch: { name: string; code: string } | null;
};

export function ApproversClient({ users, branches }: { users: ApproverUser[]; branches: Branch[] }) {
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('__ALL_USERS__');
  const visible = useMemo(() => {
    const value = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesBranch = branchFilter === '__ALL_USERS__'
        || (branchFilter === '__ALL_BRANCHES__' && user.isAllBranches)
        || (branchFilter === '__UNASSIGNED__' && !user.isAllBranches && !user.branchId)
        || (!branchFilter.startsWith('__') && user.branchId === branchFilter);
      const matchesQuery = !value || [user.fullName, user.username, user.position, user.email]
        .some((item) => item?.toLowerCase().includes(value));
      return matchesBranch && matchesQuery;
    });
  }, [branchFilter, query, users]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold">รายชื่อผู้ใช้งาน</h2><p className="text-sm text-slate-500">Active Approver {users.filter((user) => user.isActive && user.isApprover).length} คน</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-64"><Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"><option value="__ALL_USERS__">ทุกกลุ่มสาขา</option><option value="__ALL_BRANCHES__">ทุกสาขา — ผู้บริหารส่วนกลาง</option>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name} ({branch.code})</option>)}<option value="__UNASSIGNED__">ยังไม่ระบุสาขา</option></select></label>
          <label className="flex min-w-72 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><Search className="h-4 w-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ ตำแหน่ง หรืออีเมล" className="w-full bg-transparent text-sm outline-none"/></label>
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map((user) => <ApproverRow key={user.id} user={user}/>) }
        {!visible.length && <div className="p-10 text-center text-sm text-slate-500">ไม่พบผู้ใช้งาน</div>}
      </div>
    </section>
  );
}

function ApproverRow({ user }: { user: ApproverUser }) {
  const [isApprover, setIsApprover] = useState(user.isApprover);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true); setSaved(false);
    const response = await fetch(`/api/admin/users/${user.id}/approval-config`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isApprover }),
    });
    setSaving(false);
    if (!response.ok) return alert((await response.json()).error ?? 'บันทึกไม่สำเร็จ');
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className={`grid gap-4 p-5 transition md:grid-cols-[minmax(240px,1fr)_minmax(250px,0.8fr)_auto] md:items-center ${!user.isActive ? 'bg-slate-50 opacity-60 dark:bg-slate-950/40' : ''}`}>
      <div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${isApprover ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{isApprover ? <ShieldCheck/> : <UserRound/>}</span><div><div className="font-bold">{user.fullName ?? user.username}</div><div className="text-xs text-slate-500">@{user.username}{user.position ? ` · ${user.position}` : ''}{!user.isActive ? ' · Inactive' : ''}</div></div></div>
      <div className="space-y-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={isApprover} disabled={!user.isActive} onChange={(event) => setIsApprover(event.target.checked)} className="h-4 w-4 accent-blue-600"/> อนุญาตให้เป็น Approver</label><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><Building2 className="h-4 w-4 text-slate-400"/><span>{user.isAllBranches ? 'ทุกสาขา — ผู้บริหารส่วนกลาง' : user.branch ? `${user.branch.name} (${user.branch.code})` : 'ยังไม่ระบุสาขา'}</span></div></div>
      <button onClick={() => void save()} disabled={saving || !user.isActive} className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saved ? <><CheckCircle2 className="h-4 w-4"/> บันทึกแล้ว</> : saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
    </div>
  );
}
