"use client";

import { Suspense } from "react";
import { ThreeBackground } from "@/components/ThreeBackground";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function ErrorContent({ error, reset }: ErrorProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060b18]">
      <ThreeBackground />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg mx-auto px-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-500/20 to-purple-500/20 border border-red-500/30 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-500/10 to-purple-500/10 blur-lg -z-10" />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-cyan-400 to-purple-400">
            SYSTEM ERROR
          </h2>
          <p className="text-sm text-cyan-400/60 tracking-[0.2em] font-mono">
            NEURAL PATHWAY DISRUPTED
          </p>
        </div>

        <div className="w-full rounded-xl bg-black/40 border border-red-500/20 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400/80 font-mono tracking-wider">ERROR LOG</span>
          </div>
          <p className="text-sm text-cyan-400/70 font-mono break-all leading-relaxed">
            {error.message || "An unexpected error occurred in the neural network."}
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-purple-400/50 font-mono">
              digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={reset}
            className="group relative px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 text-cyan-400 text-sm font-bold tracking-widest transition-all duration-300 hover:from-cyan-500/30 hover:to-purple-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(0,255,200,0.15)] cursor-pointer"
          >
            <span className="relative z-10">RETRY</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400/5 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-8 py-3 rounded-xl border border-purple-500/20 text-purple-400/70 text-sm font-bold tracking-widest transition-all duration-300 hover:border-purple-500/40 hover:text-purple-400 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] cursor-pointer"
          >
            HOME
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#060b18]">
          <div className="text-red-400/60 text-sm tracking-widest font-mono animate-pulse">
            ERROR RECOVERY INITIALIZING...
          </div>
        </div>
      }
    >
      <ErrorContent error={error} reset={reset} />
    </Suspense>
  );
}
