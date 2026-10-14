export type MemoSignatureRuleInput = {
  approverId?: string | null;
  role?: string | null;
};

type RequiredMemoSignaturesInput = {
  signatures: MemoSignatureRuleInput[];
  creatorId: string;
  headApproverId?: string | null;
  requiredApproverIds?: string[];
};

const normalizedRole = (value: string | null | undefined) => value?.trim() === 'รับทราบโดย' ? 'พิจารณาโดย' : value?.trim();

/** Validates identities that the server will place in the Approval Chain. */
export function validateRequiredMemoSignatures({
  signatures,
  creatorId,
  headApproverId,
  requiredApproverIds = [],
}: RequiredMemoSignaturesInput): string | null {
  const ids = signatures.flatMap((signature) => signature.approverId ? [signature.approverId] : []);
  if (new Set(ids).size !== ids.length) return 'ไม่สามารถเลือกชื่อผู้ลงนามซ้ำในเอกสารเดียวกันได้';

  const presenter = signatures[0];
  if (presenter?.approverId !== creatorId || normalizedRole(presenter.role) !== 'นำเสนอโดย') {
    return 'ห้ามลบหรือเปลี่ยนผู้จัดทำ Memo ในรายการลายเซ็น';
  }

  if (headApproverId && headApproverId !== creatorId) {
    const head = signatures.find((signature) => signature.approverId === headApproverId);
    if (!head || normalizedRole(head.role) !== 'พิจารณาโดย') {
      return 'ห้ามลบหรือเปลี่ยน HOD/GM สำรองที่ระบบกำหนดในรายการลายเซ็น';
    }
  }

  const requiredIds = [...new Set(requiredApproverIds)].filter((id) => id !== creatorId && id !== headApproverId);
  if (requiredIds.some((id) => !ids.includes(id))) {
    return 'ห้ามลบผู้อนุมัติบังคับของประเภท Memo ออกจากรายการลายเซ็น';
  }
  return null;
}
