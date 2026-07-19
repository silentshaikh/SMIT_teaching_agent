"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { fetchRubrics, compareRubricVersions } from "@/lib/api";
import type { Rubric, RubricVersionCompare } from "@/lib/types";

export default function RubricsPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["rubrics"],
    queryFn: fetchRubrics,
  });

  const { data: comparison } = useQuery({
    queryKey: ["rubric-compare", selectedRubricId],
    queryFn: () => compareRubricVersions(selectedRubricId!),
    enabled: !!selectedRubricId,
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
        listRef.current?.children ?? [],
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.3, stagger: 0.08, ease: "power2.out" },
        "-=0.2"
      );
    });
    return () => ctx.revert();
  }, [data]);

  return (
    <main className="min-h-screen bg-cyber-black pt-20 pb-12 px-[var(--space-page-x)]">
      <div className="max-w-3xl mx-auto space-y-6">
        <div ref={headerRef} className="cyber-panel p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block w-2 h-2 bg-cyber-purple animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-purple/50 uppercase">
              Node // Rubrics
            </span>
          </div>
          <h1 className="font-heading text-3xl lg:text-4xl font-black uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Grading Rubrics
          </h1>
        </div>

        {data && data.length === 0 && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-syncopate text-xs tracking-widest text-cyber-green/50 uppercase">
              // NO RUBRICS DEFINED
            </span>
          </div>
        )}

        <div ref={listRef} className="space-y-3">
          {data?.map((rubric: Rubric) => (
            <div key={rubric.id} className="cyber-panel p-6 lg:p-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-orbitron text-lg tracking-wider text-cyber-green uppercase">
                  {rubric.assignment_name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="border border-cyber-purple/40 px-3 py-1 font-michroma text-[10px] tracking-widest text-cyber-purple uppercase">
                    {rubric.language}
                  </span>
                  <button
                    onClick={() => setSelectedRubricId(selectedRubricId === rubric.id ? null : rubric.id)}
                    className="cyber-btn text-[10px] px-3 py-1 h-auto"
                  >
                    {selectedRubricId === rubric.id ? "Hide Versions" : "Version History"}
                  </button>
                </div>
              </div>
              <div className="font-space-mono text-xs text-cyber-green/40 mb-4 tracking-wider">
                MAX: {rubric.max_score} pts // CREATED BY: {rubric.created_by}
              </div>
              <div className="space-y-2">
                {Object.entries(rubric.criteria).map(([criterion, points]) => (
                  <div key={criterion} className="flex items-center justify-between border-b border-cyber-green/10 pb-2">
                    <span className="font-syncopate text-xs text-cyber-green/70 uppercase tracking-[0.2em]">
                      {criterion}
                    </span>
                    <span className="font-orbitron text-sm font-bold text-cyber-green/90 tabular-nums">
                      {points}
                    </span>
                  </div>
                ))}
              </div>

              {/* Version comparison */}
              {selectedRubricId === rubric.id && comparison && (
                <div className="mt-4 border-t border-cyber-green/10 pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-cyan uppercase">
                      &gt;&gt; Version History
                    </span>
                    <span className="flex-1 border-t border-cyber-cyan/10" />
                  </div>
                  {comparison.length === 0 ? (
                    <p className="font-space-mono text-[10px] text-cyber-green/40">
                      // No version data available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {comparison.map((v: RubricVersionCompare) => (
                        <div
                          key={v.version_id}
                          className="flex items-center justify-between border border-cyber-green/10 p-3"
                        >
                          <div>
                            <span className="font-orbitron text-sm text-cyber-green">
                              v{v.version_number}
                            </span>
                            <span className="font-space-mono text-[10px] text-cyber-green/40 ml-3">
                              by {v.created_by}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-orbitron text-sm font-bold text-cyber-purple tabular-nums">
                                {v.average_score}
                              </div>
                              <div className="font-space-mono text-[8px] text-cyber-green/30">avg</div>
                            </div>
                            <div className="text-right">
                              <div className="font-orbitron text-sm text-cyber-green/60 tabular-nums">
                                {v.submission_count}
                              </div>
                              <div className="font-space-mono text-[8px] text-cyber-green/30">subs</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
