import Link from "next/link";
import { Plus } from "lucide-react";
import { getCategories, getProducts } from "@/lib/store";
import { saveCategory } from "../../actions";
import ProductList from "./ProductList";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  const categories = getCategories(true);
  const products = getProducts(true);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Produtos</h1>
          <p className="mt-1 text-sm text-mute">{products.length} itens · pause o que acabou com um toque.</p>
        </div>
        <Link href="/admin/produtos/novo" className="btn-primary !py-2.5"><Plus className="size-4" /> Novo produto</Link>
      </div>

      <ProductList products={products} categories={categories} />

      <details className="card group p-5">
        <summary className="cursor-pointer list-none font-display text-lg font-bold">Categorias <span className="ml-2 text-sm font-normal text-dim">(ordem, nome e visibilidade)</span></summary>
        <div className="mt-5 space-y-2">
          {categories.map((c) => (
            <form key={c.slug} action={saveCategory} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="slug" value={c.slug} />
              <input name="sort" type="number" defaultValue={c.sort} className="field !w-20" aria-label="Ordem" />
              <input name="name" defaultValue={c.name} className="field !w-auto min-w-0 flex-1" aria-label="Nome" />
              <label className="flex items-center gap-2 text-sm text-mute"><input type="checkbox" name="active" defaultChecked={c.active} className="size-4 accent-amber" /> Visível</label>
              <button className="btn-ghost !py-2.5">Salvar</button>
            </form>
          ))}
          <form action={saveCategory} className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <input name="name" placeholder="Nova categoria (ex.: Sobremesas)" className="field !w-auto min-w-0 flex-1" />
            <button className="btn-primary !py-2.5">Adicionar</button>
          </form>
        </div>
      </details>
    </div>
  );
}
