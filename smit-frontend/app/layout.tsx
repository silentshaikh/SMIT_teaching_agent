import type { Metadata } from "next";
import type { ReactNode } from "next";
import { Audiowide, Rajdhani, Orbitron, Michroma, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import { Navbar } from "@/components/Navbar";
import { CyberFooter } from "@/components/CyberFooter";

const heading = Audiowide({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
  display: "swap",
});

const body = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const michroma = Michroma({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-michroma",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SYNAPSE AI TEACHING AGENT",
  description: "Agentic AI Teaching Assistant — Code Analysis & Feedback System",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${orbitron.variable} ${michroma.variable} ${jetbrainsMono.variable}`}>
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
