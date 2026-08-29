export function StatsSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-border bg-border overflow-hidden rounded-none md:rounded-sm animate-pulse mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`bg-bg p-6 flex flex-col justify-between h-32 ${i !== 1 ? 'border-t md:border-t-0 md:border-l border-border' : ''}`}>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm animate-pulse h-80">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="h-64 bg-gray-100 rounded-full w-64 mx-auto"></div>
      </div>
      <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm animate-pulse h-80">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="h-64 bg-gray-100 rounded-full w-64 mx-auto"></div>
      </div>
      <div className="bg-bg border border-border rounded-none md:rounded-sm animate-pulse h-80">
        <div className="p-6 border-b border-border">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-12 bg-gray-100 rounded w-full"></div>
          <div className="h-12 bg-gray-100 rounded w-full"></div>
          <div className="h-12 bg-gray-100 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
}

export function RecentActivitySkeleton() {
  return (
    <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm animate-pulse h-96">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded w-full"></div>
        ))}
      </div>
    </div>
  );
}
