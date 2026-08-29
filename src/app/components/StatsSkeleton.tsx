import { Package, Tag, Wrench } from 'lucide-react';

export function StatsSkeleton() {
  const statNames = ['Total Assets', 'Categories', 'Available', 'In Repair'];
  const icons = [Package, Tag, Package, Wrench];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-border bg-border mb-8 overflow-hidden rounded-none md:rounded-sm">
        {statNames.map((name, i) => {
          const Icon = icons[i];
          return (
            <div key={name} className={`bg-bg p-6 flex flex-col justify-between ${i !== 0 ? 'border-t md:border-t-0 md:border-l border-border' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                <p className="font-display uppercase tracking-widest text-[0.7rem] text-text/70">{name}</p>
                <div className="text-accent-primary opacity-50">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
              </div>
              <div className="barcode-divider mb-4 hidden md:block opacity-10"></div>
              <div>
                {/* Skeleton for number */}
                <div className="h-10 w-24 bg-border animate-pulse mt-1 mb-1"></div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-border animate-pulse"></div>
        <h2 className="font-display uppercase tracking-widest text-[0.8rem] mb-6 text-text">Recent Activity</h2>
        <div className="flex justify-center items-center h-48 border border-dashed border-border">
          <div className="h-4 w-48 bg-border animate-pulse"></div>
        </div>
      </div>
    </>
  );
}
