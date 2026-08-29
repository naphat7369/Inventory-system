import { Suspense } from 'react';
import { StatsSummary } from './components/StatsSummary';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { DepartmentBorrowAnalytics } from './components/DepartmentBorrowAnalytics';
import { QuantityAssetStock } from './components/QuantityAssetStock';
import { RecentActivity } from './components/RecentActivity';
import { StatsSummarySkeleton, AnalyticsPanelSkeleton, RecentActivitySkeleton } from './components/Skeletons';
import { DashboardTabs } from './components/DashboardTabs';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedParams = await searchParams;

  const overviewContent = (
    <div className="space-y-8">
      <Suspense fallback={<StatsSummarySkeleton />} key={`stats-${JSON.stringify(resolvedParams)}`}>
        <StatsSummary searchParams={resolvedParams} />
      </Suspense>

      <Suspense fallback={<AnalyticsPanelSkeleton />} key={`analytics-${JSON.stringify(resolvedParams)}`}>
        <AnalyticsPanel searchParams={resolvedParams} />
      </Suspense>
    </div>
  );

  const recentActivityContent = (
    <Suspense fallback={<RecentActivitySkeleton />}>
      <RecentActivity />
    </Suspense>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 border-b border-border pb-6 flex items-end justify-between">
        <div>
          <p className="font-mono text-accent-primary text-xs uppercase tracking-[0.2em] mb-2">[ SYS_ID: INV-001 ]</p>
          <h1 className="font-display text-4xl tracking-tight text-text">Warehouse Overview</h1>
        </div>
        <div className="hidden md:block">
          <div className="barcode-divider w-32 opacity-50 mix-blend-multiply"></div>
        </div>
      </header>

      <DashboardTabs
        overviewComponent={overviewContent}
        quantityStockComponent={<QuantityAssetStock />}
        departmentStatsComponent={<DepartmentBorrowAnalytics />}
        recentActivityComponent={recentActivityContent}
      />
    </div>
  );
}
