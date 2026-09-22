import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

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
    if (currentUser.role !== 'ADMIN' && currentUser.departmentId !== existing.departmentId) {
      return NextResponse.json({ error: 'Forbidden: You cannot edit memos from another department' }, { status: 403 });
    }
    
    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot edit cancelled memo' }, { status: 400 });
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
      include: { department: true }
    });

    if (!memo || memo.deletedAt !== null) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    // Permission check
    if (currentUser.role !== 'ADMIN') {
      if (!currentUser.departmentId || currentUser.departmentId !== memo.departmentId) {
        return NextResponse.json({ 
          error: 'Forbidden: You do not have permission to delete memos from another department' 
        }, { status: 403 });
      }
    }

    // FINAL status cannot be deleted
    if (memo.status === 'FINAL') {
      return NextResponse.json({ 
        error: 'ไม่สามารถลบเอกสารที่ออกเลขแล้ว กรุณายกเลิกเอกสารก่อน' 
      }, { status: 400 });
    }

    // DRAFT without documentNo -> Hard Delete
    if (memo.status === 'DRAFT' && !memo.documentNo) {
      await prisma.memo.delete({
        where: { id: memo.id }
      });
      return NextResponse.json({ success: true, deletionType: 'hard' });
    }

    // CANCELLED with documentNo -> Soft Delete
    if (memo.status === 'CANCELLED' && memo.documentNo) {
      await prisma.memo.update({
        where: { id: memo.id },
        data: {
          deletedAt: new Date(),
          deletedById: currentUser.id,
        }
      });
      return NextResponse.json({ success: true, deletionType: 'soft' });
    }

    // CANCELLED without documentNo -> Hard Delete
    if (memo.status === 'CANCELLED' && !memo.documentNo) {
      await prisma.memo.delete({
        where: { id: memo.id }
      });
      return NextResponse.json({ success: true, deletionType: 'hard' });
    }

    // Fallback for any memo with documentNo that is not FINAL (e.g. edge cases) -> Soft Delete
    if (memo.documentNo) {
      await prisma.memo.update({
        where: { id: memo.id },
        data: {
          deletedAt: new Date(),
          deletedById: currentUser.id,
        }
      });
      return NextResponse.json({ success: true, deletionType: 'soft' });
    }

    // Otherwise Hard Delete
    await prisma.memo.delete({
      where: { id: memo.id }
    });
    return NextResponse.json({ success: true, deletionType: 'hard' });

  } catch (error) {
    console.error('Error deleting memo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
