import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { DEFAULT_S_HOTEL_LOGO_URL } from '@/lib/constants';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const status = searchParams.get('status') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id as string }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: Prisma.MemoWhereInput = {
      deletedAt: null
    };
    
    if (currentUser.role !== 'ADMIN') {
      if (!currentUser.departmentId) {
        where.departmentId = 'unauthorized-no-dept';
      } else {
        where.departmentId = currentUser.departmentId;
      }
    } else if (departmentId) {
      where.departmentId = departmentId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { documentNo: { contains: search } },
        { subject: { contains: search } },
        { recipient: { contains: search } },
        { sender: { contains: search } },
      ];
    }

    const [memos, total] = await Promise.all([
      prisma.memo.findMany({
        where,
        include: {
          department: {
            select: { name: true, code: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.memo.count({ where })
    ]);

    return NextResponse.json({
      data: memos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching memos:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id as string },
      include: { department: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();
    const { 
      departmentId, documentDate, recipient, sender, 
      subject, reference, carbonCopy, content, signatures,
      subHeader, remark 
    } = data;

    if (!documentDate || !recipient || !sender || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Role-based Department enforcement
    let finalDepartmentId: string;
    if (currentUser.role !== 'ADMIN') {
      if (!currentUser.departmentId) {
        return NextResponse.json({ 
          error: 'บัญชีของคุณยังไม่ได้กำหนดแผนก กรุณาติดต่อผู้ดูแลระบบ' 
        }, { status: 403 });
      }
      if (departmentId && departmentId !== currentUser.departmentId) {
        return NextResponse.json({ 
          error: 'Cannot create memo for another department' 
        }, { status: 403 });
      }
      finalDepartmentId = currentUser.departmentId;
    } else {
      if (!departmentId) {
        return NextResponse.json({ error: 'Department is required' }, { status: 400 });
      }
      finalDepartmentId = departmentId;
    }

    const department = await prisma.department.findUnique({
      where: { id: finalDepartmentId }
    });

    if (!department || !department.isActive) {
      return NextResponse.json({ error: 'Department not found or inactive' }, { status: 400 });
    }

    // Fixed S HOTEL Logo rule: versioned constant for all new memos
    const finalLogoUrl = DEFAULT_S_HOTEL_LOGO_URL;
    const finalLogoAssetId = null;

    // SubHeader rule: Custom specified in form -> Department nameEn -> Department.name DEPARTMENT (Uppercase)
    const rawSubHeader = subHeader || department.nameEn || `${department.name} DEPARTMENT`;
    const finalSubHeader = rawSubHeader.trim().toLocaleUpperCase('en-US');

    const memo = await prisma.memo.create({
      data: {
        departmentId: finalDepartmentId,
        documentDate: new Date(documentDate),
        recipient,
        sender,
        subject,
        subHeader: finalSubHeader,
        logoUrl: finalLogoUrl,
        logoAssetId: finalLogoAssetId,
        reference: reference || null,
        carbonCopy: carbonCopy || null,
        content,
        remark: remark?.trim() || null,
        status: 'DRAFT',
        createdById: currentUser.id,
        updatedById: currentUser.id,
        signatures: {
          create: signatures?.map((sig: { role?: string; name?: string | null; position?: string | null }, index: number) => ({
            role: sig.role || '',
            name: sig.name || null,
            position: sig.position || null,
            sortOrder: index
          })) || []
        }
      },
      include: { signatures: true }
    });

    return NextResponse.json(memo);
  } catch (error) {
    console.error('Error creating memo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
