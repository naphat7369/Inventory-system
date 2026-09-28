import path from 'node:path';
import type { PrismaClient } from '@prisma/client';

export const MEMO_ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
export const MEMO_ATTACHMENT_DIRECTORY = path.join(process.cwd(), 'storage', 'memos');

const allowedMimeByExtension: Record<string, string[]> = {
  pdf: ['application/pdf', 'application/x-pdf'],
  doc: ['application/msword', 'application/octet-stream'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
  xls: ['application/vnd.ms-excel', 'application/octet-stream'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
  png: ['image/png'],
  jpg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
};

export function fileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLocaleLowerCase('en-US') ?? '';
}

export function isAllowedMemoAttachment(buffer: Buffer, mimeType: string, fileName: string) {
  const extension = fileExtension(fileName);
  if (!allowedMimeByExtension[extension]?.includes(mimeType || 'application/octet-stream')) return false;
  if (buffer.length < 4) return false;
  if (extension === 'pdf') return buffer.subarray(0, 4).toString('ascii') === '%PDF';
  if (extension === 'png') return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (extension === 'jpg' || extension === 'jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === 'docx' || extension === 'xlsx') return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (extension === 'doc' || extension === 'xls') {
    const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    return buffer.length >= ole.length && ole.every((byte, index) => buffer[index] === byte);
  }
  return false;
}

export async function getAttachmentLimits(prisma: PrismaClient) {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['attachmentMaxFileMb', 'attachmentMaxTotalMb'] } },
  });
  const values = Object.fromEntries(settings.map((item) => {
    try { return [item.key, Number(JSON.parse(item.value))]; }
    catch { return [item.key, Number.NaN]; }
  }));
  return {
    maxFileMb: Number.isFinite(values.attachmentMaxFileMb) ? values.attachmentMaxFileMb : 20,
    maxTotalMb: Number.isFinite(values.attachmentMaxTotalMb) ? values.attachmentMaxTotalMb : 100,
  };
}

export function memoAttachmentPath(memoId: string, storedFileName: string) {
  const directory = path.resolve(MEMO_ATTACHMENT_DIRECTORY, memoId);
  const target = path.resolve(directory, storedFileName);
  if (!target.startsWith(`${directory}${path.sep}`)) throw new Error('INVALID_ATTACHMENT_PATH');
  return { directory, target };
}

export function safeDownloadName(fileName: string) {
  return encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
}
