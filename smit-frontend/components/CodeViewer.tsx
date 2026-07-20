"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

function useWindowSize() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setWidth(window.innerWidth);
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[260px] border border-cyber-green/20 bg-cyber-black">
        <span className="font-space-mono text-sm tracking-widest text-cyber-green/50 animate-pulse-neon">
          LOADING EDITOR...
        </span>
      </div>
    ),
  }
);

interface CodeViewerProps {
  original: string;
  modified: string;
  language: "javascript" | "python" | "html";
}

export function CodeViewer({ original, modified, language }: CodeViewerProps) {
  const width = useWindowSize();
  const editorHeight = width < 768 ? "260px" : width < 1024 ? "360px" : "480px";
  const fontSize = width < 768 ? 12 : width < 1024 ? 13 : 14;
  const lineNumbers = width < 768 ? "off" : "on";
  const minimap = width >= 1024;

  return (
    <div
      className="border border-cyber-green/30 bg-cyber-black overflow-hidden"
      style={{ boxShadow: "0 0 12px rgba(0,255,102,0.1)" }}
    >
      <MonacoDiffEditor
        original={original}
        modified={modified}
        language={language}
        theme="vs-dark"
        height={editorHeight}
        options={{
          readOnly: true,
          renderSideBySide: width >= 768,
          minimap: { enabled: minimap },
          fontSize,
          fontFamily: "JetBrains Mono, monospace",
          lineNumbers,
        }}
      />
    </div>
  );
}
