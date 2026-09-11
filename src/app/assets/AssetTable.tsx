'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Trash2, CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown, Printer } from 'lucide-react';
import { DeleteAssetButton } from './DeleteAssetButton';
import { RestoreAssetButton } from './RestoreAssetButton';
import { InlineStatusSelect } from './InlineStatusSelect';
import { hardDeleteAssets, hardDeleteAsset, softDeleteAssets } from '@/app/actions';
import { createPrintSession } from './print/actions';

export function AssetTable({ assets, role, isTrash }: { assets: any[], role?: string, isTrash: boolean }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'assetId', direction: 'asc' });

  const toggleSelectAll = () => {
    if (selectedIds.length === assets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assets.map(a => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePrintSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsPrinting(true);
    try {
      if (selectedIds.length <= 20) {
        window.open(`/assets/print?ids=${selectedIds.join(',')}`, '_blank');
      } else {
        const res = await createPrintSession(selectedIds);
        if (res.success && res.token) {
          window.open(`/assets/print?token=${res.token}`, '_blank');
        } else {
          window.open(`/assets/print?ids=${selectedIds.slice(0, 100).join(',')}`, '_blank');
        }
      }
    } catch (e) {
      console.error('Failed to initiate print session', e);
      window.open(`/assets/print?ids=${selectedIds.slice(0, 50).join(',')}`, '_blank');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBulkAction = async () => {
    if (isTrash) {
      if (confirm(`Are you sure you want to PERMANENTLY delete ${selectedIds.length} items? This cannot be undone.`)) {
        setIsDeleting(true);
        await hardDeleteAssets(selectedIds);
        setSelectedIds([]);
        setIsDeleting(false);
        setIsSelectionMode(false);
      }
    } else {
      if (confirm(`Are you sure you want to move ${selectedIds.length} items to the trash?`)) {
        setIsDeleting(true);
        await softDeleteAssets(selectedIds);
        setSelectedIds([]);
        setIsDeleting(false);
        setIsSelectionMode(false);
      }
    }
  };

  const handleSingleHardDelete = async (id: string) => {
    if (confirm('Are you sure you want to PERMANENTLY delete this asset? This cannot be undone.')) {
      await hardDeleteAsset(id);
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    let aValue = a[sortConfig.key] || '';
    let bValue = b[sortConfig.key] || '';

    if (sortConfig.key === 'property') {
      aValue = a.property?.name || '';
      bValue = b.property?.name || '';
    } else if (sortConfig.key === 'category') {
      aValue = a.category?.name || '';
      bValue = b.category?.name || '';
    }

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 opacity-40 inline" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 inline text-blue-600" /> : <ArrowDown size={14} className="ml-1 inline text-blue-600" />;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">
      {!isSelectionMode && assets.length > 0 && (
        <div className="bg-gray-50 dark:bg-slate-800/60 p-2 px-4 border-b border-gray-200 dark:border-slate-700 flex justify-end items-center gap-2">
          <button 
            onClick={() => setIsSelectionMode(true)}
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium border border-indigo-200 dark:border-indigo-900/60"
          >
            <CheckSquare size={16} /> เลือกหลายรายการ (Select)
          </button>
          {role === 'ADMIN' && (
            <button 
              onClick={() => setIsSelectionMode(true)}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium border border-red-200 dark:border-red-900/60"
            >
              <Trash2 size={16} /> Bulk Delete
            </button>
          )}
        </div>
      )}
      
      {isSelectionMode && (
        <div className="bg-indigo-50/60 dark:bg-slate-800/90 p-3 border-b border-indigo-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-indigo-900 dark:text-indigo-200 font-bold text-sm px-2">
              เลือกแล้ว {selectedIds.length} รายการ
            </span>
            <button 
              onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}
              className="text-slate-500 dark:text-slate-400 text-sm hover:underline"
            >
              ยกเลิก
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSelected}
              disabled={isPrinting || selectedIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-xs disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              <span>{isPrinting ? 'กำลังเตรียมพิมพ์...' : `พิมพ์ป้ายกำกับที่เลือก (${selectedIds.length})`}</span>
            </button>

            {role === 'ADMIN' && (
              <button 
                onClick={handleBulkAction}
                disabled={isDeleting || selectedIds.length === 0}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
              >
                <Trash2 size={16} /> {isDeleting ? 'Processing...' : (isTrash ? `Delete (${selectedIds.length})` : `Move to Trash (${selectedIds.length})`)}
              </button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
            <tr>
              {isSelectionMode && (
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-500 dark:text-gray-400 hover:text-blue-600">
                    {assets.length > 0 && selectedIds.length === assets.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
              )}
              <th className="p-4 w-[12%] min-w-[130px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 select-none transition-colors" onClick={() => requestSort('assetId')}>
                Asset ID <SortIcon columnKey="assetId" />
              </th>
              <th className="p-4 w-[22%] min-w-[180px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 select-none transition-colors" onClick={() => requestSort('name')}>
                Name <SortIcon columnKey="name" />
              </th>
              <th className="p-4 w-[10%] min-w-[100px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 select-none transition-colors" onClick={() => requestSort('owner')}>
                Owner <SortIcon columnKey="owner" />
              </th>
              <th className="p-4 w-[8%] min-w-[90px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 select-none transition-colors" onClick={() => requestSort('department')}>
                Dept <SortIcon columnKey="department" />
              </th>
              <th className="p-4 w-[10%] min-w-[100px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 select-none transition-colors" onClick={() => requestSort('property')}>
                Property <SortIcon columnKey="property" />
              </th>
              <th className="p-4 w-[10%] min-w-[110px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 select-none transition-colors" onClick={() => requestSort('category')}>
                Category <SortIcon columnKey="category" />
              </th>
              <th className="p-4 w-[12%] min-w-[130px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 select-none transition-colors" onClick={() => requestSort('location')}>
                Location <SortIcon columnKey="location" />
              </th>
              <th className="p-4 w-[10%] min-w-[130px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/60 select-none transition-colors" onClick={() => requestSort('status')}>
                Status <SortIcon columnKey="status" />
              </th>
              <th className="p-4 w-[6%] min-w-[100px] font-semibold text-gray-600 dark:text-gray-300">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map(asset => (
              <tr 
                key={asset.id} 
                className={`border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${isSelectionMode ? 'cursor-pointer' : ''}`}
                onClick={(e) => {
                  if (isSelectionMode && !(e.target as HTMLElement).closest('a, button')) {
                    toggleSelect(asset.id);
                  }
                }}
              >
                {isSelectionMode && (
                  <td className="p-4 text-center">
                    <button onClick={() => toggleSelect(asset.id)} className="text-gray-400 hover:text-blue-600">
                      {selectedIds.includes(asset.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                    </button>
                  </td>
                )}
                <td className="p-4 font-medium text-blue-600 dark:text-blue-400">
                  <Link href={`/assets/${asset.id}`}>{asset.assetId}</Link>
                </td>
                <td className={`p-4 ${asset.name === 'Unknown Asset' ? 'text-red-500 font-semibold' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                  {asset.name}
                </td>
                <td className="p-4 text-gray-700 dark:text-gray-300">{asset.owner || '-'}</td>
                <td className="p-4 text-gray-600 dark:text-gray-300">{asset.department || '-'}</td>
                <td className="p-4 text-gray-600 dark:text-gray-300">{asset.property?.name || '-'}</td>
                <td className={`p-4 ${asset.category?.name === 'Uncategorized' ? 'text-red-500 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>
                  {asset.category?.name || '-'}
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-300">{asset.location || '-'}</td>
                <td className="p-4">
                  <InlineStatusSelect id={asset.id} currentStatus={asset.status} role={role} />
                </td>
                <td className="p-4 flex gap-2">
                  <Link 
                    href={`/assets/${asset.id}`} 
                    className="flex items-center justify-center p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/60 transition-colors"
                    title="View Details"
                  >
                    <Eye size={18} />
                  </Link>
                  {role === 'ADMIN' && (
                    <>
                      {!isTrash ? (
                        <>
                          <Link 
                            href={`/assets/${asset.id}/edit`} 
                            className="flex items-center justify-center p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 hover:text-green-700 dark:bg-green-950/50 dark:text-green-400 dark:hover:bg-green-900/60 transition-colors"
                            title="Edit Asset"
                          >
                            <Pencil size={18} />
                          </Link>
                          <DeleteAssetButton id={asset.id} />
                        </>
                      ) : (
                        <>
                          <RestoreAssetButton id={asset.id} />
                          <button 
                            onClick={() => handleSingleHardDelete(asset.id)}
                            className="flex items-center justify-center p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/60"
                            title="Hard Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={role === 'ADMIN' ? 10 : 9} className="p-8 text-center text-gray-500 dark:text-gray-400">No assets found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
