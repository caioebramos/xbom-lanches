"use client";

import { Bike, Check, ChefHat, ClipboardCheck, Copy, PackageCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { OrderStatus } from "@/lib/types";

const STEPS = [
  { key: "novo", label: "Pedido recebido", icon: ClipboardCheck },
  { key: "preparo", label: "Em preparo", icon: ChefHat },
  { key: "entrega", label: "Saiu para entrega", icon: Bike },
  { key: "concluido", label: "Entregue", icon: PackageCheck },
] as const;

export function Tracker({ code, initialStatus, initialPaid, fulfillment }: { code: string; initialStatus: OrderStatus; initialPaid: boolean; fulfillment: "Entrega" | "Retirada" }) {
  const [status, setStatus] = useState(initialStatus);
  const [paid, setPaid] = useState(initialPaid);

  useEffect(() => {
    if (status === "concluido" || status === "cancelado") return;
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/orders/${code}`, { cache: "no-store" });
        if (!r.ok || stop) return;
        const d = await r.json();
        setStatus(d.status);
        setPaid(d.paid);
      } catch {
        /* tenta no próximo ciclo */
      }
    };
    const t = setInterval(poll, 6000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [code, status]);

  if (status === "cancelado")
    return (
      <p className="mt-6 flex items-center gap-3 rounded-2xl border border-bad/30 bg-bad/10 p-4 text-bad">
        <XCircle className="size-5 shrink-0" /> Pedido cancelado. Em caso de dúvida, fale com a loja.
      </p>
    );

  const steps = fulfillment === "Retirada" ? STEPS.map((s) => (s.key === "entrega" ? { ...s, label: "Pronto para retirar", icon: PackageCheck } : s.key === "concluido" ? { ...s, label: "Retirado" } : s)) : STEPS;
  const current = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="mt-6">
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const done = i < current || status === "concluido";
          const now = i === current && status !== "concluido";
          const Icon = s.icon;
          return (
            <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
              {i < steps.length - 1 && <span className={`absolute left-[1.15rem] top-10 h-[calc(100%-2.5rem)] w-0.5 ${done ? "bg-amber" : "bg-line-strong"}`} />}
              <span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full border transition ${done ? "border-amber bg-amber text-[#1a1100]" : now ? "border-amber bg-amber/10 text-amber shadow-glow" : "border-line-strong bg-surface-2 text-dim"}`}>
                {done ? <Check className="size-5" /> : <Icon className="size-5" />}
              </span>
              <div className="pt-2">
                <p className={`font-semibold ${done || now ? "text-ink" : "text-dim"}`}>{s.label}</p>
                {now && <p className="text-xs text-amber">Agora</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {paid && <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-ok/10 px-3 py-1.5 text-sm font-semibold text-ok"><Check className="size-4" /> Pagamento confirmado</p>}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn-primary w-full"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 2200);
        } catch {
          window.prompt("Copie o código Pix:", text);
        }
      }}
    >
      {ok ? <Check className="size-4" /> : <Copy className="size-4" />}
      {ok ? "Código copiado!" : "Copiar código Pix"}
    </button>
  );
}
