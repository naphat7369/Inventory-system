'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search, Filter, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { updateRepairLog } from '@/app/actions';

export function RepairListClient({ repairs, currentStatus, currentSort, currentPage, totalPages }: any) {
  const router = useRouter();
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const updateFilters = (key: string, value: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    if (value === 'ALL' || value === '1') {
      searchParams.delete(key);
      if (key === 'status') searchParams.delete('page');
    } else {
      searchParams.set(key, value);
      if (key === 'status' || key === 'sort') searchParams.set('page', '1');
    }
    router.push(`/repairs?${searchParams.toString()}`);
  };

  const getDaysPending = (sentDate: Date, completionDate: Date | null, status: string) => {
    if (status === 'COMPLETED' && completionDate) {
      return Math.floor((new Date(completionDate).getTime() - new Date(sentDate).getTime()) / (1000 * 3600 * 24));
    }
    return Math.floor((new Date().getTime() - new Date(sentDate).getTime()) / (1000 * 3600 * 24));
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const status = formData.get('status') as string;
    const cost = parseFloat(formData.get('cost') as string);
    const resolution = formData.get('resolution') as string;
    const technician = formData.get('technician') as string;

    const data: any = { status };
    if (!isNaN(cost)) data.costCents = Math.round(cost * 100);
    if (resolution) data.resolution = resolution;
    if (technician) data.technician = technician;

    try {
      await updateRepairLog(selectedRepair.id, data);
      setSelectedRepair(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error updating repair log.');
    } finally {
      setIsUpdating(false);
    }
  };

  const markCompleted = async () => {
    if (!confirm('Mark this repair as COMPLETED?')) return;
    setIsUpdating(true);
    try {
      await updateRepairLog(selectedRepair.id, { status: 'COMPLETED' });
      setSelectedRepair(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error updating repair log.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-sm shadow-sm border border-[#D4D6CF] overflow-hidden">
        <div className="bg-[#F8F9F5] p-4 border-b border-[#D4D6CF] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <select 
                value={currentStatus}
                onChange={(e) => updateFilters('status', e.target.value)}
                className="bg-white border border-[#D4D6CF] rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1C1C1A]"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_PARTS">Waiting for Parts</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort:</span>
              <select 
                value={currentSort}
                onChange={(e) => updateFilters('sort', e.target.value)}
                className="bg-white border border-[#D4D6CF] rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1C1C1A]"
              >
                <option value="sent-date-desc">Newest First</option>
                <option value="sent-date-asc">Oldest First</option>
                <option value="days-pending">Days Pending (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-[#D4D6CF]">
              <tr>
                <th className="p-4 font-semibold text-[#1C1C1A] text-sm">Asset</th>
                <th className="p-4 font-semibold text-[#1C1C1A] text-sm">Status</th>
                <th className="p-4 font-semibold text-[#1C1C1A] text-sm">Reason</th>
                <th className="p-4 font-semibold text-[#1C1C1A] text-sm">Sent Date</th>
                <th className="p-4 font-semibold text-[#1C1C1A] text-sm">Days Pending</th>
                <th className="p-4 font-semibold text-[#1C1C1A] text-sm">Cost</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((repair: any) => {
                const days = getDaysPending(repair.sentDate, repair.completionDate, repair.status);
                const isWarning = repair.status !== 'COMPLETED' && days > 7;
                return (
                  <tr 
                    key={repair.id} 
                    onClick={() => setSelectedRepair(repair)}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="font-medium text-blue-600">{repair.asset.assetId}</div>
                      <div className="text-xs text-gray-500">{repair.asset.name}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${
                        repair.status === 'COMPLETED' ? 'bg-[#4C6246]/10 text-[#4C6246]' :
                        repair.status === 'IN_PROGRESS' ? 'bg-[#E24A22]/10 text-[#E24A22]' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {repair.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[#1C1C1A] max-w-[200px] truncate">{repair.reason}</td>
                    <td className="p-4 text-sm font-[family-name:var(--font-jetbrains)] text-gray-600">
                      {new Date(repair.sentDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-[family-name:var(--font-jetbrains)]">
                      <span className={isWarning ? 'text-[#E24A22] font-bold' : 'text-gray-600'}>
                        {days} days
                      </span>
                    </td>
                    <td className="p-4 text-sm font-[family-name:var(--font-jetbrains)] text-gray-600">
                      {repair.costCents ? `$${(repair.costCents / 100).toFixed(2)}` : '-'}
                    </td>
                  </tr>
                );
              })}
              {repairs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No repair jobs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="bg-[#F8F9F5] p-4 border-t border-[#D4D6CF] flex items-center justify-between">
            <div className="text-sm text-gray-600 font-[family-name:var(--font-inter)]">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button 
                disabled={currentPage <= 1}
                onClick={() => updateFilters('page', (currentPage - 1).toString())}
                className="p-1.5 rounded-sm border border-[#D4D6CF] bg-white text-[#1C1C1A] disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                disabled={currentPage >= totalPages}
                onClick={() => updateFilters('page', (currentPage + 1).toString())}
                className="p-1.5 rounded-sm border border-[#D4D6CF] bg-white text-[#1C1C1A] disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedRepair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#F8F9F5] rounded-sm shadow-xl w-full max-w-lg overflow-hidden border border-[#D4D6CF]">
            <div className="bg-white p-4 border-b border-[#D4D6CF] flex justify-between items-center">
              <h2 className="font-bold text-lg text-[#1C1C1A]">Update Repair Job</h2>
              <button onClick={() => setSelectedRepair(null)} className="text-gray-500 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-white border-b border-[#D4D6CF]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-blue-600">{selectedRepair.asset.assetId}</h3>
                  <p className="text-sm text-gray-500">{selectedRepair.asset.name}</p>
                </div>
                <span className={`px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${
                  selectedRepair.status === 'COMPLETED' ? 'bg-[#4C6246]/10 text-[#4C6246]' :
                  selectedRepair.status === 'IN_PROGRESS' ? 'bg-[#E24A22]/10 text-[#E24A22]' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedRepair.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-sm text-[#1C1C1A] bg-[#F8F9F5] p-3 rounded-sm border border-[#D4D6CF]">
                <strong>Reason:</strong> {selectedRepair.reason}
              </div>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-sm text-sm">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-[#1C1C1A] mb-1">Status</label>
                  <select 
                    id="status" 
                    name="status" 
                    defaultValue={selectedRepair.status}
                    className="w-full border border-[#D4D6CF] rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#1C1C1A] bg-white font-[family-name:var(--font-inter)]"
                  >
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="WAITING_FOR_PARTS">Waiting for Parts</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="cost" className="block text-sm font-medium text-[#1C1C1A] mb-1">Cost ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    id="cost" 
                    name="cost"
                    defaultValue={selectedRepair.costCents ? (selectedRepair.costCents / 100).toFixed(2) : ''}
                    className="w-full border border-[#D4D6CF] rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#1C1C1A] bg-white font-[family-name:var(--font-jetbrains)]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="technician" className="block text-sm font-medium text-[#1C1C1A] mb-1">Technician / Vendor</label>
                <input 
                  type="text" 
                  id="technician" 
                  name="technician" 
                  defaultValue={selectedRepair.technician || ''}
                  className="w-full border border-[#D4D6CF] rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#1C1C1A] bg-white font-[family-name:var(--font-inter)]"
                  placeholder="Who is repairing this?"
                />
              </div>

              <div>
                <label htmlFor="resolution" className="block text-sm font-medium text-[#1C1C1A] mb-1">Resolution / Fix Description</label>
                <textarea 
                  id="resolution" 
                  name="resolution" 
                  rows={2}
                  defaultValue={selectedRepair.resolution || ''}
                  className="w-full border border-[#D4D6CF] rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#1C1C1A] bg-white resize-none font-[family-name:var(--font-inter)]"
                  placeholder="What was fixed?"
                />
              </div>

              <div className="flex justify-between items-center pt-4 mt-4 border-t border-[#D4D6CF]">
                {selectedRepair.status !== 'COMPLETED' ? (
                  <button 
                    type="button" 
                    onClick={markCompleted}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4C6246] text-white font-medium rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Check size={18} /> Mark as Completed
                  </button>
                ) : <div></div>}
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setSelectedRepair(null)}
                    className="px-4 py-2 text-[#1C1C1A] font-medium hover:bg-gray-100 rounded-sm transition-colors border border-[#D4D6CF] bg-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="px-4 py-2 bg-[#1C1C1A] text-white font-medium rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
