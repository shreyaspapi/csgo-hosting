import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import { cn } from "@/lib/utils";
import { Geist } from "next/font/google";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "FluidRush - CS:GO 5v5 Matchmaking",
  description:
    "Competitive CS:GO 5v5 matchmaking service. Queue up, find matches, and play on dedicated servers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body
        className={cn(
          geist.variable,
          geistMono.variable,
          "antialiased min-h-screen font-sans"
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
