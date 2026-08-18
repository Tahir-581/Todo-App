"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z
  .object({
    password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords must match", path: ["confirm"] });

type Form = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(typeof j.error === "string" ? j.error : "Reset failed");
      return;
    }
    router.push("/login");
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-surface p-8 text-center text-sm text-zinc-400">
        Missing token.{" "}
        <Link href="/forgot-password" className="text-accent">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-surface p-8 shadow-2xl light:border-zinc-200 light:bg-white">
      <h1 className="font-display text-2xl font-semibold text-white light:text-zinc-900">New password</h1>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="text-xs font-medium text-zinc-400">Password</label>
          <Input type="password" className="mt-1" {...register("password")} />
          {errors.password ? (
            <p className="mt-1 text-xs text-red-400">{String(errors.password.message)}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-400">Confirm</label>
          <Input type="password" className="mt-1" {...register("confirm")} />
          {errors.confirm ? (
            <p className="mt-1 text-xs text-red-400">{String(errors.confirm.message)}</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}
