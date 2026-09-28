import type { PrismaClient } from '@prisma/client';
import { requireAdmin } from './authorization';
import { EApproveError } from './errors';
import { serializeAuditValue } from '../audit';

const json = (value: unknown) => JSON.stringify(value);
async function audit(prisma: PrismaClient, actorId: string, action: string, entity: string, entityId: string, oldValue: unknown, newValue: unknown) {
  await prisma.auditLog.create({ data: { module: 'E_APPROVE', userId: actorId, action, entity, entityId, oldValue: serializeAuditValue(oldValue), newValue: serializeAuditValue(newValue) } });
}

export async function createBranch(prisma: PrismaClient, actorId: string, input: { name: string; code: string }) {
  await requireAdmin(prisma, actorId);
  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({ data: { name: input.name, code: input.code.toUpperCase() } });
    const departments = await tx.department.findMany({ where: { isActive: true }, select: { id: true } });
    if (departments.length > 0) {
      await tx.branchDepartment.createMany({
        data: departments.map((department) => ({ branchId: branch.id, departmentId: department.id })),
      });
    }
    await tx.auditLog.create({ data: { module: 'E_APPROVE', userId: actorId, action: 'CREATED', entity: 'BRANCH', entityId: branch.id, oldValue: null, newValue: serializeAuditValue(branch) } });
    return branch;
  });
}

export async function updateBranch(prisma: PrismaClient, actorId: string, branchId: string, input: { name?: string; code?: string; isActive?: boolean; generalManagerId?: string | null }) {
  await requireAdmin(prisma, actorId);
  const existing = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!existing) throw new EApproveError('BRANCH_NOT_FOUND', 'ไม่พบสาขา', 404);
  if (input.generalManagerId) {
    const gm = await prisma.user.findUnique({ where: { id: input.generalManagerId } });
    if (!gm?.isActive || !gm.isApprover || (!gm.isAllBranches && gm.branchId !== branchId)) throw new EApproveError('INVALID_GENERAL_MANAGER', 'GM ต้องเป็น Active Approver ในสาขานี้');
  }
  const branch = await prisma.branch.update({ where: { id: branchId }, data: { ...input, ...(input.code ? { code: input.code.toUpperCase() } : {}) } });
  await audit(prisma, actorId, 'UPDATED', 'BRANCH', branch.id, existing, branch);
  return branch;
}

export async function updateUserApprovalConfig(prisma: PrismaClient, actorId: string, userId: string, input: {
  branchId?: string | null; departmentId?: string | null; position?: string | null; email?: string | null; isActive?: boolean; isApprover?: boolean; isAllBranches?: boolean;
}) {
  await requireAdmin(prisma, actorId);
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new EApproveError('USER_NOT_FOUND', 'ไม่พบผู้ใช้', 404);
  const branchId = input.isAllBranches ? null : (input.branchId === undefined ? existing.branchId : input.branchId);
  const departmentId = input.isAllBranches ? null : (input.departmentId === undefined ? existing.departmentId : input.departmentId);
  if (branchId && !(await prisma.branch.findFirst({ where: { id: branchId, isActive: true } }))) throw new EApproveError('BRANCH_NOT_FOUND', 'ไม่พบสาขาที่เปิดใช้งาน');
  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, isActive: true } });
    const branchDepartment = branchId ? await prisma.branchDepartment.findUnique({ where: { branchId_departmentId: { branchId, departmentId } } }) : null;
    if (!department || (branchId && !branchDepartment?.isActive)) throw new EApproveError('DEPARTMENT_WRONG_BRANCH', 'แผนกไม่อยู่ในสาขาที่เลือก');
  }
  const normalizedInput = input.isAllBranches
    ? { ...input, branchId: null, departmentId: null }
    : input;
  const user = await prisma.user.update({ where: { id: userId }, data: normalizedInput });
  await audit(prisma, actorId, 'UPDATED_APPROVAL_CONFIG', 'USER', user.id, existing, user);
  return user;
}

export async function updateDepartmentApprovalConfig(prisma: PrismaClient, actorId: string, departmentId: string, input: { branchId: string; hodId: string | null }) {
  await requireAdmin(prisma, actorId);
  const existing = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!existing) throw new EApproveError('DEPARTMENT_NOT_FOUND', 'ไม่พบแผนก', 404);
  const branch = await prisma.branch.findFirst({ where: { id: input.branchId, isActive: true } });
  if (!branch) throw new EApproveError('BRANCH_NOT_FOUND', 'ไม่พบสาขาที่เปิดใช้งาน');
  if (input.hodId) {
    const hod = await prisma.user.findUnique({ where: { id: input.hodId } });
    if (!hod?.isActive || !hod.isApprover || (!hod.isAllBranches && hod.branchId !== input.branchId)) throw new EApproveError('INVALID_HOD', 'HOD ต้องเป็น Active Approver ในสาขานี้');
  }
  const previous = await prisma.branchDepartment.findUnique({ where: { branchId_departmentId: { branchId: input.branchId, departmentId } } });
  const config = await prisma.branchDepartment.upsert({
    where: { branchId_departmentId: { branchId: input.branchId, departmentId } },
    create: { branchId: input.branchId, departmentId, hodId: input.hodId, isActive: true },
    update: { hodId: input.hodId, isActive: true },
    include: { department: true },
  });
  await audit(prisma, actorId, 'UPDATED_APPROVAL_CONFIG', 'BRANCH_DEPARTMENT', config.id, previous, config);
  return config;
}

export async function createMemoType(prisma: PrismaClient, actorId: string, input: { name: string; code: string; description?: string | null; branchId?: string | null; sendPdfToIt: boolean }) {
  await requireAdmin(prisma, actorId);
  if (input.branchId && !(await prisma.branch.findUnique({ where: { id: input.branchId } }))) throw new EApproveError('BRANCH_NOT_FOUND', 'ไม่พบสาขา');
  const memoType = await prisma.memoType.create({ data: { ...input, code: input.code.toUpperCase() } });
  await audit(prisma, actorId, 'CREATED', 'MEMO_TYPE', memoType.id, null, memoType);
  return memoType;
}

export async function updateMemoType(prisma: PrismaClient, actorId: string, memoTypeId: string, input: { name?: string; code?: string; description?: string | null; branchId?: string | null; sendPdfToIt?: boolean; isActive?: boolean }) {
  await requireAdmin(prisma, actorId);
  const existing = await prisma.memoType.findUnique({ where: { id: memoTypeId } });
  if (!existing) throw new EApproveError('MEMO_TYPE_NOT_FOUND', 'ไม่พบ Memo Type', 404);
  const memoType = await prisma.memoType.update({ where: { id: memoTypeId }, data: { ...input, ...(input.code ? { code: input.code.toUpperCase() } : {}) } });
  await audit(prisma, actorId, 'UPDATED', 'MEMO_TYPE', memoType.id, existing, memoType);
  return memoType;
}

export async function deleteMemoType(prisma: PrismaClient, actorId: string, memoTypeId: string) {
  await requireAdmin(prisma, actorId);
  const existing = await prisma.memoType.findUnique({
    where: { id: memoTypeId },
    include: { _count: { select: { memos: true } } },
  });
  if (!existing) throw new EApproveError('MEMO_TYPE_NOT_FOUND', 'ไม่พบ Memo Type', 404);
  if (existing._count.memos > 0) {
    throw new EApproveError('MEMO_TYPE_IN_USE', `ไม่สามารถลบได้ เนื่องจากมี Memo อ้างอิงประเภทนี้ ${existing._count.memos} รายการ กรุณาปิดการใช้งานแทน`, 409);
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        userId: actorId,
        module: 'E_APPROVE',
        action: 'DELETED',
        entity: 'MEMO_TYPE',
        entityId: memoTypeId,
        oldValue: json(existing),
        newValue: json({ deleted: true }),
      },
    });
    await tx.memoType.delete({ where: { id: memoTypeId } });
  });
  return { id: memoTypeId, deleted: true };
}

export async function setRequiredApprovers(prisma: PrismaClient, actorId: string, memoTypeId: string, approverIds: string[]) {
  await requireAdmin(prisma, actorId);
  const memoType = await prisma.memoType.findUnique({ where: { id: memoTypeId } });
  if (!memoType) throw new EApproveError('MEMO_TYPE_NOT_FOUND', 'ไม่พบ Memo Type', 404);
  const users = await prisma.user.findMany({ where: { id: { in: approverIds } } });
  if (users.length !== approverIds.length || users.some((user) => !user.isActive || !user.isApprover || (memoType.branchId ? (!user.isAllBranches && user.branchId !== memoType.branchId) : !user.isAllBranches))) {
    throw new EApproveError('INVALID_REQUIRED_APPROVER', 'Required Approver ทุกคนต้อง Active มีสิทธิ์ Approver และอยู่ใน Branch ที่ถูกต้อง');
  }
  const oldValue = await prisma.memoTypeRequiredApprover.findMany({ where: { memoTypeId }, orderBy: { sortOrder: 'asc' } });
  const result = await prisma.$transaction(async (tx) => {
    await tx.memoTypeRequiredApprover.deleteMany({ where: { memoTypeId } });
    await tx.memoTypeRequiredApprover.createMany({ data: approverIds.map((approverId, sortOrder) => ({ memoTypeId, approverId, sortOrder })) });
    return tx.memoTypeRequiredApprover.findMany({ where: { memoTypeId }, orderBy: { sortOrder: 'asc' }, include: { approver: true } });
  });
  await audit(prisma, actorId, 'UPDATED_REQUIRED_APPROVERS', 'MEMO_TYPE', memoTypeId, oldValue, result);
  return result;
}

export async function updateSystemSettings(prisma: PrismaClient, actorId: string, values: Record<string, unknown>) {
  await requireAdmin(prisma, actorId);
  const allowed = Object.entries(values).filter(([, value]) => value !== undefined);
  const results = [];
  for (const [key, value] of allowed) {
    const setting = await prisma.systemSetting.upsert({ where: { key }, update: { value: json(value), updatedById: actorId }, create: { key, value: json(value), updatedById: actorId } });
    await audit(prisma, actorId, 'UPDATED', 'SYSTEM_SETTING', key, null, setting);
    results.push(setting);
  }
  return results;
}
