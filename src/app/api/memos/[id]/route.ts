import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { promises as fs } from 'node:fs';
import { memoAttachmentPath } from '@/lib/memo-attachments';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const currentUser = await prisma.user.findUnique({ where: { id: String(session.id) } });
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const memo = await prisma.memo.findUnique({
      where: { id },
      include: {
        department: true,
        signatures: {
          orderBy: { sortOrder: 'asc' }
        },
        approvalRounds: { include: { steps: { select: { approverId: true } } } },
      }
    });

    if (!memo || memo.deletedAt !== null) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }
    const participates = memo.approvalRounds.some((round) => round.steps.some((step) => step.approverId === currentUser.id));
    const canView = currentUser.role === 'ADMIN' || memo.createdById === currentUser.id || currentUser.departmentId === memo.departmentId || participates;
    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json(memo);
  } catch (error) {
    console.error('Error fetching memo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id as string }
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const data = await request.json();
    
    const existing = await prisma.memo.findUnique({
      where: { id },
      include: { signatures: true }
    });

    if (!existing || existing.deletedAt !== null) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    // Permission check for editing
    if (currentUser.role !== 'ADMIN' && existing.createdById !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden: Only the memo creator can edit this document' }, { status: 403 });
    }
    
    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot edit cancelled memo' }, { status: 400 });
    }
    if (!['DRAFT', 'REVISION_REQUESTED', 'WITHDRAWN'].includes(existing.approvalStatus)) {
      return NextResponse.json({ error: 'Cannot edit a submitted or approved memo snapshot' }, { status: 409 });
    }

    // Prepare update data
    const updateData: Prisma.MemoUpdateInput = {
      updatedById: currentUser.id,
      documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
      recipient: data.recipient,
      sender: data.sender,
      subject: data.subject,
      reference: data.reference,
      carbonCopy: data.carbonCopy,
      content: data.content,
      remark: data.remark !== undefined ? (data.remark?.trim() || null) : undefined,
    };

    if (data.memoTypeId) {
      const effectiveDepartmentId = existing.status === 'DRAFT' && data.departmentId
        ? data.departmentId
        : existing.departmentId;
      const [department, memoType] = await Promise.all([
        prisma.department.findUnique({ where: { id: effectiveDepartmentId } }),
        prisma.memoType.findFirst({ where: { id: data.memoTypeId, isActive: true } }),
      ]);
      const effectiveBranchId = existing.branchId ?? currentUser.branchId ?? memoType?.branchId ?? department?.branchId ?? null;
      const branchDepartment = department && effectiveBranchId ? await prisma.branchDepartment.findUnique({ where: { branchId_departmentId: { branchId: effectiveBranchId, departmentId: department.id } } }) : null;
      if (!department || !memoType || !effectiveBranchId || !branchDepartment?.isActive || (memoType.branchId && memoType.branchId !== effectiveBranchId)) {
        return NextResponse.json({ error: 'Memo Type is inactive or unavailable for this branch' }, { status: 400 });
      }
      updateData.memoType = { connect: { id: memoType.id } };
      updateData.branch = { connect: { id: effectiveBranchId } };
    } else if (data.memoTypeId === null) {
      if (existing.memoTypeId && existing.approvalStatus !== 'DRAFT') {
        return NextResponse.json({ error: 'Cannot remove E-Approve Memo Type after the memo has entered approval' }, { status: 409 });
      }
      updateData.memoType = { disconnect: true };
      updateData.branch = { disconnect: true };
    }

    // If FINAL: STRICTLY LOCK Logo, subHeader, and departmentId
    if (existing.status === 'FINAL') {
      if (data.logoUrl && data.logoUrl !== existing.logoUrl) {
        return NextResponse.json({ error: 'Cannot modify logo on finalized memo' }, { status: 400 });
      }
      if (data.subHeader && data.subHeader !== existing.subHeader) {
        return NextResponse.json({ error: 'Cannot modify subheader on finalized memo' }, { status: 400 });
      }
      if (data.departmentId && data.departmentId !== existing.departmentId) {
        return NextResponse.json({ error: 'Cannot modify department on finalized memo' }, { status: 400 });
      }
    } else if (existing.status === 'DRAFT') {
      // DRAFT mode: Admin can change department, regular user locked to own department
      if (data.departmentId) {
        if (currentUser.role !== 'ADMIN' && data.departmentId !== currentUser.departmentId) {
          return NextResponse.json({ error: 'Cannot change department to another department' }, { status: 403 });
        }
        updateData.department = { connect: { id: data.departmentId } };
      }
      if (data.subHeader !== undefined) {
        updateData.subHeader = data.subHeader.trim().toLocaleUpperCase('en-US');
      }
    }

    // Handle signatures update
    if (data.signatures) {
      updateData.signatures = {
        deleteMany: {},
        create: data.signatures.map((sig: { role?: string; name?: string | null; position?: string | null }, index: number) => ({
          role: sig.role || '',
          name: sig.name || null,
          position: sig.position || null,
          sortOrder: index
        }))
      };
    }

    const memo = await prisma.memo.update({
      where: { id },
      data: updateData,
      include: { signatures: true }
    });

    return NextResponse.json(memo);
  } catch (error) {
    console.error('Error updating memo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id as string }
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    
    const memo = await prisma.memo.findUnique({
      where: { id },
      include: { department: true, attachments: true }
    });

    if (!memo || memo.deletedAt !== null) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    // Permission check
    if (currentUser.role !== 'ADMIN' && memo.createdById !== currentUser.id) {
      return NextResponse.json({
        error: 'Forbidden: Only the memo creator can delete this document'
      }, { status: 403 });
    }

    // Any issued document number is permanent; cancellation never makes it deletable.
    if (memo.documentNo) {
      return NextResponse.json({ 
        error: 'ไม่สามารถลบเอกสารที่ออกเลขแล้วได้'
      }, { status: 400 });
    }

    const deleteMemoAndFiles = async () => {
      await prisma.memo.delete({ where: { id: memo.id } });
      await Promise.all(memo.attachments.map((attachment) => {
        const { target } = memoAttachmentPath(memo.id, attachment.storedFileName);
        return fs.unlink(target).catch(() => undefined);
      }));
    };

    // DRAFT without documentNo -> Hard Delete
    if (memo.status === 'DRAFT' && !memo.documentNo) {
      await deleteMemoAndFiles();
      return NextResponse.json({ success: true, deletionType: 'hard' });
    }

    // CANCELLED without documentNo -> Hard Delete
    if (memo.status === 'CANCELLED' && !memo.documentNo) {
      await deleteMemoAndFiles();
      return NextResponse.json({ success: true, deletionType: 'hard' });
    }

    // Otherwise Hard Delete
    await deleteMemoAndFiles();
    return NextResponse.json({ success: true, deletionType: 'hard' });

  } catch (error) {
    console.error('Error deleting memo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
