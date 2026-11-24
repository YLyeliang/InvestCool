"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { ConfirmDialogState, ToastItem } from "./types";

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[3000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all",
            "bg-[var(--card-bg)] text-[var(--text-primary)]",
            t.type === "success" && "border-[var(--success-color)]/40",
            t.type === "error" && "border-[var(--danger-color)]/50",
            t.type === "info" && "border-[var(--border-strong)]"
          )}
        >
          <Icon
            name={
              t.type === "success"
                ? "check-circle-2"
                : t.type === "error"
                ? "alert-circle"
                : "info"
            }
            size={18}
            className={cn(
              "shrink-0",
              t.type === "success" && "text-[var(--success-color)]",
              t.type === "error" && "text-[var(--danger-color)]",
              t.type === "info" && "text-[var(--accent-color)]"
            )}
          />
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="关闭提示"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmModal({
  state,
  onClose,
}: {
  state: ConfirmDialogState | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = React.useState(false);

  if (!state || !state.open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await state.onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0",
              state.danger
                ? "bg-red-500/10 text-[var(--danger-color)]"
                : "bg-[var(--accent-soft)] text-[var(--accent-color)]"
            )}
          >
            <Icon name={state.danger ? "alert-triangle" : "help-circle"} size={20} />
          </div>
          <div className="space-y-1.5 min-w-0">
            <h4 className="text-base font-bold text-[var(--text-primary)]">{state.title}</h4>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {state.description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 inline-flex items-center gap-2",
              state.danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[var(--accent-color)] hover:opacity-90"
            )}
          >
            {busy && (
              <span className="size-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
            )}
            {state.confirmLabel || "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}
