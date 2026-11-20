import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const legacyPrefix = 'storage/eapprove/';
const currentPrefix = 'storage/edocuments/';

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function moveFile(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  if (await exists(target)) return;
  try {
    await fs.rename(source, target);
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error;
    await fs.copyFile(source, target);
    await fs.unlink(source);
  }
}

let moved = 0;
let updated = 0;
let missing = 0;

try {
  const artifacts = await prisma.memoPdfArtifact.findMany({
    where: { storageKey: { startsWith: legacyPrefix } },
    select: { id: true, storageKey: true },
  });

  for (const artifact of artifacts) {
    const nextKey = artifact.storageKey.replace(legacyPrefix, currentPrefix);
    const source = path.resolve(process.cwd(), artifact.storageKey);
    const target = path.resolve(process.cwd(), nextKey);

    if (await exists(source)) {
      await moveFile(source, target);
      moved += 1;
    } else if (!(await exists(target))) {
      console.warn(`Missing PDF artifact file: ${artifact.storageKey}`);
      missing += 1;
      continue;
    }

    await prisma.memoPdfArtifact.update({
      where: { id: artifact.id },
      data: { storageKey: nextKey },
    });
    updated += 1;
  }

  console.log(`E-Documents storage migration complete: moved=${moved}, updated=${updated}, missing=${missing}`);
  if (missing > 0) process.exitCode = 2;
} finally {
  await prisma.$disconnect();
}
