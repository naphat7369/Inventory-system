'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-bg border border-accent-primary p-6 rounded-none md:rounded-sm relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-accent-primary"></div>
      <h2 className="font-display uppercase tracking-widest text-[0.8rem] mb-6 text-text">System Error</h2>
      <div className="font-mono text-sm text-accent-primary flex flex-col justify-center items-center h-48 border border-dashed border-accent-primary bg-accent-primary/5 p-4 text-center">
        <p className="mb-4">[ ERR_DATA_FETCH_FAILED ]</p>
        <p className="text-text/70 mb-6">{error.message || "Failed to load dashboard data."}</p>
        <button
          onClick={() => reset()}
          className="border border-accent-primary px-4 py-2 text-accent-primary hover:bg-accent-primary hover:text-bg transition-colors uppercase tracking-widest text-xs"
        >
          RETRY_CONNECTION
        </button>
      </div>
    </div>
  );
}
