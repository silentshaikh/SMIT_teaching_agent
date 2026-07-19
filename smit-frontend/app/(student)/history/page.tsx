"use client";

import { useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getHistory, getBadges } from "@/lib/api";
import type { HistoryItem, Badge } from "@/lib/types";

interface GroupedHistory {
  courseName: string;
  items: HistoryItem[];
}

export default function HistoryPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const studentId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("student_id") || "student-1"
    : "student-1";

  const { data, isLoading } = useQuery({
    queryKey: ["history", studentId],
    queryFn: () => getHistory(studentId),
  });

  const { data: badges } = useQuery({
    queryKey: ["badges", studentId],
    queryFn: () => getBadges(studentId),
  });

  const grouped = useMemo<GroupedHistory[]>(() => {
    if (!data) return [];
    const map = new Map<string, HistoryItem[]>();
    for (const item of data) {
      const key = item.course_name || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([courseName, items]) => ({
      courseName,
      items,
    }));
  }, [data]);

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
        { y: 0, opacity: 1, scale: 1, duration: 0.3, stagger: 0.06, ease: "power2.out" },
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
              Node // History
            </span>
          </div>
          <h1 className="font-heading text-3xl lg:text-4xl font-black uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Submission History
          </h1>
        </div>

        {badges && badges.filter((b: Badge) => b.earned).length > 0 && (
          <div className="cyber-panel p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-purple/50 uppercase">
                Badges
              </span>
              <span className="flex-1 border-t border-cyber-purple/10" />
            </div>
            <div className="flex flex-wrap gap-2">
              {badges.filter((b: Badge) => b.earned).map((b: Badge) => (
                <span
                  key={b.id}
                  title={b.description}
                  className="border border-cyber-green/30 bg-cyber-green/5 px-3 py-1 font-michroma text-[10px] tracking-widest text-cyber-green/80 uppercase cursor-help"
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-michroma text-xs tracking-widest text-cyber-green/50 animate-pulse-neon uppercase">
              Loading Transmission Logs...
            </span>
          </div>
        )}

        {data && data.length === 0 && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-syncopate text-xs tracking-widest text-cyber-green/50 uppercase">
              // NO SUBMISSIONS ON RECORD
            </span>
          </div>
        )}

        <div ref={listRef} className="space-y-6">
          {grouped.map((group) => (
            <div key={group.courseName} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-cyan/60 uppercase">
                  {group.courseName}
                </span>
                <span className="flex-1 border-t border-cyber-cyan/10" />
                <span className="font-space-mono text-[10px] text-cyber-green/30">
                  {group.items.length} submission{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {group.items.map((item) => (
                <Link
                  key={item.submission_id}
                  href={`/report/${item.submission_id}`}
                  className="block cyber-panel p-5 hover:border-cyber-green/60 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-orbitron text-sm tracking-wider text-cyber-green group-hover:text-cyber-green/90 uppercase">
                        {item.assignment_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-orbitron text-2xl font-black text-cyber-green tabular-nums">
                        {item.score}
                      </div>
                      <div className="font-orbitron text-[10px] text-cyber-green/50 tracking-wider uppercase">
                        {item.grade}
                      </div>
                    </div>
                  </div>
                  <div className="font-space-mono text-[10px] text-cyber-green/30 mt-2 tracking-widest">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
