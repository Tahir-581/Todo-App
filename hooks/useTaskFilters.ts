"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useTaskFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(sp.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, sp]
  );

  const buildTasksApiQuery = useMemo(() => {
    const p = new URLSearchParams(sp.toString());
    p.delete("view");
    return p.toString();
  }, [sp]);

  return { sp, setParam, buildTasksApiQuery };
}
