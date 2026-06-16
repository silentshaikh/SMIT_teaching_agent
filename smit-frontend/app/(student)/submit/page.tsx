"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { FileUploader } from "@/components/FileUploader";

export default function SubmitPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.inOut" } });
      tl.fromTo(
        headerRef.current,
        { y: -60, opacity: 0, rotation: -5 },
        { y: 0, opacity: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" }
      );
      tl.fromTo(
        formRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
        "-=0.2"
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen bg-cyber-black p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div ref={headerRef} className="cyber-panel p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block w-2 h-2 bg-cyber-green animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-green/50 uppercase">
              Node // Submit
            </span>
          </div>
          <h1 className="font-orbitron text-3xl lg:text-4xl font-black uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Submit Assignment
          </h1>
          <p className="font-syncopate text-[10px] text-cyber-green/40 mt-3 tracking-[0.3em] uppercase">
            {"// UPLOAD SOURCE CODE FOR AGENTIC ANALYSIS"}
          </p>
        </div>

        <div ref={formRef} className="cyber-panel p-6 lg:p-8">
          <FileUploader />
        </div>
      </div>
    </main>
  );
}
