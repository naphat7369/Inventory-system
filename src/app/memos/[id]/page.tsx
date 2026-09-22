import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { MemoDetailActions } from '../MemoDetailActions';
import { MemoDocumentPagination } from './MemoDocumentPagination';
import { DEFAULT_S_HOTEL_LOGO_URL } from '@/lib/constants';
import Link from 'next/link';

export default async function MemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
  
  const memo = await prisma.memo.findUnique({
    where: { id },
    include: {
      department: true,
      signatures: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  if (!memo || memo.deletedAt !== null) {
    notFound();
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const isSameDept = Boolean(currentUser.departmentId) && currentUser.departmentId === memo.departmentId;

  if (!isAdmin && !isSameDept) {
    redirect('/memos');
  }

  // Format date to Thai format
  const dateObj = new Date(memo.documentDate);
  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const thaiDateStr = `${dateObj.getDate()} ${thaiMonths[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;

  // IMMUTABLE LOGO RULE: Read ONLY from memo.logoUrl (never live department logo or constant)
  const displayLogoUrl = memo.logoUrl || DEFAULT_S_HOTEL_LOGO_URL;
  const displaySubHeader = (memo.subHeader || `${memo.department?.name || ''} DEPARTMENT`).trim().toLocaleUpperCase('en-US');

  const signatures = memo.signatures || [];

  const canDelete = isAdmin || isSameDept;
  const canEdit = isAdmin || isSameDept;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 print:p-0 print:bg-white print:min-h-0 print:m-0">
      <div className="max-w-[210mm] mx-auto print:max-w-none print:m-0 print:p-0">
        
        {/* Navigation - Hidden in Print */}
        <div className="mb-4 print:hidden flex justify-between items-center">
          <Link href="/memos" className="text-blue-600 hover:underline font-medium text-sm flex items-center gap-1.5">
            &larr; กลับหน้ารายการ
          </Link>
          <div className="text-xs text-slate-500 font-medium">
            สถานะ: <span className="font-bold text-slate-800 dark:text-slate-200">{memo.status}</span>
          </div>
        </div>

        {/* Actions - Hidden in Print */}
        <MemoDetailActions 
          memoId={memo.id} 
          status={memo.status} 
          documentNo={memo.documentNo}
          subject={memo.subject}
          canDelete={canDelete}
          canEdit={canEdit}
        />

        {/* Status Badge - Hidden in Print */}
        {memo.status !== 'FINAL' && (
          <div className={`mb-6 p-4 rounded-lg font-semibold text-sm text-center print:hidden shadow-sm ${
            memo.status === 'DRAFT' 
              ? 'bg-amber-50 text-amber-900 border border-amber-300' 
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}>
            นี่คือเอกสาร {memo.status === 'DRAFT' ? 'แบบร่าง (Draft)' : 'ยกเลิก (Cancelled)'} {memo.status === 'DRAFT' && '— ตรวจสอบความถูกต้องและกด "ออกเลขเอกสาร" เมื่อพร้อมพิมพ์'}
          </div>
        )}

        {/* Responsive A4 Paper Container with Auto-Pagination */}
        <div className="overflow-x-auto w-full pb-8 print:pb-0 print:overflow-visible flex justify-center print:block print:w-auto print:m-0 print:p-0">
          <MemoDocumentPagination
            memo={memo}
            thaiDateStr={thaiDateStr}
            displayLogoUrl={displayLogoUrl}
            displaySubHeader={displaySubHeader}
            signatures={signatures}
          />
        </div>
      </div>
    </div>
  );
}
