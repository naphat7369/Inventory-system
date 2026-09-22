import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

function getValidatedExtension(buffer: Buffer, mimeType: string): string | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    if (mimeType === 'image/png') return 'png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/pjpeg') return 'jpg';
  }
  // WEBP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    if (mimeType === 'image/webp') return 'webp';
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Max size: 2 MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds maximum allowed 2MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = getValidatedExtension(buffer, file.type);
    if (!ext) {
      return NextResponse.json({ 
        error: 'Invalid file format or spoofed file signature. Only valid PNG, JPEG, and WEBP files are allowed.' 
      }, { status: 400 });
    }

    // Always generate random UUID on server - never trust user filename
    const uniqueFileName = `${crypto.randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueFileName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/logos/${uniqueFileName}`;

    const logoAsset = await prisma.logoAsset.create({
      data: {
        fileName: uniqueFileName,
        url: publicUrl,
        mimeType: file.type,
        size: buffer.length,
      }
    });

    return NextResponse.json({
      success: true,
      asset: logoAsset
    });
  } catch (error: unknown) {
    console.error('Error in logo upload API:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Only ADMIN can delete logo assets' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing logo asset ID' }, { status: 400 });
    }

    const asset = await prisma.logoAsset.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memos: true, departments: true }
        }
      }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Logo asset not found' }, { status: 404 });
    }

    // Never delete default branding logo
    if (asset.fileName === 's-hotel-default-v1.png' || asset.url.includes('s-hotel-default-v1')) {
      return NextResponse.json({ error: 'Cannot delete system default branding logo' }, { status: 400 });
    }

    // REFERENCE COUNT SAFETY CHECK: Cannot delete if any Memo or Department is using this logo
    const memoCount = asset._count.memos;
    const deptCount = asset._count.departments;

    if (memoCount > 0 || deptCount > 0) {
      return NextResponse.json({
        error: `Cannot delete logo: It is currently referenced by ${memoCount} memo(s) and ${deptCount} department(s).`
      }, { status: 400 });
    }

    // Safe to delete file and record
    try {
      const filePath = path.join(process.cwd(), 'public', asset.url);
      await fs.unlink(filePath);
    } catch {
      // File may already be deleted from disk
    }

    await prisma.logoAsset.delete({
      where: { id: asset.id }
    });

    return NextResponse.json({ success: true, message: 'Logo deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting logo asset:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
