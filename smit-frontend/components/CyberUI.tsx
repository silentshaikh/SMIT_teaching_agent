"use client";
import React from "react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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

// ── Hex Grid Background ─────────────────────────────

function HexGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const HEX_SIZE = 32;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        hue: Math.random() < 0.7 ? 140 : Math.random() < 0.5 ? 180 : 280,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 12; i++) {
      dataStreams.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random() * 1.5,
        length: 30 + Math.random() * 80,
        alpha: 0.08 + Math.random() * 0.12,
        hue: [140, 180, 280, 330][Math.floor(Math.random() * 4)],
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
      ctx.strokeStyle = `rgba(0, 255, 102, ${alpha})`;
      ctx.lineWidth = 0.4;
      ctx.stroke();
    };

    let time = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.005;

      // Hex grid
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
          const a = 0.025 * (1 - dist / maxDist) * (0.8 + 0.2 * Math.sin(time + dist * 0.005));
          drawHex(cx, cy, HEX_SIZE, a);
        }
      }

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const pulseAlpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
        const r = p.hue === 140 ? 0 : p.hue === 180 ? 0 : p.hue === 280 ? 124 : 255;
        const g = p.hue === 140 ? 255 : p.hue === 180 ? 240 : p.hue === 280 ? 58 : 0;
        const b = p.hue === 140 ? 102 : p.hue === 180 ? 255 : p.hue === 280 ? 237 : 60;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulseAlpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulseAlpha * 0.3})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Connect nearby
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 255, 102, ${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // Data streams
      dataStreams.forEach((s) => {
        s.y += s.speed;
        if (s.y > canvas.height + s.length) {
          s.y = -s.length;
          s.x = Math.random() * canvas.width;
        }
        const grad = ctx.createLinearGradient(s.x, s.y - s.length, s.x, s.y);
        const r = s.hue === 140 ? 0 : s.hue === 180 ? 0 : s.hue === 280 ? 124 : 255;
        const g = s.hue === 140 ? 255 : s.hue === 180 ? 240 : s.hue === 280 ? 58 : 0;
        const b = s.hue === 140 ? 102 : s.hue === 180 ? 255 : s.hue === 280 ? 237 : 60;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}

// ── Animated Counter ────────────────────────────────

function AnimatedCounter({ target, duration = 2 }: { target: number; duration?: number }) {
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

// ── Glow Orb ────────────────────────────────────────

function GlowOrb() {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      setPulse((p) => (p + 0.02) % (Math.PI * 2));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const scale = 1 + 0.08 * Math.sin(pulse);
  const glow = 15 + 10 * Math.sin(pulse);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div
        className="w-32 h-32 rounded-full border border-cyber-green/20"
        style={{
          transform: `scale(${scale})`,
          boxShadow: `0 0 ${glow}px rgba(0,255,102,0.15), inset 0 0 ${glow}px rgba(0,255,102,0.05)`,
        }}
      />
      <div
        className="absolute inset-4 rounded-full border border-cyber-cyan/10"
        style={{
          transform: `scale(${1 + 0.05 * Math.sin(pulse + 1)})`,
          boxShadow: `0 0 ${glow * 0.6}px rgba(0,240,255,0.1)`,
        }}
      />
      <div
        className="absolute inset-8 rounded-full border border-cyber-purple/10"
        style={{
          transform: `scale(${1 + 0.03 * Math.sin(pulse + 2)})`,
        }}
      />
    </div>
  );
}

// ── Feature Card ────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    title: "Code Analysis",
    desc: "AI-powered review detects syntax, logic, and style mistakes across Python, JavaScript, and HTML.",
    color: "green",
    hex: "#00FF66",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Instant Grading",
    desc: "Rubric-based scoring with grade breakdowns, override capability, and PDF report export.",
    color: "purple",
    hex: "#7c3aed",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
    title: "AI Tutor",
    desc: "Ask follow-up questions about your mistakes. Get explanations in English and Roman Urdu.",
    color: "cyan",
    hex: "#00f0ff",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Progress Tracking",
    desc: "Visualize your improvement over time with score trends and mistake frequency analysis.",
    color: "crimson",
    hex: "#FF003C",
  },
];

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.fromTo(
            el,
            { y: 50, opacity: 0, scale: 0.9, rotateX: 8 },
            { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 0.6, delay: index * 0.12, ease: "back.out(2.5)" }
          );
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={cardRef}
      className="relative group opacity-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ perspective: "800px" }}
    >
      <div
        className="p-5 h-full border transition-all duration-500 relative overflow-hidden"
        style={{
          borderColor: hovered ? `${feature.hex}40` : "rgba(0,255,102,0.08)",
          background: hovered
            ? `linear-gradient(135deg, ${feature.hex}08, transparent)`
            : "var(--cyber-bg-900)",
          boxShadow: hovered
            ? `0 0 30px ${feature.hex}15, inset 0 0 30px ${feature.hex}05`
            : "0 0 8px var(--cyber-shadow)",
        }}
      >
        {/* Corner accents */}
        <div
          className="absolute top-0 left-0 w-4 h-4 border-t border-l transition-all duration-500"
          style={{ borderColor: hovered ? `${feature.hex}60` : "transparent" }}
        />
        <div
          className="absolute bottom-0 right-0 w-4 h-4 border-b border-r transition-all duration-500"
          style={{ borderColor: hovered ? `${feature.hex}60` : "transparent" }}
        />

        {/* Top glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px transition-opacity duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, ${feature.hex}60, transparent)`,
            opacity: hovered ? 1 : 0,
          }}
        />

        {/* Icon */}
        <div
          className="mb-3 transition-all duration-300"
          style={{
            color: feature.hex,
            filter: hovered ? `drop-shadow(0 0 8px ${feature.hex}60)` : "none",
          }}
        >
          {feature.icon}
        </div>

        <h3 className="font-heading text-sm font-bold text-[var(--color-text-primary)] mb-2 uppercase tracking-wider">
          {feature.title}
        </h3>
        <p className="font-body text-xs text-[var(--color-text-muted)] leading-relaxed">
          {feature.desc}
        </p>

        {/* Bottom progress indicator */}
        <div className="mt-4 h-0.5 bg-[var(--color-card-border)]/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: hovered ? "100%" : "0%",
              background: `linear-gradient(90deg, ${feature.hex}, transparent)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── System Diagnostics Panel ────────────────────────

function SystemDiagnostics() {
  const [ticks, setTicks] = useState(0);
  const [mem, setMem] = useState(42);
  const [logs, setLogs] = useState<string[]>([]);

  const LOG_MESSAGES = useMemo(() => [
    "[SYS] Core temperature: 34.2°C // Thermal regulation active",
    "[NET] Latency: 14ms // Region: AP-SOUTH-1 // Uptime: 99.97%",
    "[AI]  Model: gpt-4o-mini // Context: 128k // Temperature: 0.3",
    "[DB]  Connections: 4 active // Pool: 42% utilized // Cache: 87% hit",
    "[SEC] Auth: JWT-HS256 // Sessions: 18 active // MFA: optional",
    "[MEM] Heap: 42% // GC cycles: 3 // Allocation rate: 2.1MB/s",
    "[API] Requests: 847/min // p99: 120ms // Errors: 0.02%",
    "[WRK] Workers: 4/4 active // Queue: 0 // Throughput: 1.2k/min",
  ], []);

  useEffect(() => {
    const iv = setInterval(() => {
      setTicks((t) => t + 1);
      setMem(40 + Math.floor(Math.random() * 8));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (ticks === 0) return;
    const idx = ticks % LOG_MESSAGES.length;
    setLogs((prev) => [...prev.slice(-5), LOG_MESSAGES[idx]]);
  }, [ticks, LOG_MESSAGES]);

  const bars = [72, 45, 88, 33, 61, 95, 50, 78];

  return (
    <div className="p-4 font-space-mono text-[10px] leading-relaxed overflow-hidden border border-cyber-green/10 relative"
      style={{ background: "var(--cyber-bg-900)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 bg-cyber-green animate-pulse-neon" />
        <span className="font-syncopate text-[9px] tracking-[0.3em] text-cyber-green/60 uppercase">
          System Diagnostics
        </span>
        <span className="flex-1 border-t border-cyber-green/10" />
        <span className="text-cyber-green/40 tabular-nums text-[9px]">T+{ticks}s</span>
      </div>

      {/* Resource bars */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {["CPU", "MEM", "NET", "GPU"].map((label, i) => (
          <div key={label} className="text-center">
            <div className="text-[8px] text-cyber-green/30 mb-1">{label}</div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${bars[(ticks + i) % bars.length]}%`,
                  background: `linear-gradient(90deg, #00FF66, #00f0ff)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Log stream */}
      <div className="space-y-1">
        {logs.map((line, i) => (
          <div
            key={`${ticks}-${i}`}
            className="truncate transition-opacity duration-300"
            style={{ opacity: i === logs.length - 1 ? 1 : 0.3 + (i / logs.length) * 0.4 }}
          >
            <span className="text-cyber-green/20 mr-1">{">"}</span>
            <span className="text-cyber-green/50">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Terminal Activity Feed ──────────────────────────

const ACTIVITIES = [
  { time: "14:32:07", event: "Submission #4821 received — Python // analysis queued", type: "info" as const },
  { time: "14:32:12", event: "Code review complete — 3 mistakes detected — score: 78/100", type: "success" as const },
  { time: "14:32:14", event: "Feedback generated — 4 suggestions — 2 practice items", type: "info" as const },
  { time: "14:32:18", event: "Student notified — report available at /report/4821", type: "success" as const },
  { time: "14:33:01", event: "Batch SYNAPSE-42 analytics compiled — 24 submissions analyzed", type: "info" as const },
  { time: "14:33:15", event: "Rubric v3 created — 6 criteria — max score: 100", type: "warning" as const },
  { time: "14:34:02", event: "Override applied by teacher — submission #4798 — score: 92", type: "warning" as const },
  { time: "14:34:28", event: "PDF report exported — batch SYNAPSE-42 — 12 pages", type: "success" as const },
];

function ActivityFeed() {
  const [visible, setVisible] = useState(3);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible((v) => (v >= ACTIVITIES.length ? 3 : v + 1));
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [visible]);

  const colorMap = {
    info: "#00f0ff",
    success: "#00FF66",
    warning: "#FF003C",
  };

  return (
    <div className="p-4 overflow-hidden border border-cyber-cyan/10 relative"
      style={{ background: "var(--cyber-bg-900)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 bg-cyber-cyan animate-pulse-neon" />
        <span className="font-syncopate text-[9px] tracking-[0.3em] text-cyber-cyan/60 uppercase">
          Live Activity Feed
        </span>
        <span className="flex-1 border-t border-cyber-cyan/10" />
        <span className="text-cyber-cyan/40 font-space-mono text-[9px] flex items-center gap-1">
          <span className="w-1 h-1 bg-cyber-green rounded-full animate-pulse" />
          STREAM
        </span>
      </div>
      <div ref={feedRef} className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-hide">
        {ACTIVITIES.slice(0, visible).map((a, i) => (
          <div
            key={i}
            className="flex gap-3 text-[10px] font-space-mono items-start"
            style={{
              opacity: i === visible - 1 ? 1 : 0.3 + (i / visible) * 0.4,
            }}
          >
            <span className="text-[var(--color-text-faint)] tabular-nums shrink-0">{a.time}</span>
            <span
              className="w-1 h-1 rounded-full mt-1.5 shrink-0"
              style={{ background: colorMap[a.type] }}
            />
            <span className="text-[var(--color-text-muted)]">{a.event}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score Ring ──────────────────────────────────────

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-heading text-sm font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="font-syncopate text-[8px] text-[var(--color-text-faint)] tracking-widest uppercase">{label}</span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────

interface CyberUIProps {
  children?: React.ReactNode;
}

export function CyberUI({ children }: CyberUIProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  const bootIrisRef = useRef<HTMLDivElement>(null);
  const irisInnerRef = useRef<HTMLDivElement>(null);

  const corePanelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const diagnosticsRef = useRef<HTMLDivElement>(null);

  const title = "SYNAPSE AI TEACHING AGENT";
  const subtitle = ">> AGENTIC CODE ANALYSIS ENGINE // v4.2.1 /* REV-93 */";

  const [thinking, setThinking] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Boot progress animation
      const bootTl = gsap.timeline({
        onUpdate: () => {
          setBootProgress(Math.floor(bootTl.progress() * 100));
        },
      });

      bootTl.to(bootIrisRef.current, {
        clipPath: "circle(150% at 50% 50%)",
        duration: 0.6,
        delay: 1.2,
        ease: "power3.in",
      });

      bootTl.to(
        irisInnerRef.current,
        { opacity: 0, duration: 0.3 },
        "-=0.4"
      );

      bootTl.call(() => {
        if (bootRef.current) {
          bootRef.current.style.display = "none";
          bootRef.current.style.pointerEvents = "none";
        }
        setBootDone(true);
      });

      // Segmented reveal
      const segments = gsap.timeline({ defaults: { ease: "back.out(3.5)" } });

      segments.fromTo(
        corePanelRef.current,
        { x: "-120%", rotation: 25, opacity: 0 },
        {
          x: "0%", rotation: 0, opacity: 1, duration: 0.6,
          ease: "elastic.out(1, 0.4)",
        },
        "-=0.2"
      );

      if (titleRef.current) {
        matrixDecode(titleRef.current, title, 1.0);
      }
      segments.fromTo(
        titleRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(4)" },
        "-=0.7"
      );

      if (subtitleRef.current) {
        corruptedStream(subtitleRef.current, subtitle, 0.8);
      }
      segments.fromTo(
        subtitleRef.current,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.2, ease: "none" },
        "-=0.5"
      );

      segments.fromTo(
        taglineRef.current,
        { y: 25, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.25, ease: "back.out(4)" },
        "-=0.2"
      );

      segments.fromTo(
        ctaRef.current,
        { y: 60, opacity: 0, scale: 0.7, rotation: -5 },
        {
          y: 0, opacity: 1, scale: 1, rotation: 0, duration: 0.5,
          ease: "elastic.out(1.2, 0.3)",
        },
        "-=0.1"
      );

      segments.to(statusRef.current, { opacity: 1, duration: 0.08, ease: "none" }, "-=0.1");

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

      gsap.fromTo(
        featuresRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 2.5 }
      );

      gsap.fromTo(
        diagnosticsRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: 3.0 }
      );
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
    >
      <HexGrid />
      <div className="pointer-events-none fixed inset-0 z-50 cyber-scanline" />

      {/* === BOOT SCREEN === */}
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
            {/* Outer ring */}
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 border border-cyber-green/20 rounded-full" />
              <div className="absolute inset-3 border border-cyber-green/10 rounded-full" />
              <div className="absolute inset-6 border border-cyber-cyan/10 rounded-full" />

              {/* Rotating ring */}
              <div
                className="absolute inset-0 border-t-2 border-cyber-green/40 rounded-full"
                style={{ animation: "spin 2s linear infinite" }}
              />

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  ref={irisInnerRef}
                  className="font-syncopate text-3xl md:text-5xl font-black uppercase tracking-[0.15em] text-cyber-green animate-pulse-neon"
                >
                  BOOT
                </span>
                <div className="mt-3 font-space-mono text-[10px] tracking-widest text-cyber-green/50">
                  {bootProgress}%
                </div>
              </div>
            </div>

            {/* Loading bar */}
            <div className="mt-8 w-48">
              <div className="h-px bg-cyber-green/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyber-green/60 transition-all duration-200"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>
              <div className="mt-3 font-syncopate text-[9px] tracking-[0.4em] text-cyber-green/30 uppercase text-center">
                Initializing AI Core
              </div>
            </div>

            {/* Dot indicators */}
            <div className="mt-4 flex justify-center gap-1.5">
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className="inline-block w-1.5 h-1.5 border border-cyber-green/30"
                  style={{
                    animation: `pulseNeon ${0.8 + Math.random() * 0.4}s ease-in-out ${i * 0.08}s infinite`,
                    background: i < bootProgress / 10 ? "rgba(0,255,102,0.3)" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row pt-20 lg:pt-24 pb-4 lg:pb-8 px-[var(--space-page-x)] gap-4 lg:gap-6 max-w-[1400px] mx-auto w-full">
        {/* Left: 3D Scene */}
        <div ref={corePanelRef} className="flex-1 flex flex-col gap-4">
          <div className="flex-1 relative overflow-hidden min-h-[350px] lg:min-h-[480px] border border-cyber-green/10"
            style={{ background: "var(--cyber-bg-900)" }}
          >
            {/* HUD overlay */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-cyber-green" />
              <span className="font-syncopate text-[7px] lg:text-[8px] tracking-[0.4em] text-cyber-green/25 uppercase">
                Core // Live
              </span>
            </div>
            <div className="absolute top-3 right-3 z-10 font-space-mono text-[8px] text-cyber-green/20 tabular-nums">
              {new Date().toISOString().split("T")[0]}
            </div>

            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-cyber-green/20" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-cyber-green/20" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-cyber-green/20" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-cyber-green/20" />

            <div className="absolute inset-0 pt-5">
              {bootDone && <HeroScene />}
            </div>

            <GlowOrb />
          </div>

          {/* Status bar */}
          <div
            ref={statusRef}
            className={`px-4 py-2.5 opacity-0 transition-all duration-300 border ${
              thinking ? "border-cyber-crimson/40" : "border-cyber-green/10"
            }`}
            style={{
              background: "var(--cyber-bg-900)",
              boxShadow: thinking
                ? "0 0 20px rgba(255,0,60,0.15), inset 0 0 20px rgba(255,0,60,0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-block w-2 h-2 ${
                  thinking ? "bg-cyber-crimson animate-pulse-neon" : "bg-cyber-green"
                }`}
              />
              <span className="font-syncopate text-[9px] lg:text-[10px] tracking-[0.3em] uppercase"
                style={{ color: thinking ? "rgba(255,0,60,0.8)" : "rgba(0,255,102,0.8)" }}
              >
                {thinking
                  ? ">> STATUS: ANALYZING // NEURAL PATHWAYS ACTIVE"
                  : ">> STATUS: STANDBY // AWAITING INPUT"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-5">
          {/* Title panel */}
          <div className="p-6 lg:p-8 border border-cyber-green/10 relative overflow-hidden"
            style={{ background: "var(--cyber-bg-900)" }}
          >
            {/* Decorative lines */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-green/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-purple/20 to-transparent" />

            <h1
              ref={titleRef}
              className="title-orbitron text-3xl md:text-4xl lg:text-6xl font-black uppercase tracking-[0.15em] leading-[1.05] synapse-gradient animate-glow-pulse"
            >
              {title}
            </h1>
            <p
              ref={subtitleRef}
              className="font-syncopate text-[10px] lg:text-xs text-cyber-green/40 mt-3 tracking-[0.3em] uppercase"
            >
              {subtitle}
            </p>

            {/* Version badge */}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 border border-cyber-green/10">
              <span className="w-1 h-1 bg-cyber-green rounded-full animate-pulse" />
              <span className="font-space-mono text-[9px] text-cyber-green/40 tracking-wider">
                BUILD 2026.07.20 // STABLE
              </span>
            </div>
          </div>

          {/* CTA panel */}
          <div className="p-6 lg:p-8 flex-1 flex flex-col items-center justify-center border border-cyber-green/10 relative"
            style={{ background: "var(--cyber-bg-900)" }}
          >
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-cyber-green/15" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-cyber-cyan/15" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-cyber-purple/15" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-cyber-crimson/15" />

            <div className="text-center max-w-xl">
              <p
                ref={taglineRef}
                className="font-space-mono text-sm lg:text-base text-cyber-green/50 tracking-[0.08em] uppercase leading-relaxed mb-8"
                style={{ textShadow: "0 0 20px var(--cyber-shadow)" }}
              >
                Deploy source code for instant<br />
                <span
                  className="font-syncopate font-black tracking-[0.2em] text-lg lg:text-xl"
                  style={{
                    color: "var(--cyber-text)",
                    textShadow: "1px 0 #FF003C, -1px 0 #00f0ff",
                  }}
                >
                  AGENTIC ANALYSIS &amp; GRADING
                </span>
                <br />
                <span className="text-xs text-white/30">with neural feedback &amp; remediation</span>
              </p>

              <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/submit"
                  className="cyber-btn text-sm lg:text-base relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    SUBMIT CODE
                  </span>
                  <span className="absolute inset-0 bg-cyber-green/10 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
                </Link>
                <Link
                  href="/history"
                  className="cyber-btn cyber-btn--crimson text-sm lg:text-base relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    VIEW HISTORY
                  </span>
                  <span className="absolute inset-0 bg-cyber-crimson/10 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
                </Link>
              </div>

              {/* Quick stats under CTA */}
              <div className="mt-8 flex justify-center gap-6">
                {[
                  { label: "Languages", value: "3", color: "#00FF66" },
                  { label: "Avg Time", value: "2.4s", color: "#00f0ff" },
                  { label: "Accuracy", value: "97%", color: "#7c3aed" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="font-heading text-lg font-bold tabular-nums" style={{ color: s.color }}>
                      {s.value}
                    </div>
                    <div className="font-syncopate text-[7px] text-white/20 tracking-widest uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === STATS + FEATURES === */}
      <div ref={featuresRef} className="relative z-10 px-[var(--space-page-x)] pb-4 max-w-[1400px] mx-auto w-full opacity-0">
        {/* Score rings + Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Submissions Analyzed", value: 12847, color: "#00FF66" },
            { label: "Mistakes Detected", value: 48291, color: "#FF003C" },
            { label: "Students Active", value: 892, color: "#00f0ff" },
            { label: "Avg Processing", value: 2.4, suffix: "s", color: "#7c3aed" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="p-4 text-center group hover:scale-[1.02] transition-all duration-300 border border-white/5 relative overflow-hidden"
              style={{ background: "var(--cyber-bg-900)" }}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${stat.color}60, transparent)` }}
              />

              <div className="font-heading font-bold text-2xl lg:text-3xl tabular-nums" style={{ color: stat.color }}>
                <AnimatedCounter target={stat.value} duration={2} />
                {stat.suffix && <span className="text-lg">{stat.suffix}</span>}
              </div>
              <div className="font-syncopate text-[8px] lg:text-[9px] text-white/25 mt-1 tracking-[0.2em] uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Score rings row */}
        <div className="flex justify-center gap-8 mb-6 py-4 border border-white/5"
          style={{ background: "var(--cyber-bg-900)" }}
        >
          <ScoreRing score={92} label="Accuracy" color="#00FF66" />
          <ScoreRing score={78} label="Coverage" color="#00f0ff" />
          <ScoreRing score={85} label="Quality" color="#7c3aed" />
          <ScoreRing score={96} label="Uptime" color="#FF003C" />
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>

        {/* Diagnostics + Activity */}
        <div ref={diagnosticsRef} className="grid lg:grid-cols-2 gap-3 mb-6 opacity-0">
          <SystemDiagnostics />
          <ActivityFeed />
        </div>

        {/* How It Works */}
        <div className="p-6 lg:p-8 mb-6 border border-cyber-cyan/10 relative"
          style={{ background: "var(--cyber-bg-900)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="font-syncopate text-xs tracking-[0.3em] text-cyber-cyan uppercase">
              &gt;&gt; How It Works
            </span>
            <span className="flex-1 border-t border-cyber-cyan/15" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-cyber-green/20 via-cyber-cyan/20 to-cyber-purple/20" />

            {[
              { step: "01", title: "Upload", desc: "Drop your .py, .js, or .html file or paste a URL", color: "#00FF66" },
              { step: "02", title: "Analyze", desc: "AI reviews code structure, logic, and style", color: "#00f0ff" },
              { step: "03", title: "Grade", desc: "Rubric-based scoring with detailed breakdown", color: "#7c3aed" },
              { step: "04", title: "Improve", desc: "Get explanations, corrections, and practice items", color: "#FF003C" },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 relative z-10">
                <div className="relative shrink-0">
                  <div
                    className="w-12 h-12 border flex items-center justify-center font-heading text-lg font-black"
                    style={{ borderColor: `${item.color}30`, color: item.color }}
                  >
                    {item.step}
                  </div>
                  <div
                    className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ boxShadow: `0 0 15px ${item.color}20` }}
                  />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider mb-1">
                    {item.title}
                  </h4>
                  <p className="font-body text-xs text-white/35 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {children && (
        <div className="relative z-10 p-4 lg:p-8 pt-0 max-w-[1400px] mx-auto w-full">
          <div className="p-6 border border-cyber-green/10" style={{ background: "var(--cyber-bg-900)" }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
