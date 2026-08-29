'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Trash2, CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DeleteAssetButton } from './DeleteAssetButton';
import { RestoreAssetButton } from './RestoreAssetButton';
import { InlineStatusSelect } from './InlineStatusSelect';
import { hardDeleteAssets, hardDeleteAsset, softDeleteAssets } from '@/app/actions';

export function AssetTable({ assets, role, isTrash }: { assets: any[], role?: string, isTrash: boolean }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      {role === 'ADMIN' && !isSelectionMode && assets.length > 0 && (
        <div className="bg-gray-50 p-2 px-4 border-b border-gray-200 flex justify-end">
          <button 
            onClick={() => setIsSelectionMode(true)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium border border-red-200"
          >
            <Trash2 size={16} /> Bulk Delete
          </button>
        </div>
      )}
      
      {isSelectionMode && (
        <div className="bg-red-50 p-3 border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-red-700 font-medium px-2">{selectedIds.length} items selected</span>
            <button 
              onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}
              className="text-red-600 text-sm hover:underline"
            >
              Cancel
            </button>
          </div>
          <button 
            onClick={handleBulkAction}
            disabled={isDeleting || selectedIds.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Trash2 size={18} /> {isDeleting ? 'Processing...' : (isTrash ? `Delete Permanently (${selectedIds.length})` : `Move to Trash (${selectedIds.length})`)}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {role === 'ADMIN' && isSelectionMode && (
                <th className="p-4 font-semibold text-gray-600 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-500 hover:text-blue-600">
                    {assets.length > 0 && selectedIds.length === assets.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
              )}
              <th className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('assetId')}>
                Asset ID <SortIcon columnKey="assetId" />
              </th>
              <th className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('name')}>
                Name <SortIcon columnKey="name" />
              </th>
              <th className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('owner')}>
                Owner <SortIcon columnKey="owner" />
              </th>
              <th className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('department')}>
                Dept <SortIcon columnKey="department" />
              </th>
              <th className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('property')}>
                Property <SortIcon columnKey="property" />
              </th>
              <th className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('category')}>
                Category <SortIcon columnKey="category" />
              </th>
              <th className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('location')}>
                Location <SortIcon columnKey="location" />
              </th>
              <th className="p-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('status')}>
                Status <SortIcon columnKey="status" />
              </th>
              <th className="p-4 font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map(asset => (
              <tr 
                key={asset.id} 
                className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${isSelectionMode ? 'cursor-pointer' : ''}`}
                onClick={(e) => {
                  if (isSelectionMode && !(e.target as HTMLElement).closest('a, button')) {
                    toggleSelect(asset.id);
                  }
                }}
              >
                {role === 'ADMIN' && isSelectionMode && (
                  <td className="p-4 text-center">
                    <button onClick={() => toggleSelect(asset.id)} className="text-gray-400 hover:text-blue-600">
                      {selectedIds.includes(asset.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                    </button>
                  </td>
                )}
                <td className="p-4 font-medium text-blue-600">
                  <Link href={`/assets/${asset.id}`}>{asset.assetId}</Link>
                </td>
                <td className={`p-4 ${asset.name === 'Unknown Asset' ? 'text-red-500 font-semibold' : 'text-gray-900 font-medium'}`}>
                  {asset.name}
                </td>
                <td className="p-4">{asset.owner || '-'}</td>
                <td className="p-4 text-gray-600">{asset.department || '-'}</td>
                <td className="p-4 text-gray-600">{asset.property?.name || '-'}</td>
                <td className={`p-4 ${asset.category?.name === 'Uncategorized' ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                  {asset.category?.name || '-'}
                </td>
                <td className="p-4 text-gray-600">{asset.location || '-'}</td>
                <td className="p-4">
                  <InlineStatusSelect id={asset.id} currentStatus={asset.status} role={role} />
                </td>
                <td className="p-4 flex gap-2">
                  <Link 
                    href={`/assets/${asset.id}`} 
                    className="flex items-center justify-center p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
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
                            className="flex items-center justify-center p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors"
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
                            className="flex items-center justify-center p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border border-red-300"
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
                <td colSpan={role === 'ADMIN' ? 10 : 9} className="p-8 text-center text-gray-500">No assets found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
