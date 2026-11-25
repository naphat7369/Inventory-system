import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ApproversClient } from './ApproversClient';

export default async function ApproversPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/');

  const [users, branches] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isApprover: 'desc' }, { isReviewer: 'desc' }, { fullName: 'asc' }, { username: 'asc' }],
      select: {
        id: true, username: true, fullName: true, position: true, email: true,
        isActive: true, isApprover: true, isReviewer: true, isAllBranches: true, approvalBranchIds: true, branchId: true,
        branch: { select: { name: true, code: true } },
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return (
    <main className="min-h-full w-full bg-slate-50 p-5 dark:bg-slate-950 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/e-documents/admin" className="text-sm font-semibold text-blue-600 hover:text-blue-700">← E‑Documents Administration</Link>
        <header className="mt-4 rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-7 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">E‑Documents access control</p>
          <h1 className="mt-2 text-3xl font-bold">ผู้อนุมัติและขอบเขตสาขา</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">กำหนดสิทธิ์ Approver และ Reviewer แยกจากกัน พร้อมตรวจสอบขอบเขตสาขาของผู้ใช้งาน</p>
        </header>
        <ApproversClient users={users} branches={branches} />
      </div>
    </main>
  );
}
