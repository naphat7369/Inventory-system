'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

export function RetryEmailButton({ deliveryId }: { deliveryId: string }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const retry = async () => { setLoading(true); setError(''); const response = await fetch(`/api/admin/email-deliveries/${deliveryId}/retry`, { method: 'POST' }); const body = await response.json().catch(() => ({})); if (!response.ok) setError(body.error ?? 'Retry ไม่สำเร็จ'); else router.refresh(); setLoading(false); };
  return <div><button disabled={loading} onClick={() => void retry()} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"><RotateCcw className="h-3.5 w-3.5"/>{loading ? 'กำลัง Retry...' : 'Retry'}</button>{error && <div className="mt-1 max-w-52 text-xs text-rose-600">{error}</div>}</div>;
}
