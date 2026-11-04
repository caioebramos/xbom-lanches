import Image from "next/image";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar · Admin", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_28rem_at_50%_0%,rgb(255_160_0/0.18),transparent_65%)]" />
      <div className="card animate-rise relative w-full max-w-sm p-8">
        <div className="mx-auto mb-6 size-20 overflow-hidden rounded-full ring-1 ring-amber/40">
          <Image src="/logo.jpg" alt="Xbom Lanches" width={80} height={80} className="size-full object-cover" priority />
        </div>
        <h1 className="text-center font-display text-2xl font-extrabold">Painel Xbom</h1>
        <p className="mb-6 mt-1 text-center text-sm text-mute">Acesso restrito à administração.</p>
        <LoginForm />
      </div>
    </main>
  );
}
