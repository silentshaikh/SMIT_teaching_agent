"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import gsap from "gsap";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ScoreReveal } from "@/components/ScoreReveal";
import { MistakeList } from "@/components/MistakeList";
import { CodeViewer } from "@/components/CodeViewer";
import { useReportPoller } from "@/lib/hooks/useReportPoller";
import { useSubmissionStore } from "@/store/submission";
import { downloadReport, submitFile, askQuestion, getQAHistory } from "@/lib/api";
import type { AssignmentReport, QAPair } from "@/lib/types";

function QAPanel({ submissionId }: { submissionId: string }) {
  const [question, setQuestion] = useState("");
  const { data: qaHistory } = useQuery({
    queryKey: ["qa", submissionId],
    queryFn: () => getQAHistory(submissionId),
  });

  const mutation = useMutation({
    mutationFn: (q: string) => askQuestion(submissionId, q),
    onSuccess: () => setQuestion(""),
  });

  return (
    <section className="cyber-panel p-6 gsap-section">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-cyan uppercase">
          &gt;&gt; Ask a Question
        </span>
        <span className="flex-1 border-t border-cyber-cyan/20" />
      </div>

      {qaHistory && qaHistory.length > 0 && (
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {qaHistory.map((pair: QAPair, i: number) => (
            <div key={i} className="border border-cyber-green/10 p-3 space-y-2">
              <p className="font-body text-sm text-cyber-cyan/80">
                <span className="font-michroma text-[10px] text-cyber-cyan/50 mr-2">Q:</span>
                {pair.question}
              </p>
              <p className="font-body text-sm text-cyber-green/70">
                <span className="font-michroma text-[10px] text-cyber-green/50 mr-2">A:</span>
                {pair.answer_en}
              </p>
              <p className="font-body text-xs text-cyber-purple/60" dir="rtl">
                {pair.answer_urdu}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && question.trim()) {
              mutation.mutate(question.trim());
            }
          }}
          className="cyber-input flex-1"
          placeholder="> Ask about your mistakes..."
          disabled={mutation.isPending}
        />
        <button
          onClick={() => {
            if (question.trim()) mutation.mutate(question.trim());
          }}
          disabled={!question.trim() || mutation.isPending}
          className="cyber-btn px-6 disabled:opacity-30 disabled:cursor-none"
          style={{ height: 44 }}
        >
          {mutation.isPending ? ">> ..." : ">> Ask"}
        </button>
      </div>
      {mutation.isError && (
        <p className="font-space-mono text-[10px] text-cyber-crimson/60 mt-2">
          Failed to get answer. Try again.
        </p>
      )}
    </section>
  );
}

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

function ErrorBlock({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <main className="min-h-screen bg-cyber-black flex items-center justify-center p-4">
      <div className="cyber-panel p-8 max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="inline-block w-3 h-3 bg-cyber-crimson animate-pulse-neon" />
          <span className="font-syncopate text-lg text-cyber-crimson tracking-[0.15em] uppercase">
            System Failure
          </span>
        </div>
        <p className="font-space-mono text-[10px] text-cyber-crimson/60 tracking-widest uppercase mb-6">
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            data-cursor="pointer"
            className="cyber-btn bg-cyber-crimson/20 border-cyber-crimson text-cyber-crimson hover:bg-cyber-crimson/30 disabled:opacity-30 disabled:cursor-none w-full"
            style={{ height: 48 }}
          >
            {isRetrying ? ">> RESUBMITTING..." : ">> RESUBMIT"}
          </button>
        )}
      </div>
    </main>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const submissionId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const mainRef = useRef<HTMLDivElement>(null);

  const storeStatus = useSubmissionStore((s) => s.status);
  const originalCode = useSubmissionStore((s) => s.originalCode);
  const language = useSubmissionStore((s) => s.language);
  const studentId = useSubmissionStore((s) => s.studentId);
  const assignmentName = useSubmissionStore((s) => s.assignmentName);
  const rubricId = useSubmissionStore((s) => s.rubricId);
  const setSubmissionId = useSubmissionStore((s) => s.setSubmissionId);
  const setStatus = useSubmissionStore((s) => s.setStatus);

  const { data, isLoading, isFailed, error } = useReportPoller(
    submissionId,
    storeStatus
  );

  const downloadMutation = useMutation({
    mutationFn: () => downloadReport(submissionId),
    onSuccess: (report) => {
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${submissionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: () => {
      const ext = language === "python" ? ".py" : language === "html" ? ".html" : ".js";
      const blob = new Blob([originalCode], { type: "text/plain" });
      const file = new File([blob], `resubmit${ext}`, { type: "text/plain" });
      return submitFile(file, studentId, assignmentName, rubricId);
    },
    onSuccess: (response) => {
      setSubmissionId(response.submission_id);
      setStatus("processing");
      router.replace(`/report/${response.submission_id}`);
    },
  });

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
  if (isFailed) {
    const handleRetry = () => {
      if (originalCode && studentId && assignmentName) {
        resubmitMutation.mutate();
      } else {
        router.push("/submit");
      }
    };
    return (
      <ErrorBlock
        message="The analysis pipeline failed. You can resubmit your code or return to the upload page."
        onRetry={handleRetry}
        isRetrying={resubmitMutation.isPending}
      />
    );
  }
  if (!data) return <ReportSkeleton />;

  const report: AssignmentReport = data;

  return (
    <main ref={mainRef} className="min-h-screen bg-cyber-black pt-20 pb-12 px-[var(--space-page-x)]">
      <div className="max-w-7xl mx-auto space-y-6">
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
              <h1 className="font-heading font-bold uppercase tracking-[0.06em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
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

        {/* Override notice */}
        {report.override_score != null && (
          <div className="cyber-panel p-4 border-cyber-purple/40 gsap-section">
            <div className="flex items-center gap-3">
              <span className="inline-block w-2 h-2 bg-cyber-purple animate-pulse-neon" />
              <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-purple uppercase">
                Score Adjusted by Teacher
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-4">
              <div>
                <span className="font-space-mono text-[10px] text-cyber-green/40">Original</span>
                <span className="ml-2 font-orbitron text-lg text-cyber-green/50 line-through">{report.score}</span>
              </div>
              <div>
                <span className="font-space-mono text-[10px] text-cyber-purple/60">Adjusted</span>
                <span className="ml-2 font-orbitron text-lg font-bold text-cyber-purple">{report.override_score}</span>
              </div>
            </div>
            {report.override_note && (
              <p className="mt-2 font-body text-sm text-cyber-green/60">
                &quot;{report.override_note}&quot;
              </p>
            )}
          </div>
        )}

        {/* Desktop: 3-col layout | Tablet: 2-col | Mobile: stacked */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Score panel (desktop: left 30%) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Explanations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 gsap-section">
              <div className="cyber-panel p-6">
                <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-green uppercase mb-3 block">
                  &gt;&gt; English
                </span>
                <p className="font-body text-cyber-green/80 leading-relaxed">
                  {report.explanation_en}
                </p>
              </div>
              <div className="cyber-panel p-6" dir="rtl">
                <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-purple uppercase mb-3 block">
                  &gt;&gt; Roman Urdu
                </span>
                <p className="font-body text-cyber-purple/80 leading-relaxed font-medium">
                  {report.explanation_urdu}
                </p>
              </div>
            </div>

            {/* Next Topics */}
            <section className="cyber-panel p-6 gsap-section">
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
          </div>

          {/* Mistakes list (desktop: center 40%) */}
          <section className="lg:col-span-4 cyber-panel p-6 gsap-section">
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

          {/* Code Diff (desktop: right 30%) */}
          <div className="lg:col-span-4 space-y-3">
            <section className="cyber-panel p-6 gsap-section">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-green uppercase">
                  &gt;&gt; Corrected Code
                </span>
                <span className="flex-1 border-t border-cyber-green/20" />
              </div>
              <CodeViewer
                original={originalCode}
                modified={report.corrected_code}
                language={language as "javascript" | "python" | "html"}
              />
            </section>

            {/* Suggestions */}
            <section className="cyber-panel p-6 gsap-section">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-purple uppercase">
                  &gt;&gt; Recommendations
                </span>
                <span className="flex-1 border-t border-cyber-purple/20" />
              </div>
              <ul className="space-y-2">
                {report.suggestions.map((s: string, i: number) => (
                  <li key={i} className="font-body text-cyber-green/70 flex items-start gap-3 animate-on-scroll">
                    <span className="text-cyber-purple mt-0.5 font-michroma font-bold">&gt;</span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Phase 1.4: Practice Suggestions */}
        {report.suggestions && report.suggestions.length > 0 && (
          <section className="cyber-panel p-6 gsap-section">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-green uppercase">
                &gt;&gt; Practice Next
              </span>
              <span className="flex-1 border-t border-cyber-green/20" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {report.suggestions.map((s: string, i: number) => (
                <div
                  key={i}
                  className="border border-cyber-green/20 bg-cyber-black p-4 flex items-start gap-3"
                >
                  <span className="text-cyber-green font-michroma font-bold mt-0.5">&gt;</span>
                  <span className="font-body text-sm text-cyber-green/70">{s}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Phase 1.2: Q&A Panel */}
        <QAPanel submissionId={submissionId} />

        {/* Footer */}
        <div className="cyber-panel p-3 gsap-section">
          <div className="flex items-center justify-between font-syncopate text-[9px] tracking-[0.3em] text-cyber-green/30 uppercase">
            <span>Analysis Complete</span>
            <div className="flex items-center gap-4">
              <span className="tabular-nums">{report.processing_time_ms}ms</span>
              <button
                onClick={() => downloadMutation.mutate()}
                disabled={downloadMutation.isPending}
                data-cursor="pointer"
                className="cyber-btn text-[9px] px-3 py-1 h-auto disabled:opacity-30 disabled:cursor-none"
              >
                {downloadMutation.isPending ? ">> SAVING..." : ">> DOWNLOAD REPORT"}
              </button>
            </div>
          </div>
          {downloadMutation.isError && (
            <div className="mt-2 border border-cyber-crimson bg-cyber-crimson/10 p-2 flex items-center gap-2">
              <span className="text-cyber-crimson font-michroma text-[9px]">&gt;&gt;</span>
              <span className="font-syncopate text-[9px] tracking-widest text-cyber-crimson uppercase">
                DOWNLOAD FAILED: {downloadMutation.error?.message}
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
