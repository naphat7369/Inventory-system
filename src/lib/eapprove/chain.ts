export const APPROVAL_SOURCES = ['HOD', 'GM_FALLBACK', 'TEMPLATE', 'USER_ADDED', 'MEMO_TYPE_REQUIRED'] as const;
export type ApprovalSource = (typeof APPROVAL_SOURCES)[number];

export type ApproverCandidate = {
  id: string;
  fullName: string | null;
  position?: string | null;
  branchId: string | null;
  isActive: boolean;
  isApprover: boolean;
  isAllBranches?: boolean;
};

export type CandidateWithSource = {
  approver: ApproverCandidate;
  source: ApprovalSource;
  referenceId?: string;
};

export type ApprovalChainStep = {
  approverId: string;
  approverName: string;
  approverPosition: string | null;
  source: ApprovalSource;
  sources: Array<{ source: ApprovalSource; referenceId?: string }>;
  status: 'PENDING' | 'WAITING' | 'SKIPPED_SELF';
  sortOrder: number;
};

export class ApprovalRuleError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApprovalRuleError';
  }
}

export type BuildApprovalChainInput = {
  creatorId: string;
  branchId: string;
  hod?: ApproverCandidate | null;
  gmFallback?: ApproverCandidate | null;
  template?: CandidateWithSource[];
  userAdded?: CandidateWithSource[];
  required?: CandidateWithSource[];
};

/**
 * Canonical chain builder. Candidates are composed in business order and then
 * deduplicated by user id. The first occurrence owns the position/source while
 * every later source is retained in `sources` for audit.
 */
export function buildApprovalChain(input: BuildApprovalChainInput): ApprovalChainStep[] {
  const head = input.hod
    ? { approver: input.hod, source: 'HOD' as const }
    : input.gmFallback
      ? { approver: input.gmFallback, source: 'GM_FALLBACK' as const }
      : null;

  if (!head) {
    throw new ApprovalRuleError('APPROVAL_HEAD_MISSING', 'ไม่พบ HOD หรือ GM สำรองของสาขา กรุณาติดต่อ Super Admin');
  }

  const candidates: CandidateWithSource[] = [
    head,
    ...(input.template ?? []),
    ...(input.userAdded ?? []),
    ...(input.required ?? []),
  ];
  const byUser = new Map<string, ApprovalChainStep>();

  for (const candidate of candidates) {
    const user = candidate.approver;
    if (!user.isActive) {
      throw new ApprovalRuleError('APPROVER_INACTIVE', `ผู้อนุมัติ ${user.fullName ?? user.id} ถูกปิดใช้งาน`);
    }
    if (!user.isApprover) {
      throw new ApprovalRuleError('APPROVER_PERMISSION_REQUIRED', `ผู้ใช้ ${user.fullName ?? user.id} ไม่มีสิทธิ์ Approver`);
    }
    if (!user.isAllBranches && user.branchId !== input.branchId) {
      throw new ApprovalRuleError('APPROVER_WRONG_BRANCH', `ผู้อนุมัติ ${user.fullName ?? user.id} ไม่ได้อยู่ในสาขาเดียวกับ Memo`);
    }

    const auditSource = { source: candidate.source, ...(candidate.referenceId ? { referenceId: candidate.referenceId } : {}) };
    const existing = byUser.get(user.id);
    if (existing) {
      if (!existing.sources.some((item) => item.source === auditSource.source && item.referenceId === auditSource.referenceId)) {
        existing.sources.push(auditSource);
      }
      continue;
    }

    byUser.set(user.id, {
      approverId: user.id,
      approverName: user.fullName ?? user.id,
      approverPosition: user.position ?? null,
      source: candidate.source,
      sources: [auditSource],
      status: user.id === input.creatorId ? 'SKIPPED_SELF' : 'WAITING',
      sortOrder: byUser.size,
    });
  }

  const steps = [...byUser.values()];
  const firstActionable = steps.find((step) => step.status !== 'SKIPPED_SELF');
  if (!firstActionable) {
    throw new ApprovalRuleError('APPROVER_REQUIRED_AFTER_SELF_SKIP', 'ต้องมีผู้อนุมัติอื่นอย่างน้อย 1 คนหลังข้ามผู้สร้าง');
  }
  firstActionable.status = 'PENDING';
  return steps;
}
