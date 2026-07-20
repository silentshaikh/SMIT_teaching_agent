"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

gsap.registerPlugin(ScrollTrigger);

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/submit", label: "Submit" },
  { href: "/history", label: "History" },
  { href: "/progress", label: "Progress" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/submissions", label: "Submissions" },
  { href: "/rubrics", label: "Rubrics" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    if (!menuRef.current) {
      setIsOpen(false);
      return;
    }
    gsap.to(menuRef.current, {
      height: 0,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => setIsOpen(false),
    });
  }, []);

  const openMenu = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (!navRef.current) return;
    const st = ScrollTrigger.create({
      start: "top -20",
      end: 99999,
      onToggle: (self) => {
        if (!navRef.current) return;
        if (self.isActive) {
          gsap.to(navRef.current, { boxShadow: "0 4px 24px rgba(0,0,0,0.10)", duration: 0.3 });
        } else {
          gsap.to(navRef.current, { boxShadow: "none", duration: 0.3 });
        }
      },
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-hamburger]")
      ) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, closeMenu]);

  return (
    <header
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--cyber-bg)]/80 backdrop-blur-md border-b border-[var(--color-card-border)]"
    >
      {/* Desktop */}
      <div className="hidden lg:flex items-center justify-between h-16 max-w-7xl mx-auto px-[var(--space-page-x)]">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full bg-[#DFFFFD]" />
          <span className="title-orbitron font-bold text-xl synapse-gradient">
            SYNAPSE
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:opacity-70 transition-opacity duration-200"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <ThemeToggle />
      </div>

      {/* Mobile */}
      <div className="flex lg:hidden items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full bg-[#DFFFFD]" />
          <span className="title-orbitron font-bold text-lg synapse-gradient">
            SYNAPSE
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            data-hamburger
            onClick={isOpen ? closeMenu : openMenu}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="p-2 text-[var(--color-text-primary)] hover:opacity-70 transition-opacity"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {isOpen && (
        <div
          ref={menuRef}
          className="lg:hidden overflow-hidden border-t border-[var(--color-card-border)]"
          style={{
            height: 0,
            opacity: 0,
            backgroundColor: "color-mix(in srgb, var(--cyber-bg) 95%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          <nav className="flex flex-col">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeMenu}
                className="h-12 flex items-center px-6 text-base font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-card-bg)] border-b border-[var(--color-card-border)]/30 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
