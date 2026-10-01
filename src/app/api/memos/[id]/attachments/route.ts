import { promises as fs } from 'node:fs';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fileExtension, getAttachmentLimits, isAllowedMemoAttachment, memoAttachmentPath } from '@/lib/memo-attachments';

type IncomingAttachment = {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
};

async function readIncomingAttachments(request: Request): Promise<IncomingAttachment[]> {
  const encodedFileName = request.headers.get('x-upload-file-name');
  if (encodedFileName) {
    let name: string;
    try {
      name = decodeURIComponent(encodedFileName);
    } catch {
      throw new Error('INVALID_FILE_NAME');
    }
    const buffer = Buffer.from(await request.arrayBuffer());
    return [{
      name,
      type: request.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream',
      size: buffer.length,
      buffer,
    }];
  }

  // Backward compatibility for clients that still submit multipart/form-data.
  const formData = await request.formData();
  const files = formData.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);
  return Promise.all(files.map(async (file) => ({
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    buffer: Buffer.from(await file.arrayBuffer()),
  })));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: memoId } = await params;
  const [actor, memo, limits] = await Promise.all([
    prisma.user.findUnique({ where: { id: String(session.id) }, select: { id: true, role: true, isActive: true } }),
    prisma.memo.findUnique({ where: { id: memoId }, include: { attachments: { select: { fileSize: true } } } }),
    getAttachmentLimits(prisma),
  ]);
  if (!actor?.isActive) return NextResponse.json({ error: 'บัญชีผู้ใช้ไม่ได้เปิดใช้งาน' }, { status: 403 });
  if (!memo || memo.deletedAt) return NextResponse.json({ error: 'ไม่พบ Memo' }, { status: 404 });
  if (actor.role !== 'ADMIN' && memo.createdById !== actor.id) return NextResponse.json({ error: 'เฉพาะผู้สร้าง Memo หรือ Admin เท่านั้นที่แนบไฟล์ได้' }, { status: 403 });
  if (!['DRAFT', 'REVISION_REQUESTED', 'WITHDRAWN'].includes(memo.approvalStatus)) {
    return NextResponse.json({ error: 'ไม่สามารถแก้ไขไฟล์แนบหลังส่งอนุมัติแล้ว' }, { status: 409 });
  }

  let files: IncomingAttachment[];
  try {
    files = await readIncomingAttachments(request);
  } catch (error) {
    console.error('Unable to read memo attachment request:', error instanceof Error ? error.message : 'Unknown request error');
    return NextResponse.json({ error: 'ไม่สามารถอ่านข้อมูลไฟล์แนบได้' }, { status: 400 });
  }
  if (files.length === 0) return NextResponse.json({ error: 'กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์' }, { status: 400 });
  if (memo.attachments.length + files.length > 20) return NextResponse.json({ error: 'แนบไฟล์ได้สูงสุด 20 ไฟล์ต่อ Memo' }, { status: 400 });

  const maxFileBytes = limits.maxFileMb * 1024 * 1024;
  const maxTotalBytes = limits.maxTotalMb * 1024 * 1024;
  const existingTotal = memo.attachments.reduce((sum, item) => sum + item.fileSize, 0);
  const selectedTotal = files.reduce((sum, file) => sum + file.size, 0);
  if (existingTotal + selectedTotal > maxTotalBytes) {
    return NextResponse.json({ error: `ไฟล์แนบรวมต้องไม่เกิน ${limits.maxTotalMb} MB` }, { status: 400 });
  }

  const prepared: Array<{ file: IncomingAttachment; buffer: Buffer; storedFileName: string }> = [];
  for (const file of files) {
    if (file.name.length > 255) return NextResponse.json({ error: 'ชื่อไฟล์ยาวเกิน 255 ตัวอักษร' }, { status: 400 });
    if (file.size > maxFileBytes) return NextResponse.json({ error: `ไฟล์ “${file.name}” ต้องไม่เกิน ${limits.maxFileMb} MB` }, { status: 400 });
    const buffer = file.buffer;
    if (!isAllowedMemoAttachment(buffer, file.type, file.name)) {
      return NextResponse.json({ error: `ไฟล์ “${file.name}” ไม่ถูกต้อง รองรับ PDF, Word, Excel, PNG และ JPG` }, { status: 400 });
    }
    prepared.push({ file, buffer, storedFileName: `${crypto.randomUUID()}.${fileExtension(file.name)}` });
  }

  const writtenPaths: string[] = [];
  try {
    for (const item of prepared) {
      const { directory, target } = memoAttachmentPath(memoId, item.storedFileName);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(target, item.buffer, { flag: 'wx' });
      writtenPaths.push(target);
    }
    const attachments = await prisma.$transaction(async (tx) => {
      await tx.memoAttachment.createMany({ data: prepared.map((item) => ({
        memoId,
        fileName: item.file.name,
        storedFileName: item.storedFileName,
        mimeType: item.file.type || 'application/octet-stream',
        fileSize: item.file.size,
        uploadedById: actor.id,
      })) });
      await tx.auditLog.create({ data: {
        module: 'E_APPROVE',
        action: 'ADDED_MEMO_ATTACHMENTS', entity: 'MEMO', entityId: memoId, userId: actor.id,
        newValue: JSON.stringify(prepared.map((item) => ({ fileName: item.file.name, fileSize: item.file.size, mimeType: item.file.type }))),
      } });
      return tx.memoAttachment.findMany({ where: { memoId }, orderBy: { createdAt: 'asc' } });
    });
    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    console.error('Unable to persist memo attachments:', error instanceof Error ? error.message : 'Unknown persistence error');
    await Promise.all(writtenPaths.map((target) => fs.unlink(target).catch(() => undefined)));
    return NextResponse.json({ error: 'ไม่สามารถบันทึกไฟล์แนบได้' }, { status: 500 });
  }
}
