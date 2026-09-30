import { promises as fs } from 'node:fs';
import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';
import * as XLSX from 'xlsx';
import WordExtractor from 'word-extractor';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fileExtension, memoAttachmentPath, safeDownloadName } from '@/lib/memo-attachments';

function safePreviewHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['data', 'http', 'https'] },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

async function createOfficePreview(file: Buffer, fileName: string) {
  const extension = fileExtension(fileName);
  if (extension === 'docx') {
    const result = await mammoth.convertToHtml({ buffer: file }, {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read('base64');
        return { src: `data:${image.contentType};base64,${base64}` };
      }),
    });
    return safePreviewHtml(`<div class="word-document">${result.value}</div>`);
  }
  if (extension === 'doc') {
    const extracted = await new WordExtractor().extract(file);
    const body = escapeHtml(extracted.getBody()).replace(/\f/g, '</div><div class="word-page">').replace(/\r?\n/g, '<br>');
    return safePreviewHtml(`<div class="word-document legacy-word-document"><div class="word-page">${body}</div></div>`);
  }
  if (extension === 'xls' || extension === 'xlsx') {
    const workbook = XLSX.read(file, { type: 'buffer', cellDates: true });
    const sheets = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      return `<section class="excel-sheet"><h2>${escapeHtml(sheetName)}</h2>${XLSX.utils.sheet_to_html(sheet, { id: undefined })}</section>`;
    }).join('');
    return safePreviewHtml(`<div class="excel-workbook">${sheets}</div>`);
  }
  return null;
}

async function context(params: Promise<{ id: string; attachmentId: string }>, actorId: string) {
  const { id: memoId, attachmentId } = await params;
  const [actor, attachment] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, departmentId: true, isActive: true } }),
    prisma.memoAttachment.findFirst({ where: { id: attachmentId, memoId }, include: {
      memo: { include: { approvalRounds: { select: { steps: { select: { approverId: true } } } } } },
    } }),
  ]);
  return { actor, attachment, memoId, attachmentId };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { actor, attachment, memoId } = await context(params, String(session.id));
  if (!actor?.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!attachment || attachment.memo.deletedAt) return NextResponse.json({ error: 'ไม่พบไฟล์แนบ' }, { status: 404 });
  const participates = attachment.memo.approvalRounds.some((round) => round.steps.some((step) => step.approverId === actor.id));
  const canView = actor.role === 'ADMIN' || attachment.memo.createdById === actor.id || actor.departmentId === attachment.memo.departmentId || participates;
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { target } = memoAttachmentPath(memoId, attachment.storedFileName);
  try {
    const file = await fs.readFile(target);
    const encodedName = safeDownloadName(attachment.fileName);
    const wantsHtmlPreview = new URL(request.url).searchParams.get('preview') === 'html';
    if (wantsHtmlPreview) {
      try {
        const html = await createOfficePreview(file, attachment.fileName);
        if (!html) return NextResponse.json({ error: 'ไฟล์ประเภทนี้ไม่มี HTML Preview' }, { status: 415 });
        return NextResponse.json({ html }, { headers: { 'Cache-Control': 'private, max-age=300' } });
      } catch (error) {
        console.error('Unable to create memo attachment preview:', error instanceof Error ? error.message : 'Unknown preview error');
        return NextResponse.json({ error: 'ไม่สามารถประมวลผลตัวอย่างเอกสารนี้ได้' }, { status: 422 });
      }
    }
    const wantsInline = new URL(request.url).searchParams.get('view') === '1';
    const disposition = wantsInline ? 'inline' : 'attachment';
    const commonHeaders = {
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `${disposition}; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
    };
    const range = request.headers.get('range');
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (match) {
        const suffixLength = !match[1] && match[2] ? Number(match[2]) : null;
        const start = suffixLength !== null ? Math.max(0, file.length - suffixLength) : Number(match[1] || 0);
        const requestedEnd = suffixLength !== null ? file.length - 1 : (match[2] ? Number(match[2]) : file.length - 1);
        const end = Math.min(requestedEnd, file.length - 1);
        if (Number.isInteger(start) && Number.isInteger(end) && start >= 0 && start <= end && start < file.length) {
          const chunk = file.subarray(start, end + 1);
          return new NextResponse(chunk, { status: 206, headers: {
            ...commonHeaders,
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${start}-${end}/${file.length}`,
          } });
        }
      }
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${file.length}` } });
    }
    return new NextResponse(file, { headers: { ...commonHeaders, 'Content-Length': String(file.length) } });
  } catch {
    return NextResponse.json({ error: 'ไม่พบไฟล์ในพื้นที่จัดเก็บ' }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { actor, attachment, memoId, attachmentId } = await context(params, String(session.id));
  if (!actor?.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!attachment || attachment.memo.deletedAt) return NextResponse.json({ error: 'ไม่พบไฟล์แนบ' }, { status: 404 });
  if (actor.role !== 'ADMIN' && attachment.memo.createdById !== actor.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!['DRAFT', 'REVISION_REQUESTED', 'WITHDRAWN'].includes(attachment.memo.approvalStatus)) {
    return NextResponse.json({ error: 'ไม่สามารถลบไฟล์แนบหลังส่งอนุมัติแล้ว' }, { status: 409 });
  }
  await prisma.$transaction([
    prisma.memoAttachment.delete({ where: { id: attachmentId } }),
    prisma.auditLog.create({ data: {
      module: 'E_APPROVE',
      action: 'DELETED_MEMO_ATTACHMENT', entity: 'MEMO_ATTACHMENT', entityId: attachmentId, userId: actor.id,
      oldValue: JSON.stringify({ memoId, fileName: attachment.fileName, fileSize: attachment.fileSize, mimeType: attachment.mimeType }),
    } }),
  ]);
  const { target } = memoAttachmentPath(memoId, attachment.storedFileName);
  await fs.unlink(target).catch(() => undefined);
  return NextResponse.json({ deleted: true });
}
