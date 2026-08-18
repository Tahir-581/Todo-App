/**
 * Central semantic palette (dark theme). Mirrors :root vars in app/globals.css.
 * Use these for documentation; UI classes live in task-themes / components.
 */
export const visualTokens = {
  status: {
    TODO: { border: "#475569", header: "#94a3b8", tint: "rgba(71,85,105,0.06)" },
    IN_PROGRESS: { border: "#3b82f6", header: "#60a5fa", tint: "rgba(59,130,246,0.06)" },
    IN_REVIEW: { border: "#f59e0b", header: "#fbbf24", tint: "rgba(245,158,11,0.06)" },
    TODAY_DONE: { border: "#10b981", header: "#34d399", tint: "rgba(16,185,129,0.07)" },
    DONE: { border: "#22c55e", header: "#4ade80", tint: "rgba(34,197,94,0.06)" },
    CANCELLED: { border: "#f43f5e", header: "#fb7185", tint: "rgba(244,63,94,0.06)" },
  },
  dashboard: {
    todayAccent: "#3b82f6",
    overdueAccent: "#f43f5e",
    overdueHeader: "#fb7185",
    upcomingAccent: "#8b5cf6",
    chartGradientFrom: "#7c3aed",
    chartGradientTo: "#3b82f6",
  },
  quickAdd: {
    gradientFrom: "#7c3aed",
    gradientTo: "#3b82f6",
    focusRing: "rgba(124,58,237,0.35)",
  },
  nav: {
    dashboard: "#fbbf24",
    tasks: "#3b82f6",
    history: "#94a3b8",
    settings: "#71717a",
  },
} as const;
