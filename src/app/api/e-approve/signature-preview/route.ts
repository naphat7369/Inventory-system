import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ApprovalRuleError, buildApprovalChain } from '@/lib/eapprove/chain';
import { EApproveError } from '@/lib/eapprove/errors';
import { eApproveErrorResponse } from '@/lib/eapprove/http';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL(request.url);
    const departmentId = url.searchParams.get('departmentId');
    const memoTypeId = url.searchParams.get('memoTypeId');
    if (!departmentId || !memoTypeId) throw new EApproveError('REQUIRED_FIELDS', 'กรุณาเลือก Department และ Memo Type');

    const [creator, department, memoType] = await Promise.all([
      prisma.user.findUnique({ where: { id: String(session.id) } }),
      prisma.department.findFirst({
        where: { id: departmentId, isActive: true },
        include: { hod: true, branch: { include: { generalManager: true } } },
      }),
      prisma.memoType.findFirst({
        where: { id: memoTypeId, isActive: true },
        include: { requiredApprovers: { orderBy: { sortOrder: 'asc' }, include: { approver: true } } },
      }),
    ]);
    if (!creator?.isActive) throw new EApproveError('USER_NOT_FOUND', 'ไม่พบผู้ใช้งานที่เปิดใช้งาน', 404);
    if (!department) throw new EApproveError('DEPARTMENT_NOT_FOUND', 'ไม่พบ Department ที่เปิดใช้งาน', 404);
    const branchId = creator.branchId ?? memoType?.branchId ?? department.branchId;
    if (!branchId) throw new EApproveError('BRANCH_REQUIRED', 'กรุณากำหนด Branch ให้ผู้ใช้งานหรือ Memo Type');
    const branchDepartment = await prisma.branchDepartment.findUnique({
      where: { branchId_departmentId: { branchId, departmentId } },
      include: { hod: true, branch: { include: { generalManager: true } } },
    });
    if (!branchDepartment?.isActive || !branchDepartment.branch.isActive) throw new EApproveError('BRANCH_REQUIRED', 'Department ไม่ได้เปิดใช้งานใน Branch นี้');
    if (!memoType || (memoType.branchId && memoType.branchId !== branchId)) {
      throw new EApproveError('MEMO_TYPE_WRONG_BRANCH', 'Memo Type นี้ไม่สามารถใช้กับ Branch ของ Department ที่เลือกได้');
    }

    try {
      const chain = buildApprovalChain({
        creatorId: creator.id,
        branchId,
        hod: branchDepartment.hod,
        gmFallback: branchDepartment.hod ? null : branchDepartment.branch.generalManager,
        required: memoType.requiredApprovers.map((rule) => ({
          approver: rule.approver, source: 'MEMO_TYPE_REQUIRED', referenceId: rule.id,
        })),
      });
      const approvalSignatures = chain
        .filter((step) => step.status !== 'SKIPPED_SELF')
        .map((step) => ({
          role: step.source === 'HOD' || step.source === 'GM_FALLBACK' ? 'รับทราบโดย' : 'อนุมัติโดย',
          name: step.approverName,
          position: step.approverPosition,
          approverId: step.approverId,
          source: step.source,
          sources: step.sources,
        }));
      return NextResponse.json({
        memoType: { id: memoType.id, name: memoType.name, code: memoType.code },
        branch: { id: branchDepartment.branch.id, name: branchDepartment.branch.name, code: branchDepartment.branch.code },
        chain,
        signatures: [
          { role: 'นำเสนอโดย', name: creator.fullName ?? creator.username, position: creator.position, source: 'CREATOR' },
          ...approvalSignatures,
        ].map((signature, sortOrder) => ({ ...signature, sortOrder })),
      });
    } catch (error) {
      if (error instanceof ApprovalRuleError) throw new EApproveError(error.code, error.message);
      throw error;
    }
  } catch (error) {
    return eApproveErrorResponse(error);
  }
}
