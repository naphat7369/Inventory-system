import prisma from '@/lib/prisma';
import { Package, Tag, Wrench } from 'lucide-react';
import React from 'react';

export async function StatsSummary({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const { statusFilter, categoryId, propertyId } = searchParams;

  const where = {
    ...(statusFilter && { status: statusFilter }),
    ...(categoryId && { categoryId }),
    ...(propertyId && { propertyId }),
  };

  const [totalAssets, totalCategories, availableAssets, assetsInRepair] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.category.count(), // Categories count is usually global, but if they want filtered, we can filter it. The prompt says "so the top counters reflect the current drill-down scope." So maybe we just filter assets.
    prisma.asset.count({ where: { ...where, status: 'Available' } }),
    prisma.asset.count({ where: { ...where, status: 'Repairing' } })
  ]);
  
  const stats = [
    { name: 'Total Assets', value: totalAssets, icon: Package },
    { name: 'Categories', value: totalCategories, icon: Tag },
    { name: 'Available', value: availableAssets, icon: Package },
    { name: 'In Repair', value: assetsInRepair, icon: Wrench },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-border bg-border overflow-hidden rounded-none md:rounded-sm">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={stat.name} className={`bg-bg p-6 flex flex-col justify-between ${i !== 0 ? 'border-t md:border-t-0 md:border-l border-border' : ''}`}>
            <div className="flex justify-between items-start mb-6">
              <p className="font-display uppercase tracking-widest text-[0.7rem] text-text/70">{stat.name}</p>
              <div className="text-accent-primary">
                <Icon size={20} strokeWidth={1.5} />
              </div>
            </div>
            <div className="barcode-divider mb-4 hidden md:block opacity-30 mix-blend-multiply"></div>
            <div>
              <p className="font-mono text-mono-stat tabular-nums text-text">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
