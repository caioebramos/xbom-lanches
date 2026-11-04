import { Trash2 } from "lucide-react";
import { getZones } from "@/lib/store";
import { deleteZone, saveZone } from "../../actions";

export const dynamic = "force-dynamic";

async function remove(fd: FormData) {
  "use server";
  await deleteZone(Number(fd.get("id")));
}

export default function ZonesPage() {
  const zones = getZones(true);
  const cities = [...new Set(zones.map((z) => z.city))];
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Taxas de entrega</h1>
        <p className="mt-1 text-sm text-mute">Deixe a taxa em branco para o cliente consultar o valor pelo WhatsApp.</p>
      </div>
      {cities.map((city) => (
        <section key={city}>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-mute">{city}</h2>
          <div className="card divide-y divide-line">
            {zones.filter((z) => z.city === city).map((z) => (
              <form key={z.id} action={saveZone} className="flex flex-wrap items-center gap-2 p-3">
                <input type="hidden" name="id" value={z.id} />
                <input type="hidden" name="city" value={z.city} />
                <input name="name" defaultValue={z.name} className="field !w-auto min-w-48 flex-1" aria-label="Bairro" />
                <div className="relative w-28">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-dim">R$</span>
                  <input name="fee" defaultValue={z.fee === null ? "" : String(z.fee).replace(".", ",")} placeholder="consultar" inputMode="decimal" className="field pl-10" aria-label="Taxa" />
                </div>
                <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked={z.active} className="size-4 accent-amber" /> Ativo</label>
                <button className="btn-ghost !py-2.5">Salvar</button>
                <button formAction={remove} className="grid size-10 place-items-center rounded-xl text-dim hover:bg-bad/10 hover:text-bad" aria-label={`Excluir ${z.name}`}><Trash2 className="size-4" /></button>
              </form>
            ))}
          </div>
        </section>
      ))}
      <form action={saveZone} className="card flex flex-wrap items-center gap-2 p-4">
        <input name="city" list="cities" placeholder="Cidade" required className="field !w-44" />
        <datalist id="cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
        <input name="name" placeholder="Novo bairro" required className="field !w-auto min-w-40 flex-1" />
        <input name="fee" placeholder="Taxa" inputMode="decimal" className="field !w-24" />
        <button className="btn-primary !py-2.5">Adicionar</button>
      </form>
    </div>
  );
}
