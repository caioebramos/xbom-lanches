"use client";

import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import type { Product } from "@/lib/types";

export function PImage({ src, alt, sizes, className = "", priority = false }: { src: string | null; alt: string; sizes: string; className?: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-surface-2 text-3xl ${className}`} aria-hidden>
        🍔
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("/uploads/")}
      className={`object-cover ${className}`}
    />
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "modal",
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "drawer";
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const panel =
    variant === "drawer"
      ? "sm:ml-auto sm:h-dvh sm:w-[28rem] sm:max-w-full sm:rounded-none sm:rounded-l-[2rem] max-h-[94dvh] sm:max-h-dvh rounded-t-[2rem]"
      : "sm:mx-auto sm:my-auto sm:w-[44rem] sm:max-w-[94vw] max-h-[94dvh] sm:max-h-[90dvh] rounded-t-[2rem] sm:rounded-[2rem]";
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:flex-row sm:justify-stretch" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-[3px]" />
      <div className={`relative flex min-h-0 animate-sheet flex-col overflow-hidden border border-line-strong bg-surface shadow-2xl ${panel}`}>
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id={labelledBy} className="font-display text-lg font-bold">
              {title}
            </h2>
            <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-white/5 hover:bg-white/10" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-line bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, size = "md" }: { value: number; onChange: (n: number) => void; min?: number; max?: number; size?: "sm" | "md" }) {
  const b = size === "sm" ? "size-8" : "size-10";
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface-2 p-0.5">
      <button type="button" aria-label="Diminuir" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className={`${b} grid place-items-center rounded-full transition hover:bg-white/10 active:scale-90 disabled:opacity-30`}>
        <Minus className="size-4" />
      </button>
      <span className="min-w-6 text-center text-sm font-bold tabular-nums">{value}</span>
      <button type="button" aria-label="Aumentar" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className={`${b} grid place-items-center rounded-full bg-amber/15 text-amber transition hover:bg-amber/25 active:scale-90 disabled:opacity-30`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function TierBadge({ p }: { p: Pick<Product, "tier" | "premium"> }) {
  if (p.premium) return <span className="rounded-full bg-gradient-to-r from-rose-500/90 to-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">★ Premium</span>;
  if (p.tier === "Nobre") return <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber">Nobre</span>;
  if (p.tier === "Especial") return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">Especial</span>;
  return null;
}
