"use client";
import React from "react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function useTheme() {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return isLight;
}

const RobotHero = dynamic(
  () => import("./RobotHero").then((m) => ({ default: m.RobotHero })),
  { ssr: false }
);

const CHARS = "!<>-_\\/[]{}\u2014=+*^?#$%@&|~`";

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
        if (i < charCount) result += finalText[i];
        else result += CHARS[Math.floor(Math.random() * CHARS.length)];
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
          if (i === charCount && Math.random() < 0.15)
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          else result += finalText[i] || "";
        } else result += " ";
      }
      el.textContent = result;
    },
    onComplete: () => {
      el.textContent = finalText;
    },
  });
  return tl;
}

function LivingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const isLight = useTheme();
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; hue: number; pulse: number;
    }[] = [];
    const dataStreams: {
      x: number; y: number; speed: number; length: number;
      alpha: number; hue: number;
    }[] = [];
    const HEX_SIZE = isMobile ? 48 : 32;
    const PARTICLE_COUNT = isMobile ? 30 : 60;
    const STREAM_COUNT = isMobile ? 5 : 10;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        hue: Math.random() < 0.7 ? 160 : Math.random() < 0.5 ? 190 : 280,
        pulse: Math.random() * Math.PI * 2,
      });
    }
    for (let i = 0; i < STREAM_COUNT; i++) {
      dataStreams.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.4 + Math.random() * 1.2,
        length: 20 + Math.random() * 60,
        alpha: 0.06 + Math.random() * 0.1,
        hue: [160, 190, 280, 330][Math.floor(Math.random() * 4)],
      });
    }
    const drawHex = (cx: number, cy: number, size: number, alpha: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const hx = cx + size * Math.cos(angle);
        const hy = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0, 255, 200, ${alpha})`;
      ctx.lineWidth = 0.3;
      ctx.stroke();
    };
    let time = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.004;
      const hexW = HEX_SIZE * Math.sqrt(3);
      const hexH = HEX_SIZE * 2;
      for (let row = -1; row < canvas.height / (hexH * 0.75) + 2; row++) {
        for (let col = -1; col < canvas.width / hexW + 2; col++) {
          const offset = row % 2 === 0 ? 0 : hexW / 2;
          const cx = col * hexW + offset;
          const cy = row * hexH * 0.75;
          const dist = Math.sqrt(
            Math.pow(cx - canvas.width / 2, 2) +
            Math.pow(cy - canvas.height / 2, 2)
          );
          const maxDist = Math.sqrt(
            Math.pow(canvas.width / 2, 2) +
            Math.pow(canvas.height / 2, 2)
          );
          const a =
            0.02 *
            (1 - dist / maxDist) *
            (0.8 + 0.2 * Math.sin(time + dist * 0.005));
          drawHex(cx, cy, HEX_SIZE, a);
        }
      }
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.015;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        const pulseAlpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
        const r = p.hue === 160 ? 0 : p.hue === 190 ? 0 : p.hue === 280 ? 124 : 255;
        const g = p.hue === 160 ? 255 : p.hue === 190 ? 240 : p.hue === 280 ? 58 : 0;
        const b = p.hue === 160 ? 200 : p.hue === 190 ? 255 : p.hue === 280 ? 237 : 60;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulseAlpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulseAlpha * 0.3})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 255, 200, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        }
      }
      dataStreams.forEach((s) => {
        s.y += s.speed;
        if (s.y > canvas.height + s.length) {
          s.y = -s.length;
          s.x = Math.random() * canvas.width;
        }
        const r = s.hue === 160 ? 0 : s.hue === 190 ? 0 : s.hue === 280 ? 124 : 255;
        const g = s.hue === 160 ? 255 : s.hue === 190 ? 240 : s.hue === 280 ? 58 : 0;
        const b = s.hue === 160 ? 200 : s.hue === 190 ? 255 : s.hue === 280 ? 237 : 60;
        const grad = ctx.createLinearGradient(s.x, s.y - s.length, s.x, s.y);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${s.alpha})`);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - s.length);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isMobile]);
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: isLight ? 0.06 : 0.6 }}
    />
  );
}

function AnimatedCounter({
  target,
  duration = 2,
}: {
  target: number;
  duration?: number;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = (Date.now() - start) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          tick();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val.toLocaleString()}</span>;
}

function ScoreRing({
  score,
  label,
  color,
}: {
  score: number;
  label: string;
  color: string;
}) {
  const isLight = useTheme();
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 80 80"
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={isLight ? "rgba(0,31,26,0.08)" : "rgba(255,255,255,0.05)"}
            strokeWidth="3"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-sm font-bold"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-[8px] text-white/30 tracking-widest uppercase font-mono">
        {label}
      </span>
    </div>
  );
}

const APP_PAGES = [
  { name: "Submit Code", desc: "Upload files or paste URLs for instant AI analysis", color: "#00FFC8", icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" },
  { name: "AI Report", desc: "Detailed mistake detection with line-by-line corrections", color: "#8b5cf6", icon: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" },
  { name: "Progress Tracking", desc: "Visualize improvement with score trends over time", color: "#00f0ff", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" },
  { name: "Teacher Dashboard", desc: "Review submissions, manage rubrics, and override scores", color: "#FF003C", icon: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" },
  { name: "Batch Analytics", desc: "Class-wide performance insights with exportable PDF reports", color: "#f59e0b", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
];

function AppShowcase() {
  const isLight = useTheme();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(
      () => setActive((p) => (p + 1) % APP_PAGES.length),
      3500
    );
    return () => clearInterval(iv);
  }, [paused]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });
    return () => ctx.revert();
  }, []);
  return (
    <div ref={containerRef} className="relative opacity-0">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs tracking-[0.3em] text-cyan-400 uppercase font-mono">
          &gt;&gt; Application Showcase
        </span>
        <span className="flex-1 border-t border-cyan-400/15" />
      </div>
      <div className="hologram-panel p-4 md:p-6 relative overflow-hidden">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">
            <div className="relative w-[260px] h-[460px] md:w-[280px] md:h-[500px]">
              <div
                className="absolute inset-0 rounded-[2rem] border overflow-hidden"
                style={{
                  borderColor: isLight ? "rgba(0,31,26,0.12)" : "rgba(255,255,255,0.1)",
                  background: isLight
                    ? "linear-gradient(145deg, rgba(232,255,254,0.95), rgba(240,255,254,0.98))"
                    : "linear-gradient(145deg, rgba(0,20,15,0.9), rgba(0,10,20,0.95))",
                }}
              >
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-xl z-10 ${isLight ? "bg-[#E8FFFE]" : "bg-black"}`} />
                <div className="absolute inset-0 pt-6 px-3 pb-3 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400/30 to-purple-500/30 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-cyan-400">
                        S
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono tracking-wider ${isLight ? "text-[#006B5C]/60" : "text-white/50"}`}>
                      SYNAPSE
                    </span>
                  </div>
                  {APP_PAGES.map((page, i) => (
                    <div
                      key={page.name}
                      className="rounded-lg p-3 mb-2 transition-all duration-500 border"
                      style={{
                        borderColor:
                          i === active ? `${page.color}30` : "transparent",
                        background:
                          i === active
                            ? `linear-gradient(135deg, ${page.color}10, transparent)`
                            : isLight ? "rgba(0,31,26,0.03)" : "rgba(255,255,255,0.02)",
                        opacity: i === active ? 1 : 0.4,
                        transform:
                          i === active ? "scale(1)" : "scale(0.97)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke={page.color}
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={page.icon}
                          />
                        </svg>
                        <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                          {page.name}
                        </span>
                      </div>
                      <p className="text-[8px] text-white/35 leading-relaxed">
                        {page.desc}
                      </p>
                      {i === active && (
                        <div className={`mt-2 h-0.5 rounded-full overflow-hidden ${isLight ? "bg-[#006B5C]/10" : "bg-white/5"}`}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(90deg, ${page.color}, transparent)`,
                              width: "60%",
                              animation:
                                "shimmer 3.5s linear infinite",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="absolute -inset-8 rounded-full blur-3xl opacity-20"
                style={{
                  background: `radial-gradient(circle, ${APP_PAGES[active].color}40, transparent 70%)`,
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-3"
                style={{ borderColor: `${APP_PAGES[active].color}30` }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: APP_PAGES[active].color }}
                />
                <span
                  className="text-[10px] font-mono tracking-wider"
                  style={{ color: APP_PAGES[active].color }}
                >
                  FEATURE {String(active + 1).padStart(2, "0")} /{" "}
                  {String(APP_PAGES.length).padStart(2, "0")}
                </span>
              </div>
              <h3
                className="text-xl md:text-2xl font-bold text-white mb-2"
                style={{
                  textShadow: `0 0 30px ${APP_PAGES[active].color}40`,
                }}
              >
                {APP_PAGES[active].name}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {APP_PAGES[active].desc}
              </p>
            </div>
            <div className="flex gap-2">
              {APP_PAGES.map((page, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                  className="h-1.5 rounded-full transition-all duration-500 cursor-pointer"
                  style={{
                    width: i === active ? "2rem" : "0.5rem",
                    background:
                      i === active ? page.color : isLight ? "rgba(0,31,26,0.15)" : "rgba(255,255,255,0.15)",
                    boxShadow:
                      i === active ? `0 0 10px ${page.color}40` : "none",
                  }}
                />
              ))}
            </div>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-wider transition-all duration-300 w-fit group"
              style={{
                background: `linear-gradient(135deg, ${APP_PAGES[active].color}20, transparent)`,
                border: `1px solid ${APP_PAGES[active].color}30`,
                color: APP_PAGES[active].color,
              }}
            >
              Try It Now
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5", title: "Code Analysis", desc: "AI-powered review detects syntax, logic, and style mistakes across Python, JavaScript, and HTML.", color: "#00FFC8" },
  { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Instant Grading", desc: "Rubric-based scoring with grade breakdowns, override capability, and PDF report export.", color: "#8b5cf6" },
  { icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z", title: "AI Tutor", desc: "Ask follow-up questions about your mistakes. Get explanations in English and Roman Urdu.", color: "#00f0ff" },
  { icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z", title: "Progress Tracking", desc: "Visualize your improvement over time with score trends and mistake frequency analysis.", color: "#FF003C" },
];

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const isLight = useTheme();
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        gsap.fromTo(el, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, delay: index * 0.1, ease: "back.out(2)" });
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);
  return (
    <div ref={cardRef} className="relative group opacity-0 hologram-card" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="p-5 h-full transition-all duration-500 relative overflow-hidden rounded-2xl" style={{
        background: hovered ? `linear-gradient(135deg, ${feature.color}08, transparent)` : isLight ? "rgba(0,31,26,0.03)" : "rgba(255,255,255,0.03)",
        boxShadow: hovered ? `0 0 40px ${feature.color}12, inset 0 0 30px ${feature.color}05` : isLight ? "0 4px 30px rgba(0,31,26,0.06)" : "0 4px 30px rgba(0,0,0,0.2)",
        border: isLight ? "1px solid rgba(0,122,106,0.08)" : "none",
      }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${feature.color}50, transparent)`, opacity: hovered ? 1 : 0 }} />
        <div className="mb-3 transition-all duration-300" style={{ color: feature.color, filter: hovered ? `drop-shadow(0 0 8px ${feature.color}60)` : "none" }}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">{feature.title}</h3>
        <p className="text-xs text-white/40 leading-relaxed">{feature.desc}</p>
        <div className="mt-4 h-0.5 rounded-full overflow-hidden bg-white/5">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: hovered ? "100%" : "0%", background: `linear-gradient(90deg, ${feature.color}, transparent)` }} />
        </div>
      </div>
    </div>
  );
}

function SystemDiagnostics() {
  const [ticks, setTicks] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const LOG_MESSAGES = useMemo(() => [
    "[SYS] Core temperature: 34.2C // Thermal regulation active",
    "[NET] Latency: 14ms // Region: AP-SOUTH-1 // Uptime: 99.97%",
    "[AI]  Model: gpt-4o-mini // Context: 128k // Temperature: 0.3",
    "[DB]  Connections: 4 active // Pool: 42% utilized // Cache: 87%",
    "[SEC] Auth: JWT-HS256 // Sessions: 18 active // MFA: optional",
    "[MEM] Heap: 42% // GC cycles: 3 // Allocation rate: 2.1MB/s",
    "[API] Requests: 847/min // p99: 120ms // Errors: 0.02%",
    "[WRK] Workers: 4/4 active // Queue: 0 // Throughput: 1.2k/min",
  ], []);
  useEffect(() => { const iv = setInterval(() => setTicks(t => t + 1), 2000); return () => clearInterval(iv); }, []);
  useEffect(() => { if (ticks === 0) return; setLogs(p => [...p.slice(-5), LOG_MESSAGES[ticks % LOG_MESSAGES.length]]); }, [ticks, LOG_MESSAGES]);
  const bars = [72, 45, 88, 33, 61, 95, 50, 78];
  return (
    <div className="hologram-panel p-4 font-mono text-[10px] leading-relaxed overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-[9px] tracking-[0.3em] text-cyan-400/60 uppercase">System Diagnostics</span>
        <span className="flex-1 border-t border-cyan-400/10" />
        <span className="text-cyan-400/40 tabular-nums text-[9px]">T+{ticks}s</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {["CPU", "MEM", "NET", "GPU"].map((label, i) => (
          <div key={label} className="text-center">
            <div className="text-[8px] text-white/25 mb-1">{label}</div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${bars[(ticks + i) % bars.length]}%`, background: "linear-gradient(90deg, #00FFC8, #00f0ff)" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {logs.map((line, i) => (
          <div key={`${ticks}-${i}`} className="truncate transition-opacity duration-300" style={{ opacity: i === logs.length - 1 ? 1 : 0.3 + (i / logs.length) * 0.4 }}>
            <span className="text-white/15 mr-1">&gt;</span>
            <span className="text-cyan-400/50">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ACTIVITIES = [
  { time: "14:32:07", event: "Submission #4821 received -- Python // analysis queued", type: "info" as const },
  { time: "14:32:12", event: "Code review complete -- 3 mistakes detected -- score: 78/100", type: "success" as const },
  { time: "14:32:14", event: "Feedback generated -- 4 suggestions -- 2 practice items", type: "info" as const },
  { time: "14:32:18", event: "Student notified -- report available at /report/4821", type: "success" as const },
  { time: "14:33:01", event: "Batch SYNAPSE-42 analytics compiled -- 24 submissions", type: "info" as const },
  { time: "14:33:15", event: "Rubric v3 created -- 6 criteria -- max score: 100", type: "warning" as const },
  { time: "14:34:02", event: "Override applied by teacher -- submission #4798 -- score: 92", type: "warning" as const },
  { time: "14:34:28", event: "PDF report exported -- batch SYNAPSE-42 -- 12 pages", type: "success" as const },
];

function ActivityFeed() {
  const [visible, setVisible] = useState(3);
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const iv = setInterval(() => setVisible(v => v >= ACTIVITIES.length ? 3 : v + 1), 3500); return () => clearInterval(iv); }, []);
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [visible]);
  const colorMap = { info: "#00f0ff", success: "#00FFC8", warning: "#FF003C" };
  return (
    <div className="hologram-panel p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-[9px] tracking-[0.3em] text-cyan-400/60 uppercase">Live Activity Feed</span>
        <span className="flex-1 border-t border-cyan-400/10" />
        <span className="text-cyan-400/40 font-mono text-[9px] flex items-center gap-1">
          <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />STREAM
        </span>
      </div>
      <div ref={feedRef} className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-hide">
        {ACTIVITIES.slice(0, visible).map((a, i) => (
          <div key={i} className="flex gap-3 text-[10px] font-mono items-start" style={{ opacity: i === visible - 1 ? 1 : 0.3 + (i / visible) * 0.4 }}>
            <span className="text-white/20 tabular-nums shrink-0">{a.time}</span>
            <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: colorMap[a.type] }} />
            <span className="text-white/40">{a.event}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CyberUI() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  const bootIrisRef = useRef<HTMLDivElement>(null);
  const irisInnerRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const diagnosticsRef = useRef<HTMLDivElement>(null);

  const title = "SYNAPSE AI TEACHING AGENT";
  const subtitle = ">> AGENTIC CODE ANALYSIS ENGINE // v4.2.1 /* REV-93 */";

  const [thinking, setThinking] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const isLight = useTheme();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const bootTl = gsap.timeline({
        onUpdate: () => setBootProgress(Math.floor(bootTl.progress() * 100)),
      });
      bootTl.to(bootIrisRef.current, { clipPath: "circle(150% at 50% 50%)", duration: 0.6, delay: 1.2, ease: "power3.in" });
      bootTl.to(irisInnerRef.current, { opacity: 0, duration: 0.3 }, "-=0.4");
      bootTl.call(() => {
        if (bootRef.current) { bootRef.current.style.display = "none"; bootRef.current.style.pointerEvents = "none"; }
        setBootDone(true);
      });
      const heroTl = gsap.timeline({ delay: 0.3 });
      if (titleRef.current) matrixDecode(titleRef.current, title, 1.0);
      heroTl.fromTo(titleRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(2)" }, "-=0.5");
      if (subtitleRef.current) corruptedStream(subtitleRef.current, subtitle, 0.8);
      heroTl.fromTo(subtitleRef.current, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, "-=0.3");
      heroTl.fromTo(ctaRef.current, { y: 30, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(3)" }, "-=0.1");
      heroTl.fromTo(scrollIndicatorRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 }, "-=0.2");
      gsap.to(scrollIndicatorRef.current, { y: 8, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!bootDone) return;
    const onScroll = () => {
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(scrolled || 0, 1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [bootDone]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouseX((e.clientX / window.innerWidth - 0.5) * 2);
      setMouseY(-(e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setThinking(p => !p), 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCtaEnter = useCallback(() => setThinking(true), []);
  const handleCtaLeave = useCallback(() => setThinking(false), []);

  return (
    <div ref={containerRef} className={`relative min-h-screen overflow-hidden flex flex-col ${isLight ? "bg-[#E8FFFE]" : "bg-black"}`}>
      <LivingBackground />
      <div className="pointer-events-none fixed inset-0 z-50 cyber-scanline" />

      {/* BOOT SCREEN */}
      <div ref={bootRef} className={`fixed inset-0 z-40 flex items-center justify-center ${isLight ? "bg-[#E8FFFE]" : "bg-black"}`}>
        <div ref={bootIrisRef} className={`absolute inset-0 ${isLight ? "bg-[#E8FFFE]" : "bg-black"}`} style={{ clipPath: "circle(0% at 50% 50%)" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 border border-cyan-400/20 rounded-full" />
              <div className="absolute inset-3 border border-cyan-400/10 rounded-full" />
              <div className="absolute inset-6 border border-purple-500/10 rounded-full" />
              <div className="absolute inset-0 border-t-2 border-cyan-400/40 rounded-full" style={{ animation: "spin 2s linear infinite" }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span ref={irisInnerRef} className="text-3xl md:text-5xl font-black uppercase tracking-[0.15em] text-cyan-400" style={{ fontFamily: "var(--font-michroma), monospace", textShadow: "0 0 30px rgba(0,255,200,0.5)" }}>BOOT</span>
                <div className="mt-3 font-mono text-[10px] tracking-widest text-cyan-400/50">{bootProgress}%</div>
              </div>
            </div>
            <div className="mt-8 w-48">
              <div className="h-px bg-cyan-400/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400/60 transition-all duration-200" style={{ width: `${bootProgress}%` }} />
              </div>
              <div className="mt-3 text-[9px] tracking-[0.4em] text-cyan-400/30 uppercase text-center" style={{ fontFamily: "var(--font-michroma), monospace" }}>Initializing AI Core</div>
            </div>
            <div className="mt-4 flex justify-center gap-1.5">
              {[...Array(12)].map((_, i) => (
                <span key={i} className="inline-block w-1.5 h-1.5 border border-cyan-400/30" style={{ animation: `pulseNeon ${0.8 + Math.random() * 0.4}s ease-in-out ${i * 0.08}s infinite`, background: i < bootProgress / 10 ? "rgba(0,255,200,0.3)" : "transparent" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HERO -- FULL VIEWPORT, NO BORDERS */}
      <div className="relative z-10 h-screen flex flex-col items-center justify-center px-4">
        {/* 3D Robot scene — dark mode only */}
        {!isLight && (
          <div className="absolute inset-0 z-0">
            {bootDone && (
              <RobotHero thinking={thinking} mouseX={mouseX} mouseY={mouseY} scrollProgress={scrollProgress} />
            )}
          </div>
        )}
        {/* Overlay: dark vignette in dark mode, light gradient in light mode */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{
          background: isLight
            ? "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(232,255,254,0.3), rgba(232,255,254,0.7) 60%, rgba(232,255,254,0.95) 100%)"
            : "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(2,10,8,0.6), rgba(2,10,8,0.85) 60%, rgba(2,10,8,0.95) 100%)"
        }} />
        <div ref={heroContentRef} className="relative z-10 flex flex-col items-center text-center max-w-3xl pointer-events-none px-4">
          <div className="mb-3 pointer-events-auto">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{
              background: isLight ? "rgba(0,122,106,0.08)" : "rgba(0,255,200,0.08)",
              border: isLight ? "1px solid rgba(0,122,106,0.2)" : "1px solid rgba(0,255,200,0.18)",
              backdropFilter: "blur(8px)"
            }}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLight ? "bg-[#007A6A]" : "bg-green-400"}`} />
              <span className={`text-[10px] font-mono tracking-[0.3em] uppercase ${isLight ? "text-[#007A6A]/80" : "text-green-400/80"}`}>AI-Powered Teaching Agent</span>
            </span>
          </div>
          <h1 ref={titleRef} className="text-3xl md:text-5xl lg:text-7xl font-black uppercase tracking-[0.12em] leading-[1.05] synapse-gradient mb-4">{title}</h1>
          <p ref={subtitleRef} className={`text-[10px] md:text-xs mb-8 tracking-[0.3em] uppercase font-mono ${isLight ? "text-[#006B5C]/50" : "text-cyan-400/50"}`}>{subtitle}</p>
          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 pointer-events-auto">
            <Link href="/submit" className="group relative px-8 py-3.5 rounded-2xl text-sm font-bold tracking-wider overflow-hidden transition-all duration-300 hover:scale-105" style={{
              background: isLight
                ? "linear-gradient(135deg, rgba(0,122,106,0.15), rgba(0,122,106,0.05))"
                : "linear-gradient(135deg, rgba(0,255,200,0.18), rgba(0,255,200,0.06))",
              border: isLight ? "1px solid rgba(0,122,106,0.3)" : "1px solid rgba(0,255,200,0.3)",
              color: isLight ? "#007A6A" : "#00FFC8",
              boxShadow: isLight
                ? "0 0 40px rgba(0,122,106,0.1), 0 4px 20px rgba(0,31,26,0.08)"
                : "0 0 40px rgba(0,255,200,0.12), 0 4px 20px rgba(0,0,0,0.4)"
            }} onMouseEnter={handleCtaEnter} onMouseLeave={handleCtaLeave}>
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                SUBMIT CODE
              </span>
              <span className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ${isLight ? "bg-[#007A6A]/10" : "bg-green-400/10"}`} />
            </Link>
            <Link href="/history" className="group relative px-8 py-3.5 rounded-2xl text-sm font-bold tracking-wider overflow-hidden transition-all duration-300 hover:scale-105" style={{
              background: isLight ? "rgba(0,31,26,0.04)" : "rgba(255,255,255,0.05)",
              border: isLight ? "1px solid rgba(0,31,26,0.12)" : "1px solid rgba(255,255,255,0.12)",
              color: isLight ? "rgba(0,31,26,0.7)" : "rgba(255,255,255,0.7)",
              boxShadow: isLight ? "0 4px 20px rgba(0,31,26,0.06)" : "0 4px 20px rgba(0,0,0,0.4)"
            }} onMouseEnter={handleCtaEnter} onMouseLeave={handleCtaLeave}>
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                VIEW HISTORY
              </span>
              <span className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ${isLight ? "bg-[#007A6A]/5" : "bg-white/5"}`} />
            </Link>
          </div>
          <div className="mt-8 flex justify-center gap-8 p-4 rounded-2xl" style={{
            background: isLight ? "rgba(0,31,26,0.04)" : "rgba(0,0,0,0.3)",
            backdropFilter: "blur(12px)",
            border: isLight ? "1px solid rgba(0,31,26,0.06)" : "1px solid rgba(255,255,255,0.04)"
          }}>
            {[{ label: "Languages", value: "3", color: isLight ? "#007A6A" : "#00FFC8" }, { label: "Avg Time", value: "2.4s", color: isLight ? "#006B5C" : "#00f0ff" }, { label: "Accuracy", value: "97%", color: isLight ? "#6B21A8" : "#8b5cf6" }].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
                <div className={`text-[7px] tracking-widest uppercase font-mono ${isLight ? "text-[#006B5C]/40" : "text-white/30"}`}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div ref={scrollIndicatorRef} className="absolute bottom-8 z-10 flex flex-col items-center gap-2 opacity-0 p-3 rounded-full" style={{
          background: isLight ? "rgba(0,31,26,0.05)" : "rgba(0,0,0,0.3)",
          backdropFilter: "blur(8px)"
        }}>
          <span className={`text-[9px] tracking-[0.4em] uppercase font-mono ${isLight ? "text-[#006B5C]/35" : "text-white/30"}`}>Scroll to explore</span>
          <div className={`w-5 h-8 rounded-full flex items-start justify-center p-1 ${isLight ? "border border-[#006B5C]/20" : "border border-white/15"}`}>
            <div className={`w-1 h-2 rounded-full animate-pulse ${isLight ? "bg-[#007A6A]/50" : "bg-cyan-400/50"}`} />
          </div>
        </div>
      </div>

      {/* BELOW-FOLD CONTENT -- GLASS PANELS */}
      <div className="relative z-10 px-[var(--space-page-x)] pb-8 max-w-[1400px] mx-auto w-full">
        <div className="mb-12"><AppShowcase /></div>
        <div ref={featuresRef} className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[{ label: "Submissions Analyzed", value: 12847, color: isLight ? "#007A6A" : "#00FFC8" }, { label: "Mistakes Detected", value: 48291, color: isLight ? "#B91C1C" : "#FF003C" }, { label: "Students Active", value: 892, color: isLight ? "#006B5C" : "#00f0ff" }, { label: "Avg Processing", value: 2.4, suffix: "s", color: isLight ? "#6B21A8" : "#8b5cf6" }].map((stat) => (
              <div key={stat.label} className="hologram-card p-4 text-center group hover:scale-[1.02] transition-all duration-300 rounded-2xl relative" style={{ background: isLight ? "rgba(0,31,26,0.03)" : "rgba(255,255,255,0.03)" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, ${stat.color}60, transparent)` }} />
                <div className="font-bold text-2xl lg:text-3xl tabular-nums" style={{ color: stat.color }}>
                  <AnimatedCounter target={stat.value} duration={2} />
                  {stat.suffix && <span className="text-lg">{stat.suffix}</span>}
                </div>
                <div className={`text-[8px] lg:text-[9px] mt-1 tracking-[0.2em] uppercase font-mono ${isLight ? "text-[#006B5C]/40" : "text-white/25"}`}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mb-8 py-4 rounded-2xl" style={{ background: isLight ? "rgba(0,31,26,0.03)" : "rgba(255,255,255,0.02)" }}>
            <ScoreRing score={92} label="Accuracy" color={isLight ? "#007A6A" : "#00FFC8"} />
            <ScoreRing score={78} label="Coverage" color={isLight ? "#006B5C" : "#00f0ff"} />
            <ScoreRing score={85} label="Quality" color={isLight ? "#6B21A8" : "#8b5cf6"} />
            <ScoreRing score={96} label="Uptime" color={isLight ? "#B91C1C" : "#FF003C"} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f, i) => (<FeatureCard key={f.title} feature={f} index={i} />))}
          </div>
        </div>
        <div ref={diagnosticsRef} className="grid lg:grid-cols-2 gap-3 mb-12">
          <SystemDiagnostics />
          <ActivityFeed />
        </div>
        <div className="hologram-panel p-6 lg:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs tracking-[0.3em] text-cyan-400 uppercase font-mono">&gt;&gt; How It Works</span>
            <span className="flex-1 border-t border-cyan-400/15" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-green-400/20 via-cyan-400/20 to-purple-500/20" />
            {[{ step: "01", title: "Upload", desc: "Drop your .py, .js, or .html file or paste a URL", color: "#00FFC8" }, { step: "02", title: "Analyze", desc: "AI reviews code structure, logic, and style", color: "#00f0ff" }, { step: "03", title: "Grade", desc: "Rubric-based scoring with detailed breakdown", color: "#8b5cf6" }, { step: "04", title: "Improve", desc: "Get explanations, corrections, and practice items", color: "#FF003C" }].map((item) => (
              <div key={item.step} className="flex gap-4 relative z-10">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 flex items-center justify-center font-heading text-lg font-black rounded-xl" style={{ background: `${item.color}10`, color: item.color }}>{item.step}</div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{item.title}</h4>
                  <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
