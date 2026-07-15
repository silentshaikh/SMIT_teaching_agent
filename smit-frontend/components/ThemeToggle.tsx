"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

const THEMES: Record<Theme, { bg: string; next: Theme }> = {
  dark: { bg: "#00A693", next: "light" },
  light: { bg: "#DFFFFD", next: "dark" },
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    document.body.style.transition = "background-color 0.4s ease";
    document.body.style.backgroundColor = THEMES[theme].bg;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function handleToggle() {
    setVisible(false);
    setTimeout(() => {
      setTheme((prev) => THEMES[prev].next);
      setVisible(true);
    }, 150);
  }

  return (
    <button
      onClick={handleToggle}
      data-magnetic="true"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full p-2 border-2 border-white/30 cursor-pointer hover:scale-110 transition-transform duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.15s ease",
        background:
          theme === "dark"
            ? "rgba(255,255,255,0.10)"
            : "rgba(0,166,147,0.12)",
      }}
    >
      {theme === "dark" ? (
        <Moon size={22} color="#DFFFFD" />
      ) : (
        <Sun size={22} color="#00A693" />
      )}
    </button>
  );
}
