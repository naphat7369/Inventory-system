import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    
    // Check if department exists
    const existing = await prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn.trim().toLocaleUpperCase('en-US');
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.logoAssetId !== undefined) updateData.logoAssetId = data.logoAssetId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const department = await prisma.department.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // The requirements say: ห้ามลบรหัสแผนกที่เคยถูกใช้ออกเลขเอกสารแล้ว
    // (Do not delete a department that has been used to issue a memo number)
    const memosCount = await prisma.memo.count({
      where: { departmentId: id, status: 'FINAL' }, // Only checking if it has issued documents
    });

    if (memosCount > 0) {
      return NextResponse.json({ error: 'Cannot delete department with issued memos' }, { status: 400 });
    }
    
    // Check if it has any memos at all (even DRAFT) to be safe from foreign key constraint errors
    const totalMemos = await prisma.memo.count({
      where: { departmentId: id },
    });
    
    if (totalMemos > 0) {
        return NextResponse.json({ error: 'Cannot delete department with associated memos (even drafts). Please disable it instead.' }, { status: 400 });
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
