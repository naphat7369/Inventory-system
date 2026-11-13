import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssetIdPrefix, formatAssetId, nextAssetSequence, normalizeDepartmentCode } from '../src/lib/asset-id.ts';

test('asset id includes property, category and department', () => {
  const prefix = buildAssetIdPrefix({ propertyPrefix: 'SRAT', categoryPrefix: 'PC', department: 'ENG' });
  assert.equal(prefix, 'SRAT-PC-ENG');
  assert.equal(formatAssetId(prefix, 1), 'SRAT-PC-ENG-0001');
});

test('asset sequence is isolated by department and continues after gaps', () => {
  const engPrefix = buildAssetIdPrefix({ propertyPrefix: 'SRAT', categoryPrefix: 'PC', department: 'ENG' });
  const hkPrefix = buildAssetIdPrefix({ propertyPrefix: 'SRAT', categoryPrefix: 'PC', department: 'HK' });
  const ids = ['SRAT-PC-ENG-0001', 'SRAT-PC-ENG-0003', 'SRAT-PC-HK-0001', 'OTHER-PC-ENG-0099'];

  assert.equal(nextAssetSequence(ids, engPrefix), 4);
  assert.equal(nextAssetSequence(ids, hkPrefix), 2);
});

test('department names are normalized to stable short codes', () => {
  assert.equal(normalizeDepartmentCode('hk'), 'HK');
  assert.equal(normalizeDepartmentCode('Engineering'), 'ENG');
  assert.equal(normalizeDepartmentCode('Human Resources'), 'HR');
});
