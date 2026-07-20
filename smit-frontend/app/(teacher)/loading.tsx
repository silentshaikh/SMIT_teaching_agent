"use client";

import { Suspense } from "react";
import { ThreeBackground } from "@/components/ThreeBackground";

function TeacherLoadingContent() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060b18]">
      <ThreeBackground />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-cyan-400/20 border-b-cyan-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 animate-pulse">
            TEACHER DASHBOARD
          </h2>
          <div className="flex items-center gap-2 text-xs text-purple-400/60 tracking-[0.3em] font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            SYNCING AGENTS
          </div>
        </div>

        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-6 h-0.5 rounded-full bg-gradient-to-r from-purple-500/40 to-cyan-400/40"
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

export default function TeacherLoading() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#060b18]">
          <div className="text-purple-400/60 text-xs tracking-widest font-mono animate-pulse">
            INITIALIZING...
          </div>
        </div>
      }
    >
      <TeacherLoadingContent />
    </Suspense>
  );
}
