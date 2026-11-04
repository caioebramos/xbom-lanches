import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { dateTimeBR, money } from "@/lib/format";
import { getOrderByCode } from "@/lib/orders";
import { buildPixPayload } from "@/lib/pix";
import { getSettings } from "@/lib/store";
import { CopyButton, Tracker } from "./Tracker";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acompanhar pedido", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const order = getOrderByCode(code.toUpperCase());
  if (!order) notFound();
  const s = getSettings();

  const showPix = order.payment === "Pix" && !order.paid && order.status !== "cancelado" && !!s.pixKey;
  let pix: { payload: string; qr: string | null } | null = null;
  if (showPix) {
    const payload = buildPixPayload({ key: s.pixKey, type: s.pixKeyType, holder: s.pixHolder || s.storeName, city: s.pixCity, amount: order.total, txid: order.code });
    pix = { payload, qr: s.pixQrEnabled ? await QRCode.toDataURL(payload, { margin: 1, width: 280, color: { dark: "#0a0a0b", light: "#ffffff" } }) : null };
  }

  const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`Olá, Xbom Lanches! Sobre o pedido ${order.code}:`)}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <span className="relative size-10 overflow-hidden rounded-full ring-1 ring-amber/40">
          <Image src="/logo.jpg" alt="Xbom Lanches" fill sizes="40px" className="object-cover" />
        </span>
        <span className="font-display text-lg font-extrabold">Xbom <span className="text-gold">Lanches</span></span>
      </Link>

      <div className="animate-rise space-y-5">
        <div className="card p-6">
          <p className="text-sm text-mute">Pedido</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-gold">{order.code}</h1>
          <p className="mt-1 text-sm text-dim">Feito em {dateTimeBR(order.createdAt)} · {order.fulfillment === "Entrega" ? s.deliveryEstimate : s.pickupEstimate}</p>
          <Tracker code={order.code} initialStatus={order.status} initialPaid={order.paid} fulfillment={order.fulfillment} />
        </div>

        {pix && (
          <section className="card border-amber/30 p-6">
            <h2 className="font-display text-lg font-bold">Pague com Pix</h2>
            <p className="mt-1 text-sm text-mute">Abra o app do seu banco e pague <b className="text-ink">{money(order.total)}</b>. Seu pedido começa a ser preparado e o pagamento é conferido pela loja.</p>
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              {pix.qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pix.qr} alt="QR Code Pix" width={176} height={176} className="size-44 shrink-0 rounded-2xl bg-white p-2" />
              )}
              <div className="w-full min-w-0 space-y-3">
                <p className="label !mb-0">Pix copia e cola</p>
                <p className="break-all rounded-2xl border border-line-strong bg-surface-2 p-3 font-mono text-xs leading-relaxed text-mute">{pix.payload}</p>
                <CopyButton text={pix.payload} />
                <p className="text-xs text-dim">Favorecido: {s.pixHolder}</p>
              </div>
            </div>
          </section>
        )}

        <section className="card p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Resumo</h2>
          <ul className="divide-y divide-line">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{i.qty}× {i.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-dim">{i.option === "Combo personalizado" || i.option.startsWith("Com") ? i.description : i.option}</p>
                </div>
                <span className="font-semibold tabular-nums">{money(i.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums">{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Entrega</dt><dd className="tabular-nums">{order.fulfillment === "Retirada" ? "Grátis" : money(order.deliveryFee)}</dd></div>
            <div className="flex justify-between pt-1 text-base font-extrabold"><dt>Total</dt><dd className="tabular-nums text-gold">{money(order.total)}</dd></div>
          </dl>
        </section>

        <section className="card space-y-2 p-6 text-sm">
          <h2 className="mb-2 font-display text-lg font-bold">Dados</h2>
          <p><span className="text-mute">Cliente:</span> {order.customerName}</p>
          <p><span className="text-mute">{order.fulfillment === "Entrega" ? "Entrega em:" : "Retirada:"}</span> {order.address}</p>
          <p><span className="text-mute">Pagamento:</span> {order.payment}{order.changeFor ? ` (troco para ${money(order.changeFor)})` : ""}</p>
          {order.notes && <p><span className="text-mute">Observações:</span> {order.notes}</p>}
        </section>

        <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost w-full">
          <MessageCircle className="size-4" /> Falar com a loja no WhatsApp
        </a>
        <p className="pb-6 text-center text-xs text-dim">Guarde este link para acompanhar seu pedido.</p>
      </div>
    </main>
  );
}
