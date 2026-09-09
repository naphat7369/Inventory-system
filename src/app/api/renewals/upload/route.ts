import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';


function validateFileSignature(buffer: Buffer, mimeType: string, filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
  if (!allowedExts.includes(ext)) return false;

  if (buffer.length < 4) return false;

  // Check PDF (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return ext === 'pdf' && (mimeType === 'application/pdf' || mimeType === 'application/x-pdf');
  }

  // Check PNG (\x89PNG)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return ext === 'png' && mimeType === 'image/png';
  }

  // Check JPG / JPEG (\xFF\xD8\xFF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return (ext === 'jpg' || ext === 'jpeg') && (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/pjpeg');
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Only ADMIN users can upload contract files' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const category = (formData.get('attachmentCategory') as string) || 'General';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const storageDir = path.join(process.cwd(), 'storage', 'renewals');
    await fs.mkdir(storageDir, { recursive: true });

    const uploadedFilesData = [];

    for (const file of files) {
      const originalFileName = file.name;
      const fileSize = file.size;

      // File size limit: 10 MB (10 * 1024 * 1024 bytes)
      if (fileSize > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File "${originalFileName}" exceeds maximum allowed size of 10MB` },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate signature & extension
      const isValid = validateFileSignature(buffer, file.type, originalFileName);
      if (!isValid) {
        return NextResponse.json(
          { error: `File "${originalFileName}" invalid format or magic bytes mismatch. Only PDF, JPG, JPEG, PNG are allowed.` },
          { status: 400 }
        );
      }

      // Generate UUID disk filename
      const fileExt = originalFileName.split('.').pop()?.toLowerCase() || 'file';
      const storedFileName = `${crypto.randomUUID()}.${fileExt}`;
      const fullFilePath = path.join(storageDir, storedFileName);

      // Write to disk in storage/renewals/
      await fs.writeFile(fullFilePath, buffer);

      uploadedFilesData.push({
        fileName: originalFileName,
        storedFileName,
        filePath: fullFilePath,
        fileType: file.type,
        fileSize,
        attachmentCategory: category,
      });
    }

    return NextResponse.json({ success: true, files: uploadedFilesData });
  } catch (error: any) {
    console.error('Error in renewals file upload route:', error);
    return NextResponse.json({ error: error?.message || 'File upload failed' }, { status: 500 });
  }
}
