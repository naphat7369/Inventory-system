'use client';

import { Trash2 } from 'lucide-react';
import { deleteAsset } from '@/app/actions';

export function DeleteAssetButton({ id }: { id: string }) {
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      await deleteAsset(id);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      className="flex items-center justify-center p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
      title="Delete Asset"
    >
      <Trash2 size={18} />
    </button>
  );
}
