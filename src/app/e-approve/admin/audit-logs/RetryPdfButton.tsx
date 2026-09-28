'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';

export function RetryPdfButton({ memoId }: { memoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const retry = async () => {
    setLoading(true); setError('');
    const response = await fetch(`/api/admin/memos/${memoId}/retry-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: `retry-pdf-${memoId}-${crypto.randomUUID()}` }),
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setError(body.error ?? 'Retry ไม่สำเร็จ');
    router.refresh();
  };

  return <div className="text-right"><button type="button" onClick={() => void retry()} disabled={loading} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <RefreshCw className="h-3.5 w-3.5"/>}Retry PDF</button>{error && <p className="mt-1 max-w-44 text-xs text-rose-600">{error}</p>}</div>;
}
