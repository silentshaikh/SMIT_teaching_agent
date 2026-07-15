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
  const circleRef = useRef<SVGCircleElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const gradeRef = useRef<HTMLSpanElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    const circle = circleRef.current;
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
        ctxRef.current = gsap.context(() => {
          const tl = gsap.timeline({ defaults: { ease: "back.out(3)" } });

          tl.to(el, { scale: 1, opacity: 1, rotation: 0, duration: 0.5 });

          if (circle) {
            const r = parseFloat(circle.getAttribute("r") || "44");
            const circumference = 2 * Math.PI * r;
            gsap.fromTo(
              circle,
              { strokeDashoffset: circumference },
              { strokeDashoffset: circumference - (score / 100) * circumference, duration: 1.8, ease: "power2.out", delay: 0.3 }
            );
          }

          tl.to(
            counter,
            {
              value: score,
              duration: 0.8,
              ease: "power3.out",
              onUpdate: () => {
                scoreEl.textContent = String(Math.round(counter.value));
              },
            },
            "-=1.5"
          )
            .to(gradeEl, { opacity: 1, y: 0, duration: 0.25 }, "-=0.3")
            .fromTo(
              tagsEl.children,
              { opacity: 0, y: 8 },
              { opacity: 1, y: 0, duration: 0.15, stagger: 0.04 },
              "-=0.1"
            );
        }, el);
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
  }, [score, grade, breakdown]);

  const gradeColor =
    grade === "A" ? "text-cyber-green" :
    grade === "F" ? "text-cyber-crimson" :
    "text-cyber-purple";

  const r = 44;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] lg:w-[200px] lg:h-[200px]"
      >
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="var(--color-card-border)"
            strokeWidth="6"
            className="sm:!stroke-[8] lg:!stroke-[10]"
          />
          <circle
            ref={circleRef}
            cx="50" cy="50" r={r}
            fill="none"
            stroke="var(--color-text-primary)"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            className="sm:!stroke-[8] lg:!stroke-[10]"
          />
        </svg>
        <div className="flex flex-col items-center z-10">
          <span
            ref={scoreRef}
            className="font-heading font-extrabold text-cyber-green tabular-nums"
            style={{ fontSize: "var(--text-hero)" }}
          >
            0
          </span>
          <span
            ref={gradeRef}
            className={`font-heading font-bold tracking-widest opacity-0 translate-y-2 ${gradeColor}`}
            style={{ fontSize: "var(--text-4xl)" }}
          >
            {grade}
          </span>
        </div>
      </div>
      <div
        ref={tagsRef}
        className="flex gap-3 font-syncopate tracking-[0.2em] text-cyber-green/50"
        style={{ fontSize: "var(--text-xs)" }}
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
