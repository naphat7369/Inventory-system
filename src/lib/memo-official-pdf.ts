import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { pdfJobKey } from '@/lib/eapprove/idempotency';

type Db = PrismaClient | Prisma.TransactionClient;

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function queueOfficialPdfForFinalMemo(db: Db, memoId: string, actorId: string) {
  const memo = await db.memo.findUnique({
    where: { id: memoId },
    include: {
      signatures: { orderBy: { sortOrder: 'asc' } },
      attachments: { orderBy: { createdAt: 'asc' } },
      versions: { orderBy: { version: 'desc' }, take: 1 },
      pdfArtifacts: { where: { kind: 'OFFICIAL' }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!memo || memo.deletedAt) throw new Error('Memo not found');
  if (!memo.documentNo || memo.status !== 'FINAL' || memo.memoTypeId) {
    throw new Error('Official PDF for a normal memo can be generated only after the memo is finalized');
  }
  if (memo.pdfStatus === 'READY' && memo.pdfArtifacts[0]) {
    return { status: 'READY', versionId: memo.pdfArtifacts[0].memoVersionId };
  }

  let version = memo.versions[0];
  if (!version) {
    const contentSnapshot = {
      documentNo: memo.documentNo,
      documentDate: memo.documentDate,
      recipient: memo.recipient,
      sender: memo.sender,
      subject: memo.subject,
      subHeader: memo.subHeader,
      content: memo.content,
      remark: memo.remark,
      memoTypeId: memo.memoTypeId,
      departmentId: memo.departmentId,
      branchId: memo.branchId,
      signatures: memo.signatures,
      attachments: memo.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      })),
    };
    version = await db.memoVersion.create({
      data: {
        memoId: memo.id,
        version: 1,
        contentSnapshot: JSON.stringify(contentSnapshot),
        approvalChainSnapshot: '[]',
        contentHash: hash(contentSnapshot),
        createdById: actorId,
      },
    });
  }

  const idempotencyKey = pdfJobKey(memo.id, version.id);
  const existingJob = await db.backgroundJob.findUnique({ where: { idempotencyKey } });
  if (!existingJob) {
    await db.backgroundJob.create({
      data: {
        type: 'GENERATE_OFFICIAL_PDF',
        idempotencyKey,
        memoId: memo.id,
        payload: JSON.stringify({ memoId: memo.id, memoVersionId: version.id }),
      },
    });
  } else if (['FAILED', 'COMPLETED'].includes(existingJob.status)) {
    await db.backgroundJob.update({
      where: { id: existingJob.id },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        availableAt: new Date(),
        lockedAt: null,
        completedAt: null,
        lastErrorCode: null,
      },
    });
  }
  await db.memo.update({ where: { id: memo.id }, data: { pdfStatus: 'PENDING', pdfErrorCode: null } });
  return { status: 'PENDING', versionId: version.id, idempotencyKey };
}
