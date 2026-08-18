"use client";

import { motion } from "framer-motion";
import {
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  History,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  ListTodo,
  LogOut,
  Send,
  Settings,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { useUiStore } from "@/store/uiStore";
type Project = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  _count?: { tasks: number };
};

const nav = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    activeBorder: "border-l-[#fbbf24]",
    activeBg: "bg-[#fbbf24]/[0.08]",
    activeIcon: "text-[#fbbf24]",
  },
  {
    href: "/tasks",
    label: "All tasks",
    icon: ListTodo,
    activeBorder: "border-l-[#3b82f6]",
    activeBg: "bg-[#3b82f6]/[0.08]",
    activeIcon: "text-[#3b82f6]",
  },
  {
    href: "/ideas",
    label: "Idea lot",
    icon: Lightbulb,
    activeBorder: "border-l-[#eab308]",
    activeBg: "bg-[#eab308]/[0.1]",
    activeIcon: "text-[#facc15]",
  },
  {
    href: "/progress",
    label: "Progress Tracker",
    icon: LayoutGrid,
    activeBorder: "border-l-[#14b8a6]",
    activeBg: "bg-[#14b8a6]/[0.08]",
    activeIcon: "text-[#14b8a6]",
  },
  {
    href: "/history",
    label: "History",
    icon: History,
    activeBorder: "border-l-[#94a3b8]",
    activeBg: "bg-[#94a3b8]/[0.08]",
    activeIcon: "text-[#94a3b8]",
  },
  {
    href: "/notification-logs",
    label: "Message log",
    icon: Send,
    activeBorder: "border-l-[#a855f7]",
    activeBg: "bg-[#a855f7]/[0.08]",
    activeIcon: "text-[#a855f7]",
  },
  {
    href: "/whatsapp-schedule",
    label: "WA schedule",
    icon: CalendarClock,
    activeBorder: "border-l-[#34d399]",
    activeBg: "bg-emerald-500/[0.08]",
    activeIcon: "text-emerald-400",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    activeBorder: "border-l-[#71717a]",
    activeBg: "bg-[#71717a]/[0.08]",
    activeIcon: "text-[#a1a1aa]",
  },
] as const;

export function Sidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectLoading, setNewProjectLoading] = useState(false);
  const [newProjectError, setNewProjectError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  async function createProject(name: string) {
    setNewProjectLoading(true);
    setNewProjectError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const p = data as Project;
        setProjects((prev) => [...prev, { ...p, _count: { tasks: 0 } }]);
        setNewProjectOpen(false);
        router.push(`/project/${p.id}`);
      } else {
        const err = data?.error;
        setNewProjectError(
          typeof err === "string" ? err : "Could not create project. Try a different name."
        );
      }
    } finally {
      setNewProjectLoading(false);
    }
  }

  const NavBlock = ({ mobile, collapsed }: { mobile?: boolean; collapsed?: boolean }) => {
    if (mobile) {
      return (
        <>
          <div className="flex flex-1 justify-around space-y-1">
            {nav.map((item) => {
              const active =
                item.href === "/tasks"
                  ? pathname === "/tasks" || pathname.startsWith("/project/")
                  : item.href === "/progress"
                    ? pathname === "/progress"
                    : item.href === "/whatsapp-schedule"
                      ? pathname === "/whatsapp-schedule"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: 0 }}
                    className={`flex flex-col gap-1 rounded-lg border-l-[3px] px-2 py-2 text-[10px] transition-colors ${
                      active
                        ? `${item.activeBorder} ${item.activeBg} text-zinc-100`
                        : "border-l-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className={`mx-auto h-4 w-4 shrink-0 ${active ? item.activeIcon : ""}`} />
                    <span className="max-w-[56px] truncate">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </>
      );
    }

    if (collapsed) {
      return (
        <>
          <div className="space-y-1">
            {nav.map((item) => {
              const active =
                item.href === "/tasks"
                  ? pathname === "/tasks" || pathname.startsWith("/project/")
                  : item.href === "/progress"
                    ? pathname === "/progress"
                    : item.href === "/whatsapp-schedule"
                      ? pathname === "/whatsapp-schedule"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} title={item.label}>
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    className={`flex items-center justify-center rounded-lg p-2.5 text-sm transition-colors ${
                      active
                        ? `${item.activeBg} text-zinc-100`
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? item.activeIcon : ""}`} />
                  </motion.div>
                </Link>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-zinc-800/80 pt-4">
            <button
              type="button"
              onClick={() => setNewProjectOpen(true)}
              className="rounded-md p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
              aria-label="New project"
              title="New project"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="flex max-h-[min(40vh,320px)] w-full flex-col items-center gap-1 overflow-y-auto">
              {projects.map((p) => {
                const href = `/project/${p.id}`;
                const active = pathname === href;
                return (
                  <Link key={p.id} href={href} title={`${p.name} (${p._count?.tasks ?? 0})`}>
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg leading-none ${
                        active ? "bg-white/10" : "text-zinc-400 hover:bg-white/5"
                      }`}
                    >
                      <span aria-hidden>{p.emoji}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="space-y-1">
          {nav.map((item) => {
            const active =
              item.href === "/tasks"
                ? pathname === "/tasks" || pathname.startsWith("/project/")
                : item.href === "/progress"
                  ? pathname === "/progress"
                  : item.href === "/whatsapp-schedule"
                    ? pathname === "/whatsapp-schedule"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 rounded-lg border-l-[3px] py-2 pr-3 pl-2.5 text-sm transition-colors ${
                    active
                      ? `${item.activeBorder} ${item.activeBg} text-zinc-100`
                      : "border-l-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? item.activeIcon : ""}`} />
                  <span>{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Projects</p>
          <button
            type="button"
            onClick={() => setNewProjectOpen(true)}
            className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-white"
            aria-label="New project"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 space-y-0.5">
          {projects.map((p) => {
            const href = `/project/${p.id}`;
            const active = pathname === href;
            return (
              <Link key={p.id} href={href}>
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto font-mono text-xs text-zinc-600">
                    {p._count?.tasks ?? 0}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <>
      <PromptDialog
        open={newProjectOpen}
        onClose={() => {
          setNewProjectOpen(false);
          setNewProjectError(null);
        }}
        title="New project"
        message="Choose a name for your project. You can change details later."
        label="Project name"
        placeholder="e.g. Work, Personal…"
        submitLabel="Create"
        cancelLabel="Cancel"
        loading={newProjectLoading}
        error={newProjectError}
        onSubmit={createProject}
      />
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-x-hidden border-r border-zinc-800/80 bg-surface/80 backdrop-blur-xl transition-[width] duration-200 ease-out md:flex ${
          sidebarCollapsed ? "w-[4.25rem]" : "w-64"
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-zinc-800/80 ${
            sidebarCollapsed ? "justify-center px-0" : "gap-2 px-4"
          }`}
        >
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => toggleSidebarCollapsed()}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
          ) : (
            <>
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-accent to-violet-600 shadow-accent-glow/30 shadow-lg" />
              <span className="font-display min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
                Nexus
              </span>
              <button
                type="button"
                onClick={() => toggleSidebarCollapsed()}
                className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronsLeft className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        <div className={`flex flex-1 flex-col gap-6 overflow-y-auto ${sidebarCollapsed ? "px-2 py-4" : "p-4"}`}>
          <NavBlock collapsed={sidebarCollapsed} />
          <div
            className={`mt-auto border-t border-zinc-800/80 pt-4 ${sidebarCollapsed ? "flex flex-col items-center gap-2" : ""}`}
          >
            {sidebarCollapsed ? (
              <>
                <div className="flex justify-center rounded-lg bg-black/20 p-1.5">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                      title={user.name || user.email || "Account"}
                    />
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-300"
                      title={user.name || user.email || "Account"}
                    >
                      {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  className="h-9 w-9 shrink-0 p-0 text-zinc-400"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-300">
                      {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{user.name || "Account"}</p>
                    <p className="truncate text-xs text-zinc-500">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="mt-2 w-full justify-start text-zinc-400"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-800 bg-surface/95 px-2 py-2 backdrop-blur md:hidden">
        <NavBlock mobile />
      </nav>
    </>
  );
}
