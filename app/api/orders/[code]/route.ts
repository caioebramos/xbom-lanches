import { NextResponse } from "next/server";
import { getOrderByCode } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Status público do pedido (usado pela página de acompanhamento). Só expõe o necessário. */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const o = getOrderByCode(code.toUpperCase());
  if (!o) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  return NextResponse.json({ status: o.status, paid: o.paid, updatedAt: o.updatedAt });
}
