"use client";

import type { MistakeItem, MistakeType } from "@/lib/types";

interface MistakeListProps {
  mistakes: MistakeItem[];
}

const typeConfig: Record<MistakeType, { border: string; label: string }> = {
  syntax:    { border: "border-cyber-crimson", label: "SYNTAX" },
  logic:     { border: "border-orange-500",    label: "LOGIC" },
  naming:    { border: "border-yellow-500",    label: "NAMING" },
  structure: { border: "border-cyber-purple",  label: "STRUCTURE" },
  style:     { border: "border-cyber-cyan",    label: "STYLE" },
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
        return (
          <div
            key={i}
            className={`border-l-4 ${cfg?.border || "border-cyber-grey"} cyber-panel p-4`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-michroma text-[10px] tracking-widest text-cyber-green/80 uppercase">
                  [{cfg?.label || mistake.type}]
                </span>
                {mistake.line !== null && (
                  <span className="font-space-mono text-[10px] text-cyber-green/40 tracking-wider">
                    Ln {mistake.line}
                  </span>
                )}
              </div>
            </div>

            <p className="font-space-mono text-sm text-cyber-green/80 mb-1">
              {mistake.description}
            </p>
            <p className="font-space-mono text-sm text-cyber-green/50" dir="rtl">
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
