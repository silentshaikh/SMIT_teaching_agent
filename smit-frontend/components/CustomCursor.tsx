"use client";

import { useEffect, useRef } from "react";

export function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.cursor = "none";

    const links = document.querySelectorAll("a, button, input, textarea, [role=button]");
    const onEnter = () => {
      outerRef.current?.style.setProperty("transform", outerRef.current.style.transform.replace("scale(1)", "scale(1.5)"));
    };
    const onLeave = () => {
      outerRef.current?.style.setProperty("transform", outerRef.current.style.transform.replace("scale(1.5)", "scale(1)"));
    };

    links.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    const onMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${x}px, ${y}px) scale(1)`;
      }
      if (innerRef.current) {
        innerRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    document.addEventListener("mousemove", onMove);

    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      links.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);

  return (
    <>
      {/* Trail */}
      <div
        ref={trailRef}
        className="pointer-events-none fixed top-0 left-0 z-[9998] -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-cyber-green/20 rounded-full transition-[width,height] duration-300"
        style={{ boxShadow: "0 0 12px rgba(0,255,102,0.08)" }}
      />
      {/* Outer ring */}
      <div
        ref={outerRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] -translate-x-1/2 -translate-y-1/2 w-7 h-7 border border-cyber-green/70 rounded-full transition-[width,height] duration-200"
        style={{ boxShadow: "0 0 10px rgba(0,255,102,0.4), inset 0 0 6px rgba(0,255,102,0.15)" }}
      >
        {/* Crosshair lines */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-px h-1.5 bg-cyber-green/60" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-px h-1.5 bg-cyber-green/60" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-1.5 h-px bg-cyber-green/60" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-1.5 h-px bg-cyber-green/60" />
        </div>
      </div>
      {/* Inner dot */}
      <div
        ref={innerRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-cyber-green rounded-full"
        style={{ boxShadow: "0 0 6px #00FF66" }}
      />
    </>
  );
}
