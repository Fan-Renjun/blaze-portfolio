"use client";
import { useCallback } from "react";
import type { Project } from "@/lib/types";

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
      {p.image_url && (
        <div style={{
          margin: "-28px -28px 20px", height: 160,
          overflow: "hidden", borderRadius: "var(--radius) var(--radius) 0 0",
          flexShrink: 0,
        }}>
          <img src={p.image_url} alt={p.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <div className="corner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M7 17L17 7M9 7h8v8"/>
        </svg>
      </div>
      <div style={{ font: "500 11px/1 var(--font-mono)", letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 14 }}>
        {p.company} · {p.period}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.01em", marginBottom: 10 }}>
        {p.title}
      </div>
      <div style={{ color: "var(--fg-2)", fontSize: 14, lineHeight: 1.7, textWrap: "pretty", marginBottom: 18 }}>
        {p.description}
      </div>
      <div className="proj-stack">
        {p.tags.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}
        {p.tags.length > 3 && (
          <span className="tag" style={{ color: "var(--fg-3)" }}>+{p.tags.length - 3}</span>
        )}
      </div>
    </div>
  );
}
