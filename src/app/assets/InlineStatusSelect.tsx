'use client';

import { useTransition } from 'react';
import { updateAssetStatus } from '@/app/actions';

export function InlineStatusSelect({ id, currentStatus, role }: { id: string, currentStatus: string, role?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    startTransition(async () => {
      await updateAssetStatus(id, newStatus);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-700 border-green-200';
      case 'In-use': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Borrowed': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Repairing': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (role !== 'ADMIN') {
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentStatus)}`}>
        {currentStatus}
      </span>
    );
  }

  return (
    <select
      value={currentStatus}
      onChange={handleStatusChange}
      disabled={isPending}
      className={`px-3 py-1 rounded-full text-sm font-medium border appearance-none cursor-pointer outline-none text-center ${getStatusColor(currentStatus)} ${isPending ? 'opacity-50' : 'hover:brightness-95'}`}
    >
      <option value="Available" className="bg-white text-gray-900">Available</option>
      <option value="In-use" className="bg-white text-gray-900">In-use</option>
      <option value="Borrowed" className="bg-white text-gray-900">Borrowed</option>
      <option value="Repairing" className="bg-white text-gray-900">Repairing</option>
      <option value="Disposed" className="bg-white text-gray-900">Disposed</option>
    </select>
  );
}
