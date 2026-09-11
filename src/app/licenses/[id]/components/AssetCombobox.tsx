'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Laptop, X, Check, Loader2 } from 'lucide-react';
import { searchAssets } from '@/app/actions';

interface AssetItem {
  id: string;
  assetId: string;
  name: string;
  department: string | null;
}

interface AssetComboboxProps {
  linkedAssetId?: string | null;
  linkedAssetDisplay?: string | null;
  onSelectAsset: (asset: AssetItem) => void;
  onClearAsset: () => void;
}

export function AssetCombobox({
  linkedAssetId,
  linkedAssetDisplay,
  onSelectAsset,
  onClearAsset,
}: AssetComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const assets = await searchAssets(query);
        setResults(assets);
      } catch (err) {
        console.error('Error searching assets:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Link Inventory Asset (Optional)
      </label>

      {linkedAssetId ? (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-200">
            <Laptop size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">Linked to:</span>
            <span className="font-semibold">{linkedAssetDisplay || linkedAssetId}</span>
          </div>
          <button
            type="button"
            onClick={onClearAsset}
            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 px-2 py-1 rounded transition-colors"
            title="Unlink asset (keeps filled device name)"
          >
            <X size={14} /> Unlink Asset
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                setIsOpen(true);
              }}
              placeholder="Search asset by ID, device name, or IP..."
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            {loading && (
              <Loader2 size={16} className="absolute right-3 text-blue-600 animate-spin" />
            )}
          </div>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
              {loading && results.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500">Searching assets...</div>
              ) : results.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500">
                  {query ? 'No matching assets found.' : 'Type to search assets...'}
                </div>
              ) : (
                results.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelectAsset(asset);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                          {asset.assetId}
                        </span>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {asset.name}
                        </p>
                      </div>
                      {asset.department && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Dept: {asset.department}
                        </p>
                      )}
                    </div>
                    <Check size={16} className="text-blue-600 opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
