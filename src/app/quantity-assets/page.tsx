import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { QuantityAssetsClient } from './QuantityAssetsClient';

export default async function QuantityAssetsPage() {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';

  const assets = await prisma.asset.findMany({
    where: {
      isDeleted: false,
      isQuantityBased: true,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      property: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <QuantityAssetsClient
      initialAssets={assets}
      categories={categories}
      properties={properties}
      isAdmin={isAdmin}
    />
  );
}
