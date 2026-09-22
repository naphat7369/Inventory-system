import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { MemoForm } from '../../MemoForm';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export default async function EditMemoPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  
  const [memo, departments] = await Promise.all([
    prisma.memo.findUnique({
      where: { id },
      include: {
        signatures: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    }),
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
  ]);

  if (!memo || memo.deletedAt !== null) {
    notFound();
  }

  const isAdmin = currentUser.role === 'ADMIN';

  // Regular user can only edit memos from their own department
  if (!isAdmin && currentUser.departmentId !== memo.departmentId) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="text-blue-600" /> Edit Memo {memo.documentNo ? `(${memo.documentNo})` : ''}
        </h1>
        <div className="flex gap-4">
          <Link href={`/memos/${id}`} className="text-blue-600 hover:underline font-medium">
            View Memo
          </Link>
          <Link href="/memos" className="text-gray-600 hover:underline font-medium">
            Back to Memos
          </Link>
        </div>
      </div>
      
      <MemoForm 
        departments={departments} 
        initialData={memo} 
        isEdit={true} 
        userDepartmentId={currentUser.departmentId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
