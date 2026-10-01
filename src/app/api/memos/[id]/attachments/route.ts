import { promises as fs } from 'node:fs';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fileExtension, getAttachmentLimits, isAllowedMemoAttachment, memoAttachmentPath } from '@/lib/memo-attachments';
import { MEMO_UPLOAD_CHUNK_BYTES } from '@/lib/memo-upload';

type IncomingAttachment = {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
};

const chunkResponseHeaders = {
  'Cache-Control': 'no-store',
  Connection: 'close',
};

export async function HEAD() {
  const session = await getSession();
  if (!session?.id) return new Response(null, { status: 401, headers: chunkResponseHeaders });
  return new Response(null, { status: 204, headers: chunkResponseHeaders });
}

function decodeFileName(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error('INVALID_FILE_NAME');
  }
}

async function readIncomingAttachments(request: Request, parsedFormData?: FormData): Promise<IncomingAttachment[]> {
  const encodedFileName = request.headers.get('x-upload-file-name');
  if (encodedFileName) {
    const name = decodeFileName(encodedFileName);
    const buffer = Buffer.from(await request.arrayBuffer());
    return [{
      name,
      type: request.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream',
      size: buffer.length,
      buffer,
    }];
  }

  // Backward compatibility for clients that still submit multipart/form-data.
  const formData = parsedFormData ?? await request.formData();
  const files = formData.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);
  return Promise.all(files.map(async (file) => ({
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    buffer: Buffer.from(await file.arrayBuffer()),
  })));
}

async function removeUploadParts(memoId: string, uploadId: string, chunkCount: number) {
  await Promise.all(Array.from({ length: chunkCount }, (_, index) => {
    const { target } = memoAttachmentPath(memoId, `.upload-${uploadId}-${index}.part`);
    return fs.unlink(target).catch(() => undefined);
  }));
  const { target: lockPath } = memoAttachmentPath(memoId, `.upload-${uploadId}.lock`);
  await fs.unlink(lockPath).catch(() => undefined);
}

async function cleanupStaleUploadParts(directory: string) {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.startsWith('.upload-'))
    .map(async (entry) => {
      const target = `${directory}/${entry.name}`;
      const stat = await fs.stat(target).catch(() => null);
      if (stat && stat.mtimeMs < oneDayAgo) await fs.unlink(target).catch(() => undefined);
    }));
}

function formDataText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

async function handleChunkUpload(request: Request, options: {
  memoId: string;
  actorId: string;
  existingFileSizes: number[];
  existingFileCount: number;
  maxFileBytes: number;
  maxTotalBytes: number;
}, formData?: FormData) {
  const uploadId = formData ? formDataText(formData, 'uploadId') : request.headers.get('x-upload-id') ?? '';
  const fileName = formData
    ? formDataText(formData, 'fileName')
    : decodeFileName(request.headers.get('x-upload-file-name') ?? '');
  const mimeType = formData
    ? formDataText(formData, 'fileType') || 'application/octet-stream'
    : request.headers.get('x-upload-file-type') || 'application/octet-stream';
  const chunkIndex = Number(formData ? formDataText(formData, 'chunkIndex') : request.headers.get('x-upload-chunk-index'));
  const chunkCount = Number(formData ? formDataText(formData, 'chunkCount') : request.headers.get('x-upload-chunk-count'));
  const declaredFileSize = Number(formData ? formDataText(formData, 'fileSize') : request.headers.get('x-upload-file-size'));

  if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return NextResponse.json({ error: 'Upload ID ไม่ถูกต้อง' }, { status: 400 });
  if (!fileName || fileName.length > 255) return NextResponse.json({ error: 'ชื่อไฟล์ไม่ถูกต้องหรือยาวเกิน 255 ตัวอักษร' }, { status: 400 });
  if (!Number.isInteger(chunkIndex) || !Number.isInteger(chunkCount) || chunkIndex < 0 || chunkCount < 1 || chunkIndex >= chunkCount) {
    return NextResponse.json({ error: 'ลำดับส่วนของไฟล์ไม่ถูกต้อง' }, { status: 400 });
  }
  if (!Number.isInteger(declaredFileSize) || declaredFileSize < 1 || declaredFileSize > options.maxFileBytes) {
    return NextResponse.json({ error: 'ขนาดไฟล์ไม่ถูกต้องหรือเกินขนาดสูงสุด' }, { status: 400 });
  }
  const expectedChunkCount = Math.ceil(declaredFileSize / MEMO_UPLOAD_CHUNK_BYTES);
  if (chunkCount !== expectedChunkCount) return NextResponse.json({ error: 'จำนวนส่วนของไฟล์ไม่ถูกต้อง' }, { status: 400 });
  if (options.existingFileCount + 1 > 20) return NextResponse.json({ error: 'แนบไฟล์ได้สูงสุด 20 ไฟล์ต่อ Memo' }, { status: 400 });
  const existingTotal = options.existingFileSizes.reduce((sum, size) => sum + size, 0);
  if (existingTotal + declaredFileSize > options.maxTotalBytes) {
    return NextResponse.json({ error: 'ขนาดไฟล์แนบรวมเกินขนาดสูงสุด' }, { status: 400 });
  }

  const chunkPart = formData?.get('chunk');
  const chunk = formData
    ? chunkPart instanceof File ? Buffer.from(await chunkPart.arrayBuffer()) : Buffer.alloc(0)
    : Buffer.from(await request.arrayBuffer());
  const expectedChunkSize = Math.min(MEMO_UPLOAD_CHUNK_BYTES, declaredFileSize - (chunkIndex * MEMO_UPLOAD_CHUNK_BYTES));
  if (chunk.length !== expectedChunkSize) return NextResponse.json({ error: 'ขนาดส่วนของไฟล์ไม่ถูกต้อง' }, { status: 400 });

  const { directory, target: partPath } = memoAttachmentPath(options.memoId, `.upload-${uploadId}-${chunkIndex}.part`);
  await fs.mkdir(directory, { recursive: true });
  if (chunkIndex === 0) await cleanupStaleUploadParts(directory);
  await fs.writeFile(partPath, chunk);

  if (chunkIndex < chunkCount - 1) {
    return NextResponse.json(
      { complete: false, receivedChunk: chunkIndex },
      { status: 202, headers: chunkResponseHeaders },
    );
  }

  const { target: lockPath } = memoAttachmentPath(options.memoId, `.upload-${uploadId}.lock`);
  try {
    await fs.writeFile(lockPath, String(Date.now()), { flag: 'wx' });
  } catch {
    return NextResponse.json({ error: 'ไฟล์นี้กำลังถูกประกอบ กรุณารอสักครู่' }, { status: 409 });
  }

  let finalPath: string | null = null;
  try {
    const parts = await Promise.all(Array.from({ length: chunkCount }, async (_, index) => {
      const { target } = memoAttachmentPath(options.memoId, `.upload-${uploadId}-${index}.part`);
      return fs.readFile(target);
    }));
    const file = Buffer.concat(parts);
    if (file.length !== declaredFileSize || !isAllowedMemoAttachment(file, mimeType, fileName)) {
      return NextResponse.json({ error: `ไฟล์ “${fileName}” ไม่ถูกต้อง รองรับ PDF, Word, Excel, PNG และ JPG` }, { status: 400 });
    }

    const storedFileName = `${crypto.randomUUID()}.${fileExtension(fileName)}`;
    const resolved = memoAttachmentPath(options.memoId, storedFileName);
    finalPath = resolved.target;
    await fs.writeFile(finalPath, file, { flag: 'wx' });
    const attachments = await prisma.$transaction(async (tx) => {
      await tx.memoAttachment.create({ data: {
        memoId: options.memoId,
        fileName,
        storedFileName,
        mimeType,
        fileSize: file.length,
        uploadedById: options.actorId,
      } });
      await tx.auditLog.create({ data: {
        module: 'E_APPROVE',
        action: 'ADDED_MEMO_ATTACHMENTS', entity: 'MEMO', entityId: options.memoId, userId: options.actorId,
        newValue: JSON.stringify([{ fileName, fileSize: file.length, mimeType }]),
      } });
      return tx.memoAttachment.findMany({ where: { memoId: options.memoId }, orderBy: { createdAt: 'asc' } });
    });
    return NextResponse.json(
      { complete: true, attachments },
      { status: 201, headers: chunkResponseHeaders },
    );
  } catch (error) {
    console.error('Unable to assemble memo attachment chunks:', error instanceof Error ? error.message : 'Unknown chunk error');
    if (finalPath) await fs.unlink(finalPath).catch(() => undefined);
    return NextResponse.json({ error: 'ไม่สามารถประกอบไฟล์แนบได้ กรุณาลองใหม่' }, { status: 500 });
  } finally {
    await removeUploadParts(options.memoId, uploadId, chunkCount);
  }
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

  const maxFileBytes = limits.maxFileMb * 1024 * 1024;
  const maxTotalBytes = limits.maxTotalMb * 1024 * 1024;
  let parsedFormData: FormData | undefined;
  try {
    if (request.headers.get('content-type')?.includes('multipart/form-data')) parsedFormData = await request.formData();
  } catch (error) {
    console.error('Unable to parse memo attachment multipart request:', error instanceof Error ? error.message : 'Unknown multipart error');
    return NextResponse.json({ error: 'ไม่สามารถอ่านข้อมูลไฟล์แนบได้' }, { status: 400 });
  }
  if (request.headers.has('x-upload-id') || parsedFormData?.has('uploadId')) {
    try {
      return await handleChunkUpload(request, {
        memoId,
        actorId: actor.id,
        existingFileSizes: memo.attachments.map((attachment) => attachment.fileSize),
        existingFileCount: memo.attachments.length,
        maxFileBytes,
        maxTotalBytes,
      }, parsedFormData);
    } catch (error) {
      console.error('Unable to process memo attachment chunk:', error instanceof Error ? error.message : 'Unknown chunk request error');
      return NextResponse.json({ error: 'ไม่สามารถรับส่วนของไฟล์แนบได้' }, { status: 400 });
    }
  }

  let files: IncomingAttachment[];
  try {
    files = await readIncomingAttachments(request, parsedFormData);
  } catch (error) {
    console.error('Unable to read memo attachment request:', error instanceof Error ? error.message : 'Unknown request error');
    return NextResponse.json({ error: 'ไม่สามารถอ่านข้อมูลไฟล์แนบได้' }, { status: 400 });
  }
  if (files.length === 0) return NextResponse.json({ error: 'กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์' }, { status: 400 });
  if (memo.attachments.length + files.length > 20) return NextResponse.json({ error: 'แนบไฟล์ได้สูงสุด 20 ไฟล์ต่อ Memo' }, { status: 400 });

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
