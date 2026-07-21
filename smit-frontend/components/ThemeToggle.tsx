"use client";

import { useState, useEffect, useRef } from "react";

type Theme = "dark" | "light";

const THEMES: Record<Theme, { bg: string; next: Theme; label: string }> = {
  dark: { bg: "#0a0a0a", next: "light", label: "DARK" },
  light: { bg: "#E8FFFE", next: "dark", label: "LIGHT" },
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isAnimating, setIsAnimating] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function handleToggle() {
    if (isAnimating) return;
    setIsAnimating(true);

    // Animate icon rotation
    if (iconRef.current) {
      iconRef.current.style.transition = "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
      iconRef.current.style.transform = theme === "dark" ? "rotate(360deg)" : "rotate(-360deg)";
    }

    // Flash glow
    if (glowRef.current) {
      glowRef.current.style.opacity = "1";
      glowRef.current.style.transform = "scale(1.5)";
      setTimeout(() => {
        if (glowRef.current) {
          glowRef.current.style.opacity = "0";
          glowRef.current.style.transform = "scale(1)";
        }
      }, 400);
    }

    // Slide indicator
    const nextTheme = THEMES[theme].next;
    if (indicatorRef.current) {
      indicatorRef.current.style.transform = nextTheme === "light" ? "translateX(100%)" : "translateX(0%)";
    }

    // Apply theme after slide starts
    setTimeout(() => {
      document.body.style.transition = "background-color 0.5s ease, color 0.5s ease";
      document.body.style.backgroundColor = THEMES[nextTheme].bg;
      setTheme(nextTheme);

      setTimeout(() => {
        setIsAnimating(false);
        if (iconRef.current) {
          iconRef.current.style.transition = "none";
          iconRef.current.style.transform = "rotate(0deg)";
        }
      }, 500);
    }, 150);
  }

  return (
    <button
      onClick={handleToggle}
      data-magnetic="true"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex items-center gap-0 p-0 border rounded-full cursor-pointer transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-cyber-green overflow-hidden"
      style={{
        width: 92,
        height: 32,
        background: theme === "light" ? "rgba(0,31,26,0.06)" : "rgba(255,255,255,0.05)",
        borderColor: theme === "light" ? "rgba(0,122,106,0.2)" : "rgba(255,255,255,0.15)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Glow effect */}
      <div
        ref={glowRef}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,255,102,0.3) 0%, transparent 70%)",
          opacity: 0,
          transform: "scale(1)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      />

      {/* Sliding indicator */}
      <div
        ref={indicatorRef}
        className="absolute top-0.5 left-0.5 bottom-0.5 rounded-full"
        style={{
          width: "calc(50% - 2px)",
          background: "linear-gradient(135deg, rgba(0,255,102,0.2) 0%, rgba(0,240,255,0.1) 100%)",
          border: "1px solid rgba(0,255,102,0.3)",
          boxShadow: "0 0 12px rgba(0,255,102,0.15), inset 0 0 8px rgba(0,255,102,0.1)",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: theme === "dark" ? "translateX(0%)" : "translateX(100%)",
        }}
      />

      {/* Moon icon */}
      <div
        className="relative z-10 flex items-center justify-center flex-1"
        style={{ height: 28 }}
      >
        <div
          ref={theme === "dark" ? iconRef : undefined}
          className="flex items-center justify-center"
          style={{
            opacity: theme === "dark" ? 1 : 0.3,
            transition: "opacity 0.3s ease",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme === "dark" ? "#00FF66" : "rgba(0,122,106,0.4)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
      </div>

      {/* Sun icon */}
      <div
        className="relative z-10 flex items-center justify-center flex-1"
        style={{ height: 28 }}
      >
        <div
          ref={theme === "light" ? iconRef : undefined}
          className="flex items-center justify-center"
          style={{
            opacity: theme === "light" ? 1 : 0.3,
            transition: "opacity 0.3s ease",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme === "light" ? "#00A693" : "rgba(255,255,255,0.3)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </div>
      </div>
    </button>
  );
}
