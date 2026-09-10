import prisma from '@/lib/prisma';
import { AssetTable } from '@/app/assets/AssetTable';
import { Pagination } from '@/components/Pagination';
import { getSession } from '@/lib/auth';
import Link from 'next/link';

export async function DashboardAssetTable({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const { search = '', statusFilter = '', categoryId = '', propertyId = '', page = '1' } = searchParams;
  const session = await getSession();

  const whereClause: any = {
    isDeleted: false,
    isQuantityBased: false
  };
  const andConditions: any[] = [];
  
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search } },
        { assetId: { contains: search } },
        { owner: { contains: search } },
      ]
    });
  }
  
  if (statusFilter) {
    andConditions.push({ status: statusFilter });
  }

  if (categoryId) {
    andConditions.push({ categoryId });
  }

  if (propertyId) {
    andConditions.push({ propertyId });
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  const PAGE_SIZE = 10;
  const currentPage = parseInt(page, 10) || 1;
  const skip = (currentPage - 1) * PAGE_SIZE;

  const totalItems = await prisma.asset.count({ where: whereClause });
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const assets = await prisma.asset.findMany({
    where: whereClause,
    include: {
      category: true,
      property: true,
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: PAGE_SIZE,
  });

  return (
    <div className="bg-bg border border-border rounded-none md:rounded-sm overflow-hidden mb-8 shadow-xs">
      <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="font-display uppercase tracking-widest text-[0.85rem] text-text font-bold">Filtered Asset Data (ตารางข้อมูลอุปกรณ์)</h2>
        <Link href="/assets" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          MANAGE ALL ASSETS &rarr;
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <AssetTable assets={assets} role={session?.role as string} isTrash={false} />
      </div>
      
      {totalPages > 1 && (
        <div className="p-4 border-t border-border bg-gray-50 dark:bg-slate-800/50/50 dark:bg-slate-900/50">
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            totalItems={totalItems} 
            pageSize={PAGE_SIZE} 
          />
        </div>
      )}
    </div>
  );
}
