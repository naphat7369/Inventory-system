import { fromZonedTime } from 'date-fns-tz';
const BANGKOK_TIMEZONE = 'Asia/Bangkok';

export type DelegationScope = 'ALL' | 'MEMO_TYPE' | 'MEMO';
export type DelegationCandidate = {
  id: string;
  delegatorId: string;
  delegateId: string;
  scope: DelegationScope;
  memoTypeId?: string | null;
  memoId?: string | null;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
};

export function bangkokDayRange(startDate: string, endDate: string) {
  return {
    startsAt: fromZonedTime(`${startDate}T00:00:00.000`, BANGKOK_TIMEZONE),
    endsAt: fromZonedTime(`${endDate}T23:59:59.999`, BANGKOK_TIMEZONE),
  };
}

export function resolveDelegation(
  candidates: DelegationCandidate[],
  context: { delegatorId: string; memoId: string; memoTypeId: string; at: Date },
) {
  const priority: Record<DelegationScope, number> = { MEMO: 3, MEMO_TYPE: 2, ALL: 1 };
  return candidates
    .filter((item) => item.isActive && item.delegatorId === context.delegatorId)
    .filter((item) => item.startsAt.getTime() <= context.at.getTime() && item.endsAt.getTime() >= context.at.getTime())
    .filter((item) => item.scope === 'ALL' || (item.scope === 'MEMO_TYPE' && item.memoTypeId === context.memoTypeId) || (item.scope === 'MEMO' && item.memoId === context.memoId))
    .sort((a, b) => priority[b.scope] - priority[a.scope])[0] ?? null;
}

export function assertNoDelegationCycle(edges: Array<{ delegatorId: string; delegateId: string }>, next: { delegatorId: string; delegateId: string }) {
  if (next.delegatorId === next.delegateId) throw new ApprovalRuleCycleError();
  const graph = new Map<string, string[]>();
  for (const edge of [...edges, next]) graph.set(edge.delegatorId, [...(graph.get(edge.delegatorId) ?? []), edge.delegateId]);
  const visit = (id: string, seen: Set<string>): boolean => {
    if (id === next.delegatorId && seen.size > 0) return true;
    if (seen.has(id)) return false;
    const following = new Set(seen).add(id);
    return (graph.get(id) ?? []).some((child) => visit(child, following));
  };
  if (visit(next.delegateId, new Set())) throw new ApprovalRuleCycleError();
}

class ApprovalRuleCycleError extends Error {
  code = 'DELEGATION_CYCLE';
  constructor() { super('ไม่อนุญาต Delegation ที่วนกลับหรือซ้อนเป็นวง'); }
}
