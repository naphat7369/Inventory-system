"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export function useDrilldownFilter(paramKey: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeValues = searchParams.get(paramKey)?.split(',') || [];

  function toggle(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    let newValues = [...activeValues];
    
    if (newValues.includes(value)) {
      newValues = newValues.filter(v => v !== value);
    } else {
      newValues.push(value);
    }

    if (newValues.length > 0) {
      params.set(paramKey, newValues.join(','));
    } else {
      params.delete(paramKey);
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramKey);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return { activeValues, toggle, clear, isPending };
}
