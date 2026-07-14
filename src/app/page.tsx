import prisma from '@/lib/prisma';
import { Package, MapPin, Tag, Wrench } from 'lucide-react';

export default async function Dashboard() {
  const [totalAssets, totalCategories, availableAssets, assetsInRepair] = await Promise.all([
    prisma.asset.count(),
    prisma.category.count(),
    prisma.asset.count({ where: { status: 'Available' } }),
    prisma.asset.count({ where: { status: 'Repairing' } })
  ]);

  const stats = [
    { name: 'Total Assets', value: totalAssets, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Categories', value: totalCategories, icon: Tag, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Available', value: availableAssets, icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'In Repair', value: assetsInRepair, icon: Wrench, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
              <div className={`p-4 rounded-lg ${stat.bg}`}>
                <Icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.name}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="text-gray-500 flex justify-center items-center h-48 border-2 border-dashed border-gray-200 rounded-lg">
          No recent activity to display.
        </div>
      </div>
    </div>
  );
}
