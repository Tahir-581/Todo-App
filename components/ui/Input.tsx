import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-zinc-800 bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-accent/40 focus:border-accent focus:ring-2 transition-shadow light:bg-white light:border-zinc-200 light:text-zinc-900 ${className}`}
        {...props}
      />
    );
  }
);
