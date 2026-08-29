import prisma from '@/lib/prisma';
import { InteractivePieChart } from './InteractivePieChart';
import { REPAIR_OVERDUE_DAYS } from '@/lib/constants';
import { AlertCircle, Clock, Wrench } from 'lucide-react';
import Link from 'next/link';

export async function AnalyticsPanel({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const { statusFilter, categoryId, propertyId } = searchParams;

  // Rule 3: Self-filter exclusion.
  // When querying for the Status chart, we apply categoryId and propertyId filters, but NOT statusFilter.
  const statusWhere = {
    ...(categoryId && { categoryId }),
    ...(propertyId && { propertyId }),
  };

  // When querying for the Category chart, we apply statusFilter and propertyId, but NOT categoryId.
  const categoryWhere = {
    ...(statusFilter && { status: statusFilter }),
    ...(propertyId && { propertyId }),
  };

  // When querying for the Property chart, we apply statusFilter and categoryId, but NOT propertyId.
  const propertyWhere = {
    ...(statusFilter && { status: statusFilter }),
    ...(categoryId && { categoryId }),
  };

  // 1. Status Chart Data
  const statuses = await prisma.asset.groupBy({
    by: ['status'],
    where: Object.keys(statusWhere).length > 0 ? statusWhere : undefined,
    _count: { id: true }
  });
  
  const statusChartData = statuses.map(s => ({
    id: s.status, // use status string as ID
    name: s.status,
    value: s._count.id
  }));

  // 2. Category Chart Data
  const categoriesQuery = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { assets: { where: Object.keys(categoryWhere).length > 0 ? categoryWhere : undefined } }
      }
    }
  });
  
  const categoryChartData = categoriesQuery
    .filter(c => c._count.assets > 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      value: c._count.assets
    }));

  // 3. Property Chart Data
  const propertiesQuery = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { assets: { where: Object.keys(propertyWhere).length > 0 ? propertyWhere : undefined } }
      }
    }
  });

  const propertyChartData = propertiesQuery
    .filter(p => p._count.assets > 0)
    .map(p => ({
      id: p.id,
      name: p.name,
      value: p._count.assets
    }));

  // Unfiltered Action Alerts
  const overdueThreshold = new Date();
  overdueThreshold.setDate(overdueThreshold.getDate() - REPAIR_OVERDUE_DAYS);

  const overdueRepairs = await prisma.repairLog.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'WAITING_FOR_PARTS'] },
      sentDate: { lt: overdueThreshold }
    },
    include: { asset: { select: { assetId: true, name: true } } },
    take: 5,
    orderBy: { sentDate: 'asc' }
  });

  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);

  const expiringLicenses = await prisma.license.findMany({
    where: {
      expirationDate: {
        gte: today,
        lte: next30Days
      },
      status: 'Active'
    },
    take: 5,
    orderBy: { expirationDate: 'asc' }
  });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm">
          <InteractivePieChart data={statusChartData} paramKey="statusFilter" title="Assets by Status" />
        </div>

        <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm">
          <InteractivePieChart data={categoryChartData} paramKey="categoryId" title="Assets by Category" />
        </div>

        <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm">
          <InteractivePieChart data={propertyChartData} paramKey="propertyId" title="Assets by Property" />
        </div>
      </div>

      <div className="grid grid-cols-1 mb-8">
        {/* Alerts Section (Unfiltered) */}
        <div className="bg-bg border border-border rounded-none md:rounded-sm flex flex-col">
          <div className="p-6 border-b border-border flex items-center gap-2">
            <AlertCircle size={18} className="text-accent-primary" />
            <h2 className="font-display uppercase tracking-widest text-[0.8rem] text-text">Action Alerts (Unfiltered)</h2>
          </div>
          
          <div className="p-0 overflow-y-auto max-h-[300px]">
            {overdueRepairs.length === 0 && expiringLicenses.length === 0 ? (
              <div className="p-6 text-text/50 font-mono text-sm">
                [ All systems normal. No pending alerts. ]
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {overdueRepairs.map(repair => {
                  const days = Math.floor((today.getTime() - new Date(repair.sentDate).getTime()) / (1000 * 3600 * 24));
                  return (
                    <li key={repair.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <Link href={`/repairs`} className="flex items-start gap-3">
                        <div className="bg-accent-primary/10 text-accent-primary p-2 rounded-sm mt-0.5">
                          <Wrench size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-text text-sm">Overdue Repair: {repair.asset.assetId}</p>
                          <p className="text-text/70 text-xs mt-1">Pending for {days} days ({repair.status.replace(/_/g, ' ')})</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
                
                {expiringLicenses.map(license => {
                  const daysLeft = license.expirationDate ? Math.floor((new Date(license.expirationDate).getTime() - today.getTime()) / (1000 * 3600 * 24)) : 0;
                  return (
                    <li key={license.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <Link href={`/licenses/${license.id}`} className="flex items-start gap-3">
                        <div className="bg-yellow-100 text-yellow-700 p-2 rounded-sm mt-0.5">
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-text text-sm">License Expiring: {license.name}</p>
                          <p className="text-text/70 text-xs mt-1">Expires in {daysLeft} days</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
