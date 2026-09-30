'use client';

import { useRouter } from 'next/navigation';

export function MemoBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  const goBack = () => {
    const cameFromThisSystem = document.referrer.startsWith(window.location.origin);
    if (cameFromThisSystem && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
      aria-label="กลับไปหน้าก่อนหน้า"
    >
      &larr; กลับหน้าก่อนหน้า
    </button>
  );
}
