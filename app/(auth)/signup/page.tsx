"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signupSchema } from "@/lib/validators";
import type { z } from "zod";

type Form = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(data: Form) {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(typeof j.error === "string" ? j.error : "Could not sign up");
      return;
    }
    const sign = await signIn("credentials", {
      email: data.email,
      password: data.password,
      remember: "1",
      redirect: false,
    });
    if (sign?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-surface p-8 shadow-2xl light:border-zinc-200 light:bg-white">
      <h1 className="font-display text-2xl font-semibold text-white light:text-zinc-900">Create account</h1>
      <p className="mt-1 text-sm text-zinc-500">Start organizing work in minutes.</p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="text-xs font-medium text-zinc-400">Name</label>
          <Input className="mt-1" {...register("name")} />
          {errors.name ? (
            <p className="mt-1 text-xs text-red-400">{String(errors.name.message)}</p>
          ) : null}
        </div>
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
          {errors.password ? (
            <p className="mt-1 text-xs text-red-400">{String(errors.password.message)}</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign up
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
