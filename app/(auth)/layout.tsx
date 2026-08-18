import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0F] px-4 py-12 light:bg-zinc-100">
      <div className="mb-8 flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-violet-600 shadow-lg shadow-accent/25" />
        <span className="font-display text-xl font-semibold tracking-tight text-white light:text-zinc-900">
          Nexus
        </span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
