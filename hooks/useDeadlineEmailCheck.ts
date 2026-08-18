"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

/** Periodically asks the server to send “due tomorrow” emails (idempotent per task). */
export function useDeadlineEmailCheck() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const run = () => {
      fetch("/api/reminders/check", { method: "POST" }).catch(() => {});
    };
    run();
    const id = setInterval(run, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [status]);
}
