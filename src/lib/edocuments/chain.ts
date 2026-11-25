export const APPROVAL_SOURCES = ['HOD', 'GM_FALLBACK', 'TEMPLATE', 'USER_ADDED', 'MEMO_TYPE_REQUIRED'] as const;
export type ApprovalSource = (typeof APPROVAL_SOURCES)[number];

export type ApproverCandidate = {
  id: string;
  fullName: string | null;
  position?: string | null;
  branchId: string | null;
  isActive: boolean;
  isApprover: boolean;
  isReviewer?: boolean;
  isAllBranches?: boolean;
  approvalBranchIds?: string[];
};

export function canApproveInBranch(user: Pick<ApproverCandidate, 'branchId' | 'isAllBranches' | 'approvalBranchIds'>, branchId: string | null) {
  return Boolean(user.isAllBranches || (branchId && (user.branchId === branchId || user.approvalBranchIds?.includes(branchId))));
}

export type CandidateWithSource = {
  approver: ApproverCandidate;
  source: ApprovalSource;
  referenceId?: string;
  stepType?: 'APPROVER' | 'REVIEWER';
};

export type ApprovalChainStep = {
  approverId: string;
  approverName: string;
  approverPosition: string | null;
  source: ApprovalSource;
  sources: Array<{ source: ApprovalSource; referenceId?: string }>;
  status: 'PENDING' | 'WAITING' | 'SKIPPED_SELF';
  sortOrder: number;
  stepType: 'APPROVER' | 'REVIEWER';
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

export function resolveApprovalBranchId(input: {
  actorBranchId?: string | null;
  memoTypeBranchId?: string | null;
  departmentBranchId?: string | null;
  workflowUsers?: Array<Pick<ApproverCandidate, 'branchId' | 'isAllBranches' | 'approvalBranchIds'>>;
}) {
  const explicitBranchId = input.actorBranchId ?? input.memoTypeBranchId ?? input.departmentBranchId;
  if (explicitBranchId) return explicitBranchId;

  const scopedUsers = (input.workflowUsers ?? []).filter((user) => !user.isAllBranches);
  const first = scopedUsers[0];
  if (!first) return null;
  const candidates = new Set(first.approvalBranchIds ?? []);
  if (first.branchId) candidates.add(first.branchId);
  const matching = [...candidates].filter((id) => scopedUsers.every((user) => canApproveInBranch(user, id)));
  return matching.length === 1 ? matching[0] : null;
}

/**
 * Canonical chain builder. Candidates are composed in business order and then
 * deduplicated by user id. The first occurrence owns the position/source while
 * every later source is retained in `sources` for audit.
 */
export function buildApprovalChain(input: BuildApprovalChainInput): ApprovalChainStep[] {
  // A memo creator must never approve their own HOD step. When the creator is
  // the configured HOD, promote the branch GM to the head of the chain instead
  // of retaining a cosmetic SKIPPED_SELF HOD step in the document.
  const creatorIsHod = input.hod?.id === input.creatorId;
  const head = input.hod && !creatorIsHod
    ? { approver: input.hod, source: 'HOD' as const }
    : input.gmFallback
      ? { approver: input.gmFallback, source: 'GM_FALLBACK' as const }
      : null;

  if (!head) {
    if (creatorIsHod) {
      throw new ApprovalRuleError(
        'GM_REQUIRED_FOR_HOD_CREATOR',
        'ผู้สร้าง Memo เป็น HOD กรุณากำหนด GM ของสาขาเพื่อเป็นผู้อนุมัติแทน',
      );
    }
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
    const stepType = candidate.stepType ?? 'APPROVER';
    if (stepType === 'REVIEWER' ? !user.isReviewer : !user.isApprover) {
      throw new ApprovalRuleError(
        stepType === 'REVIEWER' ? 'REVIEWER_PERMISSION_REQUIRED' : 'APPROVER_PERMISSION_REQUIRED',
        `ผู้ใช้ ${user.fullName ?? user.id} ไม่มีสิทธิ์ ${stepType === 'REVIEWER' ? 'Reviewer' : 'Approver'}`,
      );
    }
    if (!canApproveInBranch(user, input.branchId)) {
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
      stepType,
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
