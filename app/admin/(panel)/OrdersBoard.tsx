"use client";

import { Bell, BellOff, Bike, Check, ChevronDown, MessageCircle, Printer, Store, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { dateTimeBR, formatPhone, money, timeBR } from "@/lib/format";
import type { OrderRow, OrderStatus } from "@/lib/types";
import { updateOrderPaid, updateOrderStatus } from "../actions";

const COLUMNS: { key: OrderStatus; title: string; tone: string }[] = [
  { key: "novo", title: "Novos", tone: "text-amber" },
  { key: "preparo", title: "Em preparo", tone: "text-sky-300" },
  { key: "entrega", title: "Saiu / pronto", tone: "text-violet-300" },
  { key: "concluido", title: "Concluídos", tone: "text-ok" },
];

const startOfTodayBR = () => {
  const BR = 3 * 3600_000;
  return Math.floor((Date.now() - BR) / 86_400_000) * 86_400_000 + BR;
};

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new Ctx();
    [880, 1175, 1568].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.16 + 0.15);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + i * 0.16);
      o.stop(ac.currentTime + i * 0.16 + 0.16);
    });
    setTimeout(() => ac.close(), 1200);
  } catch {
    /* áudio indisponível */
  }
}

function printTicket(o: OrderRow) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(o.code)}</title>
<style>body{font:13px/1.35 monospace;width:72mm;margin:4mm;color:#000}h1{font-size:16px;margin:0}hr{border:0;border-top:1px dashed #000;margin:6px 0}.r{display:flex;justify-content:space-between;gap:8px}small{font-size:11px}</style>
<h1>XBOM LANCHES</h1><div>Pedido <b>${esc(o.code)}</b> · ${esc(dateTimeBR(o.createdAt))}</div><hr>
<div><b>${esc(o.customerName)}</b><br>${esc(formatPhone(o.customerPhone))}</div>
<div>${o.fulfillment === "Entrega" ? "ENTREGA: " + esc(o.address) : "RETIRADA NO BALCÃO"}</div><hr>
${o.items.map((i) => `<div class="r"><b>${i.qty}x ${esc(i.name)}</b><span>${money(i.total)}</span></div><small>${esc(i.option === "Combo personalizado" || i.option.startsWith("Com") ? i.description : i.option)}</small>`).join("<br>")}
<hr><div class="r"><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div class="r"><span>Entrega</span><span>${money(o.deliveryFee)}</span></div>
<div class="r"><b>TOTAL</b><b>${money(o.total)}</b></div><hr>
<div>Pagto: ${esc(o.payment)}${o.paid ? " (PAGO)" : ""}${o.changeFor ? "<br>Troco p/ " + money(o.changeFor) : ""}</div>${o.notes ? `<hr><div>OBS: ${esc(o.notes)}</div>` : ""}
<script>onload=()=>{print();}<\/script>`);
  w.document.close();
}

export default function OrdersBoard({ initial }: { initial: OrderRow[] }) {
  const [orders, setOrders] = useState(initial);
  const [tab, setTab] = useState<OrderStatus>("novo");
  const [sound, setSound] = useState(false);
  const [live, setLive] = useState(true);
  const [, startTransition] = useTransition();
  const known = useRef(new Set(initial.map((o) => o.id)));
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/orders", { cache: "no-store" });
      if (r.status === 401) return void (window.location.href = "/admin/login");
      if (!r.ok) return setLive(false);
      const { orders: next } = (await r.json()) as { orders: OrderRow[] };
      const fresh = next.filter((o) => !known.current.has(o.id) && o.status === "novo");
      next.forEach((o) => known.current.add(o.id));
      if (fresh.length && soundRef.current) beep();
      setOrders(next);
      setLive(true);
    } catch {
      setLive(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  const novos = orders.filter((o) => o.status === "novo").length;
  useEffect(() => {
    document.title = novos ? `(${novos}) Pedidos · Xbom Admin` : "Pedidos · Xbom Admin";
  }, [novos]);

  const act = (fn: () => Promise<void>, optimistic: (o: OrderRow) => OrderRow, id: number) => {
    setOrders((cur) => cur.map((o) => (o.id === id ? optimistic(o) : o)));
    startTransition(async () => {
      await fn();
      await poll();
    });
  };

  const since = startOfTodayBR();
  const today = orders.filter((o) => new Date(o.createdAt).getTime() >= since && o.status !== "cancelado");
  const revenue = today.reduce((s, o) => s + o.total, 0);

  const visible = (key: OrderStatus) => orders.filter((o) => o.status === key && (key !== "concluido" || new Date(o.createdAt).getTime() >= since));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Pedidos</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-mute">
            <span className={`size-2 rounded-full ${live ? "bg-ok" : "bg-bad"}`} /> {live ? "Atualizando automaticamente" : "Sem conexão, tentando novamente…"}
          </p>
        </div>
        <button
          onClick={() => {
            setSound((s) => !s);
            if (!sound) beep();
          }}
          className={`btn ${sound ? "btn-primary" : "btn-ghost"} !py-2.5`}
        >
          {sound ? <Bell className="size-4" /> : <BellOff className="size-4" />} {sound ? "Alerta sonoro ligado" : "Ligar alerta sonoro"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Pedidos hoje" value={String(today.length)} />
        <Stat label="Faturamento hoje" value={money(revenue)} gold />
        <Stat label="Ticket médio" value={today.length ? money(revenue / today.length) : "—"} />
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
        {COLUMNS.map((c) => (
          <button key={c.key} onClick={() => setTab(c.key)} className={`chip shrink-0 ${tab === c.key ? "!border-amber !bg-amber/10 !text-ink" : ""}`}>
            {c.title} <b className="ml-2 tabular-nums">{visible(c.key).length}</b>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {COLUMNS.map((c) => (
          <section key={c.key} className={tab === c.key ? "" : "hidden lg:block"}>
            <h2 className={`mb-3 hidden items-center gap-2 font-display text-sm font-bold uppercase tracking-wider lg:flex ${c.tone}`}>
              {c.title} <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-mute tabular-nums">{visible(c.key).length}</span>
            </h2>
            <div className="space-y-3">
              {visible(c.key).map((o) => (
                <OrderCard key={o.id} o={o} act={act} />
              ))}
              {visible(c.key).length === 0 && <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-dim">Nada por aqui.</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-dim">{label}</p>
      <p className={`mt-1 font-display text-xl font-extrabold tabular-nums sm:text-2xl ${gold ? "text-gold" : ""}`}>{value}</p>
    </div>
  );
}

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: (o: OrderRow) => string }>> = {
  novo: { to: "preparo", label: (): string => "Aceitar e preparar" },
  preparo: { to: "entrega", label: (o) => (o.fulfillment === "Entrega" ? "Saiu para entrega" : "Pronto para retirar") },
  entrega: { to: "concluido", label: () => "Concluir" },
};

function OrderCard({ o, act }: { o: OrderRow; act: (fn: () => Promise<void>, opt: (o: OrderRow) => OrderRow, id: number) => void }) {
  const [open, setOpen] = useState(o.status === "novo");
  const next = NEXT[o.status];
  const phone = o.customerPhone.replace(/\D/g, "");
  const wa = `https://wa.me/55${phone.replace(/^55/, "")}?text=${encodeURIComponent(`Olá, ${o.customerName.split(" ")[0]}! Aqui é do Xbom Lanches sobre o seu pedido ${o.code}.`)}`;
  const ageMin = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);

  return (
    <article className={`card overflow-hidden ${o.status === "novo" ? "border-amber/40 shadow-glow" : ""}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-extrabold">{o.code}</span>
            <span className="text-xs text-dim">{timeBR(o.createdAt)}{o.status !== "concluido" && o.status !== "cancelado" ? ` · há ${ageMin} min` : ""}</span>
          </div>
          <p className="mt-0.5 truncate font-semibold">{o.customerName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Tag>{o.fulfillment === "Entrega" ? <Bike className="size-3" /> : <Store className="size-3" />} {o.fulfillment}</Tag>
            <Tag>{o.payment}</Tag>
            {o.paid ? <Tag ok><Check className="size-3" /> Pago</Tag> : o.payment === "Pix" ? <Tag warn>Pix a conferir</Tag> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-display text-lg font-extrabold tabular-nums text-gold">{money(o.total)}</span>
          <ChevronDown className={`size-4 text-dim transition ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line p-4 text-sm">
          <ul className="space-y-2">
            {o.items.map((i, idx) => (
              <li key={idx}>
                <div className="flex justify-between gap-3"><b>{i.qty}× {i.name}</b><span className="tabular-nums text-mute">{money(i.total)}</span></div>
                <p className="text-xs leading-relaxed text-dim">{i.option === "Combo personalizado" || i.option.startsWith("Com") ? i.description : i.option}</p>
              </li>
            ))}
          </ul>
          <div className="space-y-1 rounded-xl bg-white/[0.03] p-3 text-xs text-mute">
            <p>📞 {formatPhone(o.customerPhone)}</p>
            <p>📍 {o.fulfillment === "Entrega" ? o.address : "Retirada no balcão"}</p>
            {o.changeFor ? <p>💵 Troco para {money(o.changeFor)}</p> : null}
            {o.notes ? <p>📝 {o.notes}</p> : null}
            <p>Entrega {money(o.deliveryFee)} · Subtotal {money(o.subtotal)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {next && (
              <button className="btn-primary !py-2.5 flex-1" onClick={() => act(() => updateOrderStatus(o.id, next.to), (x) => ({ ...x, status: next.to }), o.id)}>
                {next.label(o)}
              </button>
            )}
            <button className="btn-ghost !px-3.5 !py-2.5" onClick={() => act(() => updateOrderPaid(o.id, !o.paid), (x) => ({ ...x, paid: !x.paid }), o.id)}>
              {o.paid ? "Desfazer pago" : "Marcar pago"}
            </button>
            <a className="btn-ghost !px-3.5 !py-2.5" href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp do cliente"><MessageCircle className="size-4" /></a>
            <button className="btn-ghost !px-3.5 !py-2.5" onClick={() => printTicket(o)} aria-label="Imprimir comanda"><Printer className="size-4" /></button>
            {o.status !== "cancelado" && o.status !== "concluido" && (
              <button
                className="btn-danger !px-3.5 !py-2.5"
                aria-label="Cancelar pedido"
                onClick={() => confirm(`Cancelar o pedido ${o.code}?`) && act(() => updateOrderStatus(o.id, "cancelado"), (x) => ({ ...x, status: "cancelado" }), o.id)}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function Tag({ children, ok, warn }: { children: React.ReactNode; ok?: boolean; warn?: boolean }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? "bg-ok/15 text-ok" : warn ? "bg-amber/15 text-amber" : "bg-white/8 text-mute"}`}>{children}</span>;
}
