"use client";

import { LayoutGrid, List, CalendarDays, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { useUiStore, type ViewMode } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";

export function Header({
  user: _user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  const showTaskChrome =
    pathname === "/tasks" || pathname.startsWith("/project/");
  const [localQ, setLocalQ] = useState(sp.get("q") ?? "");

  useEffect(() => {
    setLocalQ(sp.get("q") ?? "");
  }, [sp]);

  useEffect(() => {
    if (!showTaskChrome) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : sp.toString()
      );
      if (!localQ) next.delete("q");
      else next.set("q", localQ);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [localQ, pathname, router, showTaskChrome, sp]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function setView(v: ViewMode) {
    setViewMode(v);
    setParam("view", v);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-800/80 bg-[#0D0D0F]/90 px-4 backdrop-blur-md md:px-6 light:bg-white/90">
      {showTaskChrome ? (
        <>
          <div className="relative flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search tasks…"
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-zinc-800 bg-surface p-0.5">
            <ViewBtn
              active={viewMode === "list"}
              onClick={() => setView("list")}
              icon={<List className="h-4 w-4" />}
              label="List"
            />
            <ViewBtn
              active={viewMode === "kanban"}
              onClick={() => setView("kanban")}
              icon={<LayoutGrid className="h-4 w-4" />}
              label="Board"
            />
            <ViewBtn
              active={viewMode === "calendar"}
              onClick={() => setView("calendar")}
              icon={<CalendarDays className="h-4 w-4" />}
              label="Calendar"
            />
          </div>
        </>
      ) : (
        <div className="flex-1" />
      )}
      <Button
        variant="ghost"
        className="hidden text-xs text-zinc-400 md:inline-flex"
        onClick={() => useUiStore.getState().setCommandOpen(true)}
      >
        ⌘K
      </Button>
    </header>
  );
}

function ViewBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-accent/20 text-indigo-200" : "text-zinc-400 hover:text-white"
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
