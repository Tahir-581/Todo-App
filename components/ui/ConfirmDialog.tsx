"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, primary action uses danger styling */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

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
              role="alertdialog"
              aria-labelledby="confirm-dialog-title"
              aria-describedby="confirm-dialog-desc"
              aria-modal="true"
              className="absolute left-1/2 top-[max(1rem,22vh)] w-[min(400px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-zinc-800 bg-[#141416] p-6 shadow-2xl light:border-zinc-200 light:bg-white"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2
                    id="confirm-dialog-title"
                    className="font-display text-lg font-semibold tracking-tight text-zinc-100 light:text-zinc-900"
                  >
                    {title}
                  </h2>
                  <p
                    id="confirm-dialog-desc"
                    className="mt-2 text-sm leading-relaxed text-zinc-400 light:text-zinc-600"
                  >
                    {message}
                  </p>
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
                  onClick={() => void onConfirm()}
                >
                  {confirmLabel}
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )
      : null;

  return <>{modal}</>;
}
