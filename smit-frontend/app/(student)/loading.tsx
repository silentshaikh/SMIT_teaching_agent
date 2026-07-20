"use client";

import { Suspense } from "react";
import { ThreeBackground } from "@/components/ThreeBackground";

function StudentLoadingContent() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060b18]">
      <ThreeBackground />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 animate-pulse">
            LOADING PORTAL
          </h2>
          <div className="flex items-center gap-2 text-xs text-cyan-400/60 tracking-[0.3em] font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            CONNECTING TO SYNAPSE
          </div>
        </div>

        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-6 h-0.5 rounded-full bg-gradient-to-r from-cyan-400/40 to-purple-500/40"
              style={{
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudentLoading() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#060b18]">
          <div className="text-cyan-400/60 text-xs tracking-widest font-mono animate-pulse">
            INITIALIZING...
          </div>
        </div>
      }
    >
      <StudentLoadingContent />
    </Suspense>
  );
}
