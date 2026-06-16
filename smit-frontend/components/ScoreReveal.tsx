"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface ScoreRevealProps {
  score: number;
  grade: string;
  breakdown: Record<string, number>;
}

export function ScoreReveal({ score, grade, breakdown }: ScoreRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const gradeRef = useRef<HTMLSpanElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const scoreEl = scoreRef.current;
    const gradeEl = gradeRef.current;
    const tagsEl = tagsRef.current;
    if (!el || !scoreEl || !gradeEl || !tagsEl) return;

    gsap.set(el, { scale: 0, opacity: 0, rotation: -180 });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const counter = { value: 0 };
        const ctx = gsap.context(() => {
          const tl = gsap.timeline({ defaults: { ease: "back.out(3)" } });

          tl.to(el, { scale: 1, opacity: 1, rotation: 0, duration: 0.5 })
            .to(
              counter,
              {
                value: score,
                duration: 0.8,
                ease: "power3.out",
                onUpdate: () => {
                  scoreEl.textContent = String(Math.round(counter.value));
                },
              },
              "-=0.3"
            )
            .to(
              gradeEl,
              { opacity: 1, y: 0, duration: 0.25 },
              "-=0.3"
            )
            .fromTo(
              tagsEl.children,
              { opacity: 0, y: 8 },
              { opacity: 1, y: 0, duration: 0.15, stagger: 0.04 },
              "-=0.1"
            );
        }, el);

        return () => ctx.revert();
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [score, grade, breakdown]);

  const gradeColor =
    grade === "A" ? "text-cyber-green" :
    grade === "F" ? "text-cyber-crimson" :
    "text-cyber-purple";

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center w-28 h-28 lg:w-32 lg:h-32 border-2 border-cyber-green bg-cyber-black/80"
        style={{ boxShadow: "0 0 20px rgba(0,255,102,0.2), inset 0 0 20px rgba(0,255,102,0.05)" }}
      >
        <span
          ref={scoreRef}
          className="text-3xl lg:text-4xl font-bold text-cyber-green font-orbitron tabular-nums"
        >
          0
        </span>
        <span
          ref={gradeRef}
          className={`text-xs font-orbitron tracking-widest opacity-0 translate-y-2 ${gradeColor}`}
        >
          {grade}
        </span>
      </div>
      <div
        ref={tagsRef}
        className="flex gap-3 text-[10px] font-syncopate tracking-[0.2em] text-cyber-green/50"
      >
        {Object.entries(breakdown).map(([key, value]) => (
          <span key={key} className="uppercase">
            [{key}: {value}]
          </span>
        ))}
      </div>
    </div>
  );
}
