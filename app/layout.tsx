import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import { Header } from "@/components/Header";
import { SWRegister } from "@/components/SWRegister";
import "./globals.css";

const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest", display: "swap" });
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700"],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Протокол — коллективные претензии участников", template: "%s — Протокол" },
  description: "Жалобы участников на организацию мероприятий и хакатонов. Подписывайте то, что видели сами.",
  appleWebApp: { capable: true, title: "Протокол", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0F1420",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} ${unbounded.variable}`}>
      <body className="min-h-dvh">
        <Header />
        <main className="mx-auto max-w-2xl px-3 pb-28 pt-4">{children}</main>
        <SWRegister />
      </body>
    </html>
  );
}
