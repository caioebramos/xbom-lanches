import type { Addon, LineConfig, PricedLine, Product } from "./types";

/**
 * Regras de preço do cardápio. Código puro: roda no navegador (pré-visualização)
 * e no servidor (valor oficial do pedido, nunca confiamos no total vindo do cliente).
 */

export const MAX_FLAVORS = 3;
export const MAX_ADDON_QTY = 5;
const PREMIUM_DISCOUNT = 15;
const NOBRE_BROTO_EXTRA = 15;
const NOBRE_MINI_EXTRA = 5;
const NOBRE_ESFIHA_EXTRA = 1;

export type Ctx = {
  product: (id: number) => Product | undefined;
  addon: (id: number) => Addon | undefined;
  all: () => Product[];
};

export function makeCtx(products: Product[], addons: Addon[]): Ctx {
  const pm = new Map(products.map((p) => [p.id, p]));
  const am = new Map(addons.map((a) => [a.id, a]));
  return { product: (id) => pm.get(id), addon: (id) => am.get(id), all: () => products };
}

/** Adicional por proporção de sabores premium numa pizza grande. */
function premiumSurcharge(premiumCount: number, total: number) {
  if (!premiumCount || !total) return 0;
  const r = premiumCount / total;
  if (r >= 1) return 15;
  if (r >= 2 / 3) return 14;
  if (r >= 1 / 2) return 10;
  return 7;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

const priceOf = (p: Product, label: string) => p.prices.find((x) => x.label === label)?.value;

export function pizzaGrandePrice(flavors: Product[]): number | null {
  if (!flavors.length) return null;
  const parts = flavors.map((f) => {
    const v = priceOf(f, "Grande");
    return v === undefined ? undefined : v - (f.premium ? PREMIUM_DISCOUNT : 0);
  });
  if (parts.some((v) => v === undefined)) return null;
  const premiums = flavors.filter((f) => f.premium).length;
  return round2(Math.max(...(parts as number[])) + premiumSurcharge(premiums, flavors.length));
}

export function drinkOptions(product: Product): string[] {
  const n = product.name;
  if (n.includes("2 Pizzas")) return ["Coca-Cola 2 litros", "Coca-Cola Zero 2 litros"];
  if (n.includes("Broto em Dobro") || n.includes("10 Esfihas")) return ["Coca-Cola 600ml", "Coca-Cola Zero 600ml"];
  return ["Coca-Cola lata 350ml", "Coca-Cola Zero lata 350ml"];
}

export function esfihaComboSize(product: Product) {
  return product.name.includes("10") ? 10 : 5;
}

/** Sabores permitidos em cada combo de pizza grande. */
export function comboFlavorPool(product: Product, flavors: Product[]) {
  if (product.name.includes("Tradicionais"))
    return flavors.filter((f) => f.tier === "Tradicional" && !f.premium);
  if (product.name.includes("Especiais"))
    return flavors.filter((f) => (f.tier === "Tradicional" || f.tier === "Especial") && !f.premium);
  return flavors;
}

export type Priced = ({ ok: true } & PricedLine) | { ok: false; error: string };

const fail = (error: string): Priced => ({ ok: false, error });

export function priceLine(product: Product, config: LineConfig, ctx: Ctx): Priced {
  if (!product.active) return fail(`${product.name} está indisponível no momento.`);
  const base = product.prices[0]?.value ?? 0;
  const image = product.image;

  switch (product.kind) {
    case "simple":
    case "combo-fixed": {
      return { ok: true, name: product.name, option: product.prices[0]?.label ?? "Unidade", description: product.description, unit: base, image };
    }

    case "lanche": {
      const picked = config.t === "lanche" ? config.addons : {};
      let extra = 0;
      const names: string[] = [];
      for (const [idStr, qtyRaw] of Object.entries(picked)) {
        const qty = Math.floor(Number(qtyRaw));
        if (!qty) continue;
        const a = ctx.addon(Number(idStr));
        if (!a || !a.active || qty < 0 || qty > MAX_ADDON_QTY) return fail("Adicional inválido.");
        extra += a.price * qty;
        names.push(`${qty > 1 ? `${qty}x ` : ""}${a.name}${a.detail ? ` ${a.detail}` : ""}`);
      }
      return {
        ok: true,
        name: product.name,
        option: names.length ? `Com ${names.length} adicional${names.length > 1 ? "is" : ""}` : "Sem adicionais",
        description: names.length ? `${product.description} Adicionais: ${names.join(", ")}.` : product.description,
        unit: round2(base + extra),
        image,
      };
    }

    case "pizza": {
      if (config.t !== "pizza") return fail("Configuração de pizza inválida.");
      const flavors = config.flavors.map((id) => ctx.product(id));
      if (flavors.some((f) => !f || f.kind !== "pizza" || !f.active)) return fail("Sabor indisponível.");
      const fl = flavors as Product[];
      if (config.size === "Broto") {
        if (fl.length !== 1) return fail("Pizza broto leva 1 sabor.");
        const v = priceOf(fl[0], "Broto");
        if (v === undefined) return fail("Preço indisponível.");
        return { ok: true, name: `Pizza ${fl[0].name}`, option: "Broto · 4 fatias · 1 sabor", description: fl[0].description, unit: v, image: fl[0].image };
      }
      if (config.size !== "Grande" || fl.length < 1 || fl.length > MAX_FLAVORS) return fail("Escolha de 1 a 3 sabores.");
      if (new Set(fl.map((f) => f.id)).size !== fl.length) return fail("Sabores repetidos.");
      const unit = pizzaGrandePrice(fl);
      if (unit === null) return fail("Preço indisponível.");
      return {
        ok: true,
        name: `Pizza ${fl.map((f) => f.name).join(" + ")}`,
        option: `Grande · 8 fatias · ${fl.length} sabor${fl.length > 1 ? "es" : ""}`,
        description: fl.map((f) => `${f.name}: ${f.description}`).join(" | "),
        unit,
        image: fl[0].image,
      };
    }

    case "combo-large": {
      if (config.t !== "combo-large" || config.pizzas.length !== 2) return fail("Escolha as 2 pizzas do combo.");
      if (!drinkOptions(product).includes(config.drink)) return fail("Bebida inválida.");
      const nobreCombo = product.name.includes("Nobres");
      const pool = new Set(comboFlavorPool(product, ctx.all().filter((p) => p.kind === "pizza" && p.active)).map((f) => f.id));
      let extra = 0;
      const parts: string[] = [];
      for (const [i, ids] of config.pizzas.entries()) {
        if (ids.length < 1 || ids.length > MAX_FLAVORS || new Set(ids).size !== ids.length) return fail(`Pizza ${i + 1}: escolha de 1 a 3 sabores.`);
        const fl: Product[] = [];
        for (const id of ids) {
          const f = ctx.product(id);
          if (!f || f.kind !== "pizza" || !f.active || !pool.has(f.id)) return fail(`Pizza ${i + 1}: sabor não disponível neste combo.`);
          fl.push(f);
        }
        const prem = fl.filter((f) => f.premium).length;
        if (nobreCombo && prem > 0 && (fl.length !== 3 || prem > 2))
          return fail(`Pizza ${i + 1}: sabor Premium só em pizza de 3 sabores (máx. 2 premium).`);
        extra += premiumSurcharge(prem, fl.length);
        parts.push(`Pizza ${i + 1}: ${fl.map((f) => f.name).join(" + ")}`);
      }
      return { ok: true, name: product.name, option: "Combo personalizado", description: `${parts.join(" | ")} | Bebida: ${config.drink}`, unit: round2(base + extra), image };
    }

    case "combo-broto2":
    case "combo-broto1": {
      const n = product.kind === "combo-broto2" ? 2 : 1;
      if (config.t !== "combo-broto" || config.pizzas.length !== n || config.pizzas.some((p) => p.length !== 1)) return fail(`Escolha ${n === 1 ? "a pizza" : "as 2 pizzas"} do combo.`);
      if (!drinkOptions(product).includes(config.drink)) return fail("Bebida inválida.");
      const fl: Product[] = [];
      for (const [id] of config.pizzas) {
        const f = ctx.product(id);
        if (!f || f.kind !== "pizza" || !f.active) return fail("Sabor indisponível.");
        fl.push(f);
      }
      const nobre = fl.some((f) => f.tier === "Nobre" || f.premium);
      const extra = nobre ? (n === 2 ? NOBRE_BROTO_EXTRA : NOBRE_MINI_EXTRA) : 0;
      return {
        ok: true,
        name: product.name,
        option: "Combo personalizado",
        description: `${fl.map((f, i) => `Pizza ${i + 1}: ${f.name}`).join(" | ")} | Bebida: ${config.drink}`,
        unit: round2(base + extra),
        image,
      };
    }

    case "combo-esfiha": {
      if (config.t !== "combo-esfiha") return fail("Escolha as esfihas do combo.");
      if (!drinkOptions(product).includes(config.drink)) return fail("Bebida inválida.");
      const want = esfihaComboSize(product);
      let total = 0;
      let extra = 0;
      const parts: string[] = [];
      for (const [idStr, qtyRaw] of Object.entries(config.esfihas)) {
        const qty = Math.floor(Number(qtyRaw));
        if (!qty) continue;
        const f = ctx.product(Number(idStr));
        if (!f || f.kind !== "pizza" || !f.active || qty < 0 || qty > want) return fail("Sabor indisponível.");
        total += qty;
        if (f.tier === "Nobre") extra += qty * NOBRE_ESFIHA_EXTRA;
        parts.push(`${qty}x ${f.name}`);
      }
      if (total !== want) return fail(`Escolha exatamente ${want} esfihas.`);
      return { ok: true, name: product.name, option: "Combo personalizado", description: `${parts.join(", ")} | Bebida: ${config.drink}`, unit: round2(base + extra), image };
    }
  }
}
