"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { fetchDashboard } from "@/lib/api";

export default function DashboardPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const batch = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("batch") || "SMIT-Batch-42"
    : "SMIT-Batch-42";

  const { data } = useQuery({
    queryKey: ["dashboard", batch],
    queryFn: () => fetchDashboard(batch),
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
        gridRef.current?.children ?? [],
        { y: 40, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: 0.07, ease: "back.out(3)" },
        "-=0.2"
      );
      tl.fromTo(
        chartRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
        "-=0.15"
      );
    });
    return () => ctx.revert();
  }, [data]);

  return (
    <main className="min-h-screen bg-cyber-black pt-20 pb-12 px-[var(--space-page-x)]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div ref={headerRef} className="cyber-panel p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block w-2 h-2 bg-cyber-cyan animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-cyan/50 uppercase">
              Node // Command
            </span>
          </div>
          <h1 className="font-heading font-bold uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Class Dashboard
          </h1>
        </div>

        {data && (
          <>
            <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Students", value: data.total_students, color: "text-cyber-green" },
                { label: "Submissions", value: data.total_submissions, color: "text-cyber-cyan" },
                { label: "Avg Score", value: data.average_score, color: "text-cyber-purple" },
                { label: "Batch", value: data.batch, color: "text-cyber-green/60" },
              ].map((stat) => (
                <div key={stat.label} className="cyber-panel p-4 lg:p-6 text-center animate-on-scroll">
                  <div className={`font-heading font-bold tabular-nums ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="font-syncopate text-[10px] text-cyber-green/50 mt-1 tracking-[0.3em] uppercase">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div ref={chartRef} className="cyber-panel p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-purple uppercase">
                  &gt;&gt; Grade Distribution
                </span>
                <span className="flex-1 border-t border-cyber-purple/20" />
              </div>
              <div className="space-y-4">
                {Object.entries(data.grade_distribution || {}).map(([grade, count]) => (
                  <div key={grade} className="flex items-center gap-4">
                    <span className="font-orbitron text-lg font-bold text-cyber-green/80 w-8 text-center">
                      {grade}
                    </span>
                    <div className="flex-1 bg-cyber-black border border-cyber-grey/30 h-8 relative overflow-hidden">
                      <div
                        className="bg-cyber-green h-full transition-all duration-700 ease-out"
                        style={{
                          width: `${((count / data.total_submissions) * 100) || 0}%`,
                        }}
                      />
                    </div>
                    <span className="font-orbitron text-sm tabular-nums text-cyber-green/50 w-8 text-right">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
