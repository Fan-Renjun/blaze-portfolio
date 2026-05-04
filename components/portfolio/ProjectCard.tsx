"use client";
import { useCallback } from "react";
import type { Project } from "@/lib/portfolio-data";

interface ProjectCardProps {
  p: Project;
  onOpen: (p: Project) => void;
}

export function ProjectCard({ p, onOpen }: ProjectCardProps) {
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);

  return (
    <div className="card" onMouseMove={onMove} onClick={() => onOpen(p)}>
      <div className="corner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M7 17L17 7M9 7h8v8"/>
        </svg>
      </div>
      <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 14 }}>
        {p.company} · {p.period}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.01em", marginBottom: 10 }}>{p.name}</div>
      <div style={{ color: "var(--fg-2)", fontSize: 14, lineHeight: 1.7, textWrap: "pretty", marginBottom: 18 }}>{p.summary}</div>
      <div className="proj-stack">
        {p.stack.slice(0, 3).map((s) => <span key={s} className="tag">{s}</span>)}
        {p.stack.length > 3 ? <span className="tag" style={{ color: "var(--fg-3)" }}>+{p.stack.length - 3}</span> : null}
      </div>
    </div>
  );
}
