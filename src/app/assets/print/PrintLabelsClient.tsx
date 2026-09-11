'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  CheckSquare,
  Square,
  Search,
  ArrowLeft,
  AlertTriangle,
  Layers,
  Building,
  RotateCcw,
  CheckCircle2,
  X,
  Package,
} from 'lucide-react';

export interface PrintAssetItem {
  id: string;
  assetId: string;
  name: string;
  department?: string | null;
  location?: string | null;
  ipAddress?: string | null;
  status: string;
  categoryId: string;
  propertyId?: string | null;
  category: { id: string; name: string };
  property?: { id: string; name: string } | null;
  parent?: { id: string; assetId: string; name: string } | null;
}

interface PrintLabelsClientProps {
  assets: PrintAssetItem[];
  categories: Array<{ id: string; name: string }>;
  properties: Array<{ id: string; name: string }>;
  warning?: string | null;
  initialSelectedIds?: string[];
  baseUrl?: string;
}

export function PrintLabelsClient({
  assets,
  categories,
  properties,
  warning: initialWarning,
  initialSelectedIds,
  baseUrl,
}: PrintLabelsClientProps) {
  // Selection state (Set of asset IDs that will be printed)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return new Set(initialSelectedIds);
    }
    // Default: all initially loaded valid assets are selected
    return new Set(assets.map((a) => a.id));
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedProperty, setSelectedProperty] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [warning, setWarning] = useState<string | null>(initialWarning || null);

  // Filtered list of assets according to user live filter
  const filteredAssets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return assets.filter((asset) => {
      // Show only selected toggle
      if (showOnlySelected && !selectedIds.has(asset.id)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && asset.categoryId !== selectedCategory) {
        return false;
      }

      // Property filter
      if (selectedProperty !== 'ALL' && asset.propertyId !== selectedProperty) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && asset.status !== selectedStatus) {
        return false;
      }

      // Search query (Asset ID, Name, Department, Location, Owner, IP)
      if (q) {
        const matchAssetId = asset.assetId.toLowerCase().includes(q);
        const matchName = asset.name.toLowerCase().includes(q);
        const matchDept = asset.department?.toLowerCase().includes(q) || false;
        const matchLoc = asset.location?.toLowerCase().includes(q) || false;
        const matchIp = asset.ipAddress?.toLowerCase().includes(q) || false;
        const matchCat = asset.category.name.toLowerCase().includes(q);
        const matchProp = asset.property?.name.toLowerCase().includes(q) || false;
        return matchAssetId || matchName || matchDept || matchLoc || matchIp || matchCat || matchProp;
      }

      return true;
    });
  }, [assets, searchTerm, selectedCategory, selectedProperty, selectedStatus, showOnlySelected, selectedIds]);

  // Toggle single item selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all items matching current active filter
  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredAssets.forEach((a) => next.add(a.id));
      return next;
    });
  };

  // Deselect all items matching current active filter
  const handleDeselectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredAssets.forEach((a) => next.delete(a.id));
      return next;
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedProperty('ALL');
    setSelectedStatus('ALL');
    setShowOnlySelected(false);
  };

  // Count how many visible items are selected
  const visibleSelectedCount = useMemo(() => {
    return filteredAssets.filter((a) => selectedIds.has(a.id)).length;
  }, [filteredAssets, selectedIds]);

  const allVisibleSelected = filteredAssets.length > 0 && visibleSelectedCount === filteredAssets.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 print:bg-white print:text-black print:p-0 print:m-0 print:min-h-0">
      {/* 1. Control Toolbar (Hidden in Print Mode) */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto p-4 sm:px-6 space-y-4">
          {/* Top Row: Navigation, Title, Selection Stats, Print Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/assets"
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-sm font-semibold"
                title="กลับหน้ารายการสินทรัพย์"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับ</span>
              </Link>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <div>
                <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>พิมพ์ป้ายกำกับสินทรัพย์ (Asset Labels)</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ระบบจะพิมพ์เฉพาะสินทรัพย์หลักที่เลือกไว้เท่านั้น ({selectedIds.size} รายการ)
                </p>
              </div>
            </div>

            {/* Print Action Button & Counter */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  เลือกแล้ว {selectedIds.size} / {assets.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-bold text-sm rounded-xl shadow-xs transition disabled:cursor-not-allowed shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ป้ายที่เลือก ({selectedIds.size})</span>
              </button>
            </div>
          </div>

          {/* Warning Banner (If any invalid or missing IDs were excluded) */}
          {warning && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{warning}</span>
              </div>
              <button
                type="button"
                onClick={() => setWarning(null)}
                className="p-1 text-amber-600 dark:text-amber-400 hover:opacity-75"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Second Row: Selection Controls & Live Search / Filter */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Select All / Deselect All Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={allVisibleSelected ? handleDeselectAllVisible : handleSelectAllVisible}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition"
              >
                {allVisibleSelected ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>ยกเลิกการเลือกที่แสดงอยู่</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>เลือกทั้งหมดที่แสดงอยู่ ({filteredAssets.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Live Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา Asset ID, ชื่อ, แผนก, สถานที่..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 font-medium"
              >
                <option value="ALL">ทุกหมวดหมู่ ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Property Filter */}
            {properties.length > 0 && (
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 font-medium"
              >
                <option value="ALL">ทุกสาขา / สถานที่ ({properties.length})</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* Show only selected checkbox */}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={showOnlySelected}
                onChange={(e) => setShowOnlySelected(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>ดูเฉพาะที่เลือก ({selectedIds.size})</span>
            </label>

            {/* Clear filters button */}
            {(searchTerm || selectedCategory !== 'ALL' || selectedProperty !== 'ALL' || showOnlySelected) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Printable Area */}
      <main className="max-w-7xl mx-auto p-4 sm:px-6 pt-6 print:p-0 print:max-w-none">
        {/* Empty State */}
        {filteredAssets.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto my-12 space-y-4 print:hidden">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">ไม่พบรายการสินทรัพย์ที่ตรงกับตัวกรอง</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ลองปรับเปลี่ยนคำค้นหา หรือคลิกเพื่อล้างตัวกรองทั้งหมด
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid print:grid-cols-2 print:gap-4 print:w-full">
            {filteredAssets.map((asset) => {
              const isSelected = selectedIds.has(asset.id);
              const qrUrl =
                typeof window !== 'undefined'
                  ? `${window.location.origin}/assets/${asset.id}`
                  : baseUrl
                  ? `${baseUrl}/assets/${asset.id}`
                  : `http://localhost:3000/assets/${asset.id}`;

              return (
                <div
                  key={asset.id}
                  onClick={() => toggleSelect(asset.id)}
                  className={`relative rounded-xl p-5 transition cursor-pointer select-none break-inside-avoid print:break-inside-avoid print:cursor-default ${
                    isSelected
                      ? 'border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20 print:border-2 print:border-solid print:border-gray-800 print:shadow-none print:ring-0 print:block'
                      : 'border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 opacity-45 hover:opacity-80 print:hidden'
                  }`}
                >
                  {/* On-Screen Selection Checkbox Badge (Hidden when printed) */}
                  <div className="absolute top-3 right-3 print:hidden z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(asset.id);
                      }}
                      className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title={isSelected ? 'คลิกเพื่อยกเลิกการเลือก' : 'คลิกเพื่อเลือกรายการนี้'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Label Header */}
                  <div className="flex items-center justify-between border-b-2 border-gray-800 dark:border-slate-600 print:border-gray-800 pb-3 mb-3 pr-8 print:pr-0">
                    <div>
                      <h2 className="font-extrabold text-base uppercase tracking-wider text-slate-900 dark:text-slate-100 print:text-black">
                        {asset.category.name}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 print:text-gray-600 text-xs font-mono font-bold mt-0.5">
                        ID: {asset.assetId}
                      </p>
                    </div>
                    <div className="w-9 h-9 bg-gray-900 text-white rounded-md flex items-center justify-center font-extrabold text-[10px] tracking-tighter shrink-0">
                      LOGO
                    </div>
                  </div>

                  {/* Label Content */}
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 space-y-1.5 min-w-0 text-xs text-slate-700 dark:text-slate-300 print:text-black">
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100 print:text-black truncate">
                        {asset.name}
                      </p>
                      <div className="truncate">
                        <span className="text-slate-500 dark:text-slate-400 print:text-gray-600">สาขา/ที่ตั้ง: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                          {asset.property?.name || '-'}{asset.location ? ` (${asset.location})` : ''}
                        </span>
                      </div>
                      <p className="truncate">
                        <span className="text-slate-500 dark:text-slate-400 print:text-gray-600">แผนก: </span>
                        <span>{asset.department || '-'}</span>
                      </p>
                      {asset.parent && (
                        <p className="truncate">
                          <span className="text-slate-500 dark:text-slate-400 print:text-gray-600">ต่อพ่วงกับ: </span>
                          <span className="font-mono font-semibold">{asset.parent.assetId}</span>
                        </p>
                      )}
                      {asset.ipAddress && (
                        <p className="truncate font-mono">
                          <span className="text-slate-500 dark:text-slate-400 print:text-gray-600">IP: </span>
                          <span>{asset.ipAddress}</span>
                        </p>
                      )}
                    </div>

                    {/* QR Code Container (High-Contrast for Scanner Reading) */}
                    <div className="bg-white p-1.5 border border-gray-300 rounded-lg shrink-0 print:border-gray-800 shadow-2xs">
                      <QRCodeSVG value={qrUrl} size={88} level="M" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
