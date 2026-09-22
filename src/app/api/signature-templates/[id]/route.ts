import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id as string }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();
    const { name, items } = data;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'ชื่อเทมเพลตต้องไม่ว่าง' }, { status: 400 });
    }

    const normalizedName = name.trim();
    if (normalizedName.length < 1 || normalizedName.length > 100) {
      return NextResponse.json({ error: 'ชื่อเทมเพลตต้องมีความยาว 1-100 ตัวอักษร' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'เทมเพลตต้องมีผู้เซ็นอย่างน้อย 1 คน' }, { status: 400 });
    }

    if (items.length > 20) {
      return NextResponse.json({ error: 'เทมเพลตมีผู้เซ็นได้สูงสุด 20 คน' }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.role || typeof item.role !== 'string' || item.role.trim() === '') {
        return NextResponse.json({ error: 'บทบาท (Role) ของผู้เซ็นทุกคนต้องไม่ว่าง' }, { status: 400 });
      }
      if (item.name === undefined || item.name === null || typeof item.name !== 'string' || item.name.trim() === '') {
        return NextResponse.json({ error: 'ชื่อผู้เซ็นทุกคนต้องไม่ว่าง' }, { status: 400 });
      }
    }

    // Check ownership
    const existingTemplate = await prisma.signatureTemplate.findFirst({
      where: {
        id: id,
        userId: currentUser.id
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check unique name for this user (excluding current template)
    const duplicateTemplate = await prisma.signatureTemplate.findFirst({
      where: {
        userId: currentUser.id,
        name: normalizedName,
        id: { not: id }
      }
    });

    if (duplicateTemplate) {
      return NextResponse.json({ error: 'คุณมีเทมเพลตชื่อนี้อยู่แล้ว กรุณาใช้ชื่ออื่น' }, { status: 409 });
    }

    // Update using transaction to ensure clean replacement of items
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.signatureTemplateItem.deleteMany({
        where: { templateId: id }
      });

      // Update template and create new items
      return await tx.signatureTemplate.update({
        where: { id },
        data: {
          name: normalizedName,
          items: {
            create: items.map((item: any, index: number) => ({
              role: item.role.trim(),
              name: item.name.trim(),
              position: item.position?.trim() || null,
              sortOrder: index,
            }))
          }
        },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating signature template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id as string }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check ownership
    const existingTemplate = await prisma.signatureTemplate.findFirst({
      where: {
        id: id,
        userId: currentUser.id
      }
    });

    if (!existingTemplate) {
      // Return 404 to not expose whether the ID exists for another user
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await prisma.signatureTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting signature template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
