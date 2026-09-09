import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { promises as fs } from 'fs';

import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Access restricted to ADMIN users' }, { status: 403 });
    }

    const resolvedParams = await params;
    const { attachmentId } = resolvedParams;

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 });
    }

    const attachment = await prisma.renewalAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'File attachment record not found' }, { status: 404 });
    }

    // Always construct absolute path inside storage/renewals to prevent path traversal
    const safeFilePath = path.join(process.cwd(), 'storage', 'renewals', attachment.storedFileName);

    try {
      await fs.access(safeFilePath);
    } catch {
      return NextResponse.json({ error: 'File not found on storage disk' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(safeFilePath);
    const url = new URL(request.url);
    const isInline = url.searchParams.get('inline') === 'true';

    const contentType = attachment.fileType || 'application/octet-stream';
    const dispositionType = isInline ? 'inline' : 'attachment';

    // Encode filename safely for headers
    const encodedFileName = encodeURIComponent(attachment.fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error in secure file route:', error);
    return NextResponse.json({ error: error?.message || 'Failed to serve file' }, { status: 500 });
  }
}
