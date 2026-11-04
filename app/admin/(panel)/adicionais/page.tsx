import { Trash2 } from "lucide-react";
import { getAddons } from "@/lib/store";
import { deleteAddon, saveAddon } from "../../actions";

export const dynamic = "force-dynamic";

const fmt = (n: number) => String(n).replace(".", ",");

async function remove(fd: FormData) {
  "use server";
  await deleteAddon(Number(fd.get("id")));
}

export default function AddonsPage() {
  const addons = getAddons(true);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Adicionais</h1>
        <p className="mt-1 text-sm text-mute">Extras que o cliente pode colocar nos lanches (queijo, bacon, hambúrguer extra…).</p>
      </div>
      <div className="card divide-y divide-line">
        {addons.map((a) => (
          <form key={a.id} action={saveAddon} className="flex flex-wrap items-center gap-2 p-3">
            <input type="hidden" name="id" value={a.id} />
            <input name="name" defaultValue={a.name} className="field !w-auto min-w-40 flex-1" aria-label="Nome" />
            <input name="detail" defaultValue={a.detail ?? ""} placeholder="ex.: 150g" className="field !w-24" aria-label="Detalhe" />
            <input name="price" defaultValue={fmt(a.price)} inputMode="decimal" className="field !w-24" aria-label="Preço" />
            <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked={a.active} className="size-4 accent-amber" /> Ativo</label>
            <button className="btn-ghost !py-2.5">Salvar</button>
            <button formAction={remove} className="grid size-10 place-items-center rounded-xl text-dim hover:bg-bad/10 hover:text-bad" aria-label={`Excluir ${a.name}`}><Trash2 className="size-4" /></button>
          </form>
        ))}
      </div>
      <form action={saveAddon} className="card flex flex-wrap items-center gap-2 p-4">
        <input name="name" placeholder="Novo adicional" required className="field !w-auto min-w-40 flex-1" />
        <input name="detail" placeholder="detalhe" className="field !w-24" />
        <input name="price" placeholder="Preço" required inputMode="decimal" className="field !w-24" />
        <button className="btn-primary !py-2.5">Adicionar</button>
      </form>
    </div>
  );
}
