"use client";
import { useEffect, useRef } from "react";

export function TechCursor() {
  const reticleRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const dotPos = useRef({ x: 0, y: 0 });
  const raf = useRef(0);

  useEffect(() => {
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (reticleRef.current) {
        reticleRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
        reticleRef.current.classList.remove("is-hidden");
      }
    };
    const onLeave = () => {
      reticleRef.current?.classList.add("is-hidden");
      dotRef.current?.classList.add("is-hidden");
    };
    const onEnter = () => {
      reticleRef.current?.classList.remove("is-hidden");
      dotRef.current?.classList.remove("is-hidden");
    };
    const onOver = (e: MouseEvent) => {
      const r = reticleRef.current;
      if (!r) return;
      const t = e.target as Element;
      const interactive = t.closest("a,button,[role='button'],.card,.photo,.article-row,.nav-link,.tag");
      r.classList.toggle("is-hover", !!interactive);
    };

    const tick = () => {
      dotPos.current.x += (target.current.x - dotPos.current.x) * 0.18;
      dotPos.current.y += (target.current.y - dotPos.current.y) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotPos.current.x}px, ${dotPos.current.y}px) translate(-50%,-50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver as EventListener, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver as EventListener);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <>
      <div ref={reticleRef} className="cursor-reticle is-hidden" aria-hidden="true">
        <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M2 2 L2 8 M2 2 L8 2"/>
          <path d="M26 2 L26 8 M26 2 L20 2"/>
          <path d="M2 26 L2 20 M2 26 L8 26"/>
          <path d="M26 26 L26 20 M26 26 L20 26"/>
          <circle cx="14" cy="14" r="3"/>
          <path d="M14 9 L14 11 M14 17 L14 19 M9 14 L11 14 M17 14 L19 14"/>
        </svg>
      </div>
      <div ref={dotRef} className="cursor-dot is-hidden" aria-hidden="true" />
    </>
  );
}
