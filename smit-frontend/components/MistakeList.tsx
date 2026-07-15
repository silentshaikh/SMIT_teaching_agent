"use client";

import type { MistakeItem, MistakeType } from "@/lib/types";

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
      {mistakes.map((mistake, i) => {
        const cfg = typeConfig[mistake.type];
        const borderColor = cfg?.border || "#1a1a2e";
        const badgeBg = cfg?.bg || "rgba(26,26,46,0.15)";
        return (
          <div
            key={i}
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
          </div>
        );
      })}
    </div>
  );
}
