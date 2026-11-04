"use client";

import { ArrowLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { Category, Product, ProductKind } from "@/lib/types";
import { PImage } from "../../../../_store/ui";
import { deleteProduct, saveProduct } from "../../../actions";

const KIND_LABEL: Record<ProductKind, string> = {
  simple: "Item simples (preço único)",
  lanche: "Lanche (aceita adicionais)",
  pizza: "Pizza (broto e grande, meio a meio)",
  "combo-fixed": "Combo fixo",
  "combo-large": "Combo 2 pizzas grandes",
  "combo-broto2": "Combo 2 pizzas broto",
  "combo-broto1": "Combo mini broto",
  "combo-esfiha": "Combo de esfihas",
};

const priceStr = (n?: number) => (n === undefined ? "" : String(n).replace(".", ","));

export default function ProductForm({ categories, product }: { categories: Category[]; product?: Product }) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const [kind, setKind] = useState<ProductKind>(product?.kind ?? "simple");
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const isNew = !product;
  const image = remove ? null : (preview ?? product?.image ?? null);
  const broto = product?.prices.find((p) => p.label === "Broto")?.value;
  const grande = product?.prices.find((p) => p.label === "Grande")?.value;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/produtos" className="inline-flex items-center gap-2 text-sm text-mute hover:text-ink"><ArrowLeft className="size-4" /> Produtos</Link>
      <h1 className="font-display text-2xl font-extrabold">{isNew ? "Novo produto" : product.name}</h1>

      <form action={action} className="card space-y-5 p-5 sm:p-6">
        {product && <input type="hidden" name="id" value={product.id} />}
        {!isNew && <input type="hidden" name="removeImage" value={remove ? "1" : ""} />}

        <div className="flex items-center gap-4">
          <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl border border-line-strong bg-surface-2">
            {image?.startsWith("blob:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="size-full object-cover" />
            ) : (
              <PImage src={image} alt="" sizes="112px" />
            )}
          </div>
          <div className="space-y-2">
            <label className="btn-ghost cursor-pointer !py-2.5">
              <ImagePlus className="size-4" /> {image ? "Trocar foto" : "Enviar foto"}
              <input
                type="file"
                name="imageFile"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreview(f ? URL.createObjectURL(f) : null);
                  setRemove(false);
                }}
              />
            </label>
            {image && !isNew && <button type="button" onClick={() => { setRemove(true); setPreview(null); }} className="block text-xs text-dim hover:text-bad">Remover foto</button>}
            <p className="text-xs text-dim">JPG, PNG ou WebP · até 6 MB · quadrada fica melhor.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input id="name" name="name" required className="field" defaultValue={product?.name} />
        </div>
        <div>
          <label className="label" htmlFor="description">Descrição</label>
          <textarea id="description" name="description" rows={3} className="field resize-none" defaultValue={product?.description} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Categoria</label>
            <select id="category" name="category" className="field" defaultValue={product?.category ?? categories[0]?.slug}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="kind">Tipo</label>
            {isNew ? (
              <select id="kind" name="kind" className="field" value={kind} onChange={(e) => setKind(e.target.value as ProductKind)}>
                {(["simple", "lanche", "pizza"] as const).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            ) : (
              <p className="field !cursor-not-allowed opacity-70">{KIND_LABEL[product.kind]}</p>
            )}
          </div>
        </div>

        {kind === "pizza" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="priceBroto">Preço broto (R$)</label>
                <input id="priceBroto" name="priceBroto" required inputMode="decimal" className="field" defaultValue={priceStr(broto)} />
              </div>
              <div>
                <label className="label" htmlFor="priceGrande">Preço grande (R$)</label>
                <input id="priceGrande" name="priceGrande" required inputMode="decimal" className="field" defaultValue={priceStr(grande)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="tier">Nível do sabor</label>
                <select id="tier" name="tier" className="field" defaultValue={product?.tier ?? "Tradicional"}>
                  <option>Tradicional</option><option>Especial</option><option>Nobre</option>
                </select>
              </div>
              <label className="flex items-center gap-3 self-end rounded-2xl border border-line-strong bg-surface-2 px-4 py-3 text-sm">
                <input type="checkbox" name="premium" defaultChecked={product?.premium} className="size-4 accent-amber" /> Sabor Premium (adicional em pizza grande)
              </label>
            </div>
          </>
        ) : (
          <div>
            <label className="label" htmlFor="price">Preço (R$)</label>
            <input id="price" name="price" required inputMode="decimal" className="field sm:max-w-48" defaultValue={priceStr(product?.prices[0]?.value)} />
          </div>
        )}

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-4 accent-amber" /> Disponível no cardápio
        </label>

        {state?.error && <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">{state.error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <button className="btn-primary" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} {isNew ? "Criar produto" : "Salvar alterações"}</button>
        </div>
      </form>

      {product && (
        <form action={deleteProduct.bind(null, product.id)} onSubmit={(e) => { if (!confirm(`Excluir “${product.name}” definitivamente?`)) e.preventDefault(); }}>
          <button className="btn-danger"><Trash2 className="size-4" /> Excluir produto</button>
        </form>
      )}
    </div>
  );
}
