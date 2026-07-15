import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import { Navbar } from "@/components/Navbar";
import { CyberFooter } from "@/components/CyberFooter";

const heading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SMIT // AI TEACHING CORE",
  description: "Agentic AI Teaching Assistant — Code Analysis & Feedback System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          <Navbar />
          {children}
          <CyberFooter />
        </Providers>
      </body>
    </html>
  );
}
