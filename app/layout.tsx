import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "PokeDaily — Daily Pokémon games", template: "%s · PokeDaily" },
  description: "New Pokémon puzzles every day. Play the daily Pokémon Grid.",
};

export const viewport: Viewport = {
  themeColor: "#0b1533",
};

/**
 * Root shell only. Platform chrome lives in route groups:
 *   (site) → shared dark PokeDaily shell (hub + games)
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
