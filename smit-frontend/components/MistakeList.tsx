"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { reverifyMistake } from "@/lib/api";
import type { MistakeItem, MistakeType, ReverifyResponse } from "@/lib/types";

interface MistakeListProps {
  mistakes: MistakeItem[];
}

const typeConfig: Record<MistakeType, { border: string; bg: string; label: string }> = {
  syntax:    { border: "#FF6B6B", bg: "rgba(255,107,107,0.15)", label: "SYNTAX" },
  logic:     { border: "#FFB347", bg: "rgba(255,179,71,0.15)",  label: "LOGIC" },
  naming:    { border: "#48CAE4", bg: "rgba(72,202,228,0.15)",  label: "NAMING" },
  structure: { border: "#9B59B6", bg: "rgba(155,89,182,0.15)",  label: "STRUCTURE" },
  style:     { border: "#2ECC71", bg: "rgba(46,204,113,0.15)",  label: "STYLE" },
};

function MistakeItemCard({ mistake }: { mistake: MistakeItem }) {
  const [expanded, setExpanded] = useState(false);
  const [snippet, setSnippet] = useState(mistake.corrected_snippet || "");
  const [result, setResult] = useState<ReverifyResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () => reverifyMistake(mistake.id, snippet),
    onSuccess: (data) => setResult(data),
  });

  const cfg = typeConfig[mistake.type];
  const borderColor = cfg?.border || "#1a1a2e";
  const badgeBg = cfg?.bg || "rgba(26,26,46,0.15)";

  return (
    <div
      className="cyber-panel p-3 sm:p-3.5 lg:p-4"
      style={{
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: "clamp(10px, 1.5vw, 14px)",
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <span
            className="font-syncopate uppercase tracking-wider font-medium px-2 py-0.5 rounded-full"
            style={{
              fontSize: "var(--text-xs)",
              backgroundColor: badgeBg,
              color: borderColor,
            }}
          >
            {cfg?.label || mistake.type}
          </span>
          {mistake.line !== null && (
            <span className="font-space-mono text-cyber-green/40 tracking-wider" style={{ fontSize: "var(--text-xs)" }}>
              Ln {mistake.line}
            </span>
          )}
        </div>
      </div>

      <p className="font-body mb-1" style={{ fontSize: "var(--text-base)", lineHeight: 1.7 }}>
        {mistake.description}
      </p>
      <p
        className="font-body font-medium"
        dir="rtl"
        style={{ fontSize: "var(--text-base)", lineHeight: 1.7, marginTop: 4 }}
      >
        {mistake.description_urdu}
      </p>

      {mistake.corrected_snippet && (
        <pre className="mt-3 border border-cyber-green/20 bg-cyber-black p-3 text-xs font-jetbrains text-cyber-green/70 overflow-x-auto">
          {mistake.corrected_snippet}
        </pre>
      )}

      {/* Fix it yourself */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 font-syncopate text-[10px] tracking-[0.2em] text-cyber-cyan/60 hover:text-cyber-cyan transition-colors uppercase"
      >
        {expanded ? ">> Collapse" : ">> Fix It Yourself"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-cyber-green/10 pt-3">
          <textarea
            value={snippet}
            onChange={(e) => { setSnippet(e.target.value); setResult(null); }}
            className="cyber-input w-full h-24 font-jetbrains text-xs resize-none"
            placeholder="Paste your corrected code here..."
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => mutation.mutate()}
              disabled={!snippet || mutation.isPending}
              className="cyber-btn text-[10px] px-4 py-1.5 h-auto disabled:opacity-30 disabled:cursor-none"
            >
              {mutation.isPending ? ">> Checking..." : ">> Recheck"}
            </button>
            {result && (
              <span
                className={`font-michroma text-[10px] tracking-widest uppercase ${
                  result.passed ? "text-cyber-green" : "text-cyber-crimson"
                }`}
              >
                {result.passed ? ">> PASSED" : ">> FAILED"}
              </span>
            )}
          </div>
          {result && (
            <p className="font-space-mono text-[10px] text-cyber-green/50">
              {result.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function MistakeList({ mistakes }: MistakeListProps) {
  if (mistakes.length === 0) {
    return (
      <div className="border border-cyber-green bg-cyber-green/5 p-6 text-center">
        <span className="font-space-mono text-sm tracking-widest text-cyber-green">
          // NO ANOMALIES DETECTED — CODE INTEGRITY CONFIRMED
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mistakes.map((mistake) => (
        <MistakeItemCard key={mistake.id} mistake={mistake} />
      ))}
    </div>
  );
}
