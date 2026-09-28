import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileType2 } from 'lucide-react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MemoTypesClient } from './MemoTypesClient';

export default async function MemoTypesPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const [memoTypes, branches, users] = await Promise.all([
    prisma.memoType.findMany({
      include: {
        requiredApprovers: {
          orderBy: { sortOrder: 'asc' },
          include: {
            approver: {
              select: {
                id: true, username: true, fullName: true, position: true,
                isActive: true, isApprover: true, isAllBranches: true,
                branchId: true, branch: { select: { name: true, code: true } },
              },
            },
          },
        },
        branch: { select: { name: true, code: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, isApprover: true },
      orderBy: [{ fullName: 'asc' }, { username: 'asc' }],
      select: {
        id: true, fullName: true, username: true, position: true,
        branchId: true, isAllBranches: true,
        branch: { select: { name: true, code: true } },
      },
    }),
  ]);

  return (
    <main className="min-h-full w-full bg-slate-50 p-5 dark:bg-slate-950 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/e-approve/admin" className="text-sm font-semibold text-blue-600 hover:text-blue-700">← E‑Approve Administration</Link>
        <header className="mt-4 rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-7 text-white shadow-xl">
          <FileType2 className="h-9 w-9 text-blue-200" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Approval configuration</p>
          <h1 className="mt-1 text-3xl font-bold">ประเภท Memo และผู้อนุมัติบังคับ</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">สร้างประเภทเอกสาร กำหนดขอบเขตสาขา และจัดลำดับ Required Approvers ที่จะถูกบันทึกใน Approval Snapshot</p>
        </header>
        <MemoTypesClient memoTypes={memoTypes} branches={branches} users={users} />
      </div>
    </main>
  );
}
