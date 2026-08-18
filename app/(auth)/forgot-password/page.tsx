"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({ email: z.string().email() });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setDone(true);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-surface p-8 shadow-2xl light:border-zinc-200 light:bg-white">
      <h1 className="font-display text-2xl font-semibold text-white light:text-zinc-900">Reset password</h1>
      <p className="mt-1 text-sm text-zinc-500">
        We&apos;ll email you a link if an account exists for that address.
      </p>
      {done ? (
        <p className="mt-6 text-sm text-zinc-400">Check your inbox for the next steps.</p>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-xs font-medium text-zinc-400">Email</label>
            <Input type="email" className="mt-1" {...register("email")} />
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
