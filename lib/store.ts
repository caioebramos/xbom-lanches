import "server-only";
import { db } from "./db";
import { DEFAULT_SETTINGS } from "./seed";
import type { Addon, Category, Product, ProductKind, PublicSettings, Settings, Tier, Zone } from "./types";

type Row = Record<string, unknown>;

/* ---------------- Configurações ---------------- */

export function getSettings(): Settings {
  const rows = db().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      /* mantém o padrão */
    }
  }
  return out as unknown as Settings;
}

export function getPublicSettings(): PublicSettings {
  const { pixKey: _a, pixKeyType: _b, pixHolder: _c, pixCity: _d, pixQrEnabled: _e, ...pub } = getSettings();
  return pub;
}

export function saveSettings(patch: Partial<Settings>) {
  const st = db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const [k, v] of Object.entries(patch)) st.run(k, JSON.stringify(v));
}

/* ---------------- Catálogo ---------------- */

const toProduct = (r: Row): Product => ({
  id: r.id as number,
  category: r.category as string,
  name: r.name as string,
  description: r.description as string,
  image: (r.image as string | null) ?? null,
  kind: r.kind as ProductKind,
  tier: (r.tier as Tier | null) ?? null,
  premium: !!r.premium,
  prices: JSON.parse(r.prices as string),
  active: !!r.active,
  sort: r.sort as number,
});

export function getCategories(all = false): Category[] {
  const rows = db()
    .prepare(`SELECT * FROM categories ${all ? "" : "WHERE active = 1"} ORDER BY sort, name`)
    .all() as Row[];
  return rows.map((r) => ({ slug: r.slug as string, name: r.name as string, sort: r.sort as number, active: !!r.active }));
}

export function getProducts(all = false): Product[] {
  const rows = db()
    .prepare(
      `SELECT p.* FROM products p JOIN categories c ON c.slug = p.category
       ${all ? "" : "WHERE p.active = 1 AND c.active = 1"} ORDER BY c.sort, p.sort, p.id`,
    )
    .all() as Row[];
  return rows.map(toProduct);
}

export function getProduct(id: number): Product | undefined {
  const r = db().prepare("SELECT * FROM products WHERE id = ?").get(id) as Row | undefined;
  return r ? toProduct(r) : undefined;
}

export function getAddons(all = false): Addon[] {
  const rows = db().prepare(`SELECT * FROM addons ${all ? "" : "WHERE active = 1"} ORDER BY sort, id`).all() as Row[];
  return rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    detail: (r.detail as string | null) ?? null,
    price: r.price as number,
    active: !!r.active,
    sort: r.sort as number,
  }));
}

export function getZones(all = false): Zone[] {
  const rows = db().prepare(`SELECT * FROM zones ${all ? "" : "WHERE active = 1"} ORDER BY city, sort, id`).all() as Row[];
  return rows.map((r) => ({
    id: r.id as number,
    city: r.city as string,
    name: r.name as string,
    fee: (r.fee as number | null) ?? null,
    active: !!r.active,
    sort: r.sort as number,
  }));
}

export function getCatalog() {
  return {
    categories: getCategories(),
    products: getProducts(),
    addons: getAddons(),
    zones: getZones(),
  };
}
