import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrintLabelsClient } from './PrintLabelsClient';
import { getPrintSessionIds } from './actions';

export default async function PrintAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    category?: string;
    property?: string;
    ids?: string;
    token?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const {
    search = '',
    status = '',
    category = '',
    property = '',
    ids = '',
    token = '',
  } = await searchParams;

  // 1. Gather & Validate Requested Asset IDs
  let requestedIds: string[] = [];

  // If token is provided, retrieve IDs from the server-side print session
  if (token) {
    const sessionIds = await getPrintSessionIds(token);
    if (sessionIds && sessionIds.length > 0) {
      requestedIds.push(...sessionIds);
    }
  }

  // If ids parameter is provided, parse and validate
  if (ids) {
    const parsedIds = ids
      .split(',')
      .map((id) => id.trim())
      .filter((id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id));
    requestedIds.push(...parsedIds);
  }

  // Deduplicate and enforce max limit (500 items per request)
  const uniqueRequestedIds = Array.from(new Set(requestedIds)).slice(0, 500);

  // 2. Build Strict Where Clause: Primary Assets Only (Exclude Quantity-Based Stock and Soft-Deleted Trash)
  const andConditions: any[] = [
    { isDeleted: false },       // Do not include deleted trash items
    { isQuantityBased: false },  // Strictly primary assets only (exclude quantity borrowable stock)
  ];

  // Specific IDs filter if provided
  if (uniqueRequestedIds.length > 0) {
    andConditions.push({
      id: { in: uniqueRequestedIds },
    });
  }

  // Text search filter
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search } },
        { assetId: { contains: search } },
        { owner: { contains: search } },
        { department: { contains: search } },
        { location: { contains: search } },
      ],
    });
  }

  // Status filter
  if (status && status !== 'ALL') {
    andConditions.push({ status });
  }

  // Category filter
  if (category && category !== 'ALL') {
    andConditions.push({ categoryId: category });
  }

  // Property filter
  if (property && property !== 'ALL') {
    andConditions.push({ propertyId: property });
  }

  // 3. Query Prisma Database
  const [assets, categories, properties] = await Promise.all([
    prisma.asset.findMany({
      where: { AND: andConditions },
      include: {
        category: {
          select: { id: true, name: true },
        },
        property: {
          select: { id: true, name: true },
        },
        parent: {
          select: { id: true, assetId: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.property.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // 4. Check for Missing / Inaccessible IDs
  let warningMessage: string | null = null;
  if (uniqueRequestedIds.length > 0) {
    const foundIdSet = new Set(assets.map((a) => a.id));
    const missingIds = uniqueRequestedIds.filter((id) => !foundIdSet.has(id));

    if (missingIds.length > 0) {
      warningMessage = `พบ ${missingIds.length} รายการที่ระบุในคำขอไม่พบในระบบ หรือถูกลบ/ไม่ใช่สินทรัพย์หลักแล้ว (ระบบได้คัดกรองออกเพื่อความถูกต้อง)`;
    }
  }

  // 5. Preserve Requested Order if specific IDs were supplied
  let orderedAssets = assets;
  if (uniqueRequestedIds.length > 0) {
    const assetMap = new Map(assets.map((a) => [a.id, a]));
    orderedAssets = uniqueRequestedIds
      .map((id) => assetMap.get(id))
      .filter((a): a is typeof assets[0] => a !== undefined);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || undefined;

  return (
    <PrintLabelsClient
      assets={orderedAssets as any}
      categories={categories}
      properties={properties}
      warning={warningMessage}
      initialSelectedIds={orderedAssets.map((a) => a.id)}
      baseUrl={baseUrl}
    />
  );
}
