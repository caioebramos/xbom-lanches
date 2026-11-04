"use client";

import { ArrowLeft, Banknote, Bike, CreditCard, Loader2, MessageCircle, QrCode, ShoppingBag, Store, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/format";
import { priceLine, type Ctx } from "@/lib/pricing";
import type { CartLine, PaymentMethod, Product, PublicSettings, Zone } from "@/lib/types";
import { PImage, Sheet, Stepper } from "./ui";

type Props = {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  products: Product[];
  ctx: Ctx;
  zones: Zone[];
  settings: PublicSettings;
  storeOpen: boolean | null;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

const CUSTOMER_KEY = "xbom-customer-v1";

type Form = {
  name: string;
  phone: string;
  fulfillment: "Entrega" | "Retirada";
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  payment: PaymentMethod;
  changeFor: string;
  notes: string;
};

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export function CartDrawer({ open, onClose, lines, ctx, zones, settings, storeOpen, setQty, clear }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const cities = useMemo(() => [...new Set(zones.map((z) => z.city))], [zones]);
  const [f, setF] = useState<Form>({
    name: "",
    phone: "",
    fulfillment: "Entrega",
    city: cities[0] ?? "",
    neighborhood: "",
    street: "",
    number: "",
    complement: "",
    payment: "Pix",
    changeFor: "",
    notes: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "null");
      if (saved && typeof saved === "object") setF((cur) => ({ ...cur, ...saved, changeFor: "", notes: "" }));
    } catch {
      /* sem dados salvos */
    }
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const priced = useMemo(
    () =>
      lines.map((l) => {
        const p = ctx.product(l.productId);
        const r = p ? priceLine(p, l.config, ctx) : null;
        return { line: l, r: r && r.ok ? r : null };
      }),
    [lines, ctx],
  );
  const valid = priced.filter((x) => x.r);
  const subtotal = valid.reduce((s, x) => s + x.r!.unit * x.line.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const zone = zones.find((z) => z.city === f.city && z.name === f.neighborhood);
  const fee = f.fulfillment === "Entrega" ? (zone?.fee ?? 0) : 0;
  const total = subtotal + fee;
  const consult = f.fulfillment === "Entrega" && zone && zone.fee === null;
  const belowMin = subtotal < settings.minOrder;
  const wa = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("Olá, Xbom Lanches! Quero consultar a taxa de entrega para o bairro: " + (f.neighborhood || ""))}`;

  async function submit() {
    setErr("");
    if (storeOpen === false) return setErr(`Estamos fechados agora. Atendemos das ${settings.openTime} às ${settings.closeTime}.`);
    if (f.name.trim().length < 2) return setErr("Informe seu nome.");
    if (f.phone.replace(/\D/g, "").length < 10) return setErr("Informe um telefone com DDD.");
    if (f.fulfillment === "Entrega") {
      if (!f.neighborhood) return setErr("Selecione o bairro.");
      if (consult) return setErr("Para esse bairro, consulte a taxa pelo WhatsApp.");
      if (!f.street.trim() || !f.number.trim()) return setErr("Informe rua e número.");
    }
    const changeFor = f.payment === "Dinheiro" && f.changeFor ? Number(f.changeFor.replace(/\./g, "").replace(",", ".")) : null;
    if (changeFor !== null && (!Number.isFinite(changeFor) || changeFor < total)) return setErr("O valor do troco deve ser maior ou igual ao total.");

    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: f.name,
          customerPhone: f.phone,
          fulfillment: f.fulfillment,
          city: f.city,
          neighborhood: f.neighborhood,
          street: f.street,
          number: f.number,
          complement: f.complement,
          payment: f.payment,
          changeFor,
          notes: f.notes,
          lines: valid.map((x) => ({ key: x.line.key, productId: x.line.productId, qty: x.line.qty, config: x.line.config })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar o pedido.");
      try {
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: f.name, phone: f.phone, fulfillment: f.fulfillment, city: f.city, neighborhood: f.neighborhood, street: f.street, number: f.number, complement: f.complement, payment: f.payment }));
      } catch {
        /* ignora */
      }
      clear();
      onClose();
      setStep("cart");
      router.push(`/pedido/${data.code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    setStep("cart");
    setErr("");
    onClose();
  };

  const footer =
    lines.length === 0 ? null : step === "cart" ? (
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-sm text-mute">Subtotal</span>
          <span className="font-display text-xl font-extrabold">{money(subtotal)}</span>
        </div>
        {belowMin && <p className="text-xs text-amber">Pedido mínimo de {money(settings.minOrder)}.</p>}
        <button className="btn-primary w-full" disabled={belowMin || valid.length === 0} onClick={() => setStep("checkout")}>
          Continuar
        </button>
      </div>
    ) : (
      <div className="space-y-3">
        {err && <p className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">{err}</p>}
        <div className="flex items-end justify-between">
          <span className="text-sm text-mute">Total</span>
          <span className="font-display text-xl font-extrabold text-gold">{money(total)}</span>
        </div>
        <button className="btn-primary w-full" disabled={busy || !!consult || storeOpen === false} onClick={submit}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {storeOpen === false ? "Loja fechada" : busy ? "Enviando…" : "Finalizar pedido"}
        </button>
      </div>
    );

  return (
    <Sheet open={open} onClose={close} variant="drawer" labelledBy="cart-title" footer={footer}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          {step === "checkout" && (
            <button onClick={() => setStep("cart")} className="grid size-9 place-items-center rounded-full bg-white/5 hover:bg-white/10" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <h2 id="cart-title" className="font-display text-lg font-bold">
            {step === "cart" ? `Sua sacola${count ? ` (${count})` : ""}` : "Finalizar pedido"}
          </h2>
        </div>
        <button onClick={close} className="grid size-9 place-items-center rounded-full bg-white/5 hover:bg-white/10" aria-label="Fechar">
          ✕
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="grid place-items-center gap-3 px-6 py-20 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-amber/10 text-amber">
            <ShoppingBag className="size-7" />
          </div>
          <p className="font-display text-lg font-bold">Sua sacola está vazia</p>
          <p className="max-w-[16rem] text-sm text-mute">Escolha seus favoritos no cardápio e monte o pedido do seu jeito.</p>
          <button className="btn-ghost mt-2" onClick={close}>
            Ver cardápio
          </button>
        </div>
      ) : step === "cart" ? (
        <ul className="divide-y divide-line px-5">
          {priced.map(({ line, r }) => (
            <li key={line.key} className="flex gap-3 py-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                <PImage src={r?.image ?? null} alt="" sizes="64px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{r?.name ?? "Item indisponível"}</p>
                {r && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-dim">{r.option === "Combo personalizado" || r.option.startsWith("Com") ? r.description : r.option}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <Stepper size="sm" value={line.qty} min={0} max={30} onChange={(n) => setQty(line.key, n)} />
                  <span className="font-bold tabular-nums">{r ? money(r.unit * line.qty) : "—"}</span>
                </div>
              </div>
              <button onClick={() => setQty(line.key, 0)} className="self-start p-1 text-dim hover:text-bad" aria-label="Remover item">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-6 px-5 py-5">
          {storeOpen === false && <p className="rounded-xl border border-amber/30 bg-amber/10 p-3 text-sm text-amber-soft">Estamos fechados agora (atendemos das {settings.openTime} às {settings.closeTime}). Você pode montar o pedido e finalizar quando abrirmos.</p>}

          <fieldset className="space-y-3">
            <legend className="label">Seus dados</legend>
            <input className="field" placeholder="Seu nome" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} />
            <input className="field" placeholder="Telefone / WhatsApp" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} />
          </fieldset>

          <fieldset>
            <legend className="label">Como quer receber?</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={f.fulfillment === "Entrega"} onClick={() => set("fulfillment", "Entrega")} icon={<Bike className="size-5" />} title="Entrega" sub={settings.deliveryEstimate} />
              {settings.pickupEnabled && <Choice active={f.fulfillment === "Retirada"} onClick={() => set("fulfillment", "Retirada")} icon={<Store className="size-5" />} title="Retirada" sub="Sem taxa" />}
            </div>
          </fieldset>

          {f.fulfillment === "Entrega" ? (
            <fieldset className="space-y-3">
              <legend className="label">Endereço de entrega</legend>
              <div className="grid grid-cols-2 gap-2">
                {cities.map((c) => (
                  <button key={c} type="button" onClick={() => setF((cur) => ({ ...cur, city: c, neighborhood: "" }))} className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${f.city === c ? "border-amber bg-amber/10" : "border-line-strong bg-surface-2"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <select className="field" value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)}>
                <option value="">Selecione o bairro…</option>
                {zones
                  .filter((z) => z.city === f.city)
                  .map((z) => (
                    <option key={z.id} value={z.name}>
                      {z.name}
                      {z.fee !== null ? ` — ${money(z.fee)}` : ""}
                    </option>
                  ))}
              </select>
              {consult && (
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-amber/30 bg-amber/10 p-3 text-sm text-amber-soft">
                  <MessageCircle className="size-4 shrink-0" /> Para esse bairro a taxa é combinada. Toque para consultar no WhatsApp.
                </a>
              )}
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <input className="field" placeholder="Rua" autoComplete="address-line1" value={f.street} onChange={(e) => set("street", e.target.value)} />
                <input className="field" placeholder="Nº" inputMode="numeric" value={f.number} onChange={(e) => set("number", e.target.value)} />
              </div>
              <input className="field" placeholder="Complemento / ponto de referência (opcional)" value={f.complement} onChange={(e) => set("complement", e.target.value)} />
            </fieldset>
          ) : (
            <p className="flex items-start gap-2 rounded-2xl border border-line bg-surface-2/50 p-3 text-sm text-mute">
              <Store className="mt-0.5 size-4 shrink-0 text-amber" /> Retire em {settings.address}. Previsão: {settings.pickupEstimate}.
            </p>
          )}

          <fieldset>
            <legend className="label">Pagamento</legend>
            <div className="grid gap-2">
              <Choice active={f.payment === "Pix"} onClick={() => set("payment", "Pix")} icon={<QrCode className="size-5" />} title="Pix" sub="Você recebe o QR Code e o copia e cola logo após enviar" row />
              <Choice active={f.payment === "Cartão na entrega"} onClick={() => set("payment", "Cartão na entrega")} icon={<CreditCard className="size-5" />} title="Cartão na entrega" sub="Débito ou crédito na maquininha" row />
              <Choice active={f.payment === "Dinheiro"} onClick={() => set("payment", "Dinheiro")} icon={<Banknote className="size-5" />} title="Dinheiro" sub="Informe se precisa de troco" row />
            </div>
            {f.payment === "Dinheiro" && <input className="field mt-3" placeholder="Troco para quanto? (opcional)  ex.: 100" inputMode="decimal" value={f.changeFor} onChange={(e) => set("changeFor", e.target.value)} />}
          </fieldset>

          <fieldset>
            <legend className="label">Observações</legend>
            <textarea className="field min-h-20 resize-none" maxLength={300} placeholder="Ex.: sem cebola, tocar a campainha…" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </fieldset>

          <dl className="space-y-2 rounded-2xl border border-line bg-surface-2/50 p-4 text-sm">
            <Row k="Subtotal" v={money(subtotal)} />
            <Row k="Entrega" v={f.fulfillment === "Retirada" ? "Grátis" : zone ? (zone.fee === null ? "A consultar" : money(zone.fee)) : "Selecione o bairro"} />
          </dl>
        </div>
      )}
    </Sheet>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-mute">{k}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
    </div>
  );
}

function Choice({ active, onClick, icon, title, sub, row = false }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; row?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.98] ${active ? "border-amber bg-amber/10 shadow-glow" : "border-line-strong bg-surface-2 hover:border-white/30"} ${row ? "" : "flex-col items-start"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-amber text-[#1a1100]" : "bg-white/8 text-mute"}`}>{icon}</span>
      <span>
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="block text-xs text-mute">{sub}</span>
      </span>
    </button>
  );
}
