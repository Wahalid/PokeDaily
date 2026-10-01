"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Lightweight accessible dialog: centered card on desktop,
 * bottom sheet on mobile. Closes on Escape and backdrop click.
 *
 * Focus: on open, focuses the first `[data-autofocus]` element inside (or the
 * panel); on close, returns focus to the element that opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    // Captured before we move focus into the dialog.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:pt-[12vh]">
      <div className="absolute inset-0 bg-night-950/70 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[85dvh] w-full animate-sheet-up flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-night-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)] outline-none sm:max-w-md sm:rounded-3xl"
      >
        {/* PokeDaily accent strip */}
        <span aria-hidden className="absolute inset-x-0 top-0 flex h-1">
          <span className="flex-1 bg-brand-500" />
          <span className="flex-1 bg-sun-400" />
          <span className="flex-1 bg-ember-500" />
        </span>
        {children}
      </div>
    </div>
  );
}
