"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export type RenameChatDialogUIProps = {
  open: boolean;
  initialValue: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (value: string) => Promise<void> | void;
};

export default function RenameChatDialogUI({
  open,
  initialValue,
  loading = false,
  onClose,
  onConfirm,
}: RenameChatDialogUIProps) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState<string>(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") {
        const v = value.trim();
        if (v && !loading) onConfirm(v);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onConfirm, value, loading]);

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
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Rename chat title</h3>
                <p className="mt-1 text-xs text-zinc-400">Give this conversation a short name.</p>
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

            <div className="px-5 pt-4">
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-zinc-700/60 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500"
                placeholder="Untitled chat"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 px-5 pb-5">
              <button
                onClick={onClose}
                disabled={loading}
                className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const v = value.trim();
                  if (!v) return;
                  await onConfirm(v);
                }}
                disabled={loading || !value.trim()}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-black hover:bg-zinc-100 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
