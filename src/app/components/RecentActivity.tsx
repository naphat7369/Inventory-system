import prisma from '@/lib/prisma';
import { Activity } from 'lucide-react';

export async function RecentActivity() {
  const activities = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return (
    <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-accent-secondary"></div>
      <div className="flex items-center gap-2 mb-6">
        <Activity size={18} className="text-accent-secondary" />
        <h2 className="font-display uppercase tracking-widest text-[0.8rem] text-text">Recent Activity</h2>
      </div>
      
      {activities.length === 0 ? (
        <div className="font-mono text-sm text-text/50 flex justify-center items-center h-48 border border-dashed border-border">
          [ No recent activity registered ]
        </div>
      ) : (
        <ul className="space-y-4">
          {activities.map(activity => {
            const actor = activity.userId ? `User ${activity.userId}` : 'System'; // Replace with User object when auth exists
            
            let color = 'text-gray-500';
            if (activity.action === 'CREATED') color = 'text-green-600';
            if (activity.action === 'DELETED') color = 'text-red-600';
            if (activity.action === 'UPDATED') color = 'text-blue-600';

            return (
              <li key={activity.id} className="text-sm font-mono flex items-start gap-4 p-3 bg-[#F8F9F5] border border-border">
                <div className="min-w-[120px] text-text/50">
                  {new Date(activity.createdAt).toLocaleString()}
                </div>
                <div className="flex-1">
                  <span className="font-bold text-text">{actor}</span>{' '}
                  <span className={color}>{activity.action}</span>{' '}
                  <span className="font-bold">{activity.entity}</span>{' '}
                  <span className="text-text/70">({activity.entityId})</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
