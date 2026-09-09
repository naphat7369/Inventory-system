'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Filter, XCircle } from 'lucide-react';

export function DashboardMultiFilter({ 
  categories, 
  properties,
  statuses = ['Available', 'In-use', 'Repairing', 'Retired']
}: { 
  categories: { id: string, name: string }[], 
  properties: { id: string, name: string }[],
  statuses?: string[]
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatuses = searchParams.get('statusFilter')?.split(',') || [];
  const currentCategories = searchParams.get('categoryId')?.split(',') || [];
  const currentProperties = searchParams.get('propertyId')?.split(',') || [];

  const handleSelect = (key: string, value: string, current: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    let newValues;
    if (current.includes(value)) {
      newValues = current.filter(v => v !== value);
    } else {
      newValues = [...current, value];
    }
    
    if (newValues.length > 0) {
      params.set(key, newValues.join(','));
    } else {
      params.delete(key);
    }
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('statusFilter');
    params.delete('categoryId');
    params.delete('propertyId');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const hasFilters = currentStatuses.length > 0 || currentCategories.length > 0 || currentProperties.length > 0;

  return (
    <div className={`bg-bg border border-border p-5 rounded-none md:rounded-sm mb-8 shadow-xs transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-display tracking-widest uppercase text-[0.85rem] font-bold text-text">Global Chart Filters</h3>
        </div>
        {hasFilters && (
          <button 
            onClick={clearAll}
            className="flex items-center gap-1 text-[0.7rem] uppercase tracking-wider text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded transition-colors"
          >
            <XCircle size={14} /> Clear All
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-bold text-text/60 mb-3 tracking-wider">STATUS</label>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {statuses.map(s => (
              <label key={s} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded transition-colors group">
                <input 
                  type="checkbox" 
                  checked={currentStatuses.includes(s)}
                  onChange={() => handleSelect('statusFilter', s, currentStatuses)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium transition-colors">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text/60 mb-3 tracking-wider">CATEGORY</label>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {categories.map(c => (
              <label key={c.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded transition-colors group">
                <input 
                  type="checkbox" 
                  checked={currentCategories.includes(c.id)}
                  onChange={() => handleSelect('categoryId', c.id, currentCategories)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium transition-colors">{c.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text/60 mb-3 tracking-wider">PROPERTY / BRANCH</label>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {properties.map(p => (
              <label key={p.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded transition-colors group">
                <input 
                  type="checkbox" 
                  checked={currentProperties.includes(p.id)}
                  onChange={() => handleSelect('propertyId', p.id, currentProperties)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-text group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium transition-colors">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
