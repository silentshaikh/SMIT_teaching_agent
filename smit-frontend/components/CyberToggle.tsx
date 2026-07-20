"use client";

import { useRef, useEffect } from "react";

export interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: "green" | "cyan" | "purple" | "crimson";
}

interface CyberToggleProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

const COLOR_MAP = {
  green: {
    active: "border-cyber-green bg-cyber-green/15 text-cyber-green shadow-[0_0_12px_rgba(0,255,102,0.15)]",
    inactive: "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60",
    indicator: "bg-cyber-green",
  },
  cyan: {
    active: "border-cyber-cyan bg-cyber-cyan/15 text-cyber-cyan shadow-[0_0_12px_rgba(0,240,255,0.15)]",
    inactive: "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60",
    indicator: "bg-cyber-cyan",
  },
  purple: {
    active: "border-cyber-purple bg-cyber-purple/15 text-cyber-purple shadow-[0_0_12px_rgba(168,85,247,0.15)]",
    inactive: "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60",
    indicator: "bg-cyber-purple",
  },
  crimson: {
    active: "border-cyber-crimson bg-cyber-crimson/15 text-cyber-crimson shadow-[0_0_12px_rgba(255,0,60,0.15)]",
    inactive: "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60",
    indicator: "bg-cyber-crimson",
  },
};

const SIZE_MAP = {
  sm: "text-[9px] px-3 py-1.5 gap-1.5",
  md: "text-[10px] px-4 py-2 gap-2",
  lg: "text-xs px-5 py-2.5 gap-2.5",
};

export function CyberToggle({
  options,
  value,
  onChange,
  size = "md",
  fullWidth = false,
  className = "",
}: CyberToggleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !indicatorRef.current) return;
    const buttons = containerRef.current.querySelectorAll("button");
    const activeIndex = options.findIndex((o) => o.value === value);
    if (activeIndex === -1) return;

    const btn = buttons[activeIndex];
    if (!btn) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    indicatorRef.current.style.width = `${btnRect.width}px`;
    indicatorRef.current.style.left = `${btnRect.left - containerRect.left}px`;
  }, [value, options]);

  const activeColor = options.find((o) => o.value === value)?.color || "green";
  const colors = COLOR_MAP[activeColor];

  return (
    <div
      ref={containerRef}
      className={`relative flex border border-white/10 ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {/* Sliding indicator */}
      <div
        ref={indicatorRef}
        className={`absolute top-0 bottom-0 ${colors.indicator} opacity-20 transition-all duration-300 ease-out pointer-events-none`}
        style={{ left: 0, width: 0 }}
      />

      {options.map((opt) => {
        const isActive = opt.value === value;
        const optColor = COLOR_MAP[opt.color || "green"];

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`
              relative z-10 flex items-center justify-center
              font-syncopate tracking-widest uppercase
              border-r border-white/5 last:border-r-0
              transition-all duration-200
              ${SIZE_MAP[size]}
              ${fullWidth ? "flex-1" : ""}
              ${isActive ? optColor.active : optColor.inactive}
            `}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
