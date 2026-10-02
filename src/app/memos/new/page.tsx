import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MemoForm } from '../MemoForm';
import { FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { getAttachmentLimits } from '@/lib/memo-attachments';

export default async function NewMemoPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id as string },
    include: { department: true }
  });

  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUser.role === 'ADMIN';

  // If regular user has no department, block memo creation
  if (!isAdmin && !currentUser.departmentId) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">
            ไม่สามารถสร้างเอกสาร Memo ได้
          </h2>
          <p className="text-amber-800 dark:text-amber-300 font-medium text-base">
            บัญชีของคุณยังไม่ได้กำหนดแผนก กรุณาติดต่อผู้ดูแลระบบ
          </p>
          <div className="pt-4">
            <Link
              href="/memos"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition shadow-xs"
            >
              กลับหน้ารายการ Memo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active departments only
  const [departments, memoTypes, approvers, attachmentLimits, branchDepartments] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.memoType.findMany({
      where: { isActive: true }, orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, branchId: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, isApprover: true },
      orderBy: [{ fullName: 'asc' }, { username: 'asc' }],
      select: { id: true, username: true, fullName: true, position: true, branchId: true, isAllBranches: true, branch: { select: { name: true, code: true } } },
    }),
    getAttachmentLimits(prisma),
    prisma.branchDepartment.findMany({ where: { isActive: true } }),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="text-blue-600" /> Create Memo
        </h1>
        <Link href="/memos" className="text-blue-600 hover:underline font-medium">
          Back to Memos
        </Link>
      </div>
      
      <MemoForm 
        departments={departments.map((department) => {
          const effectiveBranchId = currentUser.branchId ?? department.branchId;
          const branchDept = branchDepartments.find(b => b.departmentId === department.id && b.branchId === effectiveBranchId);
          return {
            ...department,
            branchId: effectiveBranchId,
            hodId: branchDept?.hodId || department.hodId
          };
        })}
        userDepartmentId={currentUser.departmentId}
        isAdmin={isAdmin}
        memoTypes={memoTypes}
        currentUser={{ id: currentUser.id, username: currentUser.username, fullName: currentUser.fullName, position: currentUser.position, branchId: currentUser.branchId }}
        approvers={approvers}
        attachmentLimits={attachmentLimits}
      />
    </div>
  );
}
