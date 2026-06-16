"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { ScoreReveal } from "@/components/ScoreReveal";
import { MistakeList } from "@/components/MistakeList";
import { CodeViewer } from "@/components/CodeViewer";
import { useReportPoller } from "@/lib/hooks/useReportPoller";
import { useSubmissionStore } from "@/store/submission";
import type { AssignmentReport } from "@/lib/types";

function ReportSkeleton() {
  return (
    <main className="min-h-screen bg-cyber-black flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="w-8 h-8 border-2 border-cyber-green/50 border-t-cyber-green animate-spin" />
        <span className="font-michroma text-xs tracking-[0.3em] text-cyber-green animate-pulse-neon uppercase">
          Analyzing Neural Pathways...
        </span>
      </div>
    </main>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-cyber-black flex items-center justify-center p-4">
      <div className="cyber-panel p-8 max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="inline-block w-3 h-3 bg-cyber-crimson animate-pulse-neon" />
          <span className="font-syncopate text-lg text-cyber-crimson tracking-[0.15em] uppercase">
            System Failure
          </span>
        </div>
        <p className="font-space-mono text-[10px] text-cyber-crimson/60 tracking-widest uppercase">
          {message}
        </p>
      </div>
    </main>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const submissionId = Array.isArray(id) ? id[0] : id;
  const storeStatus = useSubmissionStore((s) => s.status);
  const originalCode = useSubmissionStore((s) => s.originalCode);
  const mainRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useReportPoller(
    submissionId,
    storeStatus
  );

  useEffect(() => {
    if (!data || !mainRef.current) return;
    const panels = mainRef.current.querySelectorAll<HTMLElement>(".gsap-section");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panels,
        { y: 40, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: 0.06, ease: "power3.out" }
      );
    }, mainRef.current);
    return () => ctx.revert();
  }, [data]);

  if (isLoading) return <ReportSkeleton />;
  if (error) return <ErrorBlock message="Failed to load report." />;
  if (!data) return <ReportSkeleton />;

  const report: AssignmentReport = data;

  return (
    <main ref={mainRef} className="min-h-screen bg-cyber-black p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Header */}
        <div className="cyber-panel p-6 lg:p-8 gsap-section">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-3 mb-1">
                <span className="inline-block w-2 h-2 bg-cyber-green animate-pulse-neon" />
                <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-green/50 uppercase">
                  Analysis Complete
                </span>
              </div>
              <h1 className="font-orbitron text-2xl lg:text-3xl font-black uppercase tracking-[0.06em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
                {report.assignment_name}
              </h1>
              <p className="font-syncopate text-[10px] text-cyber-green/40 mt-1 tracking-[0.3em] uppercase">
                {"// "}{report.student_id}
              </p>
            </div>
            <ScoreReveal
              score={report.score}
              grade={report.grade}
              breakdown={report.breakdown}
            />
          </div>
        </div>

        {/* Mistakes */}
        <section className="cyber-panel p-6 lg:p-8 gsap-section">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-crimson uppercase">
              &gt;&gt; Anomalies
            </span>
            <span className="flex-1 border-t border-cyber-crimson/20" />
            <span className="font-space-mono text-[10px] text-cyber-crimson/50 tabular-nums">
              {report.mistakes.length} DETECTED
            </span>
          </div>
          <MistakeList mistakes={report.mistakes} />
        </section>

        {/* Code Diff */}
        <section className="cyber-panel p-6 lg:p-8 gsap-section">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-green uppercase">
              &gt;&gt; Corrected Code
            </span>
            <span className="flex-1 border-t border-cyber-green/20" />
          </div>
          <CodeViewer
            original={originalCode}
            modified={report.corrected_code}
            language="javascript"
          />
        </section>

        {/* Explanations */}
        <div className="grid md:grid-cols-2 gap-3 gsap-section">
          <div className="cyber-panel p-6 lg:p-8">
            <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-green uppercase mb-3 block">
              &gt;&gt; English
            </span>
            <p className="font-share-tech text-sm text-cyber-green/80 leading-relaxed">
              {report.explanation_en}
            </p>
          </div>
          <div className="cyber-panel p-6 lg:p-8" dir="rtl">
            <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-purple uppercase mb-3 block">
              &gt;&gt; Roman Urdu
            </span>
            <p className="font-share-tech text-sm text-cyber-purple/80 leading-relaxed">
              {report.explanation_urdu}
            </p>
          </div>
        </div>

        {/* Suggestions */}
        <section className="cyber-panel p-6 lg:p-8 gsap-section">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-purple uppercase">
              &gt;&gt; Recommendations
            </span>
            <span className="flex-1 border-t border-cyber-purple/20" />
          </div>
          <ul className="space-y-2">
            {report.suggestions.map((s: string, i: number) => (
              <li key={i} className="font-space-mono text-sm text-cyber-green/70 flex items-start gap-3">
                <span className="text-cyber-purple mt-0.5 font-michroma font-bold">&gt;</span>
                {s}
              </li>
            ))}
          </ul>
        </section>

        {/* Next Topics */}
        <section className="cyber-panel p-6 lg:p-8 gsap-section">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-cyan uppercase">
              &gt;&gt; Next Topics
            </span>
            <span className="flex-1 border-t border-cyber-cyan/20" />
          </div>
          <div className="flex flex-wrap gap-3">
            {report.next_topics.map((t: string, i: number) => (
              <span
                key={i}
                className="border border-cyber-green/30 bg-cyber-black px-4 py-1.5 font-michroma text-[10px] tracking-widest text-cyber-green/80 uppercase"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="cyber-panel p-3 gsap-section">
          <div className="flex items-center justify-between font-syncopate text-[9px] tracking-[0.3em] text-cyber-green/30 uppercase">
            <span>Analysis Complete</span>
            <span className="tabular-nums">{report.processing_time_ms}ms</span>
          </div>
        </div>
      </div>
    </main>
  );
}
