import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('--- Starting Backfill for Immutable Memo Logo & SubHeader ---');

  const defaultLogoPath = path.join(process.cwd(), 'public', 'assets', 'branding', 's-hotel-default-v1.png');
  let fileSize = 15000;
  try {
    const stat = fs.statSync(defaultLogoPath);
    fileSize = stat.size;
  } catch (err) {
    console.warn('Could not read default logo file size, using fallback 15000');
  }

  // 1. Upsert default LogoAsset
  const defaultAsset = await prisma.logoAsset.upsert({
    where: { fileName: 's-hotel-default-v1.png' },
    update: {},
    create: {
      fileName: 's-hotel-default-v1.png',
      url: '/assets/branding/s-hotel-default-v1.png',
      mimeType: 'image/png',
      size: fileSize,
    }
  });
  console.log('Default LogoAsset initialized:', defaultAsset.id, defaultAsset.url);

  // 2. Backfill Departments
  const departmentsWithoutLogo = await prisma.department.findMany({
    where: {
      OR: [
        { logoUrl: null },
        { nameEn: null }
      ]
    }
  });

  let deptBackfillCount = 0;
  for (const dept of departmentsWithoutLogo) {
    const updatedNameEn = dept.nameEn || `${dept.name.trim()} DEPARTMENT`.toLocaleUpperCase('en-US');
    const updatedLogoUrl = dept.logoUrl || defaultAsset.url;
    const updatedLogoAssetId = dept.logoAssetId || defaultAsset.id;

    await prisma.department.update({
      where: { id: dept.id },
      data: {
        nameEn: updatedNameEn,
        logoUrl: updatedLogoUrl,
        logoAssetId: updatedLogoAssetId,
      }
    });
    deptBackfillCount++;
  }
  console.log(`Backfilled ${deptBackfillCount} department(s).`);

  // 3. Backfill Memos
  const memosWithoutSnapshot = await prisma.memo.findMany({
    where: {
      OR: [
        { logoUrl: null },
        { subHeader: null }
      ]
    },
    include: { department: true }
  });

  let memoBackfillCount = 0;
  for (const memo of memosWithoutSnapshot) {
    const targetLogoUrl = memo.logoUrl || defaultAsset.url;
    const targetLogoAssetId = memo.logoAssetId || defaultAsset.id;
    const targetSubHeader = memo.subHeader || (memo.department?.nameEn || `${memo.department?.name || 'GENERAL'} DEPARTMENT`).trim().toLocaleUpperCase('en-US');

    await prisma.memo.update({
      where: { id: memo.id },
      data: {
        logoUrl: targetLogoUrl,
        logoAssetId: targetLogoAssetId,
        subHeader: targetSubHeader,
      }
    });
    memoBackfillCount++;
  }

  console.log(`Backfilled ${memoBackfillCount} existing memo(s) with immutable logo snapshot and subheader.`);
  console.log('--- Backfill Complete ---');
}

main()
  .catch(e => {
    console.error('Backfill error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
