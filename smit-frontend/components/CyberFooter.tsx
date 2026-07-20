"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const metrics = [
  { label: "Agent Status", value: "Active", color: "text-cyber-green" },
  { label: "Core Temp", value: "42.7°C", color: "text-cyber-crimson/70" },
  { label: "Uptime", value: "00:23:17", color: "text-cyber-green/60" },
  { label: "Model", value: "v4.2.1 // REV-93", color: "text-cyber-green/50" },
  { label: "Throughput", value: "1.4 Gb/s", color: "text-cyber-cyan/60" },
  { label: "Queue", value: "0 pending", color: "text-cyber-purple/60" },
];

export function CyberFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.inOut" } });

      tl.fromTo(
        footerRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
      );

      tl.fromTo(
        itemsRef.current?.children ?? [],
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.12, stagger: 0.03, ease: "none" },
        "-=0.15"
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="relative z-30 border-t border-cyber-green/15 bg-cyber-black/90 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2 lg:py-3">
        <div
          ref={itemsRef}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1"
        >
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              <span className="font-syncopate text-[8px] lg:text-[9px] tracking-[0.3em] text-cyber-green/30 uppercase min-w-[60px]">
                {m.label}
              </span>
              <span className={`font-body text-[10px] lg:text-xs tabular-nums ${m.color}`}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 pt-1 border-t border-cyber-green/5 flex items-center justify-between">
          <span className="font-syncopate text-[7px] tracking-[0.3em] text-cyber-green/20 uppercase">
            SYNAPSE // AI Teaching Agent
          </span>
          <span className="font-space-mono text-[7px] text-cyber-green/20">
            {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  );
}
