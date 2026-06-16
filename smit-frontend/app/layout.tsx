import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "SMIT // AI TEACHING CORE",
  description: "Agentic AI Teaching Assistant — Code Analysis & Feedback System",
};

const CursorController = dynamic(
  () => import("@/components/CustomCursor").then((m) => ({ default: m.CustomCursor })),
  { ssr: false }
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
          <CursorController />
        </Providers>
      </body>
    </html>
  );
}
