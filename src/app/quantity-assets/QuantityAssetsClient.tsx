'use me';
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Boxes, Plus, Search, Edit3, ArrowLeftRight, PackageCheck, AlertTriangle, Layers, Trash2, History, List } from 'lucide-react';
import { NewQuantityAssetModal } from './components/NewQuantityAssetModal';
import { EditQuantityStockModal } from './components/EditQuantityStockModal';
import { StockLogsModal } from './components/StockLogsModal';
import { CentralStockLogsView } from './components/CentralStockLogsView';
import { hardDeleteAsset } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface QuantityAssetsClientProps {
  initialAssets: any[];
  categories: any[];
  properties?: any[];
  isAdmin: boolean;
}

export function QuantityAssetsClient({
  initialAssets,
  categories,
  properties = [],
  isAdmin,
}: QuantityAssetsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'STOCK_ITEMS' | 'CENTRAL_LOGS'>('STOCK_ITEMS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [deletingAsset, setDeletingAsset] = useState<any>(null);
  const [logsAsset, setLogsAsset] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredAssets = initialAssets.filter((asset) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      asset.name.toLowerCase().includes(q) ||
      asset.assetId.toLowerCase().includes(q) ||
      (asset.category?.name && asset.category.name.toLowerCase().includes(q)) ||
      (asset.property?.name && asset.property.name.toLowerCase().includes(q)) ||
      (asset.department && asset.department.toLowerCase().includes(q))
    );
  });

  const totalItemTypes = initialAssets.length;
  const totalStockUnits = initialAssets.reduce((acc, a) => acc + (a.totalQuantity || 0), 0);
  const totalAvailableUnits = initialAssets.reduce((acc, a) => acc + (a.availableQuantity || 0), 0);
  const totalBorrowedUnits = Math.max(0, totalStockUnits - totalAvailableUnits);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAsset) return;
    setIsDeleting(true);
    try {
      await hardDeleteAsset(deletingAsset.id);
      setDeletingAsset(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบรายการสต็อก');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4" />
            <span>Consumables & Bulk Borrowables Inventory</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            อุปกรณ์นับจำนวน (Stock Assets)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            บริหารจัดการสต็อกอุปกรณ์ย่อย เมาส์ คีย์บอร์ด สายเชื่อมต่อ และติดตามประวัติการปรับปรุงสต็อก
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มสต็อกอุปกรณ์ใหม่</span>
          </button>
        )}
      </div>

      {/* Main Sub-Topic Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('STOCK_ITEMS')}
          className={`px-4 py-2.5 font-bold text-sm rounded-xl transition flex items-center gap-2 ${
            activeTab === 'STOCK_ITEMS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <List className="w-4 h-4" />
          <span>📦 รายการคลังอุปกรณ์ ({totalItemTypes})</span>
        </button>

        <button
          onClick={() => setActiveTab('CENTRAL_LOGS')}
          className={`px-4 py-2.5 font-bold text-sm rounded-xl transition flex items-center gap-2 ${
            activeTab === 'CENTRAL_LOGS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>📜 ศูนย์รวมประวัติการปรับสต็อก (Stock Audit Trail)</span>
        </button>
      </div>

      {activeTab === 'CENTRAL_LOGS' ? (
        <CentralStockLogsView properties={properties} />
      ) : (
        <>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">รายการอุปกรณ์สต็อก</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalItemTypes} รายการ</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">สต็อกรวมทั้งหมด</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalStockUnits} ชิ้น</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">กำลังถูกยืมอยู่</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalBorrowedUnits} ชิ้น</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">คงเหลือพร้อมยืม</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalAvailableUnits} ชิ้น</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่ออุปกรณ์, รหัสสต็อก, หมวดหมู่ หรือแผนก..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          />
        </div>

        <Link
          href="/borrows"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition text-center justify-center shrink-0"
        >
          <ArrowLeftRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>ไปที่หน้ายืม-คืนอุปกรณ์</span>
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">รหัสและชื่ออุปกรณ์</th>
                <th className="px-5 py-3.5">หมวดหมู่</th>
                <th className="px-5 py-3.5 text-center">สต็อกทั้งหมด</th>
                <th className="px-5 py-3.5 text-center">ถูกยืมอยู่</th>
                <th className="px-5 py-3.5 text-center">คงเหลือพร้อมยืม</th>
                <th className="px-5 py-3.5">สถานะสต็อก</th>
                <th className="px-5 py-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <div>ไม่พบรายการอุปกรณ์ประเภทนับจำนวน</div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const borrowedCount = Math.max(0, asset.totalQuantity - asset.availableQuantity);
                  const isOutOfStock = asset.availableQuantity === 0;
                  const isLowStock = asset.availableQuantity > 0 && asset.availableQuantity <= 2;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{asset.name}</div>
                        <div className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">
                            {asset.assetId}
                          </span>
                          {asset.property?.name && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                              • สาขา: {asset.property.name}
                            </span>
                          )}
                          {asset.department && <span>• {asset.department}</span>}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {asset.category?.name || '-'}
                      </td>

                      <td className="px-5 py-4 text-center font-bold text-slate-900 dark:text-slate-100">
                        {asset.totalQuantity} ชิ้น
                      </td>

                      <td className="px-5 py-4 text-center font-bold text-amber-600 dark:text-amber-400">
                        {borrowedCount} ชิ้น
                      </td>

                      <td className="px-5 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {asset.availableQuantity} ชิ้น
                      </td>

                      <td className="px-5 py-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" /> Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" /> สต็อกเหลือน้อย ({asset.availableQuantity})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                            <PackageCheck className="w-3.5 h-3.5" /> พร้อมยืม ({asset.availableQuantity})
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setEditingAsset(asset)}
                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> แก้ไขสต็อก
                              </button>
                              <button
                                onClick={() => setDeletingAsset(asset)}
                                className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <Link
                            href="/borrows"
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                          >
                            ยืมรายการนี้
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NewQuantityAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        categories={categories}
        properties={properties}
        onSuccess={handleRefresh}
      />

      <EditQuantityStockModal
        isOpen={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        asset={editingAsset}
        properties={properties}
        onSuccess={handleRefresh}
      />

      <StockLogsModal
        isOpen={!!logsAsset}
        onClose={() => setLogsAsset(null)}
        asset={logsAsset}
      />

      {/* Delete Confirmation Modal */}
      {deletingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold text-lg">
              <Trash2 className="w-6 h-6 shrink-0" />
              <span>ยืนยันลบรายการอุปกรณ์สต็อก</span>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการสต็อก <strong className="text-slate-900 dark:text-slate-100">{deletingAsset.name}</strong> ({deletingAsset.assetId})?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingAsset(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบรายการ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )}
</div>
  );
}

