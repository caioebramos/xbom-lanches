import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const sora = localFont({
  src: "./fonts/Sora.woff2",
  variable: "--font-sora",
  weight: "100 800",
  display: "swap",
});

const PREVIEW = process.env.PREVIEW_MODE === "1";

export const metadata: Metadata = {
  robots: PREVIEW ? { index: false, follow: false } : undefined,
  title: { default: "Xbom Lanches | Cardápio e pedidos", template: "%s | Xbom Lanches" },
  description:
    "Hambúrgueres artesanais, pizzas, batatas recheadas e esfihas em Rio Negro/PR e Mafra/SC. Monte seu pedido e acompanhe em tempo real.",
  icons: { icon: "/icon.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
