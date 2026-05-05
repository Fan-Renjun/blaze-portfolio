"use client";
import { useEffect, useRef } from "react";

export function TechCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;

    const el = cursorRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      el.classList.remove("is-hidden");
    };
    const onLeave  = () => el.classList.add("is-hidden");
    const onEnter  = () => el.classList.remove("is-hidden");
    const onOver   = (e: MouseEvent) => {
      const t = e.target as Element;
      const interactive = t.closest("a,button,[role='button'],.card,.photo,.article-row,.nav-link,.tag");
      el.classList.toggle("is-hover", !!interactive);
    };

    window.addEventListener("mousemove", onMove,  { passive: true });
    window.addEventListener("mouseover",  onOver as EventListener, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover",  onOver as EventListener);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <div ref={cursorRef} className="mech-cursor is-hidden" aria-hidden="true">
      <svg viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* ── 主指针体：角形轮廓 ── */}
        <path
          d="M3 2 L3 21 L7.5 16.5 L10.5 23 L13 22 L10 15.5 L16 15.5 Z"
          stroke="currentColor" strokeWidth="1.4"
          strokeLinecap="round" strokeLinejoin="round"
          fill="rgba(0,0,0,0.55)"
        />
        {/* ── 关节刻线（模拟机械臂分段） ── */}
        <line x1="3" y1="8"  x2="5.8" y2="8"  stroke="currentColor" strokeWidth="0.9" opacity="0.65"/>
        <line x1="3" y1="13" x2="5.8" y2="13" stroke="currentColor" strokeWidth="0.9" opacity="0.65"/>
        {/* ── 指尖高亮点 ── */}
        <circle cx="3" cy="2" r="1.2" fill="currentColor" opacity="0.9"/>
      </svg>
    </div>
  );
}
