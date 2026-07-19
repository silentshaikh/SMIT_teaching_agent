"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useQuery } from "@tanstack/react-query";
import { getStudentProgress } from "@/lib/api";

export default function ProgressPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const mistakeRef = useRef<HTMLDivElement>(null);

  const studentId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("student_id") || "student-1"
    : "student-1";

  const { data, isLoading } = useQuery({
    queryKey: ["progress", studentId],
    queryFn: () => getStudentProgress(studentId),
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.inOut" } });
      tl.fromTo(
        headerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "back.out(3)" }
      );
      tl.fromTo(
        chartRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
        "-=0.2"
      );
      if (mistakeRef.current) {
        tl.fromTo(
          mistakeRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
          "-=0.15"
        );
      }
    });
    return () => ctx.revert();
  }, [data]);

  const maxScore = Math.max(...(data?.time_series.map((p) => p.score ?? 0) || [100]), 1);
  const maxMistakeCount = Math.max(...(data?.mistake_type_frequency.map((m) => m.count) || [1]), 1);

  return (
    <main className="min-h-screen bg-cyber-black pt-20 pb-12 px-[var(--space-page-x)]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div ref={headerRef} className="cyber-panel p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block w-2 h-2 bg-cyber-cyan animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-cyan/50 uppercase">
              Node // Growth
            </span>
          </div>
          <h1 className="font-heading text-3xl lg:text-4xl font-black uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            My Progress
          </h1>
        </div>

        {isLoading && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-michroma text-xs tracking-widest text-cyber-green/50 animate-pulse-neon uppercase">
              Loading Growth Data...
            </span>
          </div>
        )}

        {data && data.time_series.length === 0 && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-syncopate text-xs tracking-widest text-cyber-green/50 uppercase">
              // NO SUBMISSIONS YET — SUBMIT YOUR FIRST ASSIGNMENT
            </span>
          </div>
        )}

        {data && data.time_series.length > 0 && (
          <>
            {/* Score over time */}
            <div ref={chartRef} className="cyber-panel p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-purple uppercase">
                  &gt;&gt; Score Over Time
                </span>
                <span className="flex-1 border-t border-cyber-purple/20" />
              </div>
              <div className="flex items-end gap-2 h-48">
                {data.time_series.map((point, i) => (
                  <div key={point.submission_id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="font-orbitron text-[10px] text-cyber-green/60 tabular-nums">
                      {point.score}
                    </span>
                    <div
                      className="w-full bg-cyber-green transition-all duration-500"
                      style={{
                        height: `${((point.score ?? 0) / maxScore) * 100}%`,
                        minHeight: 4,
                      }}
                    />
                    <span className="font-space-mono text-[8px] text-cyber-green/30">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mistake type frequency */}
            {data.mistake_type_frequency.length > 0 && (
              <div ref={mistakeRef} className="cyber-panel p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-cyan uppercase">
                    &gt;&gt; Mistake Frequency
                  </span>
                  <span className="flex-1 border-t border-cyber-cyan/20" />
                </div>
                <div className="space-y-4">
                  {data.mistake_type_frequency.map((mf) => (
                    <div key={mf.type} className="flex items-center gap-4">
                      <span className="font-orbitron text-sm font-bold text-cyber-green/80 w-24 text-right uppercase">
                        {mf.type}
                      </span>
                      <div className="flex-1 bg-cyber-black border border-cyber-grey/30 h-8 relative overflow-hidden">
                        <div
                          className="bg-cyber-cyan h-full transition-all duration-700 ease-out"
                          style={{
                            width: `${(mf.count / maxMistakeCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="font-orbitron text-sm tabular-nums text-cyber-green/50 w-8 text-right">
                        {mf.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
