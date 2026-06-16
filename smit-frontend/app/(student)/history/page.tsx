"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getHistory } from "@/lib/api";
import type { HistoryItem } from "@/lib/types";

export default function HistoryPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: () => getHistory("student-1"),
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
        { y: 0, opacity: 1, scale: 1, duration: 0.3, stagger: 0.06, ease: "power2.out" },
        "-=0.2"
      );
    });
    return () => ctx.revert();
  }, [data]);

  return (
    <main className="min-h-screen bg-cyber-black p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div ref={headerRef} className="cyber-panel p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block w-2 h-2 bg-cyber-purple animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-purple/50 uppercase">
              Node // History
            </span>
          </div>
          <h1 className="font-orbitron text-3xl lg:text-4xl font-black uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Submission History
          </h1>
        </div>

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

        <div ref={listRef} className="space-y-3">
          {data?.map((item: HistoryItem) => (
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
      </div>
    </main>
  );
}
