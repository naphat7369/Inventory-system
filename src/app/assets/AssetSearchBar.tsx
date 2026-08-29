'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { getAssetSuggestions } from '@/app/actions';

export function AssetSearchBar({ defaultValue }: { defaultValue: string }) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await getAssetSuggestions(query);
        setSuggestions(results);
        setShowDropdown(true);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (assetName: string) => {
    setQuery(assetName);
    setShowDropdown(false);
    // Give state a moment to update the input value before submitting
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.click();
      }
    }, 50);
  };

  return (
    <div className="relative flex-1 w-full" ref={wrapperRef}>
      <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
      <input 
        type="text" 
        name="search" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        placeholder="Search by ID, Name, or Owner..." 
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      
      {showDropdown && (query.length >= 2) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-3 text-sm text-gray-500 text-center font-mono">Loading...</div>
          ) : suggestions.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto">
              {suggestions.map((asset) => (
                <li 
                  key={asset.id}
                  onClick={() => handleSelect(asset.name)}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium text-gray-900">{asset.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{asset.assetId} {asset.owner ? `• ${asset.owner}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-sm text-gray-500 text-center font-mono">No matches found</div>
          )}
        </div>
      )}
      
      {/* Invisible form ref anchor for auto-submit */}
      <button ref={formRef as any} type="submit" className="hidden" />
    </div>
  );
}
