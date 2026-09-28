import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, CheckCircle2, Clock3, FileCheck2, Filter, Inbox, RotateCcw } from 'lucide-react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

const views = [
  { key: 'pending', label: 'รอฉันอนุมัติ', icon: Clock3 },
  { key: 'history', label: 'ดำเนินการแล้ว', icon: CheckCircle2 },
  { key: 'all', label: 'ทั้งหมด', icon: Inbox },
];

function formatBangkok(value: Date) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok',
  }).format(value);
}

export default async function ApprovalInboxPage({ searchParams }: { searchParams: Promise<{ view?: string; branchId?: string; departmentId?: string }> }) {
  const session = await getSession();
  if (!session?.id) redirect('/login');
  const currentUser = await prisma.user.findUnique({ where: { id: String(session.id) }, select: { isActive: true, isApprover: true } });
  if (!currentUser?.isActive || !currentUser.isApprover) redirect('/memos');
  const requested = await searchParams;
  const view = ['pending', 'history', 'all'].includes(requested.view ?? '') ? requested.view! : 'pending';
  const status = view === 'pending' ? 'PENDING' : view === 'history' ? { in: ['APPROVED', 'REVISION_REQUESTED'] } : undefined;

  const scopeRows = await prisma.memoApprovalStep.findMany({
    where: { approverId: String(session.id) },
    select: { round: { select: { memo: { select: {
      departmentId: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true } },
    } } } } },
  });
  const branchMap = new Map<string, { id: string; name: string; code: string }>();
  const departmentMap = new Map<string, { id: string; name: string; branchId: string | null }>();
  scopeRows.forEach(({ round }) => {
    const department = round.memo.department;
    const memoBranchId = round.memo.branchId;
    departmentMap.set(`${memoBranchId ?? 'none'}:${department.id}`, { id: department.id, name: department.name, branchId: memoBranchId });
    if (round.memo.branch) branchMap.set(round.memo.branch.id, round.memo.branch);
  });
  const branches = [...branchMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const allDepartments = [...departmentMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const branchId = requested.branchId && branchMap.has(requested.branchId) ? requested.branchId : '';
  const departmentId = requested.departmentId && allDepartments.some((item) => item.id === requested.departmentId && (!branchId || item.branchId === branchId)) ? requested.departmentId : '';
  const departments = branchId ? allDepartments.filter((item) => item.branchId === branchId) : allDepartments;
  const memoScope = {
    ...(departmentId ? { departmentId } : {}),
    ...(branchId ? { branchId } : {}),
  };

  const [steps, pendingCount] = await Promise.all([
    prisma.memoApprovalStep.findMany({
      where: { approverId: String(session.id), ...(status ? { status } : {}), ...(branchId || departmentId ? { round: { memo: memoScope } } : {}) },
      include: {
        round: { include: { memo: { include: { department: true, branch: true, memoType: true } } } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.memoApprovalStep.count({ where: { approverId: String(session.id), status: 'PENDING' } }),
  ]);

  return (
    <main className="min-h-full bg-slate-50 p-5 dark:bg-slate-950 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 p-7 text-white shadow-xl">
          <FileCheck2 className="h-9 w-9 text-blue-200"/>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Approval workspace</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">กล่องงานอนุมัติ</h1><p className="mt-2 text-sm text-blue-100">เอกสารจะแสดงในรายการรออนุมัติเมื่อถึงคิวของคุณเท่านั้น</p></div><span className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">รอดำเนินการ {pendingCount} รายการ</span></div>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {views.map(({ key, label, icon: Icon }) => {
            const query = new URLSearchParams({ view: key });
            if (branchId) query.set('branchId', branchId);
            if (departmentId) query.set('departmentId', departmentId);
            return <Link key={key} href={`/memos/approvals?${query.toString()}`} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon className="h-4 w-4"/>{label}{key === 'pending' && pendingCount > 0 && <span className={`${view === key ? 'bg-white/20' : 'bg-rose-100 text-rose-700'} rounded-full px-2 py-0.5 text-xs`}>{pendingCount}</span>}</Link>;
          })}
        </nav>

        <form method="GET" className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <input type="hidden" name="view" value={view}/>
          <label className="text-xs font-bold text-slate-500"><span className="mb-1.5 flex items-center gap-1"><Building2 className="h-3.5 w-3.5"/>สาขา</span><select name="branchId" defaultValue={branchId} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><option value="">ทุกสาขาที่มีสิทธิ์</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}</select></label>
          <label className="text-xs font-bold text-slate-500"><span className="mb-1.5 block">แผนก</span><select name="departmentId" defaultValue={departmentId} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><option value="">ทุกแผนกที่มีสิทธิ์</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Filter className="h-4 w-4"/>กรอง</button>
          <Link href={`/memos/approvals?view=${view}`} className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">ล้าง</Link>
        </form>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {steps.map((step) => {
              const memo = step.round.memo;
              return <Link href={`/memos/${memo.id}`} key={step.id} className="grid gap-3 p-5 transition hover:bg-blue-50/50 dark:hover:bg-blue-950/20 md:grid-cols-[minmax(0,1fr)_180px_160px_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate font-bold">{memo.subject}</span><StatusBadge status={step.status}/></div><div className="mt-1 text-xs text-slate-500">{memo.documentNo ?? 'ยังไม่ออกเลข'} · {memo.branch?.name ?? 'ไม่ระบุสาขา'} / {memo.department.name} · {memo.memoType?.name ?? 'ไม่ระบุประเภท'}</div></div><div className="text-sm"><span className="text-xs text-slate-400">รอบ / ลำดับ</span><div className="font-semibold">รอบ {step.round.roundNumber} · ขั้นที่ {step.sortOrder + 1}</div></div><div className="text-sm"><span className="text-xs text-slate-400">ได้รับงาน</span><div>{formatBangkok(step.createdAt)}</div></div><span className="text-sm font-bold text-blue-600">เปิดเอกสาร →</span></Link>;
            })}
            {!steps.length && <div className="p-14 text-center"><Inbox className="mx-auto h-11 w-11 text-slate-300"/><h2 className="mt-3 font-bold">ไม่มีรายการในกล่องนี้</h2><p className="mt-1 text-sm text-slate-500">เมื่อมีเอกสารถึงคิวของคุณ ระบบจะแสดงที่นี่</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'PENDING') return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">รอคุณอนุมัติ</span>;
  if (status === 'APPROVED') return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">อนุมัติแล้ว</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700"><RotateCcw className="h-3 w-3"/>ส่งกลับแล้ว</span>;
}
