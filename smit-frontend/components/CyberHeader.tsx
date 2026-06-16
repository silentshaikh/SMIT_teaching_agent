"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const navLinks = [
  { href: "/submit", label: "Submit" },
  { href: "/history", label: "History" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rubrics", label: "Rubrics" },
];

export function CyberHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "none" } });

      tl.fromTo(
        headerRef.current,
        { y: -80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
      );

      tl.fromTo(
        badgeRef.current,
        { scale: 0, rotation: -90 },
        { scale: 1, rotation: 0, duration: 0.25, ease: "back.out(4)" },
        "-=0.15"
      );

      tl.fromTo(
        linksRef.current?.children ?? [],
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.15, stagger: 0.04, ease: "power2.out" },
        "-=0.1"
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={headerRef}
      className="relative z-30 border-b border-cyber-green/20 bg-cyber-black/90 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between h-12 lg:h-14">
        <Link href="/" className="flex items-center gap-3 group">
          <span
            ref={badgeRef}
            className="inline-flex items-center justify-center w-7 h-7 border border-cyber-green bg-cyber-black text-cyber-green font-michroma text-[9px] tracking-widest"
            style={{ boxShadow: "0 0 8px rgba(0,255,102,0.2)" }}
          >
            SM
          </span>
          <span className="font-syncopate text-[10px] lg:text-xs tracking-[0.3em] text-cyber-green/60 uppercase hidden sm:inline">
            AI Teaching Core
          </span>
        </Link>

        <nav ref={linksRef} className="flex items-center gap-1 lg:gap-2">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 font-syncopate text-[9px] lg:text-[10px] tracking-[0.3em] text-cyber-green/50 hover:text-cyber-green hover:bg-cyber-green/5 border border-transparent hover:border-cyber-green/30 uppercase transition-all duration-150"
            >
              [{l.label}]
            </Link>
          ))}
          <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-1 border border-cyber-purple/30">
            <span className="w-1.5 h-1.5 bg-cyber-green animate-pulse-neon" />
            <span className="font-michroma text-[8px] tracking-[0.2em] text-cyber-purple/60 uppercase hidden lg:inline">
              v4.2.1
            </span>
          </span>
        </nav>
      </div>
    </header>
  );
}
