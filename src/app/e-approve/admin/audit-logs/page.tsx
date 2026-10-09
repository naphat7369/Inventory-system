import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { Activity, Bell, BriefcaseBusiness, CheckCircle2, Clock3, Mail, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { displayAuditValue } from '@/lib/audit';
import { bangkokDayRange } from '@/lib/eapprove/delegation';
import { RetryPdfButton } from './RetryPdfButton';
import { RetryEmailButton } from './RetryEmailButton';

const pageSize = 25;
const tabs = [
  { key: 'audit', label: 'Audit Logs', icon: Activity },
  { key: 'jobs', label: 'Background Jobs', icon: BriefcaseBusiness },
  { key: 'email', label: 'Email Delivery', icon: Mail },
  { key: 'notifications', label: 'Notifications', icon: Bell },
] as const;

function bangkokDate(value: Date | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(value);
}

function badge(status: string) {
  const style = status === 'COMPLETED' || status === 'SENT' || status === 'READY'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'FAILED' ? 'bg-rose-100 text-rose-700'
      : status === 'PROCESSING' || status === 'SENDING' || status === 'GENERATING' ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${style}`}>{status}</span>;
}

export default async function AuditOperationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');
  const query = await searchParams;
  const tab = tabs.some((item) => item.key === query.tab) ? query.tab! : 'audit';
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const search = query.q?.trim() ?? '';
  const actorId = query.actorId ?? '';
  const action = query.action ?? '';
  const entity = query.entity ?? '';
  const allowedModules = ['E_APPROVE', 'INVENTORY', 'BORROW', 'REPAIR', 'LICENSE', 'SYSTEM'];
  const moduleFilter = query.module === 'ALL' ? '' : allowedModules.includes(query.module ?? '') ? query.module! : 'E_APPROVE';
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from ?? '') ? query.from! : '';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to ?? '') ? query.to! : '';

  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = bangkokDayRange(from, from).startsAt;
  if (to) createdAt.lte = bangkokDayRange(to, to).endsAt;
  const auditWhere: Prisma.AuditLogWhereInput = {
    ...(moduleFilter ? { module: moduleFilter } : {}),
    ...(actorId ? { userId: actorId } : {}),
    ...(action ? { action } : {}),
    ...(entity ? { entity } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(search ? { OR: [
      { entityId: { contains: search } }, { action: { contains: search } },
      { entity: { contains: search } }, { details: { contains: search } },
    ] } : {}),
  };

  const [failedJobs, failedEmails, unreadNotifications] = await Promise.all([
    prisma.backgroundJob.count({ where: { status: 'FAILED' } }),
    prisma.emailDelivery.count({ where: { status: 'FAILED' } }),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  const baseQuery = new URLSearchParams();
  const linkForTab = (key: string) => { const params = new URLSearchParams(baseQuery); params.set('tab', key); return `/e-approve/admin/audit-logs?${params}`; };

  let content: React.ReactNode;
  if (tab === 'audit') {
    const [logs, total, actors, actions, entities] = await Promise.all([
      prisma.auditLog.findMany({ where: auditWhere, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.auditLog.count({ where: auditWhere }),
      prisma.user.findMany({ where: { id: { in: (await prisma.auditLog.findMany({ where: { userId: { not: null }, ...(moduleFilter ? { module: moduleFilter } : {}) }, select: { userId: true }, distinct: ['userId'] })).flatMap((item) => item.userId ? [item.userId] : []) } }, select: { id: true, username: true, fullName: true }, orderBy: { username: 'asc' } }),
      prisma.auditLog.groupBy({ by: ['action'], where: moduleFilter ? { module: moduleFilter } : {}, orderBy: { action: 'asc' } }),
      prisma.auditLog.groupBy({ by: ['entity'], where: moduleFilter ? { module: moduleFilter } : {}, orderBy: { entity: 'asc' } }),
    ]);
    const actorMap = new Map(actors.map((item) => [item.id, item.fullName ?? item.username]));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageHref = (target: number) => { const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))); params.set('tab', 'audit'); params.set('page', String(target)); return `/e-approve/admin/audit-logs?${params}`; };
    content = <>
      <form method="GET" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <input type="hidden" name="tab" value="audit"/><label className="md:col-span-2 text-xs font-bold text-slate-500">ค้นหา<input name="q" defaultValue={search} placeholder="Action, Entity, ID หรือรายละเอียด" className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"/></label>
        <label className="text-xs font-bold text-slate-500">Module<select name="module" defaultValue={moduleFilter || 'ALL'} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="E_APPROVE">E_APPROVE</option><option value="INVENTORY">INVENTORY</option><option value="BORROW">BORROW</option><option value="REPAIR">REPAIR</option><option value="LICENSE">LICENSE</option><option value="SYSTEM">SYSTEM</option><option value="ALL">ทุก Module</option></select></label>
        <label className="text-xs font-bold text-slate-500">ผู้ดำเนินการ<select name="actorId" defaultValue={actorId} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">ทั้งหมด</option>{actors.map((item) => <option key={item.id} value={item.id}>{item.fullName ?? item.username}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-500">Action<select name="action" defaultValue={action} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">ทั้งหมด</option>{actions.map((item) => <option key={item.action}>{item.action}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-500">Entity<select name="entity" defaultValue={entity} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">ทั้งหมด</option>{entities.map((item) => <option key={item.entity}>{item.entity}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-500">ตั้งแต่วันที่<input name="from" type="date" defaultValue={from} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"/></label><label className="text-xs font-bold text-slate-500">ถึงวันที่<input name="to" type="date" defaultValue={to} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"/></label>
        <div className="flex items-end gap-2"><button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><Search className="h-4 w-4"/>ค้นหา</button><Link href="/e-approve/admin/audit-logs?tab=audit" className="rounded-xl border px-4 py-2.5 text-sm font-bold">ล้าง</Link></div>
      </form>
      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[1060px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr><th className="p-4">วันเวลา</th><th className="p-4">Module</th><th className="p-4">ผู้ดำเนินการ</th><th className="p-4">Action</th><th className="p-4">Entity</th><th className="p-4">รายละเอียด</th></tr></thead><tbody className="divide-y dark:divide-slate-800">{logs.map((log) => <tr key={log.id} className="align-top"><td className="whitespace-nowrap p-4 text-xs text-slate-500">{bangkokDate(log.createdAt)}</td><td className="p-4"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">{log.module}</span></td><td className="p-4 font-semibold">{log.userId ? actorMap.get(log.userId) ?? `ผู้ใช้ ${log.userId.slice(0, 8)}` : 'System'}</td><td className="p-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">{log.action}</span></td><td className="p-4"><div className="font-bold">{log.entity}</div><div className="max-w-48 truncate text-xs text-slate-400" title={log.entityId}>{log.entityId}</div></td><td className="p-4"><div className="max-w-sm text-xs text-slate-600 dark:text-slate-300">{log.details ?? '—'}</div>{(log.oldValue || log.newValue) && <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-blue-600">ดู Before / After</summary><div className="mt-2 grid gap-2 lg:grid-cols-2">{log.oldValue && <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">{displayAuditValue(log.oldValue)}</pre>}{log.newValue && <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">{displayAuditValue(log.newValue)}</pre>}</div></details>}</td></tr>)}{logs.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-500">ไม่พบ Audit Log ตามเงื่อนไข</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t p-4 text-sm dark:border-slate-800"><span>ทั้งหมด {total} รายการ · หน้า {page}/{totalPages}</span><div className="flex gap-2">{page > 1 && <Link href={pageHref(page - 1)} className="rounded-lg border px-3 py-2">ก่อนหน้า</Link>}{page < totalPages && <Link href={pageHref(page + 1)} className="rounded-lg border px-3 py-2">ถัดไป</Link>}</div></div></section>
    </>;
  } else if (tab === 'jobs') {
    const jobs = await prisma.backgroundJob.findMany({ include: { memo: { select: { id: true, documentNo: true, subject: true, pdfStatus: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    content = <OperationTable headers={['งาน / Memo', 'สถานะ', 'Attempts', 'เวลาล่าสุด', 'Error / Action']}>{jobs.map((job) => <tr key={job.id} className="border-t dark:border-slate-800"><td className="p-4"><div className="font-bold">{job.type}</div>{job.memo && <Link href={`/memos/${job.memo.id}`} className="text-xs text-blue-600 hover:underline">{job.memo.documentNo ?? job.memo.subject}</Link>}</td><td className="p-4">{badge(job.status)}{job.memo && <div className="mt-1 text-xs text-slate-500">PDF: {job.memo.pdfStatus}</div>}</td><td className="p-4">{job.attemptCount}/{job.maxAttempts}</td><td className="p-4 text-xs">{bangkokDate(job.updatedAt)}</td><td className="p-4"><div className="text-xs font-bold text-rose-600">{job.lastErrorCode ?? '—'}</div>{job.status === 'FAILED' && job.memoId && job.type === 'GENERATE_OFFICIAL_PDF' && <div className="mt-2"><RetryPdfButton memoId={job.memoId}/></div>}</td></tr>)}</OperationTable>;
  } else if (tab === 'email') {
    const deliveries = await prisma.emailDelivery.findMany({ include: { memo: { select: { id: true, documentNo: true, subject: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    content = <OperationTable headers={['ผู้รับ / Template', 'Memo', 'สถานะ', 'Attempts', 'ส่งเมื่อ / Error']}>{deliveries.map((item) => <tr key={item.id} className="border-t dark:border-slate-800"><td className="p-4"><div className="font-bold">{item.recipient}</div><div className="text-xs text-slate-500">{item.template}</div></td><td className="p-4">{item.memo ? <Link href={`/memos/${item.memo.id}`} className="text-blue-600 hover:underline">{item.memo.documentNo ?? item.memo.subject}</Link> : '—'}</td><td className="p-4">{badge(item.status)}</td><td className="p-4">{item.attemptCount}/{item.maxAttempts}</td><td className="p-4 text-xs"><div>{bangkokDate(item.sentAt)}</div><div className="mt-1 font-bold text-rose-600">{item.lastErrorCode ?? ''}</div>{item.status === 'FAILED' && <div className="mt-2"><RetryEmailButton deliveryId={item.id}/></div>}</td></tr>)}</OperationTable>;
  } else {
    const notifications = await prisma.notification.findMany({ include: { memo: { select: { id: true, documentNo: true, subject: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    const userIds = [...new Set(notifications.map((item) => item.userId))];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, fullName: true } });
    const userMap = new Map(users.map((item) => [item.id, item.fullName ?? item.username]));
    content = <OperationTable headers={['ผู้รับ', 'ประเภท', 'Memo', 'สถานะ', 'สร้างเมื่อ']}>{notifications.map((item) => <tr key={item.id} className="border-t dark:border-slate-800"><td className="p-4 font-bold">{userMap.get(item.userId) ?? item.userId.slice(0, 8)}</td><td className="p-4 text-xs">{item.type}</td><td className="p-4">{item.memo ? <Link href={`/memos/${item.memo.id}`} className="text-blue-600 hover:underline">{item.memo.documentNo ?? item.memo.subject}</Link> : '—'}</td><td className="p-4">{item.readAt ? badge('READ') : badge('UNREAD')}</td><td className="p-4 text-xs">{bangkokDate(item.createdAt)}</td></tr>)}</OperationTable>;
  }

  return <main className="min-h-full bg-slate-50 p-5 dark:bg-slate-950 md:p-8"><div className="mx-auto max-w-7xl"><Link href="/e-approve/admin" className="text-sm font-bold text-blue-600 hover:underline">&larr; กลับ E‑Approve Administration</Link><header className="mt-4 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-800 p-7 text-white shadow-xl"><ShieldCheck className="h-9 w-9 text-blue-200"/><p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Security & Operations</p><h1 className="mt-1 text-3xl font-black">Audit Logs & Operations</h1><p className="mt-2 text-sm text-blue-100">ตรวจสอบเหตุการณ์ของระบบและงานเบื้องหลัง ข้อมูลลับถูกปกปิดอัตโนมัติ</p><div className="mt-5 grid gap-2 sm:grid-cols-3"><Summary icon={TriangleAlert} label="Jobs ล้มเหลว" value={failedJobs}/><Summary icon={Mail} label="Email ล้มเหลว" value={failedEmails}/><Summary icon={Clock3} label="Notification ยังไม่อ่าน" value={unreadNotifications}/></div></header><nav className="mt-5 flex flex-wrap gap-2 rounded-2xl border bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">{tabs.map(({ key, label, icon: Icon }) => <Link key={key} href={linkForTab(key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon className="h-4 w-4"/>{label}</Link>)}</nav><div className="mt-4">{content}</div></div></main>;
}

function Summary({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: number }) {
  return <div className="rounded-xl bg-white/10 p-3 backdrop-blur"><div className="flex items-center gap-2 text-xs text-blue-100"><Icon className="h-4 w-4"/>{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>;
}

function OperationTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr>{headers.map((header) => <th key={header} className="p-4">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div></section>;
}
