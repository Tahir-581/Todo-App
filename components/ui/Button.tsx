"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "outline";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-indigo-500 shadow-accent-glow/20 shadow-lg",
  ghost: "bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white",
  danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30",
  outline:
    "border border-zinc-700 bg-transparent text-zinc-200 hover:border-zinc-500 hover:bg-white/5",
};

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  loading?: boolean;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", variant = "primary", loading, disabled, children, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : null}
      {children}
    </motion.button>
  );
});
