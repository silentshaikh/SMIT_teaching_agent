"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { FileUploader } from "@/components/FileUploader";
import { BulkUploader } from "@/components/BulkUploader";

export default function SubmitPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"single" | "bulk">("single");

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
      if (infoRef.current) {
        tl.fromTo(
          infoRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
          "-=0.3"
        );
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen bg-cyber-black pt-20 pb-12 px-[var(--space-page-x)]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div ref={headerRef} className="cyber-panel p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block w-2 h-2 bg-cyber-green animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-green/50 uppercase">
              Node // Submit
            </span>
          </div>
          <h1 className="font-heading font-bold uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Submit Assignment
          </h1>
          <p className="font-syncopate text-[10px] text-cyber-green/40 mt-3 tracking-[0.3em] uppercase">
            {"// UPLOAD SOURCE CODE FOR AGENTIC ANALYSIS"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("single")}
            className={`cyber-btn text-[10px] px-4 py-2 h-auto ${
              mode === "single" ? "" : "opacity-40"
            }`}
          >
            Single Upload
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`cyber-btn text-[10px] px-4 py-2 h-auto ${
              mode === "bulk" ? "" : "opacity-40"
            }`}
          >
            Bulk Upload (Teacher)
          </button>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          <div ref={formRef} className="md:col-span-3 cyber-panel p-6 lg:p-8 animate-on-scroll">
            {mode === "single" ? <FileUploader /> : <BulkUploader />}
          </div>

          <div ref={infoRef} className="md:col-span-2 cyber-panel p-6 lg:p-8 space-y-4">
            <h3 className="font-heading font-semibold text-cyber-green">Supported Languages</h3>
            <div className="space-y-2 text-sm text-cyber-green/70">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400" />
                <span>JavaScript (.js)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400" />
                <span>Python (.py)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-400" />
                <span>HTML (.html)</span>
              </div>
            </div>
            <div className="border-t border-cyber-green/10 pt-4">
              <h4 className="font-heading font-semibold text-cyber-green mb-2">How It Works</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-cyber-green/60">
                <li>Upload your source code file</li>
                <li>4 AI agents analyze your code</li>
                <li>Get instant feedback &amp; score</li>
              </ol>
            </div>
            {mode === "bulk" && (
              <div className="border-t border-cyber-purple/20 pt-4">
                <h4 className="font-heading font-semibold text-cyber-purple mb-2">Bulk Mode</h4>
                <p className="text-sm text-cyber-green/60">
                  Upload a .zip file containing student submissions. Each file is processed independently.
                  Student identifiers are extracted from filenames (e.g., <code className="text-cyber-purple/80">student123_app.js</code>).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
