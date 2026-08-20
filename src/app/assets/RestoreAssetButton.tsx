'use client';

import { RefreshCw } from 'lucide-react';
import { restoreAsset } from '@/app/actions';

export function RestoreAssetButton({ id }: { id: string }) {
  const handleRestore = async () => {
    if (confirm('Are you sure you want to restore this asset from the trash?')) {
      await restoreAsset(id);
    }
  };

  return (
    <button 
      onClick={handleRestore}
      className="flex items-center justify-center p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors border border-green-200"
      title="Restore Asset"
    >
      <RefreshCw size={18} />
    </button>
  );
}
