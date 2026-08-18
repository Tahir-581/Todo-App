import { Suspense } from "react";
import { ResetPasswordForm } from "./form";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-zinc-800 bg-surface p-8 text-sm text-zinc-500">Loading…</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
