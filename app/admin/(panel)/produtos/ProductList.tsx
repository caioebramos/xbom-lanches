"use client";

import { Pencil, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { money } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { PImage } from "../../../_store/ui";
import { toggleProduct } from "../../actions";

export default function ProductList({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [, start] = useTransition();
  const [items, setItem] = useOptimistic(products, (cur, upd: { id: number; active: boolean }) => cur.map((p) => (p.id === upd.id ? { ...p, active: upd.active } : p)));

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    return categories
      .filter((c) => cat === "all" || c.slug === cat)
      .map((c) => ({ c, list: items.filter((p) => p.category === c.slug && (!t || p.name.toLowerCase().includes(t))) }))
      .filter((g) => g.list.length);
  }, [items, categories, q, cat]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input className="field pl-10" placeholder="Buscar produto…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="field !w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
          <option value="all">Todas as categorias</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>

      {groups.map(({ c, list }) => (
        <section key={c.slug}>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-mute">
            {c.name} {!c.active && <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[10px] text-bad">oculta</span>}
          </h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {list.map((p) => (
              <li key={p.id} className={`flex items-center gap-3 p-3 sm:gap-4 ${p.active ? "" : "opacity-50"}`}>
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2"><PImage src={p.image} alt="" sizes="56px" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-dim">{p.prices.map((x) => `${p.prices.length > 1 ? x.label + " " : ""}${money(x.value)}`).join(" · ")}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={p.active}
                  aria-label={p.active ? `Pausar ${p.name}` : `Ativar ${p.name}`}
                  onClick={() => start(async () => { setItem({ id: p.id, active: !p.active }); await toggleProduct(p.id, !p.active); })}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${p.active ? "bg-ok" : "bg-surface-3"}`}
                >
                  <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${p.active ? "left-6" : "left-1"}`} />
                </button>
                <Link href={`/admin/produtos/${p.id}`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 hover:bg-white/10" aria-label={`Editar ${p.name}`}><Pencil className="size-4" /></Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="py-12 text-center text-dim">Nenhum produto encontrado.</p>}
    </div>
  );
}
