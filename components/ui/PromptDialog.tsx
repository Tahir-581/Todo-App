"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type PromptDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  label: string;
  inputType?: "text" | "password";
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  /** Shown after a failed submit (e.g. API error) */
  error?: string | null;
  required?: boolean;
  onSubmit: (value: string) => void | Promise<void>;
};

export function PromptDialog({
  open,
  onClose,
  title,
  message,
  label,
  inputType = "text",
  placeholder,
  submitLabel = "Continue",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  error = null,
  required = true,
  onSubmit,
}: PromptDialogProps) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue("");
    setLocalError(null);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  async function submit() {
    const trimmed = value.trim();
    if (required && !trimmed) {
      setLocalError("This field is required.");
      return;
    }
    setLocalError(null);
    await onSubmit(trimmed);
  }

  const displayError = localError || error;

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[130]">
            <motion.div
              role="presentation"
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (!loading) onClose();
              }}
            />
            <motion.div
              role="dialog"
              aria-labelledby="prompt-dialog-title"
              aria-describedby={message ? "prompt-dialog-desc" : undefined}
              aria-modal="true"
              className="absolute left-1/2 top-[max(1rem,18vh)] w-[min(440px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-zinc-800 bg-[#141416] p-6 shadow-2xl light:border-zinc-200 light:bg-white"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2
                    id="prompt-dialog-title"
                    className="font-display text-lg font-semibold tracking-tight text-zinc-100 light:text-zinc-900"
                  >
                    {title}
                  </h2>
                  {message ? (
                    <p
                      id="prompt-dialog-desc"
                      className="mt-2 text-sm leading-relaxed text-zinc-400 light:text-zinc-600"
                    >
                      {message}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) onClose();
                  }}
                  className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-white/10 hover:text-white light:hover:bg-zinc-100"
                  aria-label="Close"
                  disabled={loading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5">
                <label htmlFor="prompt-dialog-input" className="text-xs text-zinc-500">
                  {label}
                </label>
                <Input
                  ref={inputRef}
                  id="prompt-dialog-input"
                  type={inputType}
                  className="mt-1"
                  value={value}
                  placeholder={placeholder}
                  disabled={loading}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                {displayError ? <p className="mt-2 text-sm text-red-400">{displayError}</p> : null}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="sm:min-w-[100px]"
                  disabled={loading}
                  onClick={onClose}
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={destructive ? "danger" : "primary"}
                  className="sm:min-w-[100px]"
                  loading={loading}
                  onClick={() => void submit()}
                >
                  {submitLabel}
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )
      : null;

  return <>{modal}</>;
}
