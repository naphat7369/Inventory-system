export type ApprovalStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'REVISION_REQUESTED' | 'WITHDRAWN' | 'APPROVED' | 'CANCELLATION_REQUESTED' | 'CANCELLED';
export type PdfStatus = 'NOT_REQUESTED' | 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';

const TRANSITIONS: Record<ApprovalStatus, readonly ApprovalStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['IN_REVIEW', 'REVISION_REQUESTED', 'WITHDRAWN'],
  IN_REVIEW: ['APPROVED', 'REVISION_REQUESTED', 'WITHDRAWN'],
  REVISION_REQUESTED: ['SUBMITTED'],
  WITHDRAWN: ['SUBMITTED'],
  APPROVED: ['CANCELLATION_REQUESTED'],
  CANCELLATION_REQUESTED: ['APPROVED', 'CANCELLED'],
  CANCELLED: [],
};

export function canTransitionMemo(from: ApprovalStatus, to: ApprovalStatus) {
  return TRANSITIONS[from].includes(to);
}

export function assertMemoTransition(from: string, to: ApprovalStatus) {
  if (!(from in TRANSITIONS) || !canTransitionMemo(from as ApprovalStatus, to)) {
    const error = new Error(`ไม่สามารถเปลี่ยนสถานะจาก ${from} เป็น ${to}`) as Error & { code: string };
    error.code = 'INVALID_MEMO_TRANSITION';
    throw error;
  }
}

export function canReplaceApprover(status: string) {
  return status === 'PENDING' || status === 'WAITING';
}

export function pdfFailed<T extends { approvalStatus: ApprovalStatus; pdfStatus: PdfStatus }>(state: T): T {
  return { ...state, pdfStatus: 'FAILED' };
}

export function immutableSnapshot<T>(value: T): Readonly<T> {
  return Object.freeze(structuredClone(value));
}
