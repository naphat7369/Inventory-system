import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequiredMemoSignatures } from '../src/lib/memo-signature-rules.ts';

const valid = [
  { approverId: 'creator', role: 'นำเสนอโดย' },
  { approverId: 'hod', role: 'พิจารณาโดย' },
  { approverId: 'required', role: 'อนุมัติโดย' },
];

test('creator, HOD, and required approvers form a valid signature list', () => {
  assert.equal(validateRequiredMemoSignatures({ signatures: valid, creatorId: 'creator', headApproverId: 'hod', requiredApproverIds: ['required'] }), null);
});

test('creator signature cannot be removed or replaced', () => {
  assert.match(validateRequiredMemoSignatures({ signatures: valid.slice(1), creatorId: 'creator', headApproverId: 'hod' }) ?? '', /ผู้จัดทำ Memo/);
});

test('HOD signature cannot be removed even though the server builds the approval chain', () => {
  assert.match(validateRequiredMemoSignatures({ signatures: [valid[0], valid[2]], creatorId: 'creator', headApproverId: 'hod' }) ?? '', /HOD\/GM/);
});

test('creator who is also HOD is represented once and self-skip remains possible', () => {
  assert.equal(validateRequiredMemoSignatures({ signatures: [valid[0], valid[2]], creatorId: 'creator', headApproverId: 'creator', requiredApproverIds: ['required'] }), null);
});

test('duplicate signer identities are rejected', () => {
  assert.match(validateRequiredMemoSignatures({ signatures: [...valid, { approverId: 'hod', role: 'อนุมัติโดย' }], creatorId: 'creator', headApproverId: 'hod' }) ?? '', /ซ้ำ/);
});
