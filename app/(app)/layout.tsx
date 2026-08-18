import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return <AppShell user={session.user}>{children}</AppShell>;
}
