import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    include: {
      category: true,
      property: true
    },
    orderBy: { createdAt: 'asc' }
  });

  for (const asset of assets) {
    let catPrefix = asset.category?.prefix;
    if (!catPrefix && asset.category?.name) {
      catPrefix = asset.category.name.substring(0, 3).toUpperCase();
    }
    if (!catPrefix) catPrefix = 'ASSET';

    let propPrefix = '';
    if (asset.property) {
      propPrefix = asset.property.prefix || asset.property.name.substring(0, 3).toUpperCase();
      propPrefix += '-';
    }

    // Extract the number part from the current assetId (e.g. COM-0001 -> 0001)
    const match = asset.assetId.match(/-(\d+)$/);
    let numberPart = '';
    if (match) {
      numberPart = match[1];
    } else {
      // fallback
      numberPart = '0000';
    }

    const newAssetId = `${propPrefix}${catPrefix}-${numberPart}`;

    if (asset.assetId !== newAssetId) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { assetId: newAssetId }
      });
      console.log(`Updated ${asset.assetId} -> ${newAssetId}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
