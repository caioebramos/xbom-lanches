import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { ProductKind, Tier } from "./types";
import catalogRaw from "../data/catalog.raw.json";

type RawProduct = {
  name: string;
  description: string;
  category: string;
  image: string;
  prices: { label: string; value: number; slices?: number }[];
};
type RawFlavor = { name: string; tier: Tier; premium?: boolean };
type Raw = {
  addons: { name: string; detail?: string; value: number }[];
  products: RawProduct[];
  zones: Record<string, [string, number | null][]>;
  flavors: RawFlavor[];
};

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Ordem de exibição das categorias na vitrine. */
const CATEGORY_ORDER = [
  "Combos",
  "Lanches",
  "Pizzas tradicionais",
  "Pizzas especiais",
  "Pizzas nobres",
  "Pizzas doces tradicionais",
  "Pizzas doces especiais",
  "Batatas recheadas",
  "Esfihas",
  "Bebidas",
];

export const DEFAULT_SETTINGS = {
  storeName: "Xbom Lanches",
  whatsapp: "5500000000000",
  phone: "(00) 00000-0000",
  address: "Rua Exemplo, 123, Cidade/UF",
  openTime: "11:00",
  closeTime: "23:00",
  deliveryEstimate: "40 a 60 minutos",
  pickupEstimate: "20 a 30 minutos",
  storeMode: "auto",
  pickupEnabled: true,
  pixKey: "",
  pixKeyType: "phone",
  pixHolder: "Nome do Favorecido",
  pixCity: "Cidade",
  pixQrEnabled: true,
  minOrder: 0,
  instagram: "",
};

function comboKind(name: string): ProductKind {
  if (name.includes("2 Pizzas")) return "combo-large";
  if (name.includes("Broto em Dobro")) return "combo-broto2";
  if (name.includes("Mini Broto")) return "combo-broto1";
  if (name.includes("Esfihas")) return "combo-esfiha";
  return "combo-fixed";
}

export function seedIfEmpty(d: DatabaseSync) {
  const has = d.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number };
  if (has.n > 0) return;

  const raw = catalogRaw as unknown as Raw;
  const flavorInfo = new Map(raw.flavors.map((f) => [f.name, f]));

  d.exec("BEGIN");
  try {
    const insCat = d.prepare("INSERT OR IGNORE INTO categories (slug, name, sort) VALUES (?, ?, ?)");
    CATEGORY_ORDER.forEach((name, i) => insCat.run(slugify(name), name, i));

    const insProd = d.prepare(
      `INSERT INTO products (category, name, description, image, kind, tier, premium, prices, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    raw.products.forEach((p, i) => {
      const cat = slugify(p.category);
      let kind: ProductKind = "simple";
      let tier: Tier | null = null;
      let premium = 0;
      if (p.category === "Lanches") kind = "lanche";
      else if (p.category === "Combos") kind = comboKind(p.name);
      else if (p.category.startsWith("Pizzas")) {
        kind = "pizza";
        const f = flavorInfo.get(p.name);
        tier = f?.tier ?? null;
        premium = f?.premium ? 1 : 0;
      } else if (p.category === "Batatas recheadas" || p.category === "Esfihas") {
        tier = (p.prices[0]?.label as Tier) ?? null;
      }
      insProd.run(cat, p.name, p.description, p.image, kind, tier, premium, JSON.stringify(p.prices), i);
    });

    const insAddon = d.prepare("INSERT INTO addons (name, detail, price, sort) VALUES (?, ?, ?, ?)");
    raw.addons.forEach((a, i) => insAddon.run(a.name, a.detail ?? null, a.value, i));

    const insZone = d.prepare("INSERT INTO zones (city, name, fee, sort) VALUES (?, ?, ?, ?)");
    let z = 0;
    for (const [city, list] of Object.entries(raw.zones)) for (const [name, fee] of list) insZone.run(city, name, fee, z++);

    const insSet = d.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSet.run(k, JSON.stringify(v));

    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
