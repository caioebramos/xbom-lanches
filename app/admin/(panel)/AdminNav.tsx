"use client";

import { BarChart3, Bike, ClipboardList, ExternalLink, LogOut, Plus, Settings, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../actions";

const ITEMS = [
  { href: "/admin", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/produtos", label: "Produtos", icon: UtensilsCrossed },
  { href: "/admin/adicionais", label: "Adicionais", icon: Plus },
  { href: "/admin/entrega", label: "Entrega", icon: Bike },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/configuracoes", label: "Ajustes", icon: Settings },
];

export default function AdminNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 p-5 lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <span className="relative size-11 overflow-hidden rounded-full ring-1 ring-amber/40">
            <Image src="/logo.jpg" alt="" fill sizes="44px" className="object-cover" />
          </span>
          <div>
            <p className="font-display font-extrabold leading-tight">Xbom <span className="text-gold">Admin</span></p>
            <p className="text-xs text-dim">Painel da loja</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${isActive(href) ? "bg-amber/12 text-amber" : "text-mute hover:bg-white/5 hover:text-ink"}`}>
              <Icon className="size-[18px]" /> {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-mute hover:bg-white/5 hover:text-ink">
            <ExternalLink className="size-4" /> Ver o site
          </Link>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-mute hover:bg-white/5 hover:text-bad">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile: barra inferior */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Navegação do painel">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold ${isActive(href) ? "text-amber" : "text-dim"}`}>
            <Icon className="size-5" /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
