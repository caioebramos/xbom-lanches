import { getCatalog, getPublicSettings } from "@/lib/store";
import Storefront from "./_store/Storefront";

export const dynamic = "force-dynamic";

export default function Home() {
  const catalog = getCatalog();
  return <Storefront {...catalog} settings={getPublicSettings()} />;
}
