import prisma from '@/lib/prisma';
import { Package, MapPin, Tag, Wrench } from 'lucide-react';
import React from 'react';

const getStats = React.cache(async () => {
  const [totalAssets, totalCategories, availableAssets, assetsInRepair] = await Promise.all([
    prisma.asset.count(),
    prisma.category.count(),
    prisma.asset.count({ where: { status: 'Available' } }),
    prisma.asset.count({ where: { status: 'Repairing' } })
  ]);
  
  return { totalAssets, totalCategories, availableAssets, assetsInRepair };
});

export async function DashboardStats() {
  const { totalAssets, totalCategories, availableAssets, assetsInRepair } = await getStats();

  const stats = [
    { name: 'Total Assets', value: totalAssets, icon: Package },
    { name: 'Categories', value: totalCategories, icon: Tag },
    { name: 'Available', value: availableAssets, icon: Package },
    { name: 'In Repair', value: assetsInRepair, icon: Wrench },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-border bg-border mb-8 overflow-hidden rounded-none md:rounded-sm">
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
      
      <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent-secondary"></div>
        <h2 className="font-display uppercase tracking-widest text-[0.8rem] mb-6 text-text">Recent Activity</h2>
        <div className="font-mono text-sm text-text/50 flex justify-center items-center h-48 border border-dashed border-border">
          [ No recent activity registered ]
        </div>
      </div>
    </>
  );
}
