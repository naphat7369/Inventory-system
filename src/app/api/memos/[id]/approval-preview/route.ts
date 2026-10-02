import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildApprovalChain, ApprovalRuleError } from '@/lib/eapprove/chain';
import { eApproveErrorResponse } from '@/lib/eapprove/http';
import { EApproveError } from '@/lib/eapprove/errors';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const memo = await prisma.memo.findUnique({
      where: { id },
      include: {
        department: { include: { hod: true, branch: { include: { generalManager: true } } } },
        branch: { include: { generalManager: true } },
        memoType: { include: { requiredApprovers: { orderBy: { sortOrder: 'asc' }, include: { approver: true } } } },
        signatures: { orderBy: { sortOrder: 'asc' }, include: { approver: true } },
      },
    });
    if (!memo || memo.deletedAt) throw new EApproveError('MEMO_NOT_FOUND', 'ไม่พบ Memo', 404);
    if (memo.createdById !== String(session.id)) throw new EApproveError('FORBIDDEN', 'เฉพาะผู้สร้าง Memo เท่านั้น', 403);
    if (memo.memoType && !memo.memoType.isActive) throw new EApproveError('MEMO_TYPE_INACTIVE', 'Memo Type ที่เลือกถูกปิดใช้งาน');
    const branch = memo.branch ?? memo.department.branch;
    if (!branch?.isActive) throw new EApproveError('BRANCH_REQUIRED', 'แผนกยังไม่ได้กำหนดสาขาที่เปิดใช้งาน');
    const branchDepartment = await prisma.branchDepartment.findUnique({
      where: { branchId_departmentId: { branchId: branch.id, departmentId: memo.departmentId } },
      include: { hod: true },
    });
    if (!branchDepartment?.isActive) throw new EApproveError('DEPARTMENT_WRONG_BRANCH', 'แผนกนี้ไม่ได้เปิดใช้งานในสาขาของ Memo');
    const unresolvedManualSigner = memo.signatures.find((signature) =>
      signature.role !== 'นำเสนอโดย' && Boolean(signature.name?.trim()) && !signature.approver,
    );
    if (unresolvedManualSigner) {
      throw new EApproveError(
        'MANUAL_APPROVER_REQUIRED',
        `กรุณาเลือกผู้อนุมัติ “${unresolvedManualSigner.name}” จาก Dropdown ใหม่ก่อนส่งอนุมัติ`,
      );
    }
    try {
      const chain = buildApprovalChain({
        creatorId: String(session.id), branchId: branch.id,
        hod: branchDepartment.hod,
        gmFallback: branchDepartment.hod ? null : branch.generalManager,
        userAdded: memo.signatures
          .filter((signature) => signature.role !== 'นำเสนอโดย' && signature.approver)
          .map((signature) => ({
            approver: signature.approver!, source: 'USER_ADDED', referenceId: signature.id,
          })),
        required: (memo.memoType?.requiredApprovers ?? []).map((rule) => ({
          approver: rule.approver, source: 'MEMO_TYPE_REQUIRED', referenceId: rule.id,
        })),
      });
      return NextResponse.json({
        memoType: memo.memoType
          ? { id: memo.memoType.id, name: memo.memoType.name, code: memo.memoType.code }
          : { id: '', name: 'กำหนดผู้อนุมัติเอง', code: 'MANUAL' },
        branch: { id: branch.id, name: branch.name, code: branch.code }, chain,
      });
    } catch (error) {
      if (error instanceof ApprovalRuleError) throw new EApproveError(error.code, error.message);
      throw error;
    }
  } catch (error) {
    return eApproveErrorResponse(error);
  }
}
