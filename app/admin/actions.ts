"use server";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession, rateLimit, requireAdmin } from "@/lib/auth";
import { DATA_DIR, db } from "@/lib/db";
import { setOrderPaid, setOrderStatus } from "@/lib/orders";
import { slugify } from "@/lib/seed";
import { saveSettings } from "@/lib/store";
import type { OrderStatus, Price, ProductKind, Settings, Tier } from "@/lib/types";

/* ---------------- helpers ---------------- */

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const num = (fd: FormData, k: string) => {
  const raw = String(fd.get(k) ?? "").trim();
  if (!raw) return NaN;
  const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true" || fd.get(k) === "1";

export type FormState = { error?: string; ok?: boolean } | undefined;

async function saveUpload(file: File): Promise<string> {
  if (file.size === 0) throw new Error("Arquivo vazio.");
  if (file.size > 6 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 6 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  let ext: string | null = null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ext = "jpg";
  else if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ext = "png";
  else if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") ext = "webp";
  if (!ext) throw new Error("Formato inválido. Envie JPG, PNG ou WebP.");
  const dir = path.join(DATA_DIR, "uploads");
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return `/uploads/${name}`;
}

/* ---------------- sessão ---------------- */

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`login:${ip}`, 6, 5 * 60_000)) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  if (!checkPassword(String(fd.get("password") ?? ""))) return { error: "Senha incorreta." };
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------------- pedidos ---------------- */

export async function updateOrderStatus(id: number, status: OrderStatus) {
  await requireAdmin();
  setOrderStatus(id, status);
}

export async function updateOrderPaid(id: number, paid: boolean) {
  await requireAdmin();
  setOrderPaid(id, paid);
}

/* ---------------- produtos ---------------- */

const KINDS_CREATABLE: ProductKind[] = ["simple", "lanche", "pizza"];

export async function saveProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(fd.get("id") || 0);
  const name = str(fd, "name", 120);
  const description = str(fd, "description", 600);
  const category = str(fd, "category", 80);
  if (name.length < 2) return { error: "Informe o nome do produto." };
  if (!db().prepare("SELECT 1 FROM categories WHERE slug = ?").get(category)) return { error: "Escolha uma categoria." };

  const existing = id ? (db().prepare("SELECT * FROM products WHERE id = ?").get(id) as Record<string, unknown> | undefined) : undefined;
  if (id && !existing) return { error: "Produto não encontrado." };
  const kind = (existing ? (existing.kind as ProductKind) : (str(fd, "kind") as ProductKind)) || "simple";
  if (!existing && !KINDS_CREATABLE.includes(kind)) return { error: "Tipo de produto inválido." };

  let prices: Price[];
  if (kind === "pizza") {
    const broto = num(fd, "priceBroto");
    const grande = num(fd, "priceGrande");
    if (!(broto >= 0) || !(grande >= 0)) return { error: "Informe os preços do broto e do grande." };
    prices = [
      { label: "Broto", value: broto, slices: 4 },
      { label: "Grande", value: grande, slices: 8 },
    ];
  } else {
    const price = num(fd, "price");
    if (!(price >= 0)) return { error: "Informe o preço." };
    const prev = existing ? (JSON.parse(existing.prices as string) as Price[]) : [];
    prices = [{ label: prev[0]?.label ?? "Unidade", value: price }];
  }

  let image = (existing?.image as string | null) ?? null;
  const file = fd.get("imageFile");
  try {
    if (file instanceof File && file.size > 0) image = await saveUpload(file);
    else if (bool(fd, "removeImage")) image = null;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao enviar a imagem." };
  }

  const tierRaw = str(fd, "tier");
  const tier: Tier | null = kind === "pizza" ? (["Tradicional", "Especial", "Nobre"].includes(tierRaw) ? (tierRaw as Tier) : "Tradicional") : ((existing?.tier as Tier | null) ?? null);
  const premium = kind === "pizza" ? (bool(fd, "premium") ? 1 : 0) : Number(existing?.premium ?? 0);
  const active = bool(fd, "active") ? 1 : 0;

  if (existing) {
    db()
      .prepare("UPDATE products SET name=?, description=?, category=?, image=?, tier=?, premium=?, prices=?, active=? WHERE id=?")
      .run(name, description, category, image, tier, premium, JSON.stringify(prices), active, id);
  } else {
    const max = db().prepare("SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM products").get() as { n: number };
    db()
      .prepare("INSERT INTO products (category, name, description, image, kind, tier, premium, prices, active, sort) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(category, name, description, image, kind, tier, premium, JSON.stringify(prices), active, max.n);
  }
  revalidatePath("/", "layout");
  redirect("/admin/produtos");
}

export async function toggleProduct(id: number, active: boolean) {
  await requireAdmin();
  db().prepare("UPDATE products SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
  revalidatePath("/", "layout");
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  db().prepare("DELETE FROM products WHERE id = ?").run(id);
  revalidatePath("/", "layout");
  redirect("/admin/produtos");
}

/* ---------------- categorias ---------------- */

export async function saveCategory(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name", 60);
  if (!name) return;
  const slug = str(fd, "slug", 80);
  if (slug) {
    db().prepare("UPDATE categories SET name = ?, active = ?, sort = ? WHERE slug = ?").run(name, bool(fd, "active") ? 1 : 0, Number(fd.get("sort") ?? 0) || 0, slug);
  } else {
    const max = db().prepare("SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM categories").get() as { n: number };
    db().prepare("INSERT OR IGNORE INTO categories (slug, name, sort) VALUES (?, ?, ?)").run(slugify(name), name, max.n);
  }
  revalidatePath("/", "layout");
}

/* ---------------- adicionais ---------------- */

export async function saveAddon(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id") || 0);
  const name = str(fd, "name", 80);
  const price = num(fd, "price");
  if (!name || !(price >= 0)) return;
  const detail = str(fd, "detail", 30) || null;
  if (id) db().prepare("UPDATE addons SET name=?, detail=?, price=?, active=? WHERE id=?").run(name, detail, price, bool(fd, "active") ? 1 : 0, id);
  else {
    const max = db().prepare("SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM addons").get() as { n: number };
    db().prepare("INSERT INTO addons (name, detail, price, sort) VALUES (?,?,?,?)").run(name, detail, price, max.n);
  }
  revalidatePath("/", "layout");
}

export async function deleteAddon(id: number) {
  await requireAdmin();
  db().prepare("DELETE FROM addons WHERE id = ?").run(id);
  revalidatePath("/", "layout");
}

/* ---------------- entrega ---------------- */

export async function saveZone(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id") || 0);
  const city = str(fd, "city", 60);
  const name = str(fd, "name", 80);
  if (!city || !name) return;
  const raw = str(fd, "fee", 12);
  const fee = raw === "" ? null : num(fd, "fee");
  if (fee !== null && !(fee >= 0)) return;
  if (id) db().prepare("UPDATE zones SET city=?, name=?, fee=?, active=? WHERE id=?").run(city, name, fee, bool(fd, "active") ? 1 : 0, id);
  else {
    const max = db().prepare("SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM zones").get() as { n: number };
    db().prepare("INSERT INTO zones (city, name, fee, sort) VALUES (?,?,?,?)").run(city, name, fee, max.n);
  }
  revalidatePath("/", "layout");
}

export async function deleteZone(id: number) {
  await requireAdmin();
  db().prepare("DELETE FROM zones WHERE id = ?").run(id);
  revalidatePath("/", "layout");
}

/* ---------------- configurações ---------------- */

export async function saveStoreSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const openTime = str(fd, "openTime", 5);
  const closeTime = str(fd, "closeTime", 5);
  if (!time.test(openTime) || !time.test(closeTime)) return { error: "Horários inválidos (use HH:MM)." };
  const mode = str(fd, "storeMode");
  const keyType = str(fd, "pixKeyType");
  const minOrder = num(fd, "minOrder");
  const patch: Partial<Settings> = {
    storeName: str(fd, "storeName", 60) || "Xbom Lanches",
    whatsapp: str(fd, "whatsapp", 20).replace(/\D/g, ""),
    phone: str(fd, "phone", 30),
    address: str(fd, "address", 160),
    openTime,
    closeTime,
    deliveryEstimate: str(fd, "deliveryEstimate", 40),
    pickupEstimate: str(fd, "pickupEstimate", 40),
    storeMode: mode === "open" || mode === "closed" ? mode : "auto",
    pickupEnabled: bool(fd, "pickupEnabled"),
    pixKey: str(fd, "pixKey", 80),
    pixKeyType: (["phone", "cpf", "cnpj", "email", "random"].includes(keyType) ? keyType : "phone") as Settings["pixKeyType"],
    pixHolder: str(fd, "pixHolder", 60),
    pixCity: str(fd, "pixCity", 30),
    pixQrEnabled: bool(fd, "pixQrEnabled"),
    minOrder: Number.isFinite(minOrder) && minOrder > 0 ? minOrder : 0,
  };
  if (!patch.whatsapp) return { error: "Informe o WhatsApp com DDI e DDD (ex.: 5547999999999)." };
  saveSettings(patch);
  revalidatePath("/", "layout");
  return { ok: true };
}
