import "server-only";
import crypto from "node:crypto";
import { db, tx } from "./db";
import { isOpenNow } from "./hours";
import { makeCtx, priceLine, round2 } from "./pricing";
import { getAddons, getProducts, getSettings, getZones } from "./store";
import type { CartLine, OrderInput, OrderItem, OrderRow, OrderStatus, PaymentMethod } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I/L
const newCode = () => "XB-" + Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");

const PAYMENTS: PaymentMethod[] = ["Pix", "Cartão na entrega", "Dinheiro"];
const MAX_LINES = 40;
const MAX_QTY = 30;

export class OrderError extends Error {}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, max) : "");

function toRow(r: Record<string, unknown>): OrderRow {
  return {
    id: r.id as number,
    code: r.code as string,
    status: r.status as OrderStatus,
    fulfillment: r.fulfillment as "Entrega" | "Retirada",
    customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    city: r.city as string,
    address: r.address as string,
    payment: r.payment as PaymentMethod,
    changeFor: (r.change_for as number | null) ?? null,
    notes: r.notes as string,
    items: JSON.parse(r.items as string) as OrderItem[],
    subtotal: r.subtotal as number,
    deliveryFee: r.delivery_fee as number,
    total: r.total as number,
    paid: !!r.paid,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

/** Valida o pedido e recalcula todos os valores a partir do banco. */
export function createOrder(input: OrderInput): OrderRow {
  const settings = getSettings();
  if (!isOpenNow(settings)) throw new OrderError(`Estamos fechados agora. Atendemos das ${settings.openTime} às ${settings.closeTime}.`);

  const name = clean(input.customerName, 80);
  const phone = clean(input.customerPhone, 20).replace(/[^\d()+\-\s]/g, "");
  const digits = phone.replace(/\D/g, "");
  if (name.length < 2) throw new OrderError("Informe seu nome.");
  if (digits.length < 10 || digits.length > 13) throw new OrderError("Informe um telefone válido com DDD.");

  const fulfillment = input.fulfillment === "Retirada" ? "Retirada" : "Entrega";
  if (fulfillment === "Retirada" && !settings.pickupEnabled) throw new OrderError("Retirada no balcão indisponível no momento.");
  if (!PAYMENTS.includes(input.payment)) throw new OrderError("Forma de pagamento inválida.");

  if (!Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > MAX_LINES) throw new OrderError("Sua sacola está vazia.");

  const products = getProducts();
  const ctx = makeCtx(products, getAddons());
  const items: OrderItem[] = [];
  for (const line of input.lines as CartLine[]) {
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) throw new OrderError("Quantidade inválida.");
    const product = ctx.product(Number(line.productId));
    if (!product) throw new OrderError("Um item da sacola não está mais disponível. Atualize a página.");
    const priced = priceLine(product, line.config, ctx);
    if (!priced.ok) throw new OrderError(priced.error);
    const { ok: _ok, ...rest } = priced;
    items.push({ ...rest, qty, total: round2(priced.unit * qty) });
  }
  const subtotal = round2(items.reduce((s, i) => s + i.total, 0));
  if (subtotal < settings.minOrder) throw new OrderError(`Pedido mínimo de R$ ${settings.minOrder.toFixed(2).replace(".", ",")}.`);

  let deliveryFee = 0;
  let city = "";
  let address = "Retirada no balcão";
  if (fulfillment === "Entrega") {
    const zone = getZones().find((z) => z.city === input.city && z.name === input.neighborhood);
    if (!zone) throw new OrderError("Selecione o bairro de entrega.");
    if (zone.fee === null) throw new OrderError("Para esse bairro, consulte a taxa de entrega pelo WhatsApp.");
    const street = clean(input.street, 120);
    const number = clean(input.number, 12);
    if (!street || !number) throw new OrderError("Informe rua e número para a entrega.");
    const complement = clean(input.complement, 80);
    deliveryFee = zone.fee;
    city = zone.city;
    address = `${street}, ${number} — ${zone.name}, ${zone.city}${complement ? ` (${complement})` : ""}`;
  }
  const total = round2(subtotal + deliveryFee);

  let changeFor: number | null = null;
  if (input.payment === "Dinheiro" && input.changeFor) {
    const c = Number(input.changeFor);
    if (!Number.isFinite(c) || c < total) throw new OrderError("O valor para troco deve ser maior ou igual ao total do pedido.");
    changeFor = round2(c);
  }

  const now = new Date().toISOString();
  const row = tx(() => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      try {
        db()
          .prepare(
            `INSERT INTO orders (code, status, fulfillment, customer_name, customer_phone, city, address, payment, change_for,
              notes, items, subtotal, delivery_fee, total, paid, created_at, updated_at)
             VALUES (?, 'novo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          )
          .run(code, fulfillment, name, phone, city, address, input.payment, changeFor, clean(input.notes, 300), JSON.stringify(items), subtotal, deliveryFee, total, now, now);
        return code;
      } catch (e) {
        if (!String(e).includes("UNIQUE")) throw e;
      }
    }
    throw new OrderError("Não foi possível registrar o pedido. Tente novamente.");
  });
  return getOrderByCode(row)!;
}

export function getOrderByCode(code: string): OrderRow | undefined {
  const r = db().prepare("SELECT * FROM orders WHERE code = ?").get(code) as Record<string, unknown> | undefined;
  return r ? toRow(r) : undefined;
}

export function listOrders(opts: { since?: string; statuses?: OrderStatus[]; limit?: number } = {}): OrderRow[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.since) {
    where.push("created_at >= ?");
    args.push(opts.since);
  }
  if (opts.statuses?.length) {
    where.push(`status IN (${opts.statuses.map(() => "?").join(",")})`);
    args.push(...opts.statuses);
  }
  const sql = `SELECT * FROM orders ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ?`;
  args.push(opts.limit ?? 300);
  return (db().prepare(sql).all(...args) as Record<string, unknown>[]).map(toRow);
}

const STATUSES: OrderStatus[] = ["novo", "preparo", "entrega", "concluido", "cancelado"];

export function setOrderStatus(id: number, status: OrderStatus) {
  if (!STATUSES.includes(status)) throw new Error("Status inválido");
  db().prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, new Date().toISOString(), id);
}

export function setOrderPaid(id: number, paid: boolean) {
  db().prepare("UPDATE orders SET paid = ?, updated_at = ? WHERE id = ?").run(paid ? 1 : 0, new Date().toISOString(), id);
}

/* ---------------- Relatórios ---------------- */

/** Início do dia em Brasília (UTC−3, sem horário de verão), em ISO UTC. */
export function startOfDayBR(daysAgo = 0) {
  const BR = 3 * 3600_000;
  const day = Math.floor((Date.now() - BR) / 86_400_000) - daysAgo;
  return new Date(day * 86_400_000 + BR).toISOString();
}

export function salesSummary(sinceIso: string) {
  const orders = listOrders({ since: sinceIso, limit: 5000 }).filter((o) => o.status !== "cancelado");
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const byProduct = new Map<string, { qty: number; total: number }>();
  for (const o of orders)
    for (const i of o.items) {
      const key = i.name.startsWith("Pizza ") ? "Pizzas (todas)" : i.name;
      const cur = byProduct.get(key) ?? { qty: 0, total: 0 };
      cur.qty += i.qty;
      cur.total += i.total;
      byProduct.set(key, cur);
    }
  return {
    count: orders.length,
    revenue: round2(revenue),
    avgTicket: orders.length ? round2(revenue / orders.length) : 0,
    top: [...byProduct.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty).slice(0, 8),
  };
}
