"use client";

import { Bike, Check, Clock, MapPin, MessageCircle, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Zap } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isOpenNow } from "@/lib/hours";
import { money } from "@/lib/format";
import { makeCtx, priceLine } from "@/lib/pricing";
import type { Addon, Category, LineConfig, Product, PublicSettings, Zone } from "@/lib/types";
import { CartDrawer } from "./CartDrawer";
import { useCart } from "./cart";
import { ProductSheet } from "./ProductSheet";
import { PImage, TierBadge } from "./ui";

type Props = { categories: Category[]; products: Product[]; addons: Addon[]; zones: Zone[]; settings: PublicSettings };

const priceLabel = (p: Product) => {
  if (p.kind === "pizza") return { prefix: "a partir de", value: Math.min(...p.prices.map((x) => x.value)) };
  if (p.kind === "lanche") return { prefix: "", value: p.prices[0]?.value ?? 0 };
  return { prefix: "", value: p.prices[0]?.value ?? 0 };
};

const quickAdd = (p: Product) => p.kind === "simple" || p.kind === "combo-fixed";

export default function Storefront({ categories, products, addons, zones, settings }: Props) {
  const ctx = useMemo(() => makeCtx(products, addons), [products, addons]);
  const cart = useCart(useCallback((l) => !!ctx.product(l.productId), [ctx]));

  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [storeOpen, setStoreOpen] = useState<boolean | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const lockSpy = useRef(false);

  useEffect(() => {
    const tick = () => setStoreOpen(isOpenNow(settings));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [settings]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((c) => ({
        c,
        items: products.filter((p) => p.category === c.slug && (!q || `${p.name} ${p.description}`.toLowerCase().includes(q))),
      }))
      .filter((g) => g.items.length);
  }, [categories, products, query]);

  /* scroll-spy: destaca a categoria visível */
  useEffect(() => {
    if (query) return;
    const els = categories.map((c) => document.getElementById(`cat-${c.slug}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        if (lockSpy.current) return;
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id.replace("cat-", ""));
      },
      { rootMargin: "-140px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [categories, query, grouped]);

  useEffect(() => {
    railRef.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const goTo = (slug: string) => {
    setActive(slug);
    lockSpy.current = true;
    document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => (lockSpy.current = false), 900);
  };

  const flash = (text: string) => {
    const id = Date.now();
    setToast({ id, text });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3200);
  };

  const onAdd = (productId: number, config: LineConfig, qty: number) => {
    cart.add(productId, config, qty);
    flash(`${ctx.product(productId)?.name ?? "Item"} adicionado`);
  };

  const open = (p: Product) => {
    setSelected(p);
    setSheetOpen(true);
  };

  const cartCount = cart.lines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.lines.reduce((s, l) => {
    const p = ctx.product(l.productId);
    const r = p ? priceLine(p, l.config, ctx) : null;
    return s + (r && r.ok ? r.unit * l.qty : 0);
  }, 0);

  const statusChip =
    storeOpen === null ? null : storeOpen ? (
      <span className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-3 py-1.5 text-sm font-semibold text-ok">
        <span className="size-2 animate-pulse-ring rounded-full bg-ok" /> Aberto agora · até {settings.closeTime}
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 rounded-full border border-bad/30 bg-bad/10 px-3 py-1.5 text-sm font-semibold text-bad">
        <span className="size-2 rounded-full bg-bad" /> Fechado · abrimos às {settings.openTime}
      </span>
    );

  return (
    <div className="pb-28">
      {/* ===== Cabeçalho ===== */}
      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <a href="#inicio" className="flex items-center gap-3">
            <span className="relative size-10 overflow-hidden rounded-full ring-1 ring-amber/40">
              <Image src="/logo.jpg" alt="Xbom Lanches" fill sizes="40px" className="object-cover" priority />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Xbom <span className="text-gold">Lanches</span>
            </span>
          </a>
          <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-mute md:flex">
            <button onClick={() => goTo(categories[0]?.slug ?? "")} className="hover:text-ink">Cardápio</button>
            <a href="#entrega" className="hover:text-ink">Entrega</a>
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-ink">WhatsApp</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block">{statusChip}</div>
            <button onClick={() => setCartOpen(true)} className="relative inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.04] px-4 py-2.5 text-sm font-bold transition hover:bg-white/10 active:scale-95" aria-label={`Abrir sacola com ${cartCount} itens`}>
              <ShoppingBag className="size-4 text-amber" />
              <span className="tabular-nums">{cartCount ? money(cartTotal) : "Sacola"}</span>
              {cartCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-amber text-[11px] font-extrabold text-[#1a1100]">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section id="inicio" className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgb(255_160_0/0.22),transparent_60%),radial-gradient(40rem_24rem_at_0%_100%,rgb(255_184_28/0.08),transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pb-20 md:pt-16">
          <div className="animate-rise">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-mute">
              <MapPin className="size-3.5 text-amber" /> Rio Negro/PR · Mafra/SC
            </p>
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              Fome de <span className="text-gold">Xbom</span>?<br />
              Peça do seu jeito.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-mute">
              Hambúrgueres artesanais, pizzas meio a meio, batatas recheadas e esfihas. Monte o pedido, pague como preferir e acompanhe em tempo real.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button onClick={() => goTo(categories[0]?.slug ?? "")} className="btn-primary px-7 py-3.5 text-base">Ver cardápio</button>
              <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3.5 text-base">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <div className="sm:hidden">{statusChip}</div>
            </div>
            <ul className="mt-9 grid max-w-xl grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                [Zap, "Feito na hora", "Sempre quentinho"],
                [Bike, "Entrega rápida", settings.deliveryEstimate],
                [ShieldCheck, "Pix, cartão ou dinheiro", "Pague como quiser"],
              ].map(([Icon, t, s]) => {
                const I = Icon as typeof Zap;
                return (
                  <li key={t as string} className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber/12 text-amber"><I className="size-4" /></span>
                    <span><b className="block text-[13px] leading-tight">{t as string}</b><span className="text-xs text-dim">{s as string}</span></span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md animate-rise [animation-delay:120ms]">
            <div className="absolute -inset-6 -z-10 rounded-full bg-amber/20 blur-3xl" />
            <div className="relative aspect-square overflow-hidden rounded-[2.5rem] ring-1 ring-amber/30 shadow-[0_30px_80px_-20px_rgb(255_160_0/0.5)]">
              <Image src="/logo.jpg" alt="Xbom Lanches: hambúrguer, batata recheada, pizza e esfihas" fill priority sizes="(min-width: 768px) 28rem, 90vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Barra de categorias ===== */}
      <div className="glass sticky top-16 z-30 border-y border-line">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div ref={railRef} className="no-scrollbar -mx-1 flex flex-1 gap-2 overflow-x-auto px-1">
            {categories.map((c) => (
              <button key={c.slug} data-slug={c.slug} onClick={() => { setQuery(""); setTimeout(() => goTo(c.slug), 0); }} className={`chip shrink-0 ${active === c.slug && !query ? "!border-amber !bg-amber !text-[#1a1100] font-bold" : ""}`}>
                {c.name}
              </button>
            ))}
          </div>
          <label className="relative hidden w-56 shrink-0 sm:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar no cardápio…" className="field !rounded-full !py-2 pl-10" aria-label="Buscar no cardápio" />
          </label>
        </div>
        <div className="px-4 pb-3 sm:hidden">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar no cardápio…" className="field !rounded-full !py-2.5 pl-10" aria-label="Buscar no cardápio" />
          </label>
        </div>
      </div>

      {/* ===== Cardápio ===== */}
      <main className="mx-auto max-w-6xl space-y-14 px-4 pt-10 sm:px-6">
        {storeOpen === false && (
          <p className="flex items-start gap-3 rounded-2xl border border-amber/25 bg-amber/10 p-4 text-sm text-amber-soft">
            <Clock className="mt-0.5 size-4 shrink-0" /> Estamos fechados no momento. Você pode montar sua sacola agora e finalizar a partir das {settings.openTime}.
          </p>
        )}
        {grouped.length === 0 && <p className="py-20 text-center text-mute">Nenhum item encontrado para “{query}”.</p>}
        {grouped.map(({ c, items }) => (
          <section key={c.slug} id={`cat-${c.slug}`}>
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{c.name}</h2>
              <span className="text-sm text-dim">{items.length} {items.length === 1 ? "item" : "itens"}</span>
            </div>
            <ul className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              {items.map((p, i) => (
                <li key={p.id}>
                  <ProductCard p={p} priority={i < 2 && c.slug === categories[0]?.slug} onOpen={() => open(p)} onQuick={() => onAdd(p.id, { t: "simple" }, 1)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {/* ===== Entrega ===== */}
      <section id="entrega" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-amber/10 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-3">
            <Info icon={<Bike className="size-5" />} title="Entrega" lines={[`Rio Negro/PR e Mafra/SC`, `Previsão: ${settings.deliveryEstimate}`, "Taxa calculada pelo bairro no checkout"]} />
            <Info icon={<Clock className="size-5" />} title="Horário" lines={[`Todos os dias, das ${settings.openTime} às ${settings.closeTime}`, `Retirada: ${settings.pickupEstimate}`]} />
            <Info icon={<MapPin className="size-5" />} title="Onde estamos" lines={[settings.address, settings.phone]} />
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-16 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-line px-4 py-8 text-sm text-dim sm:flex-row sm:px-6">
        <p className="flex items-center gap-2"><Sparkles className="size-4 text-amber" /> © {new Date().getFullYear()} Xbom Lanches</p>
        <a href="/admin" className="hover:text-mute">Área administrativa</a>
      </footer>

      {/* ===== Barra flutuante da sacola (mobile) ===== */}
      {cartCount > 0 && !cartOpen && !sheetOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
          <button onClick={() => setCartOpen(true)} className="btn-primary w-full justify-between px-5 py-4 text-base animate-rise">
            <span className="flex items-center gap-2"><ShoppingBag className="size-5" /> Ver sacola · {cartCount}</span>
            <span className="tabular-nums">{money(cartTotal)}</span>
          </button>
        </div>
      )}

      {toast && (
        <div key={toast.id} className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4">
          <div className="glass animate-rise flex items-center gap-2 rounded-full border border-line-strong px-4 py-2.5 text-sm font-semibold shadow-xl">
            <span className="grid size-5 place-items-center rounded-full bg-ok text-[#04211a]"><Check className="size-3.5" /></span>
            {toast.text}
          </div>
        </div>
      )}

      {selected && <ProductSheet product={selected} products={products} addons={addons} categories={categories} ctx={ctx} open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={onAdd} />}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} lines={cart.lines} products={products} ctx={ctx} zones={zones} settings={settings} storeOpen={storeOpen} setQty={cart.setQty} clear={cart.clear} />
    </div>
  );
}

function Info({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-amber/12 text-amber">{icon}</span>
        <h3 className="font-display text-lg font-bold">{title}</h3>
      </div>
      {lines.map((l) => <p key={l} className="text-[15px] leading-relaxed text-mute">{l}</p>)}
    </div>
  );
}

function ProductCard({ p, priority, onOpen, onQuick }: { p: Product; priority: boolean; onOpen: () => void; onQuick: () => void }) {
  const price = priceLabel(p);
  return (
    <article onClick={onOpen} className="group relative flex cursor-pointer gap-4 rounded-3xl border border-line bg-surface p-3 transition duration-300 hover:-translate-y-0.5 hover:border-amber/40 hover:bg-surface-2 sm:p-4">
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2"><TierBadge p={p} /></div>
        <h3 className="font-display text-[17px] font-bold leading-snug">{p.name}</h3>
        <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-mute">{p.description}</p>
        <div className="mt-auto pt-3">
          {price.prefix && <span className="mr-1.5 text-xs text-dim">{price.prefix}</span>}
          <span className="font-display text-lg font-extrabold text-gold">{money(price.value)}</span>
        </div>
      </div>
      <div className="relative size-28 shrink-0 self-center overflow-hidden rounded-2xl bg-surface-2 sm:size-32">
        <PImage src={p.image} alt={p.name} sizes="(min-width: 640px) 128px, 112px" priority={priority} className="transition duration-500 group-hover:scale-105" />
        <button
          aria-label={quickAdd(p) ? `Adicionar ${p.name}` : `Escolher ${p.name}`}
          onClick={(e) => {
            e.stopPropagation();
            if (quickAdd(p)) onQuick();
            else onOpen();
          }}
          className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-amber text-[#1a1100] shadow-lg transition active:scale-90 group-hover:scale-110"
        >
          <Plus className="size-5" strokeWidth={3} />
        </button>
      </div>
    </article>
  );
}
