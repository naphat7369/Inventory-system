import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id as string }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const templates = await prisma.signatureTemplate.findMany({
      where: {
        userId: currentUser.id
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching signature templates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check count
    const templateCount = await prisma.signatureTemplate.count({
      where: { userId: currentUser.id }
    });

    if (templateCount >= 30) {
      return NextResponse.json({ error: 'คุณมีเทมเพลตเกินจำนวนสูงสุดที่อนุญาต (30 ชุด) แล้ว' }, { status: 400 });
    }

    // Check unique name for this user
    const existingTemplate = await prisma.signatureTemplate.findUnique({
      where: {
        userId_name: {
          userId: currentUser.id,
          name: normalizedName
        }
      }
    });

    if (existingTemplate) {
      return NextResponse.json({ error: 'คุณมีเทมเพลตชื่อนี้อยู่แล้ว กรุณาใช้ชื่ออื่น' }, { status: 409 });
    }

    const newTemplate = await prisma.signatureTemplate.create({
      data: {
        userId: currentUser.id,
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

    return NextResponse.json(newTemplate);
  } catch (error) {
    console.error('Error creating signature template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
