"use client";

import dynamic from "next/dynamic";

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] border border-cyber-green/20 bg-cyber-black">
        <span className="font-share-tech text-sm tracking-widest text-cyber-green/50 animate-pulse-neon">
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
        height="400px"
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "JetBrains Mono, monospace",
        }}
      />
    </div>
  );
}
