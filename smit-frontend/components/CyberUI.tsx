"use client";
import React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const CHARS = "!<>-_\\/[]{}—=+*^?#$%@&|~`";

function matrixDecode(
  el: HTMLElement,
  finalText: string,
  duration: number
): GSAPTimeline {
  const tl = gsap.timeline();
  const len = finalText.length;
  const pf = 1 / (duration / 16);
  let progress = 0;

  tl.to(el, {
    duration,
    ease: "none",
    onUpdate: () => {
      progress = Math.min(progress + pf, 1);
      const charCount = Math.floor(progress * len);
      let result = "";
      for (let i = 0; i < len; i++) {
        if (i < charCount) {
          result += finalText[i];
        } else {
          result += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      el.textContent = result;
    },
    onComplete: () => {
      el.textContent = finalText;
    },
  });
  return tl;
}

function corruptedStream(
  el: HTMLElement,
  finalText: string,
  duration: number
): GSAPTimeline {
  const tl = gsap.timeline();
  const len = finalText.length;
  let progress = 0;
  const pf = 1 / (duration / 16);

  tl.to(el, {
    duration,
    ease: "none",
    onUpdate: () => {
      progress = Math.min(progress + pf, 1);
      const charCount = Math.floor(progress * len);
      let result = "";
      for (let i = 0; i < len; i++) {
        if (i <= charCount) {
          if (i === charCount && Math.random() < 0.15) {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          } else {
            result += finalText[i] || "";
          }
        } else {
          result += " ";
        }
      }
      el.textContent = result;
    },
    onComplete: () => {
      el.textContent = finalText;
    },
  });
  return tl;
}

interface CyberUIProps {
  children?: React.ReactNode;
}

export function CyberUI({ children }: CyberUIProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  const bootIrisRef = useRef<HTMLDivElement>(null);
  const irisInnerRef = useRef<HTMLDivElement>(null);

  // Segments (revealed in order)
  const corePanelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const title = "SMIT // AI TEACHING CORE";
  const subtitle = ">> AGENTIC CODE ANALYSIS ENGINE // v4.2.1 /* REV-93 */";

  const [thinking, setThinking] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [mouseVel, setMouseVel] = useState({ x: 0, y: 0 });
  const [bootDone, setBootDone] = useState(false);

  const prevMouseRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    setMouseVel({ x: nx - prevMouseRef.current.x, y: ny - prevMouseRef.current.y });
    prevMouseRef.current = { x: nx, y: ny };
    setMouse({ x: nx, y: ny });
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // === MECHANICAL IRIS BOOT ===
      const bootTl = gsap.timeline({ defaults: { ease: "power4.inOut" } });

      // Iris aperture expand
      bootTl.to(bootIrisRef.current, {
        clipPath: "circle(150% at 50% 50%)",
        duration: 0.6,
        delay: 1.0,
        ease: "power3.in",
      });

      // Inner boot text fades during iris
      bootTl.to(
        irisInnerRef.current,
        { opacity: 0, duration: 0.3 },
        "-=0.4"
      );

      // Kill boot
      bootTl.call(() => {
        if (bootRef.current) {
          bootRef.current.style.display = "none";
          bootRef.current.style.pointerEvents = "none";
        }
        setBootDone(true);
      });

      // === SEGMENTED REVEAL — INDUSTRIAL SNAP ===
      const segments = gsap.timeline({ defaults: { ease: "back.out(3.5)" } });

      // 1. Core panel — elastic whip
      segments.fromTo(
        corePanelRef.current,
        { x: "-120%", rotation: 25, opacity: 0 },
        {
          x: "0%", rotation: 0, opacity: 1, duration: 0.6,
          ease: "elastic.out(1, 0.4)",
        },
        "-=0.2"
      );

      // 3. Title — matrix decode + industrial snap-in
      if (titleRef.current) {
        matrixDecode(titleRef.current, title, 1.0);
      }
      segments.fromTo(
        titleRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(4)" },
        "-=0.7"
      );

      // 4. Subtitle — corrupted stream
      if (subtitleRef.current) {
        corruptedStream(subtitleRef.current, subtitle, 0.8);
      }
      segments.fromTo(
        subtitleRef.current,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.2, ease: "none" },
        "-=0.5"
      );

      // 5. Tagline — industrial snap
      segments.fromTo(
        taglineRef.current,
        { y: 25, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.25, ease: "back.out(4)" },
        "-=0.2"
      );

      // 6. CTA — elastic whip stagger (overclock feel)
      segments.fromTo(
        ctaRef.current,
        { y: 60, opacity: 0, scale: 0.7, rotation: -5 },
        {
          y: 0, opacity: 1, scale: 1, rotation: 0, duration: 0.5,
          ease: "elastic.out(1.2, 0.3)",
        },
        "-=0.1"
      );

      // 7. Status bar — hard stop
      segments.to(statusRef.current, { opacity: 1, duration: 0.08, ease: "none" }, "-=0.1");

      // === STAGGERED OVERCLOCK on the CTA links ===
      if (ctaRef.current) {
        const links = ctaRef.current.querySelectorAll("a");
        segments.to(links, {
          scale: 1.1,
          duration: 0.06,
          stagger: { each: 0.03, from: "start" },
          yoyo: true,
          repeat: 1,
          ease: "none",
        }, "-=0.3");
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setThinking((prev) => !prev), 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-cyber-black overflow-hidden flex flex-col"
      onMouseMove={handleMouseMove}
    >
      <div className="pointer-events-none fixed inset-0 z-50 cyber-scanline" />

      {/* === MECHANICAL IRIS BOOT === */}
      <div
        ref={bootRef}
        className="fixed inset-0 z-40 flex items-center justify-center bg-cyber-black"
      >
        <div
          ref={bootIrisRef}
          className="absolute inset-0 bg-cyber-black"
          style={{ clipPath: "circle(0% at 50% 50%)" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="border border-cyber-green/30 px-12 py-8 text-center"
              style={{ boxShadow: "0 0 40px var(--cyber-shadow), inset 0 0 40px var(--cyber-shadow-inset)" }}
            >
              <span
                ref={irisInnerRef}
                className="font-michroma text-4xl md:text-7xl font-black uppercase tracking-[0.15em] text-cyber-green animate-pulse-neon"
              >
                BOOT
              </span>
              <div className="mt-4 font-syncopate text-[10px] tracking-[0.4em] text-cyber-green/50 uppercase">
                Initializing AI Core
              </div>
              <div className="mt-3 mx-auto w-32 h-px bg-cyber-green/30" />
              <div className="mt-3 flex justify-center gap-1">
                {[...Array(8)].map((_, i) => (
                  <span
                    key={i}
                    className="inline-block w-2 h-2 border border-cyber-green/40"
                    style={{
                      animation: `pulseNeon ${1 + Math.random()}s ease-in-out ${i * 0.1}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row pt-20 lg:pt-24 pb-4 lg:pb-8 px-[var(--space-page-x)] gap-4 lg:gap-8 max-w-7xl mx-auto w-full">
        {/* Left: 3D Computer Scene */}
        <div ref={corePanelRef} className="flex-1 flex flex-col gap-4">
          <div className="cyber-panel p-2 lg:p-3 flex-1 relative overflow-hidden min-h-[400px] lg:min-h-[500px]">
            <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-cyber-green" />
              <span className="font-michroma text-[7px] lg:text-[8px] tracking-[0.4em] text-cyber-green/25 uppercase">
                Core // Live
              </span>
            </div>
            <div className="absolute inset-0 pt-5">
              {bootDone && <HeroScene />}
            </div>
          </div>

          <div
            ref={statusRef}
            className={`cyber-panel px-4 py-2.5 opacity-0 transition-all duration-300 ${
              thinking ? "cyber-panel--thinking" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-block w-2.5 h-2.5 ${
                  thinking ? "bg-cyber-crimson animate-pulse-neon" : "bg-cyber-green"
                }`}
              />
              <span className="font-michroma text-[9px] lg:text-[10px] tracking-[0.3em] text-cyber-green/80 uppercase">
                {thinking
                  ? ">> STATUS: ANALYZING // NEURAL PATHWAYS ACTIVE"
                  : ">> STATUS: STANDBY // AWAITING INPUT"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-5">
          <div className="cyber-panel p-6 lg:p-10">
            <h1
              ref={titleRef}
              className="font-heading text-4xl md:text-5xl lg:text-7xl font-black uppercase tracking-[0.04em] leading-[1.05]"
              style={{
                color: "var(--cyber-text)",
                textShadow: "2px 0 rgba(255,0,60,0.3), -1px 0 rgba(0,240,255,0.2)",
              }}
            >
              {title}
            </h1>
            <p
              ref={subtitleRef}
              className="font-syncopate text-[10px] lg:text-xs text-cyber-green/40 mt-4 tracking-[0.3em] uppercase"
            >
              {subtitle}
            </p>
          </div>

          <div className="cyber-panel p-6 lg:p-10 flex-1 flex flex-col items-center justify-center">
            <div className="text-center max-w-xl">
              <p
                ref={taglineRef}
                className="font-space-mono text-sm lg:text-base text-cyber-green/60 tracking-[0.1em] uppercase leading-relaxed mb-8"
                style={{
                  textShadow: "0 0 20px var(--cyber-shadow)",
                }}
              >
                Deploy source code for instant<br />
                <span
                  className="font-syncopate font-black tracking-[0.25em]"
                  style={{
                    color: "var(--cyber-text)",
                    textShadow: "1px 0 #FF003C, -1px 0 #00f0ff",
                  }}
                >
                  AGENTIC ANALYSIS &amp; GRADING
                </span>
                <br />
                with neural feedback &amp; remediation
              </p>

              <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/submit"
                  className="cyber-btn text-sm lg:text-base relative overflow-hidden group"
                >
                  <span className="relative z-10">[ SUBMIT CODE ]</span>
                  <span className="absolute inset-0 bg-cyber-green/10 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
                </Link>
                <Link
                  href="/history"
                  className="cyber-btn cyber-btn--crimson text-sm lg:text-base relative overflow-hidden group"
                >
                  <span className="relative z-10">[ VIEW HISTORY ]</span>
                  <span className="absolute inset-0 bg-cyber-crimson/10 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {children && (
        <div className="relative z-10 p-4 lg:p-8 pt-0 max-w-7xl mx-auto w-full">
          <div className="cyber-panel p-6">{children}</div>
        </div>
      )}
    </div>
  );
}
