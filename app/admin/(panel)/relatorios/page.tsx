import { money } from "@/lib/format";
import { listOrders, salesSummary, startOfDayBR } from "@/lib/orders";

export const dynamic = "force-dynamic";

const BR = 3 * 3600_000;
const dayKey = (iso: string) => new Date(new Date(iso).getTime() - BR).toISOString().slice(0, 10);

export default function ReportsPage() {
  const periods = [
    { label: "Hoje", s: salesSummary(startOfDayBR(0)) },
    { label: "7 dias", s: salesSummary(startOfDayBR(6)) },
    { label: "30 dias", s: salesSummary(startOfDayBR(29)) },
  ];

  const orders = listOrders({ since: startOfDayBR(13), limit: 5000 }).filter((o) => o.status !== "cancelado");
  const days: { key: string; label: string; total: number; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - BR - i * 86_400_000);
    days.push({ key: d.toISOString().slice(0, 10), label: d.toISOString().slice(8, 10) + "/" + d.toISOString().slice(5, 7), total: 0, n: 0 });
  }
  for (const o of orders) {
    const day = days.find((d) => d.key === dayKey(o.createdAt));
    if (day) {
      day.total += o.total;
      day.n++;
    }
  }
  const max = Math.max(1, ...days.map((d) => d.total));

  const payments = new Map<string, number>();
  for (const o of orders) payments.set(o.payment, (payments.get(o.payment) ?? 0) + o.total);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-extrabold">Relatórios</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {periods.map(({ label, s }) => (
          <div key={label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-dim">{label}</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-gold tabular-nums">{money(s.revenue)}</p>
            <p className="mt-1 text-sm text-mute">{s.count} pedidos · ticket médio {s.count ? money(s.avgTicket) : "—"}</p>
          </div>
        ))}
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="mb-5 font-display text-lg font-bold">Faturamento · últimos 14 dias</h2>
        <div className="flex h-48 items-end gap-1.5 sm:gap-2" role="img" aria-label="Gráfico de faturamento diário">
          {days.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="rounded-t-lg bg-gradient-to-t from-amber-deep to-amber-soft transition group-hover:brightness-125" style={{ height: `${Math.max(2, (d.total / max) * 100)}%`, opacity: d.total ? 1 : 0.15 }} />
              <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-3 px-2 py-1 text-xs font-semibold group-hover:block">{money(d.total)} · {d.n}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 sm:gap-2">
          {days.map((d, i) => <span key={d.key} className="flex-1 text-center text-[10px] text-dim">{i % 2 === 0 ? d.label : ""}</span>)}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Mais vendidos · 30 dias</h2>
          <ol className="space-y-3">
            {periods[2].s.top.map((t, i) => (
              <li key={t.name} className="flex items-center gap-3 text-sm">
                <span className="grid size-7 place-items-center rounded-full bg-amber/12 text-xs font-bold text-amber">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                <span className="text-mute tabular-nums">{t.qty} un.</span>
                <span className="w-24 text-right font-semibold tabular-nums">{money(t.total)}</span>
              </li>
            ))}
            {periods[2].s.top.length === 0 && <li className="text-sm text-dim">Ainda sem vendas no período.</li>}
          </ol>
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Formas de pagamento · 14 dias</h2>
          <ul className="space-y-3 text-sm">
            {[...payments.entries()].map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><b className="tabular-nums">{money(v)}</b></li>
            ))}
            {payments.size === 0 && <li className="text-dim">Ainda sem vendas no período.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
