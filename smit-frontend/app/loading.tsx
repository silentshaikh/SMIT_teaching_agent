"use client";

import { Suspense } from "react";
import { ThreeBackground } from "@/components/ThreeBackground";

function LoadingContent() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060b18]">
      <ThreeBackground />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          <div className="absolute inset-4 rounded-full border border-cyan-400/10 border-t-cyan-400/60 animate-spin" style={{ animationDuration: "2s" }} />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 animate-pulse">
            SYNAPSE
          </h2>
          <div className="flex items-center gap-2 text-sm text-cyan-400/60 tracking-[0.3em] font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            INITIALIZING AI CORE
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>

        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-8 h-1 rounded-full bg-gradient-to-r from-cyan-400/40 to-purple-500/40"
              style={{
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#060b18]">
          <div className="text-cyan-400/60 text-sm tracking-widest font-mono animate-pulse">
            LOADING...
          </div>
        </div>
      }
    >
      <LoadingContent />
    </Suspense>
  );
}
