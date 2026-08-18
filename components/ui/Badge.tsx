import type { HTMLAttributes, ReactNode } from "react";

export function Badge({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
