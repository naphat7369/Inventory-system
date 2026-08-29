"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export function useDrilldownFilter(paramKey: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeValue = searchParams.get(paramKey);

  function toggle(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(paramKey) === value) {
      params.delete(paramKey); // clicking the active slice clears it
    } else {
      params.set(paramKey, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return { activeValue, toggle, isPending };
}
