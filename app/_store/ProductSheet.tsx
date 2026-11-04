"use client";

import { AlertCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { comboFlavorPool, drinkOptions, esfihaComboSize, MAX_ADDON_QTY, MAX_FLAVORS, pizzaGrandePrice, priceLine, type Ctx } from "@/lib/pricing";
import type { Addon, Category, LineConfig, Product } from "@/lib/types";
import { PImage, Sheet, Stepper, TierBadge } from "./ui";

type Props = {
  product: Product;
  products: Product[];
  addons: Addon[];
  categories: Category[];
  ctx: Ctx;
  open: boolean;
  onClose: () => void;
  onAdd: (productId: number, config: LineConfig, qty: number) => void;
};

function initialConfig(p: Product): LineConfig {
  switch (p.kind) {
    case "lanche":
      return { t: "lanche", addons: {} };
    case "pizza":
      return { t: "pizza", size: "Grande", flavors: [p.id] };
    case "combo-large":
      return { t: "combo-large", pizzas: [[0], [0]], drink: drinkOptions(p)[0] };
    case "combo-broto2":
      return { t: "combo-broto", pizzas: [[0], [0]], drink: drinkOptions(p)[0] };
    case "combo-broto1":
      return { t: "combo-broto", pizzas: [[0]], drink: drinkOptions(p)[0] };
    case "combo-esfiha":
      return { t: "combo-esfiha", esfihas: {}, drink: drinkOptions(p)[0] };
    default:
      return { t: "simple" };
  }
}

export function ProductSheet(props: Props) {
  const { product, open, onClose } = props;
  return (
    <Sheet open={open} onClose={onClose} labelledBy="product-title">
      {/* remonta o estado a cada produto aberto */}
      <Body key={product.id} {...props} />
    </Sheet>
  );
}

function Body({ product, products, addons, categories, ctx, onClose, onAdd }: Props) {
  const [config, setConfig] = useState<LineConfig>(() => initialConfig(product));
  const [qty, setQty] = useState(1);
  const flavors = useMemo(() => products.filter((p) => p.kind === "pizza"), [products]);
  const catName = useMemo(() => new Map(categories.map((c) => [c.slug, c.name])), [categories]);

  const priced = priceLine(product, config, ctx);
  const incomplete = hasPlaceholder(config) || (config.t === "combo-esfiha" && sumValues(config.esfihas) !== esfihaComboSize(product));
  const canAdd = priced.ok && !incomplete;
  const unit = priced.ok ? priced.unit : 0;

  const isBuilder = product.kind !== "simple" && product.kind !== "combo-fixed";
  const fromPrice = product.kind === "pizza" ? product.prices[0]?.value : undefined;

  return (
    <>
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-surface-2 sm:aspect-[16/7]">
        <PImage src={product.image} alt={product.name} sizes="(min-width: 640px) 704px, 100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/30" />
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/55 text-lg backdrop-blur hover:bg-black/75">
          ✕
        </button>
      </div>

      <div className="-mt-10 relative space-y-6 px-5 pb-6">
        <header>
          <div className="mb-1 flex items-center gap-2">
            <TierBadge p={product} />
          </div>
          <h2 id="product-title" className="font-display text-2xl font-extrabold leading-tight">
            {product.name}
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-mute">{product.description}</p>
          {!isBuilder && <p className="mt-3 font-display text-2xl font-extrabold text-gold">{money(product.prices[0]?.value ?? 0)}</p>}
          {product.kind === "pizza" && fromPrice !== undefined && <p className="mt-2 text-sm text-dim">Escolha o tamanho e monte do seu jeito, inclusive meio a meio.</p>}
        </header>

        {product.kind === "lanche" && config.t === "lanche" && (
          <AddonPicker addons={addons} value={config.addons} onChange={(a) => setConfig({ t: "lanche", addons: a })} />
        )}

        {product.kind === "pizza" && config.t === "pizza" && (
          <PizzaBuilder config={config} setConfig={setConfig} flavors={flavors} catName={catName} />
        )}

        {product.kind === "combo-large" && config.t === "combo-large" && (
          <ComboLarge product={product} config={config} setConfig={setConfig} flavors={flavors} catName={catName} />
        )}

        {(product.kind === "combo-broto2" || product.kind === "combo-broto1") && config.t === "combo-broto" && (
          <ComboBroto config={config} setConfig={setConfig} flavors={flavors} catName={catName} />
        )}

        {product.kind === "combo-esfiha" && config.t === "combo-esfiha" && (
          <ComboEsfiha product={product} config={config} setConfig={setConfig} flavors={flavors} />
        )}

        {"drink" in config && (
          <Field label="Bebida do combo">
            <select className="field" value={config.drink} onChange={(e) => setConfig({ ...config, drink: e.target.value } as LineConfig)}>
              {drinkOptions(product).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
        )}

        {!priced.ok && !incomplete && (
          <p className="flex items-start gap-2 rounded-2xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {priced.error}
          </p>
        )}
        {incomplete && isBuilder && (
          <p className="flex items-start gap-2 rounded-2xl border border-amber/25 bg-amber/10 p-3 text-sm text-amber-soft">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {config.t === "combo-esfiha" ? `Escolha exatamente ${esfihaComboSize(product)} esfihas (${sumValues(config.esfihas)} escolhidas).` : "Complete a escolha dos sabores para continuar."}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-line bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Stepper value={qty} onChange={setQty} min={1} max={30} />
        <button
          disabled={!canAdd}
          onClick={() => {
            onAdd(product.id, config, qty);
            onClose();
          }}
          className="btn-primary flex-1"
        >
          Adicionar <span className="opacity-60">·</span> {canAdd ? money(unit * qty) : "—"}
        </button>
      </div>
    </>
  );
}

/* ---------- helpers de UI ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

const sumValues = (r: Record<number, number>) => Object.values(r).reduce((s, n) => s + n, 0);
const hasPlaceholder = (c: LineConfig) => (c.t === "pizza" ? c.flavors.includes(0) : c.t === "combo-large" || c.t === "combo-broto" ? c.pizzas.some((p) => p.length === 0 || p.includes(0)) : false);

function FlavorSelect({ value, onChange, options, catName, label }: { value: number; onChange: (id: number) => void; options: Product[]; catName: Map<string, string>; label: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, Product[]>();
    for (const p of options) m.set(p.category, [...(m.get(p.category) ?? []), p]);
    return [...m.entries()];
  }, [options]);
  const sel = options.find((o) => o.id === value);
  return (
    <div>
      <Field label={label}>
        <select className="field" value={value} onChange={(e) => onChange(Number(e.target.value))}>
          <option value={0}>Escolha o sabor…</option>
          {groups.map(([cat, list]) => (
            <optgroup key={cat} label={catName.get(cat) ?? cat}>
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.premium ? " ★ Premium" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      {sel && <p className="mt-1.5 px-1 text-xs leading-relaxed text-dim">{sel.description}</p>}
    </div>
  );
}

function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: React.ReactNode; sub?: React.ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-2" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-2xl border px-3 py-3 text-left transition active:scale-[0.98] ${o.value === value ? "border-amber bg-amber/10 shadow-glow" : "border-line-strong bg-surface-2 hover:border-white/30"}`}
        >
          <div className="text-[15px] font-bold">{o.label}</div>
          {o.sub && <div className="text-xs text-mute">{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Lanche: adicionais ---------- */

function AddonPicker({ addons, value, onChange }: { addons: Addon[]; value: Record<number, number>; onChange: (v: Record<number, number>) => void }) {
  return (
    <section>
      <h3 className="mb-3 font-display text-base font-bold">Turbine seu lanche</h3>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface-2/50">
        {addons.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">
                {a.name} {a.detail && <span className="text-dim">{a.detail}</span>}
              </p>
              <p className="text-sm text-amber">+ {money(a.price)}</p>
            </div>
            <Stepper size="sm" value={value[a.id] ?? 0} max={MAX_ADDON_QTY} onChange={(n) => onChange({ ...value, [a.id]: n })} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Pizza avulsa ---------- */

function PizzaBuilder({ config, setConfig, flavors, catName }: { config: Extract<LineConfig, { t: "pizza" }>; setConfig: (c: LineConfig) => void; flavors: Product[]; catName: Map<string, string> }) {
  const first = flavors.find((f) => f.id === config.flavors[0]);
  const chosen = config.flavors.map((id) => flavors.find((f) => f.id === id)).filter(Boolean) as Product[];
  const grande = chosen.length === config.flavors.length ? pizzaGrandePrice(chosen) : null;
  const broto = first?.prices.find((p) => p.label === "Broto")?.value;

  const setSize = (size: "Broto" | "Grande") => setConfig({ ...config, size, flavors: size === "Broto" ? config.flavors.slice(0, 1) : config.flavors });
  const setCount = (n: number) => setConfig({ ...config, flavors: Array.from({ length: n }, (_, i) => config.flavors[i] ?? 0) });
  const setFlavor = (i: number, id: number) => setConfig({ ...config, flavors: config.flavors.map((f, j) => (j === i ? id : f)) });

  return (
    <section className="space-y-5">
      <div>
        <h3 className="mb-3 font-display text-base font-bold">Tamanho</h3>
        <Segmented
          value={config.size}
          onChange={setSize}
          options={[
            { value: "Broto", label: "Broto", sub: `4 fatias · ${broto !== undefined ? money(broto) : "—"}` },
            { value: "Grande", label: "Grande", sub: `8 fatias · ${grande ? money(grande) : "a partir de " + money(first?.prices.find((p) => p.label === "Grande")?.value ?? 0)}` },
          ]}
        />
      </div>
      {config.size === "Grande" && (
        <div>
          <h3 className="mb-3 font-display text-base font-bold">Quantos sabores?</h3>
          <Segmented
            value={config.flavors.length}
            onChange={setCount}
            options={Array.from({ length: MAX_FLAVORS }, (_, i) => ({ value: i + 1, label: i === 0 ? "Inteira" : `${i + 1} sabores`, sub: i === 0 ? "1 sabor" : "meio a meio" }))}
          />
          <p className="mt-2 text-xs text-dim">Em pizza com mais de um sabor, vale o valor do sabor mais caro.</p>
        </div>
      )}
      <div className="space-y-4">
        {config.flavors.map((id, i) => (
          <FlavorSelect key={i} label={config.flavors.length > 1 ? `Sabor ${i + 1}` : "Sabor"} value={id} onChange={(v) => setFlavor(i, v)} options={flavors} catName={catName} />
        ))}
      </div>
    </section>
  );
}

/* ---------- Combo 2 pizzas grandes ---------- */

function ComboLarge({ product, config, setConfig, flavors, catName }: { product: Product; config: Extract<LineConfig, { t: "combo-large" }>; setConfig: (c: LineConfig) => void; flavors: Product[]; catName: Map<string, string> }) {
  const pool = useMemo(() => comboFlavorPool(product, flavors), [product, flavors]);
  const nobreCombo = product.name.includes("Nobres");
  const setPizza = (pi: number, ids: number[]) => setConfig({ ...config, pizzas: config.pizzas.map((p, i) => (i === pi ? ids : p)) });
  return (
    <section className="space-y-5">
      {nobreCombo && <p className="rounded-2xl bg-white/5 p-3 text-xs leading-relaxed text-mute">Sabores ★ Premium entram só em pizzas de 3 sabores (no máximo 2 premium) e podem ter adicional.</p>}
      {config.pizzas.map((ids, pi) => (
        <div key={pi} className="space-y-4 rounded-3xl border border-line bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">Pizza {pi + 1}</h3>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" onClick={() => setPizza(pi, Array.from({ length: n }, (_, i) => ids[i] ?? 0))} className={`rounded-full px-3 py-1 text-xs font-bold transition ${ids.length === n ? "bg-amber text-[#1a1100]" : "bg-white/8 text-mute hover:text-ink"}`}>
                  {n} {n === 1 ? "sabor" : "sabores"}
                </button>
              ))}
            </div>
          </div>
          {ids.map((id, i) => (
            <FlavorSelect key={i} label={`Sabor ${i + 1}`} value={id} onChange={(v) => setPizza(pi, ids.map((x, j) => (j === i ? v : x)))} options={pool.filter((o) => o.id === id || !ids.includes(o.id))} catName={catName} />
          ))}
        </div>
      ))}
    </section>
  );
}

/* ---------- Broto em dobro / Mini broto ---------- */

function ComboBroto({ config, setConfig, flavors, catName }: { config: Extract<LineConfig, { t: "combo-broto" }>; setConfig: (c: LineConfig) => void; flavors: Product[]; catName: Map<string, string> }) {
  return (
    <section className="space-y-4">
      <p className="text-xs text-dim">Sabores Nobres e Premium têm um pequeno adicional no combo.</p>
      {config.pizzas.map((ids, i) => (
        <FlavorSelect key={i} label={config.pizzas.length > 1 ? `Pizza ${i + 1}` : "Pizza"} value={ids[0] ?? 0} onChange={(v) => setConfig({ ...config, pizzas: config.pizzas.map((p, j) => (j === i ? [v] : p)) })} options={flavors} catName={catName} />
      ))}
    </section>
  );
}

/* ---------- Combo de esfihas ---------- */

function ComboEsfiha({ product, config, setConfig, flavors }: { product: Product; config: Extract<LineConfig, { t: "combo-esfiha" }>; setConfig: (c: LineConfig) => void; flavors: Product[] }) {
  const [q, setQ] = useState("");
  const size = esfihaComboSize(product);
  const total = sumValues(config.esfihas);
  const list = flavors.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-bold">Escolha as esfihas</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${total === size ? "bg-ok/15 text-ok" : "bg-white/10 text-mute"}`}>
          {total}/{size}
        </span>
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
        <input className="field pl-10" placeholder="Buscar sabor…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-surface-2/50">
        {list.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{f.name}</p>
              <TierBadge p={f} />
            </div>
            <Stepper
              size="sm"
              value={config.esfihas[f.id] ?? 0}
              max={Math.min(size, (config.esfihas[f.id] ?? 0) + (size - total))}
              onChange={(n) => setConfig({ ...config, esfihas: { ...config.esfihas, [f.id]: n } })}
            />
          </li>
        ))}
        {!list.length && <li className="p-4 text-center text-sm text-dim">Nenhum sabor encontrado.</li>}
      </ul>
    </section>
  );
}
