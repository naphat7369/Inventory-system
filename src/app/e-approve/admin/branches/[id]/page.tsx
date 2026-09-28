import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BranchDetailClient } from './BranchDetailClient';

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (session?.role !== 'ADMIN') redirect('/');
  const { id } = await params;
  const [branch, availableDepartments, allBranchApprovers] = await Promise.all([
    prisma.branch.findUnique({ where: { id }, include: { departments: { orderBy: { name: 'asc' } }, users: { orderBy: { username: 'asc' }, select: { id: true, username: true, fullName: true, position: true, isActive: true, isApprover: true, isAllBranches: true, departmentId: true } } } }),
    prisma.department.findMany({ where: { branchId: null, isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
    prisma.user.findMany({ where: { isAllBranches: true, isActive: true, isApprover: true }, orderBy: { username: 'asc' }, select: { id: true, username: true, fullName: true, position: true, isActive: true, isApprover: true, isAllBranches: true, departmentId: true } }),
  ]);
  if (!branch) notFound();
  const users = [...branch.users, ...allBranchApprovers.filter((globalUser) => !branch.users.some((branchUser) => branchUser.id === globalUser.id))];
  return <main className="p-5 md:p-8 w-full bg-slate-50 dark:bg-slate-950 min-h-full"><div className="max-w-6xl mx-auto"><Link href="/e-approve/admin/branches" className="text-sm text-blue-600">← รายการสาขา</Link><div className="mt-3"><h1 className="text-3xl font-bold">{branch.name}</h1><p className="text-slate-500">รหัส {branch.code} · จัดการข้อมูลเฉพาะสาขานี้</p></div><BranchDetailClient branch={{ ...branch, users, availableDepartments }}/></div></main>;
}
