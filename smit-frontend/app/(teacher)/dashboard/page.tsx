"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { fetchDashboard, getBatchAnalytics } from "@/lib/api";

export default function DashboardPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);

  const batch = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("batch") || "SYNAPSE-Batch-42"
    : "SYNAPSE-Batch-42";

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", batch],
    queryFn: () => fetchDashboard(batch),
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics", batch],
    queryFn: () => getBatchAnalytics(batch),
    enabled: !!data && data.total_students > 0,
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
      if (coursesRef.current) {
        tl.fromTo(
          coursesRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
          "-=0.15"
        );
      }
      if (insightsRef.current) {
        tl.fromTo(
          insightsRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
          "-=0.15"
        );
      }
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
          <div className="mt-3">
            <button
              onClick={() => {
                const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
                window.open(`${BASE}/api/v1/batches/${batch}/report.pdf`, "_blank");
              }}
              className="cyber-btn text-[10px] px-4 py-1.5 h-auto"
            >
              &gt;&gt; Export Weekly Report (PDF)
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-syncopate text-xs tracking-widest text-cyber-green/50 animate-pulse-neon uppercase">
              &gt;&gt; Compiling Batch Telemetry...
            </span>
          </div>
        )}

        {data && data.total_students === 0 && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-syncopate text-xs tracking-widest text-cyber-green/50 uppercase">
              // NO STUDENTS IN THIS BATCH YET
            </span>
          </div>
        )}

        {data && data.total_students > 0 && (
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

            {data.courses && data.courses.length > 0 && (
              <div ref={coursesRef} className="cyber-panel p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-cyan uppercase">
                    &gt;&gt; Per-Course Breakdown
                  </span>
                  <span className="flex-1 border-t border-cyber-cyan/20" />
                </div>
                <div className="space-y-4">
                  {data.courses.map((course) => (
                    <div
                      key={course.course_id}
                      className="border border-cyber-green/10 p-4 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-orbitron text-sm tracking-wider text-cyber-green uppercase">
                          {course.course_name}
                        </span>
                        <div className="font-space-mono text-[10px] text-cyber-green/40 mt-1">
                          {course.total_submissions} submission{course.total_submissions !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-orbitron text-xl font-bold text-cyber-purple tabular-nums">
                          {course.average_score}
                        </div>
                        <div className="font-syncopate text-[10px] text-cyber-green/40 tracking-wider uppercase">
                          avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics && analytics.mistake_stats.length > 0 && (
              <div ref={insightsRef} className="cyber-panel p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-crimson uppercase">
                    &gt;&gt; Class Insights — Mistake Breakdown
                  </span>
                  <span className="flex-1 border-t border-cyber-crimson/20" />
                </div>
                <div className="space-y-4">
                  {analytics.mistake_stats.map((ms) => (
                    <div key={ms.type} className="flex items-center gap-4">
                      <span className="font-orbitron text-sm font-bold text-cyber-green/80 w-24 text-right uppercase">
                        {ms.type}
                      </span>
                      <div className="flex-1 bg-cyber-black border border-cyber-grey/30 h-8 relative overflow-hidden">
                        <div
                          className="bg-cyber-crimson h-full transition-all duration-700 ease-out"
                          style={{ width: `${ms.percentage}%` }}
                        />
                      </div>
                      <span className="font-orbitron text-sm tabular-nums text-cyber-green/50 w-16 text-right">
                        {ms.percentage}%
                      </span>
                      <span className="font-space-mono text-[10px] text-cyber-green/30 w-12 text-right">
                        ({ms.count})
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
