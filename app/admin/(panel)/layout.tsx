import { requireAdmin } from "@/lib/auth";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <AdminNav />
      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-10">
        <div className="mx-auto max-w-[88rem]">{children}</div>
      </main>
    </div>
  );
}
