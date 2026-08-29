import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RepairListClient } from './RepairListClient';

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/login');

  const { status, sort, page } = await searchParams;
  
  const statusFilter = typeof status === 'string' && status !== 'ALL' ? status : undefined;
  const pageNum = typeof page === 'string' ? parseInt(page) : 1;
  const pageSize = 20;

  const where = statusFilter ? { status: statusFilter } : {};

  const totalRepairs = await prisma.repairLog.count({ where });
  const totalPages = Math.ceil(totalRepairs / pageSize) || 1;

  let orderBy: any = { sentDate: 'desc' };
  if (sort === 'days-pending') {
    // pending means oldest sentDate first
    orderBy = { sentDate: 'asc' }; 
  } else if (sort === 'sent-date-asc') {
    orderBy = { sentDate: 'asc' };
  } else if (sort === 'sent-date-desc') {
    orderBy = { sentDate: 'desc' };
  }

  const repairs = await prisma.repairLog.findMany({
    where,
    orderBy,
    skip: (pageNum - 1) * pageSize,
    take: pageSize,
    include: {
      asset: {
        select: {
          assetId: true,
          name: true,
        }
      }
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1C1A]">Repair Center</h1>
          <p className="text-gray-500">Manage all asset repairs and maintenance</p>
        </div>
      </div>

      <RepairListClient 
        repairs={repairs} 
        currentStatus={typeof status === 'string' ? status : 'ALL'} 
        currentSort={typeof sort === 'string' ? sort : 'sent-date-desc'}
        currentPage={pageNum}
        totalPages={totalPages}
      />
    </div>
  );
}
