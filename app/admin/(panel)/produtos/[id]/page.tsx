import { notFound } from "next/navigation";
import { getCategories, getProduct } from "@/lib/store";
import ProductForm from "./ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = getCategories(true);
  if (id === "novo") return <ProductForm categories={categories} />;
  const product = getProduct(Number(id));
  if (!product) notFound();
  return <ProductForm categories={categories} product={product} />;
}
