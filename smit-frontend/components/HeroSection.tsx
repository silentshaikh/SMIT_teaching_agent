"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let SplitText: any = null;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let split: any = null;
    let cancelled = false;

    (async () => {
      if (typeof window !== "undefined" && !SplitText) {
        try {
          const mod = await import("gsap/SplitText");
          SplitText = mod.SplitText;
          gsap.registerPlugin(SplitText);
        } catch {
          SplitText = null;
        }
      }
      if (cancelled) return;

      let ctx: gsap.Context | null = null;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.from(eyebrowRef.current, { x: -30, opacity: 0, duration: 0.6 });

        if (SplitText && headingRef.current) {
          split = new SplitText(headingRef.current, { type: "words" });
          tl.from(split.words, { y: 60, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power4.out" }, "-=0.3");
        } else {
          tl.from(headingRef.current, { y: 40, opacity: 0, duration: 0.8 }, "-=0.3");
        }

        tl.from(subRef.current, { y: 25, opacity: 0, duration: 0.6 }, "-=0.4");
        tl.from(ctaRef.current?.children ?? [], { y: 20, opacity: 0, scale: 0.95, duration: 0.5, stagger: 0.12 }, "-=0.3");
        tl.from(statsRef.current?.children ?? [], { y: 20, opacity: 0, duration: 0.4, stagger: 0.10 }, "-=0.2");
      }, sectionRef);

      if (cancelled) {
        ctx?.revert();
        return;
      }
      cleanupRef.current = () => {
        ctx?.revert();
        if (split) split.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, []);

  return (
    <section ref={sectionRef} className="hero-section">
      <div ref={canvasRef} className="hero-canvas" />

      <div ref={contentRef} className="hero-content">
        <div ref={eyebrowRef} className="hero-eyebrow">
          AI-Powered Teaching Assistant
        </div>

        <h1 ref={headingRef} className="font-heading hero-heading">
          Learn Smarter.<br />Code Better.
        </h1>

        <p ref={subRef} className="hero-sub">
          Upload your code. Get instant feedback, mistakes explained
          in English and Roman Urdu, and a score — in seconds.
        </p>

        <div ref={ctaRef} className="hero-cta">
          <Link href="/submit" className="btn-primary">Submit Assignment</Link>
          <Link href="/dashboard" className="btn-secondary">View Demo</Link>
        </div>

        <div ref={statsRef} className="hero-stats">
          <div className="stat-item animate-on-scroll"><span className="stat-num">4</span><span className="stat-label">AI Agents</span></div>
          <div className="stat-item animate-on-scroll"><span className="stat-num">&lt;10s</span><span className="stat-label">Per Report</span></div>
          <div className="stat-item animate-on-scroll"><span className="stat-num">2</span><span className="stat-label">Languages</span></div>
          <div className="stat-item animate-on-scroll"><span className="stat-num">100%</span><span className="stat-label">Consistent</span></div>
        </div>
      </div>
    </section>
  );
}
