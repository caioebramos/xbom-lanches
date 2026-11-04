import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/auth";
import { createOrder, OrderError } from "@/lib/orders";
import type { OrderInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`order:${ip}`, 6, 10 * 60_000)) {
    return NextResponse.json({ error: "Muitos pedidos em pouco tempo. Aguarde alguns minutos ou chame no WhatsApp." }, { status: 429 });
  }
  let body: OrderInput;
  try {
    body = (await req.json()) as OrderInput;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    const order = createOrder(body);
    return NextResponse.json({ code: order.code });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("[orders] falha ao criar pedido", e);
    return NextResponse.json({ error: "Erro interno ao registrar o pedido." }, { status: 500 });
  }
}
