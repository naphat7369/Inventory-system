import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovalChain, ApprovalRuleError, type ApproverCandidate } from '../src/lib/eapprove/chain.ts';
import { bangkokDayRange, resolveDelegation } from '../src/lib/eapprove/delegation.ts';
import { IdempotencyLedger, emailDeliveryKey, pdfJobKey } from '../src/lib/eapprove/idempotency.ts';
import { canReplaceApprover, immutableSnapshot, pdfFailed } from '../src/lib/eapprove/lifecycle.ts';
import { assertMemoTransition, canTransitionMemo } from '../src/lib/eapprove/lifecycle.ts';
import { approveMemoSchema, reassignApproverSchema, requestRevisionSchema, submitMemoSchema } from '../src/lib/eapprove/schemas.ts';
import { isAllowedMemoAttachment } from '../src/lib/memo-attachments.ts';
import { redactAuditValue } from '../src/lib/audit.ts';

const user = (id: string, overrides: Partial<ApproverCandidate> = {}): ApproverCandidate => ({
  id, fullName: id, position: 'Manager', branchId: 'b1', isActive: true, isApprover: true, ...overrides,
});

test('HOD duplicated as required approver becomes one step with both sources', () => {
  const hod = user('hod');
  const chain = buildApprovalChain({ creatorId: 'creator', branchId: 'b1', hod, required: [{ approver: hod, source: 'MEMO_TYPE_REQUIRED', referenceId: 'rule-1' }] });
  assert.equal(chain.length, 1);
  assert.deepEqual(chain[0].sources.map((item) => item.source), ['HOD', 'MEMO_TYPE_REQUIRED']);
});

test('GM fallback duplicated as required GM is not repeated', () => {
  const gm = user('gm');
  const chain = buildApprovalChain({ creatorId: 'creator', branchId: 'b1', gmFallback: gm, required: [{ approver: gm, source: 'MEMO_TYPE_REQUIRED' }] });
  assert.equal(chain.length, 1);
  assert.equal(chain[0].source, 'GM_FALLBACK');
  assert.equal(chain[0].sources.length, 2);
});

test('user-added approver duplicated in template keeps template position and audit sources', () => {
  const hod = user('hod');
  const common = user('common');
  const chain = buildApprovalChain({ creatorId: 'creator', branchId: 'b1', hod,
    template: [{ approver: common, source: 'TEMPLATE', referenceId: 'template-1' }],
    userAdded: [{ approver: common, source: 'USER_ADDED' }],
  });
  assert.equal(chain.length, 2);
  assert.equal(chain[1].source, 'TEMPLATE');
  assert.deepEqual(chain[1].sources.map((item) => item.source), ['TEMPLATE', 'USER_ADDED']);
});

test('inactive approver is rejected and must be replaced', () => {
  assert.throws(() => buildApprovalChain({ creatorId: 'creator', branchId: 'b1', hod: user('hod', { isActive: false }) }),
    (error: unknown) => error instanceof ApprovalRuleError && error.code === 'APPROVER_INACTIVE');
});

test('creator self-skip still requires a different approver', () => {
  assert.throws(() => buildApprovalChain({ creatorId: 'hod', branchId: 'b1', hod: user('hod') }),
    (error: unknown) => error instanceof ApprovalRuleError && error.code === 'APPROVER_REQUIRED_AFTER_SELF_SKIP');
});

test('all-branches executive can approve a memo from any branch', () => {
  const executive = user('cto', { branchId: null, isAllBranches: true });
  const chain = buildApprovalChain({ creatorId: 'creator', branchId: 'remote-branch', hod: executive });
  assert.equal(chain[0].approverId, 'cto');
  assert.equal(chain[0].status, 'PENDING');
});

test('template snapshot remains unchanged after template edit', () => {
  const template = { version: 1, approvers: ['a'] };
  const snapshot = immutableSnapshot(template);
  template.version = 2;
  template.approvers.push('b');
  assert.deepEqual(snapshot, { version: 1, approvers: ['a'] });
});

test('Super Admin replacement is allowed only for pending or waiting steps', () => {
  assert.equal(canReplaceApprover('PENDING'), true);
  assert.equal(canReplaceApprover('WAITING'), true);
  assert.equal(canReplaceApprover('APPROVED'), false);
  assert.equal(canReplaceApprover('REVISION_REQUESTED'), false);
});

test('PDF failure never rolls approval status back', () => {
  const next = pdfFailed({ approvalStatus: 'APPROVED' as const, pdfStatus: 'GENERATING' as const });
  assert.equal(next.approvalStatus, 'APPROVED');
  assert.equal(next.pdfStatus, 'FAILED');
});

test('retrying the same PDF job creates one logical artifact', () => {
  const ledger = new IdempotencyLedger<{ id: string }>();
  const key = pdfJobKey('memo-1', 'version-1');
  const first = ledger.run(key, () => ({ id: 'artifact-1' }));
  const retry = ledger.run(key, () => ({ id: 'artifact-2' }));
  assert.equal(ledger.size, 1);
  assert.equal(retry.id, first.id);
});

test('retrying email uses one normalized idempotency key', () => {
  const ledger = new IdempotencyLedger<number>();
  const firstKey = emailDeliveryKey('APPROVED', 'memo-1', 'IT@Example.com');
  const retryKey = emailDeliveryKey('APPROVED', 'memo-1', 'it@example.com');
  ledger.run(firstKey, () => 1);
  ledger.run(retryKey, () => 2);
  assert.equal(ledger.size, 1);
});

test('delegation includes Bangkok start and end-day boundaries', () => {
  const range = bangkokDayRange('2026-09-23', '2026-09-24');
  const delegation = { id: 'd1', delegatorId: 'a', delegateId: 'b', scope: 'ALL' as const, isActive: true, ...range };
  assert.equal(range.startsAt.toISOString(), '2026-09-22T17:00:00.000Z');
  assert.equal(range.endsAt.toISOString(), '2026-09-24T16:59:59.999Z');
  assert.equal(resolveDelegation([delegation], { delegatorId: 'a', memoId: 'm', memoTypeId: 't', at: range.startsAt })?.id, 'd1');
  assert.equal(resolveDelegation([delegation], { delegatorId: 'a', memoId: 'm', memoTypeId: 't', at: range.endsAt })?.id, 'd1');
  assert.equal(resolveDelegation([delegation], { delegatorId: 'a', memoId: 'm', memoTypeId: 't', at: new Date(range.endsAt.getTime() + 1) }), null);
});

test('memo state machine permits only documented transitions', () => {
  assert.equal(canTransitionMemo('DRAFT', 'SUBMITTED'), true);
  assert.equal(canTransitionMemo('IN_REVIEW', 'APPROVED'), true);
  assert.equal(canTransitionMemo('APPROVED', 'DRAFT'), false);
  assert.equal(canTransitionMemo('REVISION_REQUESTED', 'SUBMITTED'), true);
  assert.throws(() => assertMemoTransition('APPROVED', 'SUBMITTED'), (error: unknown) => (error as { code?: string }).code === 'INVALID_MEMO_TRANSITION');
});

test('mutating E-Approve payloads require idempotency keys and valid reasons', () => {
  assert.equal(submitMemoSchema.safeParse({ userAddedApproverIds: [], idempotencyKey: 'submit-0001' }).success, true);
  assert.equal(submitMemoSchema.safeParse({ userAddedApproverIds: [] }).success, false);
  assert.equal(approveMemoSchema.safeParse({ signatureId: 'signature-1', idempotencyKey: 'approve-0001' }).success, true);
  assert.equal(approveMemoSchema.safeParse({ idempotencyKey: 'approve-0001' }).success, false);
  assert.equal(reassignApproverSchema.safeParse({ newApproverId: 'u2', reason: '', idempotencyKey: 'replace-0001' }).success, false);
  assert.equal(requestRevisionSchema.safeParse({ reason: 'กรุณาแก้ไขยอดเงิน', idempotencyKey: 'revision-0001' }).success, true);
  assert.equal(requestRevisionSchema.safeParse({ reason: '', idempotencyKey: 'revision-0001' }).success, false);
});

test('memo attachments validate file content as well as extension and MIME type', () => {
  const pdf = Buffer.from('%PDF-1.7 sample');
  const zippedOffice = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
  assert.equal(isAllowedMemoAttachment(pdf, 'application/pdf', 'evidence.pdf'), true);
  assert.equal(isAllowedMemoAttachment(pdf, 'application/pdf', 'evidence.jpg'), false);
  assert.equal(isAllowedMemoAttachment(zippedOffice, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'memo.docx'), true);
  assert.equal(isAllowedMemoAttachment(Buffer.from('not a document'), 'application/pdf', 'fake.pdf'), false);
});

test('audit snapshots redact secrets recursively before storage or display', () => {
  assert.deepEqual(redactAuditValue({
    username: 'admin', passwordHash: 'hash', nested: { productKey: 'XXXXX', email: 'it@example.com' },
  }), {
    username: 'admin', passwordHash: '[REDACTED]', nested: { productKey: '[REDACTED]', email: 'it@example.com' },
  });
});
