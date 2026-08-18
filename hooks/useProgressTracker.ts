"use client";

import { useEffect } from "react";
import { useProgressTrackerStore } from "@/store/progressTrackerStore";

/** Ensures progress tracker state is loaded from localStorage (pt_activities / pt_checks). */
export function useProgressTrackerHydration() {
  const hydrate = useProgressTrackerStore((s) => s.hydrate);
  const hydrated = useProgressTrackerStore((s) => s.hydrated);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return hydrated;
}

export { useProgressTrackerStore } from "@/store/progressTrackerStore";
