"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";
import type { Settings } from "@/lib/types";
import { saveStoreSettings } from "../../actions";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-mute">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Input({ label, name, defaultValue, ...rest }: { label: string; name: string; defaultValue?: string | number } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={defaultValue} className="field" {...rest} />
    </div>
  );
}

export default function SettingsForm({ s }: { s: Settings }) {
  const [state, action, pending] = useActionState(saveStoreSettings, undefined);
  return (
    <form action={action} className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Ajustes da loja</h1>

      <Section title="Loja">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome" name="storeName" defaultValue={s.storeName} />
          <Input label="WhatsApp (com 55 + DDD)" name="whatsapp" defaultValue={s.whatsapp} inputMode="numeric" />
          <Input label="Telefone (exibição)" name="phone" defaultValue={s.phone} />
          <Input label="Endereço" name="address" defaultValue={s.address} />
        </div>
      </Section>

      <Section title="Funcionamento" hint="O site bloqueia novos pedidos quando a loja está fechada.">
        <fieldset>
          <legend className="label">Status da loja</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {([["auto", "Automático", "Segue o horário abaixo"], ["open", "Forçar aberta", "Ignora o horário"], ["closed", "Forçar fechada", "Pausa os pedidos agora"]] as const).map(([v, t, d]) => (
              <label key={v} className="cursor-pointer rounded-2xl border border-line-strong bg-surface-2 p-3.5 has-[:checked]:border-amber has-[:checked]:bg-amber/10">
                <input type="radio" name="storeMode" value={v} defaultChecked={s.storeMode === v} className="sr-only" />
                <span className="block text-[15px] font-bold">{t}</span>
                <span className="block text-xs text-mute">{d}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Abre às" name="openTime" type="time" defaultValue={s.openTime} />
          <Input label="Fecha às" name="closeTime" type="time" defaultValue={s.closeTime} />
          <Input label="Previsão de entrega" name="deliveryEstimate" defaultValue={s.deliveryEstimate} />
          <Input label="Previsão de retirada" name="pickupEstimate" defaultValue={s.pickupEstimate} />
          <Input label="Pedido mínimo (R$)" name="minOrder" defaultValue={String(s.minOrder).replace(".", ",")} inputMode="decimal" />
        </div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="pickupEnabled" defaultChecked={s.pickupEnabled} className="size-4 accent-amber" /> Aceitar retirada no balcão</label>
      </Section>

      <Section title="Pix" hint="Usado para gerar o QR Code e o “copia e cola” na página do pedido. O pagamento é conferido por você no app do banco e marcado como pago no painel.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Chave Pix" name="pixKey" defaultValue={s.pixKey} />
          <div>
            <label className="label" htmlFor="pixKeyType">Tipo da chave</label>
            <select id="pixKeyType" name="pixKeyType" className="field" defaultValue={s.pixKeyType}>
              <option value="phone">Telefone</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="random">Chave aleatória</option>
            </select>
          </div>
          <Input label="Nome do favorecido" name="pixHolder" defaultValue={s.pixHolder} maxLength={25} />
          <Input label="Cidade" name="pixCity" defaultValue={s.pixCity} maxLength={15} />
        </div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="pixQrEnabled" defaultChecked={s.pixQrEnabled} className="size-4 accent-amber" /> Mostrar QR Code e copia e cola com o valor do pedido</label>
        <p className="rounded-xl border border-amber/25 bg-amber/10 p-3 text-xs leading-relaxed text-amber-soft">
          Confirme o <b>tipo da chave</b> (um número de 11 dígitos pode ser telefone ou CPF) e faça um pedido de teste pagando pelo app do seu banco antes de divulgar o site.
        </p>
      </Section>

      {state?.error && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">{state.error}</p>}
      <div className="sticky bottom-24 z-10 flex items-center gap-3 lg:bottom-6">
        <button className="btn-primary shadow-2xl" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Salvar ajustes</button>
        {state?.ok && !pending && <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-3 py-1.5 text-sm font-semibold text-ok"><Check className="size-4" /> Salvo</span>}
      </div>
    </form>
  );
}
