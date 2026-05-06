"use client";
import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  type SpringOptions,
} from "framer-motion";
import type { Project } from "@/lib/types";

const SPRING: SpringOptions = { stiffness: 260, damping: 26, mass: 0.55 };

interface ProjectCardProps {
  p: Project;
  onOpen: (p: Project) => void;
}

export function ProjectCard({ p, onOpen }: ProjectCardProps) {
  const ref     = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);

  // normalised -0.5 … 0.5 mouse offset relative to card centre
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // spring-smoothed 3D rotation
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), SPRING);
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-7,  7]), SPRING);

  // image parallax (moves ~2× more than the card)
  const imgX = useSpring(useTransform(mx, [-0.5, 0.5], [-16, 16]), SPRING);
  const imgY = useSpring(useTransform(my, [-0.5, 0.5], [-12, 12]), SPRING);

  // disable on touch/mobile
  const noTilt = typeof window !== "undefined" && window.matchMedia("(hover:none)").matches;

  const track = (e: React.MouseEvent<HTMLDivElement>) => {
    if (noTilt || !ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    mx.set(nx); my.set(ny);
    // update CSS vars for spotlight
    ref.current.style.setProperty("--sx", `${(nx + 0.5) * 100}%`);
    ref.current.style.setProperty("--sy", `${(ny + 0.5) * 100}%`);
  };

  const enter = () => setOver(true);
  const leave = () => {
    setOver(false);
    mx.set(0); my.set(0);
  };

  return (
    <div
      ref={ref}
      className="pc3-outer"
      onMouseMove={track}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onClick={() => onOpen(p)}
    >
      <motion.div
        className={`pc3-card${over ? " is-over" : ""}`}
        style={{}}
        animate={{
          boxShadow: over
            ? "0 28px 64px rgba(20,50,180,.25), 0 8px 20px rgba(0,0,0,.4)"
            : "0 4px 18px rgba(0,0,0,.18)",
        }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── spotlight (hand-torch effect) ── */}
        <div className="pc3-spotlight" />

        {/* ── border shimmer ── */}
        <div className={`pc3-shimmer${over ? " visible" : ""}`} />

        {/* ── image area with overlaid labels ── */}
        <div className="pc3-img-area">
          {p.image_url ? (
            <motion.img
              src={p.image_url}
              alt={p.title}
              className="pc3-img"
              style={{ x: noTilt ? 0 : imgX, y: noTilt ? 0 : imgY }}
            />
          ) : (
            <div className="pc3-img-placeholder" />
          )}

          {/* company pill — top left */}
          <span className="pc3-pill">{p.company}</span>

          {/* arrow — top right, appears on hover */}
          <motion.div
            className="pc3-arrow"
            initial={false}
            animate={over ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: -5, y: 5 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 13L13 3M6 3h7v7"/>
            </svg>
          </motion.div>
        </div>

        {/* ── content below image ── */}
        <div className="pc3-body">
          <div className="pc3-period">{p.period}</div>
          <div className="pc3-title">{p.title}</div>
          <div className="pc3-desc">{p.description}</div>

          {/* tech params: tags styled as metric labels */}
          {p.tags.length > 0 && (
            <div className="pc3-params">
              {p.tags.slice(0, 3).map(t => (
                <span key={t} className="pc3-param">{t}</span>
              ))}
              {p.tags.length > 3 && (
                <span className="pc3-param pc3-param-more">+{p.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* company footer */}
          <div className="pc3-company-row">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="pc3-company-icon">
              <rect x="2" y="6" width="12" height="9" rx="1"/>
              <path d="M5 6V4a3 3 0 016 0v2"/>
              <circle cx="8" cy="10.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            <span className="pc3-company-name">{p.company}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
