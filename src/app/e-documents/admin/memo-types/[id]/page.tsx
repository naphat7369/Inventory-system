import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FileType2 } from 'lucide-react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MemoTypeEditor } from '../MemoTypesClient';

export default async function MemoTypeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');
  const { id } = await params;
  const [item, branches, users] = await Promise.all([
    prisma.memoType.findUnique({
      where: { id },
      include: {
        requiredApprovers: {
          orderBy: { sortOrder: 'asc' },
          include: { approver: { select: {
            id: true, username: true, fullName: true, position: true,
            isActive: true, isApprover: true, isReviewer: true, isAllBranches: true,
            branchId: true, branch: { select: { name: true, code: true } },
          } } },
        },
        filterPermissions: { include: { user: { select: { id: true, username: true, fullName: true } } } },
        branch: { select: { name: true, code: true } },
      },
    }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
    prisma.user.findMany({
      where: { isActive: true }, orderBy: [{ fullName: 'asc' }, { username: 'asc' }],
      select: {
        id: true, fullName: true, username: true, position: true,
        branchId: true, isAllBranches: true, isApprover: true, isReviewer: true,
        branch: { select: { name: true, code: true } },
      },
    }),
  ]);
  if (!item) notFound();

  return <main className="min-h-full w-full bg-slate-50 p-5 dark:bg-slate-950 md:p-8"><div className="mx-auto max-w-6xl"><Link href="/e-documents/admin/memo-types" className="text-sm font-semibold text-blue-600 hover:text-blue-700">← รายการ Memo Type</Link><header className="mt-4 rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-7 text-white shadow-xl"><FileType2 className="h-9 w-9 text-blue-200"/><p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Memo type configuration</p><div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">{item.name}</h1><p className="mt-2 text-sm text-blue-100">แก้ไขข้อมูล Workflow ผู้อนุมัติ/ผู้ตรวจสอบ และสิทธิ์ Filter ของ Memo Type นี้</p></div><span className="rounded-xl bg-white/10 px-3 py-2 font-mono text-sm font-bold">{item.code}</span></div></header><MemoTypeEditor item={item} branches={branches} users={users}/></div></main>;
}
