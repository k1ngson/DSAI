"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export type ConfirmDeleteDialogUIProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDeleteDialogUI({
  open,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  loading = false,
  danger = true,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogUIProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") {
        if (!loading) onConfirm();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onConfirm, loading]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : onClose}
          />

          <motion.div
            className="relative w-[92vw] max-w-md rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 pt-5">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center ${
                    danger ? "bg-red-500/15 text-red-400" : "bg-white/10 text-zinc-300"
                  }`}
                >
                  <AlertTriangle size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
                  {description && <p className="mt-1 text-xs text-zinc-400">{description}</p>}
                </div>
              </div>

              <button
                onClick={onClose}
                disabled={loading}
                className="p-2 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex justify-end gap-2 px-5 pb-5">
              <button
                onClick={onClose}
                disabled={loading}
                className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                {cancelText}
              </button>

              <button
                onClick={async () => onConfirm()}
                disabled={loading}
                className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                  danger
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-white text-black hover:bg-zinc-100"
                }`}
              >
                {loading ? "Deleting..." : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
