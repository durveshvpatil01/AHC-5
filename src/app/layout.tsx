import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const jet = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-jet" });

export const metadata: Metadata = {
  title: "Account Desk · FlytBase CS",
  description: "Live CRM for two FlytBase accounts: book, power, first moves, risks and gaps, every number cited.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${plex.variable} ${jet.variable} antialiased`}>{children}</body>
    </html>
  );
}
