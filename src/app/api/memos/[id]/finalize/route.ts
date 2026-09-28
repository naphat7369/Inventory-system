import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { queueOfficialPdfForFinalMemo } from '@/lib/memo-official-pdf';

const prisma = new PrismaClient();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const currentUser = await prisma.user.findUnique({ where: { id: String(session.id) } });
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Use transaction to ensure safe number generation
    const memo = await prisma.$transaction(async (tx) => {
      const existing = await tx.memo.findUnique({
        where: { id },
        include: { department: true }
      });

      if (!existing) {
        throw new Error('Memo not found');
      }

      if (existing.status !== 'DRAFT') {
        throw new Error('Only DRAFT memos can be finalized');
      }
      if (existing.memoTypeId || existing.branchId) {
        throw new Error('E-Approve memos must use the submit approval endpoint');
      }
      if (currentUser.role !== 'ADMIN' && (existing.createdById !== currentUser.id || existing.departmentId !== currentUser.departmentId)) {
        throw new Error('Forbidden');
      }

      // 1. Calculate Buddhist Year from documentDate
      // Assuming documentDate is stored in UTC but conceptually it's Bangkok time.
      // We'll use the year from the date object directly and add 543.
      // Alternatively, we use current date in Asia/Bangkok if the requirement meant "current year"
      // User says: "แปลงเป็นปี พ.ศ. เฉพาะตอนแสดงผลและสร้างเลขเอกสาร ใช้เขตเวลา Asia/Bangkok ในการตัดสินวันที่และปีเอกสาร"
      // Since `documentDate` is provided by user, we get the year from `documentDate`. Wait, no, usually the document number runs based on the actual creation/finalize date, but let's use the provided `documentDate` as requested. 
      // Actually, let's use current time in Bangkok for the running number year to be safe, or just use the `documentDate`.
      // "ใช้เขตเวลา Asia/Bangkok ในการตัดสินวันที่และปีเอกสาร" -> this usually implies generating the year using current time in Bangkok. Let's use `documentDate` year in Bangkok time.
      
      const dateInBkkStr = new Date(existing.documentDate).toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
      const dateInBkk = new Date(dateInBkkStr);
      const buddhistYear = dateInBkk.getFullYear() + 543;

      // 2. Find the highest sequence for this department and year
      const lastMemo = await tx.memo.findFirst({
        where: {
          departmentId: existing.departmentId,
          buddhistYear: buddhistYear,
          status: { not: 'DRAFT' } // FINAL or CANCELLED
        },
        orderBy: { sequence: 'desc' }
      });

      const nextSequence = (lastMemo?.sequence || 0) + 1;
      
      // 3. Format document number: "IT 001/2569"
      const paddedSequence = nextSequence.toString().padStart(3, '0');
      const documentNo = `${existing.department.code} ${paddedSequence}/${buddhistYear}`;

      // 4. Update the memo
      const updatedMemo = await tx.memo.update({
        where: { id },
        data: {
          status: 'FINAL',
          approvalStatus: 'APPROVED',
          pdfStatus: 'NOT_REQUESTED',
          sequence: nextSequence,
          buddhistYear: buddhistYear,
          documentNo: documentNo,
          updatedById: session.id as string
        }
      });

      return updatedMemo;
    });

    const pdf = await prisma.$transaction((tx) => queueOfficialPdfForFinalMemo(tx, memo.id, String(session.id)));
    return NextResponse.json({ ...memo, pdfStatus: pdf.status });
  } catch (error: unknown) {
    console.error('Error finalizing memo:', error);
    const err = error as { code?: string; message?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Failed to generate document number due to concurrent requests. Please try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
