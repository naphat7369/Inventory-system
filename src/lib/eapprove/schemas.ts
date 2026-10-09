import { z } from 'zod';

const id = z.string().trim().min(1).max(100);
const idempotencyKey = z.string().trim().min(8).max(200);

export const submitMemoSchema = z.object({
  templateId: id.nullish(),
  userAddedApproverIds: z.array(id).max(50).default([]),
  idempotencyKey,
}).strict();

export const approveMemoSchema = z.object({
  signatureId: id,
  idempotencyKey,
}).strict();

export const requestRevisionSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
  idempotencyKey,
}).strict();

export const reassignApproverSchema = z.object({
  newApproverId: id,
  reason: z.string().trim().min(3).max(1000),
  idempotencyKey,
}).strict();

export const retryJobSchema = z.object({ idempotencyKey }).strict();
export const withdrawMemoSchema = z.object({ idempotencyKey }).strict();

export const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

export const updateBranchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/).optional(),
  isActive: z.boolean().optional(),
  generalManagerId: id.nullable().optional(),
}).strict();

export const userApprovalConfigSchema = z.object({
  branchId: id.nullable().optional(),
  departmentId: id.nullable().optional(),
  position: z.string().trim().max(150).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  isActive: z.boolean().optional(),
  isApprover: z.boolean().optional(),
  isAllBranches: z.boolean().optional(),
}).strict();

export const departmentApprovalConfigSchema = z.object({ branchId: id, hodId: id.nullable() }).strict();

export const createMemoTypeSchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().max(1000).nullable().optional(),
  branchId: id.nullable().optional(),
  sendPdfToIt: z.boolean().default(false),
}).strict();

export const updateMemoTypeSchema = createMemoTypeSchema.partial().extend({ isActive: z.boolean().optional() }).strict();
export const requiredApproversSchema = z.object({ approverIds: z.array(id).min(1).max(20).refine((items) => new Set(items).size === items.length, 'Duplicate approvers') }).strict();

export const systemSettingsSchema = z.object({
  itEmail: z.string().trim().email().max(254).nullable().optional(),
  attachmentMaxFileMb: z.number().int().min(1).max(100).optional(),
  attachmentMaxTotalMb: z.number().int().min(1).max(500).optional(),
  eapproveEmailEnabled: z.boolean().optional(),
  eapproveCalendarEnabled: z.boolean().optional(),
  eapproveOfficialPdfAutoSendEnabled: z.boolean().optional(),
  emailAttachmentMaxMb: z.number().int().min(1).max(100).optional(),
}).strict();

export function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('ข้อมูลที่ส่งมาไม่ถูกต้อง') as Error & { code: string; fieldErrors: unknown };
    error.code = 'VALIDATION_ERROR';
    error.fieldErrors = z.flattenError(result.error).fieldErrors;
    throw error;
  }
  return result.data;
}
