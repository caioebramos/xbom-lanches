"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CartLine, LineConfig } from "@/lib/types";

const KEY = "xbom-cart-v2";

export const lineKey = (productId: number, config: LineConfig) => `${productId}:${JSON.stringify(config)}`;

export function useCart(isValid: (l: CartLine) => boolean) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const validRef = useRef(isValid);
  validRef.current = isValid;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const arr: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) setLines((arr as CartLine[]).filter((l) => l && typeof l.productId === "number" && validRef.current(l)));
    } catch {
      /* ignora carrinho corrompido */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* armazenamento indisponível (modo privado) */
    }
  }, [lines, ready]);

  const add = useCallback((productId: number, config: LineConfig, qty = 1) => {
    const key = lineKey(productId, config);
    setLines((cur) =>
      cur.some((l) => l.key === key)
        ? cur.map((l) => (l.key === key ? { ...l, qty: Math.min(30, l.qty + qty) } : l))
        : [...cur, { key, productId, config, qty }],
    );
  }, []);
  const setQty = useCallback((key: string, qty: number) => setLines((cur) => (qty <= 0 ? cur.filter((l) => l.key !== key) : cur.map((l) => (l.key === key ? { ...l, qty: Math.min(30, qty) } : l)))), []);
  const clear = useCallback(() => setLines([]), []);

  return { lines, ready, add, setQty, clear };
}
