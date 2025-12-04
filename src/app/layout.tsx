import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Providers from "./Providers";

// Body Font: Inter - clean, modern, widely supported
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Heading Font: Space Grotesk - geometric, distinctive
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DocklyTask - Aufgaben- und Projektmanagement",
  description: "Ein umfassendes Aufgaben- und Projektmanagement-Tool für effiziente Verwaltung von Aufgaben, Projekten, Kunden und Teams.",
  keywords: ["DocklyTask", "Projektmanagement", "Aufgabenmanagement", "Kundenmanagement", "Team"],
  authors: [{ name: "DocklyTask Team" }],
  openGraph: {
    title: "DocklyTask - Aufgaben- und Projektmanagement",
    description: "Effiziente Verwaltung von Aufgaben, Projekten, Kunden und Teams",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DocklyTask - Aufgaben- und Projektmanagement",
    description: "Effiziente Verwaltung von Aufgaben, Projekten, Kunden und Teams",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
