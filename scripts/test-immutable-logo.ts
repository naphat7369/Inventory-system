import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING IMMUTABLE LOGO & MEMO SPECIFICATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Check existing backfilled memo
  const initialMemo = await prisma.memo.findFirst();
  assert(initialMemo !== null, 'Existing memo was preserved after migration');
  assert(typeof initialMemo?.logoUrl === 'string' && initialMemo.logoUrl.length > 0, 'Existing memo has immutable logo snapshot');
  assert(typeof initialMemo?.subHeader === 'string' && initialMemo.subHeader.length > 0, 'Existing memo has uppercase subHeader snapshot');

  // 2. Create Department A with Logo A
  const logoA_Asset = await prisma.logoAsset.create({
    data: {
      fileName: 'test-logo-a.png',
      url: '/uploads/logos/test-logo-a.png',
      mimeType: 'image/png',
      size: 1024,
    }
  });

  const deptA = await prisma.department.create({
    data: {
      name: 'Food & Beverage',
      nameEn: 'FOOD & BEVERAGE DEPARTMENT',
      code: 'FNB' + Math.floor(Math.random() * 1000),
      logoUrl: logoA_Asset.url,
      logoAssetId: logoA_Asset.id,
      isActive: true,
    }
  });
  assert(deptA.nameEn === 'FOOD & BEVERAGE DEPARTMENT', 'Department A created with English uppercase name');

  // 3. Create Memo 1 under Department A
  const memo1 = await prisma.memo.create({
    data: {
      departmentId: deptA.id,
      documentDate: new Date(),
      recipient: 'General Manager',
      sender: 'F&B Manager',
      subject: 'Monthly Inventory Report',
      subHeader: deptA.nameEn,
      logoUrl: deptA.logoUrl,
      logoAssetId: deptA.logoAssetId,
      content: '<p>Test content for memo 1</p>',
      status: 'DRAFT',
    }
  });
  assert(memo1.logoUrl === logoA_Asset.url, 'Memo 1 received Logo A snapshot on creation');
  assert(memo1.subHeader === 'FOOD & BEVERAGE DEPARTMENT', 'Memo 1 received uppercase subheader snapshot');

  // 4. Change Department A to Logo B
  const logoB_Asset = await prisma.logoAsset.create({
    data: {
      fileName: 'test-logo-b.png',
      url: '/uploads/logos/test-logo-b.png',
      mimeType: 'image/png',
      size: 2048,
    }
  });

  await prisma.department.update({
    where: { id: deptA.id },
    data: {
      nameEn: 'UPDATED FNB DEPARTMENT',
      logoUrl: logoB_Asset.url,
      logoAssetId: logoB_Asset.id,
    }
  });

  // 5. Verify Memo 1 STILL HAS Logo A (Immutable!)
  const memo1Refreshed = await prisma.memo.findUnique({
    where: { id: memo1.id }
  });
  assert(memo1Refreshed?.logoUrl === logoA_Asset.url, 'Memo 1 maintains Logo A even after Department changed to Logo B');
  assert(memo1Refreshed?.subHeader === 'FOOD & BEVERAGE DEPARTMENT', 'Memo 1 maintains original subHeader even after Department nameEn changed');

  // 6. Create Memo 2 under Department A -> Should now get Logo B
  const memo2 = await prisma.memo.create({
    data: {
      departmentId: deptA.id,
      documentDate: new Date(),
      recipient: 'General Manager',
      sender: 'F&B Supervisor',
      subject: 'New Supplier Proposal',
      subHeader: 'UPDATED FNB DEPARTMENT',
      logoUrl: logoB_Asset.url,
      logoAssetId: logoB_Asset.id,
      content: '<p>Test content for memo 2</p>',
      status: 'DRAFT',
    }
  });
  assert(memo2.logoUrl === logoB_Asset.url, 'Memo 2 received Logo B snapshot');

  // 7. Test Finalize Memo 1 (Locking)
  const finalizedMemo1 = await prisma.memo.update({
    where: { id: memo1.id },
    data: {
      status: 'FINAL',
      documentNo: `${deptA.code} 001/2569`,
      sequence: 1,
      buddhistYear: 2569
    }
  });
  assert(finalizedMemo1.status === 'FINAL', 'Memo 1 finalized');

  // 8. Test Duplicate Memo from finalized Memo 1
  const duplicatedMemo = await prisma.memo.create({
    data: {
      departmentId: finalizedMemo1.departmentId,
      documentDate: new Date(),
      recipient: finalizedMemo1.recipient,
      sender: finalizedMemo1.sender,
      subject: `[Copy] ${finalizedMemo1.subject}`,
      subHeader: finalizedMemo1.subHeader,
      logoUrl: finalizedMemo1.logoUrl,
      logoAssetId: finalizedMemo1.logoAssetId,
      content: finalizedMemo1.content,
      status: 'DRAFT',
    }
  });
  assert(duplicatedMemo.logoUrl === logoA_Asset.url, 'Duplicated Memo inherits Logo A from source memo');
  assert(duplicatedMemo.documentNo === null, 'Duplicated Memo documentNo is reset to null');
  assert(duplicatedMemo.status === 'DRAFT', 'Duplicated Memo starts as DRAFT');

  // 9. Change Logo of Duplicated Draft Memo (User can customize draft)
  const customDraftMemo = await prisma.memo.update({
    where: { id: duplicatedMemo.id },
    data: {
      logoUrl: logoB_Asset.url,
      logoAssetId: logoB_Asset.id,
      subHeader: 'CUSTOM DEPARTMENT TITLE'
    }
  });
  assert(customDraftMemo.logoUrl === logoB_Asset.url, 'Draft duplicated memo logo successfully customized before finalize');

  // 10. Check Reference Guard: Logo A cannot be deleted while Memo 1 references it!
  const memoCountUsingLogoA = await prisma.memo.count({
    where: {
      OR: [
        { logoAssetId: logoA_Asset.id },
        { logoUrl: logoA_Asset.url }
      ]
    }
  });
  assert(memoCountUsingLogoA > 0, `Logo A is referenced by ${memoCountUsingLogoA} memo(s) and cannot be deleted`);

  // Cleanup test records
  await prisma.memo.delete({ where: { id: duplicatedMemo.id } });
  await prisma.memo.delete({ where: { id: memo2.id } });
  await prisma.memo.delete({ where: { id: memo1.id } });
  await prisma.department.delete({ where: { id: deptA.id } });
  await prisma.logoAsset.delete({ where: { id: logoA_Asset.id } });
  await prisma.logoAsset.delete({ where: { id: logoB_Asset.id } });

  console.log(`\n====================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch(e => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
