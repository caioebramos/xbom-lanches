import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listOrders, startOfDayBR } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Atualização em tempo real do quadro de pedidos (polling). */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const orders = listOrders({ since: startOfDayBR(1), limit: 400 });
  return NextResponse.json({ orders }, { headers: { "cache-control": "no-store" } });
}
