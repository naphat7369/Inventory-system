'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface ExportSlotsButtonProps {
  licenseId: string;
  filter: 'active' | 'history' | 'all';
}

export function ExportSlotsButton({ licenseId, filter }: ExportSlotsButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/licenses/${licenseId}/export?filter=${filter}`);
      if (!res.ok) {
        throw new Error('Export failed. Make sure you are authorized.');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `license-assignments-${new Date().toISOString().split('T')[0]}.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download Excel export.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors shadow-2xs disabled:opacity-50"
      title="Export assignments to Excel (.xlsx)"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin text-blue-600" />
      ) : (
        <Download size={14} className="text-gray-500 dark:text-gray-400" />
      )}
      <span>Export Excel</span>
    </button>
  );
}
