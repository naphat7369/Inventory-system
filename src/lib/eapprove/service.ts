import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import { buildApprovalChain, ApprovalRuleError, type CandidateWithSource } from './chain';
import { pdfJobKey, notificationKey, runIdempotentTransaction } from './idempotency';
import { assertMemoTransition, canReplaceApprover } from './lifecycle';
import { EApproveError } from './errors';

type Db = PrismaClient | Prisma.TransactionClient;

export { EApproveError } from './errors';

const json = (value: unknown) => JSON.stringify(value);
const hash = (value: unknown) => createHash('sha256').update(json(value)).digest('hex');

async function enqueueNotification(tx: Db, input: { event: string; memoId: string; userId: string; payload: unknown }) {
  return tx.notification.upsert({
    where: { idempotencyKey: notificationKey(input.event, input.memoId, input.userId) },
    update: {},
    create: {
      userId: input.userId,
      memoId: input.memoId,
      type: input.event,
      payload: json(input.payload),
      idempotencyKey: notificationKey(input.event, input.memoId, input.userId),
    },
  });
}

export async function submitMemo(prisma: PrismaClient, input: {
  memoId: string;
  actorId: string;
  templateId?: string | null;
  userAddedApproverIds?: string[];
  idempotencyKey: string;
}) {
  return runIdempotentTransaction(prisma, {
    key: input.idempotencyKey, action: 'SUBMIT_MEMO', actorId: input.actorId, resourceId: input.memoId,
    request: { templateId: input.templateId ?? null, userAddedApproverIds: input.userAddedApproverIds ?? [] },
  }, async (tx) => {
    const memo = await tx.memo.findUnique({
      where: { id: input.memoId },
      include: {
        department: { include: { hod: true, branch: { include: { generalManager: true } } } },
        branch: { include: { generalManager: true } },
        memoType: { include: { requiredApprovers: { orderBy: { sortOrder: 'asc' }, include: { approver: true } } } },
        signatures: { orderBy: { sortOrder: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
        approvalRounds: { orderBy: { roundNumber: 'desc' }, take: 1 },
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!memo || memo.deletedAt) throw new EApproveError('MEMO_NOT_FOUND', 'ไม่พบ Memo', 404);
    if (memo.createdById !== input.actorId) throw new EApproveError('FORBIDDEN', 'เฉพาะผู้สร้างเท่านั้นที่ส่ง Memo ได้', 403);
    try { assertMemoTransition(memo.approvalStatus, 'SUBMITTED'); }
    catch { throw new EApproveError('INVALID_MEMO_STATE', 'สถานะปัจจุบันไม่สามารถส่งอนุมัติได้', 409); }
    if (!memo.memoType?.isActive) throw new EApproveError('MEMO_TYPE_REQUIRED', 'กรุณาเลือก Memo Type ที่เปิดใช้งาน');
    const branch = memo.branch ?? memo.department.branch;
    if (!branch?.isActive) throw new EApproveError('BRANCH_REQUIRED', 'แผนกยังไม่ได้กำหนดสาขาที่เปิดใช้งาน');
    const branchDepartment = await tx.branchDepartment.findUnique({
      where: { branchId_departmentId: { branchId: branch.id, departmentId: memo.departmentId } },
      include: { hod: true },
    });
    if (!branchDepartment?.isActive) throw new EApproveError('DEPARTMENT_WRONG_BRANCH', 'แผนกนี้ไม่ได้เปิดใช้งานในสาขาของ Memo');
    if (memo.memoType.branchId && memo.memoType.branchId !== branch.id) {
      throw new EApproveError('MEMO_TYPE_WRONG_BRANCH', 'Memo Type นี้ไม่สามารถใช้กับสาขาของผู้สร้างได้');
    }
    const presenterSignature = await tx.approvalSignature.findFirst({
      where: { userId: input.actorId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    if (!presenterSignature) {
      throw new EApproveError('PRESENTER_SIGNATURE_REQUIRED', 'กรุณาสร้างลายเซ็นของฉันก่อนส่ง Memo อนุมัติ', 400);
    }
    const presenterSignatureSnapshot = {
      signatureId: presenterSignature.id,
      signatureName: presenterSignature.name,
      signatureType: presenterSignature.type,
      signatureData: presenterSignature.data,
      confirmedBy: memo.signatures[0]?.name ?? memo.sender,
      confirmedAt: new Date().toISOString(),
    };

    const template = input.templateId ? await tx.approvalTemplate.findFirst({
      where: { id: input.templateId, isActive: true, departmentId: memo.departmentId, branchId: branch.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    }) : null;
    if (input.templateId && !template) throw new EApproveError('TEMPLATE_INVALID', 'Template ไม่อยู่ในแผนกและสาขานี้');

    const ids = [...new Set([...(template?.items.map((i) => i.approverId) ?? []), ...(input.userAddedApproverIds ?? [])])];
    const users = await tx.user.findMany({ where: { id: { in: ids } } });
    const userMap = new Map(users.map((user) => [user.id, user]));
    const mapped = (id: string, source: 'TEMPLATE' | 'USER_ADDED', referenceId?: string): CandidateWithSource => {
      const approver = userMap.get(id);
      if (!approver) throw new EApproveError('APPROVER_NOT_FOUND', `ไม่พบผู้อนุมัติ ${id}`);
      return { approver, source, referenceId };
    };

    let chain;
    try {
      chain = buildApprovalChain({
        creatorId: input.actorId,
        branchId: branch.id,
        hod: branchDepartment.hod,
        gmFallback: branchDepartment.hod ? null : branch.generalManager,
        template: template?.items.map((item) => mapped(item.approverId, 'TEMPLATE', template.id)),
        userAdded: (input.userAddedApproverIds ?? []).map((id) => mapped(id, 'USER_ADDED')),
        required: memo.memoType.requiredApprovers.map((item) => ({ approver: item.approver, source: 'MEMO_TYPE_REQUIRED', referenceId: item.id })),
      });
    } catch (error) {
      if (error instanceof ApprovalRuleError) throw new EApproveError(error.code, error.message);
      throw error;
    }

    const documentBuddhistYear = Number(formatInTimeZone(memo.documentDate, 'Asia/Bangkok', 'yyyy')) + 543;
    const sequenceRecord = memo.documentNo ? null : await tx.memoDocumentSequence.upsert({
      where: { departmentId_buddhistYear: { departmentId: memo.departmentId, buddhistYear: documentBuddhistYear } },
      create: { departmentId: memo.departmentId, buddhistYear: documentBuddhistYear, lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
    });
    const nextSequence = memo.documentNo ? memo.sequence! : sequenceRecord!.lastSequence;
    const buddhistYear = memo.documentNo ? memo.buddhistYear! : documentBuddhistYear;
    const documentNo = memo.documentNo ?? `${memo.department.code} ${String(nextSequence).padStart(3, '0')}/${buddhistYear}`;
    const versionNumber = (memo.versions[0]?.version ?? 0) + 1;
    const roundNumber = (memo.approvalRounds[0]?.roundNumber ?? 0) + 1;
    const contentSnapshot = {
      documentNo, documentDate: memo.documentDate, recipient: memo.recipient, sender: memo.sender,
      subject: memo.subject, content: memo.content, remark: memo.remark, memoTypeId: memo.memoTypeId,
      departmentId: memo.departmentId, branchId: branch.id, signatures: memo.signatures,
      attachments: memo.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      })),
      presenterSignatureSnapshot,
    };
    const version = await tx.memoVersion.create({ data: {
      memoId: memo.id, version: versionNumber, contentSnapshot: json(contentSnapshot),
      approvalChainSnapshot: json(chain), contentHash: hash(contentSnapshot), createdById: input.actorId,
    } });
    const round = await tx.memoApprovalRound.create({ data: {
      memoId: memo.id, memoVersionId: version.id, roundNumber,
      steps: { create: chain.map((step) => ({
        sortOrder: step.sortOrder, approverId: step.approverId, status: step.status,
        source: step.source, sourceMetadata: json(step.sources), approverNameSnapshot: step.approverName,
        approverPositionSnapshot: step.approverPosition, memoVersionId: version.id,
      })) },
    }, include: { steps: true } });
    await tx.memo.update({ where: { id: memo.id }, data: {
      status: 'SUBMITTED', approvalStatus: 'SUBMITTED', branchId: branch.id,
      sequence: nextSequence, buddhistYear, documentNo, updatedById: input.actorId,
    } });
    const pending = round.steps.find((step) => step.status === 'PENDING');
    if (pending) await enqueueNotification(tx, { event: `APPROVAL_PENDING:${round.id}`, memoId: memo.id, userId: pending.approverId, payload: { stepId: pending.id } });
    await tx.auditLog.create({ data: { module: 'E_APPROVE', action: 'SUBMITTED', entity: 'MEMO', entityId: memo.id, userId: input.actorId, newValue: json({ roundId: round.id, versionId: version.id, chain }) } });
    return { memoId: memo.id, documentNo, versionId: version.id, roundId: round.id, chain };
  });
}

export async function approveCurrentStep(prisma: PrismaClient, input: {
  memoId: string; actorId: string; signatureId: string; idempotencyKey: string;
}) {
  return runIdempotentTransaction(prisma, {
    key: input.idempotencyKey, action: 'APPROVE_STEP', actorId: input.actorId, resourceId: input.memoId,
    request: { signatureId: input.signatureId },
  }, async (tx) => {
    const memo = await tx.memo.findUnique({ where: { id: input.memoId }, include: {
      approvalRounds: { where: { status: 'ACTIVE' }, take: 1, orderBy: { roundNumber: 'desc' }, include: { steps: { orderBy: { sortOrder: 'asc' } } } },
    } });
    const round = memo?.approvalRounds[0];
    if (!memo || !round) throw new EApproveError('ACTIVE_ROUND_NOT_FOUND', 'ไม่พบรอบอนุมัติที่กำลังดำเนินการ', 404);
    const step = round.steps.find((item) => item.status === 'PENDING');
    if (!step) throw new EApproveError('PENDING_STEP_NOT_FOUND', 'ไม่มี Step ที่รออนุมัติ', 409);
    if (step.approverId !== input.actorId) throw new EApproveError('NOT_CURRENT_APPROVER', 'ยังไม่ถึงคิวของผู้ใช้นี้', 403);
    const actor = await tx.user.findUnique({ where: { id: input.actorId } });
    if (!actor?.isActive || !actor.isApprover) throw new EApproveError('APPROVER_INACTIVE', 'ผู้อนุมัติถูกปิดใช้งานหรือไม่มีสิทธิ์ กรุณาให้ Super Admin เปลี่ยนผู้อนุมัติ', 403);
    const signature = await tx.approvalSignature.findFirst({ where: { id: input.signatureId, userId: input.actorId } });
    if (!signature) throw new EApproveError('SIGNATURE_NOT_FOUND', 'ไม่พบลายเซ็นที่เลือก กรุณาตั้งค่าลายเซ็นของคุณก่อนอนุมัติ', 400);
    const confirmedAt = new Date();
    const signatureSnapshot = {
      signatureId: signature.id,
      signatureName: signature.name,
      signatureType: signature.type,
      signatureData: signature.data,
      confirmedBy: actor.fullName ?? actor.username,
      confirmedAt: confirmedAt.toISOString(),
    };
    const updated = await tx.memoApprovalStep.updateMany({ where: { id: step.id, status: 'PENDING' }, data: {
      status: 'APPROVED', actedById: input.actorId, actedByNameSnapshot: step.approverNameSnapshot,
      signatureSnapshot: json(signatureSnapshot), actedAt: confirmedAt,
      integrityHash: hash({ stepId: step.id, versionId: step.memoVersionId, actorId: input.actorId, signature: signatureSnapshot }),
    } });
    if (updated.count !== 1) throw new EApproveError('STEP_ALREADY_COMPLETED', 'Step นี้ถูกดำเนินการแล้ว', 409);
    const next = round.steps.find((item) => item.sortOrder > step.sortOrder && item.status === 'WAITING');
    if (next) {
      await tx.memoApprovalStep.update({ where: { id: next.id }, data: { status: 'PENDING' } });
      await tx.memo.update({ where: { id: memo.id }, data: { status: 'IN_REVIEW', approvalStatus: 'IN_REVIEW' } });
      await enqueueNotification(tx, { event: `APPROVAL_PENDING:${round.id}`, memoId: memo.id, userId: next.approverId, payload: { stepId: next.id } });
    } else {
      // Approval is committed independently of the asynchronous PDF lifecycle.
      await tx.memo.update({ where: { id: memo.id }, data: { status: 'APPROVED', approvalStatus: 'APPROVED', pdfStatus: 'PENDING', pdfErrorCode: null } });
      await tx.memoApprovalRound.update({ where: { id: round.id }, data: { status: 'COMPLETED', closedAt: new Date() } });
      const key = pdfJobKey(memo.id, step.memoVersionId);
      await tx.backgroundJob.upsert({ where: { idempotencyKey: key }, update: {}, create: {
        type: 'GENERATE_OFFICIAL_PDF', idempotencyKey: key, memoId: memo.id,
        payload: json({ memoId: memo.id, memoVersionId: step.memoVersionId }),
      } });
    }
    await tx.auditLog.create({ data: { module: 'E_APPROVE', action: 'APPROVED_STEP', entity: 'MEMO_APPROVAL_STEP', entityId: step.id, userId: input.actorId, details: input.idempotencyKey } });
    return { stepId: step.id, approvalStatus: next ? 'IN_REVIEW' : 'APPROVED', pdfStatus: next ? memo.pdfStatus : 'PENDING' };
  });
}

export async function requestMemoRevision(prisma: PrismaClient, input: {
  memoId: string; actorId: string; reason: string; idempotencyKey: string;
}) {
  return runIdempotentTransaction(prisma, {
    key: input.idempotencyKey, action: 'REQUEST_MEMO_REVISION', actorId: input.actorId,
    resourceId: input.memoId, request: { reason: input.reason.trim() },
  }, async (tx) => {
    const memo = await tx.memo.findUnique({
      where: { id: input.memoId },
      include: {
        approvalRounds: {
          where: { status: 'ACTIVE' }, take: 1, orderBy: { roundNumber: 'desc' },
          include: { steps: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    const round = memo?.approvalRounds[0];
    if (!memo || !round) throw new EApproveError('ACTIVE_ROUND_NOT_FOUND', 'ไม่พบรอบอนุมัติที่กำลังดำเนินการ', 404);
    const step = round.steps.find((item) => item.status === 'PENDING');
    if (!step) throw new EApproveError('PENDING_STEP_NOT_FOUND', 'ไม่มี Step ที่รอดำเนินการ', 409);
    if (step.approverId !== input.actorId) throw new EApproveError('NOT_CURRENT_APPROVER', 'ยังไม่ถึงคิวของผู้ใช้นี้', 403);
    const actor = await tx.user.findUnique({ where: { id: input.actorId } });
    if (!actor?.isActive || !actor.isApprover) throw new EApproveError('APPROVER_INACTIVE', 'ผู้ใช้ไม่มีสิทธิ์ Approver', 403);

    const updated = await tx.memoApprovalStep.updateMany({
      where: { id: step.id, status: 'PENDING' },
      data: {
        status: 'REVISION_REQUESTED', actedById: actor.id,
        actedByNameSnapshot: actor.fullName ?? actor.username,
        decisionReason: input.reason.trim(), actedAt: new Date(),
        integrityHash: hash({ stepId: step.id, versionId: step.memoVersionId, actorId: actor.id, decision: 'REVISION_REQUESTED', reason: input.reason.trim() }),
      },
    });
    if (updated.count !== 1) throw new EApproveError('STEP_ALREADY_COMPLETED', 'Step นี้ถูกดำเนินการแล้ว', 409);

    await tx.memoApprovalRound.update({ where: { id: round.id }, data: { status: 'REVISION_REQUESTED', closedAt: new Date() } });
    await tx.memo.update({ where: { id: memo.id }, data: { status: 'REVISION_REQUESTED', approvalStatus: 'REVISION_REQUESTED' } });
    if (memo.createdById) {
      await enqueueNotification(tx, {
        event: `REVISION_REQUESTED:${round.id}`, memoId: memo.id, userId: memo.createdById,
        payload: { stepId: step.id, reason: input.reason.trim(), requestedBy: actor.fullName ?? actor.username },
      });
    }
    await tx.auditLog.create({
      data: {
        module: 'E_APPROVE',
        action: 'REVISION_REQUESTED', entity: 'MEMO_APPROVAL_STEP', entityId: step.id,
        userId: actor.id, details: input.reason.trim(),
        newValue: json({ memoId: memo.id, roundId: round.id, approvalStatus: 'REVISION_REQUESTED' }),
      },
    });
    return { memoId: memo.id, stepId: step.id, approvalStatus: 'REVISION_REQUESTED' };
  });
}

export async function replacePendingApprover(prisma: PrismaClient, input: {
  stepId: string; newApproverId: string; actorId: string; reason: string; idempotencyKey: string;
}) {
  if (!input.reason.trim()) throw new EApproveError('REASON_REQUIRED', 'กรุณาระบุเหตุผล');
  return runIdempotentTransaction(prisma, {
    key: input.idempotencyKey, action: 'REASSIGN_APPROVER', actorId: input.actorId, resourceId: input.stepId,
    request: { newApproverId: input.newApproverId, reason: input.reason.trim() },
  }, async (tx) => {
    const actor = await tx.user.findUnique({ where: { id: input.actorId } });
    if (!actor?.isActive || actor.role !== 'ADMIN') throw new EApproveError('ADMIN_REQUIRED', 'เฉพาะผู้ดูแลระบบเท่านั้น', 403);
    const step = await tx.memoApprovalStep.findUnique({ where: { id: input.stepId }, include: { round: { include: { memo: true } }, approver: true } });
    if (!step) throw new EApproveError('STEP_NOT_FOUND', 'ไม่พบ Approval Step', 404);
    if (!canReplaceApprover(step.status)) throw new EApproveError('COMPLETED_STEP_IMMUTABLE', 'ห้ามเปลี่ยน Step ที่ดำเนินการแล้ว', 409);
    const replacement = await tx.user.findUnique({ where: { id: input.newApproverId } });
    if (!replacement?.isActive || !replacement.isApprover || (!replacement.isAllBranches && replacement.branchId !== step.round.memo.branchId)) {
      throw new EApproveError('INVALID_REPLACEMENT', 'ผู้รับแทนต้องเป็น Active Approver ใน Branch เดียวกัน');
    }
    await tx.memoApprovalStep.update({ where: { id: step.id }, data: {
      approverId: replacement.id, approverNameSnapshot: replacement.fullName ?? replacement.username,
      approverPositionSnapshot: replacement.position, sourceMetadata: json([
        ...JSON.parse(step.sourceMetadata), { source: 'ADMIN_REPLACEMENT', oldApproverId: step.approverId, reason: input.reason.trim() },
      ]),
    } });
    await tx.auditLog.create({ data: { module: 'E_APPROVE', action: 'REPLACED_PENDING_APPROVER', entity: 'MEMO_APPROVAL_STEP', entityId: step.id, userId: actor.id,
      oldValue: json({ approverId: step.approverId }), newValue: json({ approverId: replacement.id }), details: input.reason.trim() } });
    await Promise.all([step.approverId, replacement.id].map((userId) => enqueueNotification(tx, {
      event: `APPROVER_REPLACED:${step.id}:${userId}`, memoId: step.round.memoId, userId,
      payload: { stepId: step.id, oldApproverId: step.approverId, newApproverId: replacement.id, reason: input.reason.trim() },
    })));
    return { stepId: step.id, oldApproverId: step.approverId, newApproverId: replacement.id };
  });
}

export async function recordPdfFailure(prisma: PrismaClient, input: { jobKey: string; safeErrorCode: string }) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.backgroundJob.findUnique({ where: { idempotencyKey: input.jobKey } });
    if (!job?.memoId) throw new EApproveError('PDF_JOB_NOT_FOUND', 'ไม่พบงาน PDF', 404);
    await tx.backgroundJob.update({ where: { id: job.id }, data: { status: 'FAILED', attemptCount: { increment: 1 }, lastErrorCode: input.safeErrorCode, lockedAt: null } });
    return tx.memo.update({ where: { id: job.memoId }, data: { pdfStatus: 'FAILED', pdfErrorCode: input.safeErrorCode } });
  });
}

export async function retryPdf(prisma: PrismaClient, input: { memoId: string; actorId: string; idempotencyKey: string }) {
  return runIdempotentTransaction(prisma, {
    key: input.idempotencyKey, action: 'RETRY_PDF', actorId: input.actorId, resourceId: input.memoId, request: {},
  }, async (tx) => {
    const actor = await tx.user.findUnique({ where: { id: input.actorId } });
    if (!actor?.isActive || actor.role !== 'ADMIN') throw new EApproveError('ADMIN_REQUIRED', 'เฉพาะผู้ดูแลระบบเท่านั้น', 403);
    const memo = await tx.memo.findUnique({ where: { id: input.memoId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
    if (!memo || memo.approvalStatus !== 'APPROVED' || !memo.versions[0]) throw new EApproveError('MEMO_NOT_APPROVED', 'Memo ยังไม่อนุมัติครบ');
    const key = pdfJobKey(memo.id, memo.versions[0].id);
    await tx.backgroundJob.update({ where: { idempotencyKey: key }, data: { status: 'PENDING', attemptCount: 0, availableAt: new Date(), lockedAt: null, completedAt: null, lastErrorCode: null } });
    await tx.memo.update({ where: { id: memo.id }, data: { pdfStatus: 'PENDING', pdfErrorCode: null } });
    await tx.auditLog.create({ data: { module: 'E_APPROVE', action: 'RETRY_PDF', entity: 'MEMO', entityId: memo.id, userId: actor.id, details: key } });
    return { jobKey: key };
  });
}

export async function completePdfJob(prisma: PrismaClient, input: {
  jobKey: string; storageKey: string; contentHash: string;
}) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.backgroundJob.findUnique({ where: { idempotencyKey: input.jobKey } });
    if (!job?.memoId || job.type !== 'GENERATE_OFFICIAL_PDF') throw new EApproveError('PDF_JOB_NOT_FOUND', 'ไม่พบงาน PDF', 404);
    const payload = JSON.parse(job.payload) as { memoVersionId: string };
    const artifact = await tx.memoPdfArtifact.upsert({
      where: { jobKey: input.jobKey }, update: {}, create: {
        memoId: job.memoId, memoVersionId: payload.memoVersionId, kind: 'OFFICIAL',
        storageKey: input.storageKey, contentHash: input.contentHash, jobKey: input.jobKey,
      },
    });
    await tx.backgroundJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', completedAt: new Date(), lockedAt: null } });
    await tx.memo.update({ where: { id: job.memoId }, data: { pdfStatus: 'READY', pdfErrorCode: null } });
    return artifact;
  });
}

export async function processEmailDelivery(
  prisma: PrismaClient,
  deliveryId: string,
  send: (message: { recipient: string; template: string; payload: unknown; idempotencyKey: string }) => Promise<void>,
) {
  const claimed = await prisma.emailDelivery.updateMany({
    where: { id: deliveryId, status: { in: ['PENDING', 'FAILED'] } },
    data: { status: 'SENDING', attemptCount: { increment: 1 } },
  });
  const delivery = await prisma.emailDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new EApproveError('EMAIL_DELIVERY_NOT_FOUND', 'ไม่พบ Email delivery', 404);
  if (claimed.count === 0) return { status: delivery.status, duplicate: true };
  try {
    await send({ recipient: delivery.recipient, template: delivery.template, payload: JSON.parse(delivery.payload), idempotencyKey: delivery.idempotencyKey });
    await prisma.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', sentAt: new Date(), lastErrorCode: null } });
    return { status: 'SENT', duplicate: false };
  } catch {
    await prisma.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', lastErrorCode: 'PROVIDER_ERROR' } });
    throw new EApproveError('EMAIL_SEND_FAILED', 'ส่ง Email ไม่สำเร็จ', 502);
  }
}
