"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginSchema } from "@/lib/validators";
import type { z } from "zod";

type Form = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: false },
  });

  async function onSubmit(data: Form) {
    setError(null);
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      remember: data.remember ? "1" : "0",
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-surface p-8 shadow-2xl light:border-zinc-200 light:bg-white">
      <h1 className="font-display text-2xl font-semibold text-white light:text-zinc-900">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">Welcome back to your workspace.</p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="text-xs font-medium text-zinc-400">Email</label>
          <Input type="email" className="mt-1" {...register("email")} />
          {errors.email ? (
            <p className="mt-1 text-xs text-red-400">{String(errors.email.message)}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-400">Password</label>
          <Input type="password" className="mt-1" {...register("password")} />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" {...register("remember")} />
          Remember me
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/forgot-password" className="text-accent hover:underline">
          Forgot password?
        </Link>
        {" · "}
        <Link href="/signup" className="text-zinc-400 hover:text-white">
          Create account
        </Link>
      </p>
    </div>
  );
}
