"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { ProjectCard } from "./ProjectCard";
import { Modal } from "./Modal";

// ── sort by period end date, present first ────────────────
function periodToKey(period: string): number {
  const end = period.split("—").pop()?.trim() ?? "";
  if (/now|至今|现在/i.test(end)) return Infinity;
  const nums = end.replace(/[^\d.]/g, "");
  const [y, m = "00"] = nums.split(".");
  return parseInt(y + m.padStart(2, "0"));
}

// ── constants ─────────────────────────────────────────────
const CARD_W = 320;
const GAP    = 16;

export function ProjectsSection() {
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [openProject, setOpenProject] = useState<Project | null>(null);

  const trackRef    = useRef<HTMLDivElement>(null);
  const isDragging  = useRef(false);
  const startX      = useRef(0);
  const scrollStart = useRef(0);
  const isJumping   = useRef(false);   // suppress scroll handler during teleport

  // ── fetch + sort ─────────────────────────────────────────
  useEffect(() => {
    createClient()
      .from("projects").select("*")
      .then(({ data }) => {
        const sorted = ((data as Project[]) ?? [])
          .sort((a, b) => periodToKey(b.period) - periodToKey(a.period));
        setProjects(sorted);
        setLoading(false);
      });
  }, []);

  // ── scroll to middle copy on mount ────────────────────────
  useEffect(() => {
    if (!projects.length || !trackRef.current) return;
    const oneSet = projects.length * (CARD_W + GAP);
    // spacer width = calculated by CSS: ~(50vw - CARD_W/2)
    // approximate spacer here for the jump math
    const spacer = Math.max(32, window.innerWidth / 2 - CARD_W / 2 - 8);
    trackRef.current.scrollLeft = spacer + oneSet;
  }, [projects]);

  // ── infinite loop: seamless position reset ───────────────
  const onScroll = useCallback(() => {
    if (isJumping.current || !trackRef.current || !projects.length) return;
    const track  = trackRef.current;
    const oneSet = projects.length * (CARD_W + GAP);
    const spacer = Math.max(32, window.innerWidth / 2 - CARD_W / 2 - 8);
    const { scrollLeft } = track;

    const jumpFwd  = scrollLeft < spacer + oneSet * 0.15;
    const jumpBack = scrollLeft > spacer + oneSet * 1.85;
    if (!jumpFwd && !jumpBack) return;

    isJumping.current = true;

    // Disable scroll-snap to prevent snap-animation during the instant jump
    track.style.scrollSnapType = "none";
    track.scrollLeft += jumpFwd ? oneSet : -oneSet;

    // Re-enable after two RAF cycles so the browser settles first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.scrollSnapType = "";
        isJumping.current = false;
      });
    });
  }, [projects]);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    t.addEventListener("scroll", onScroll, { passive: true });
    return () => t.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  // ── drag-to-scroll ────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    isDragging.current  = true;
    startX.current      = e.pageX - trackRef.current.offsetLeft;
    scrollStart.current = trackRef.current.scrollLeft;
    trackRef.current.style.cursor     = "grabbing";
    trackRef.current.style.userSelect = "none";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    e.preventDefault();
    const x    = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.4;
    trackRef.current.scrollLeft = scrollStart.current - walk;
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (trackRef.current) {
      trackRef.current.style.cursor     = "grab";
      trackRef.current.style.userSelect = "";
    }
  };

  // ── render helpers ────────────────────────────────────────
  // 3 copies for seamless looping
  const loopProjects = projects.length
    ? [...projects, ...projects, ...projects]
    : [];

  return (
    <section className="section" id="projects">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="PROJECTS / 项目经历"
            title="已发布与正在发生"
            sub="目前主要聚焦在AI Agent的开发、AI native的探索与落地。"
            action={
              <button
                className="ptrack-arrow"
                onClick={() => trackRef.current?.scrollBy({ left: CARD_W + GAP, behavior: "smooth" })}
                aria-label="下一个"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M5 12h14M13 5l7 7-7 7"/>
                </svg>
              </button>
            }
          />
        </Reveal>
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 16, padding: "32px 40px 12px", overflow: "hidden" }}>
          {[0,1,2].map(i => (
            <div key={i} className="ptrack-skeleton" style={{ opacity: 0.25 + i * 0.15 }} />
          ))}
        </div>
      ) : (
        <Reveal delay={40}>
          <div
            ref={trackRef}
            className="ptrack"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* left spacer: lets first card center */}
            <div className="ptrack-spacer" aria-hidden />

            {loopProjects.map((p, i) => (
              <div key={`${p.id}-${i}`} className="ptrack-item">
                <ProjectCard p={p} onOpen={setOpenProject} />
              </div>
            ))}

            {/* right spacer: lets last card center */}
            <div className="ptrack-spacer" aria-hidden />
          </div>
        </Reveal>
      )}

      {/* modal */}
      <Modal
        open={!!openProject}
        onClose={() => setOpenProject(null)}
        eyebrow={openProject ? `${openProject.company} · PROJECT` : ""}
        title={openProject?.title}
      >
        {openProject && (
          <>
            {openProject.image_url ? (
              <div className="proj-detail-img-wrap">
                <img src={openProject.image_url} alt={openProject.title} className="proj-detail-img" />
                <span className="bn">{openProject.company} · {openProject.period}</span>
              </div>
            ) : (
              <div className="proj-detail-hero">
                <span className="bn">{openProject.company} · {openProject.period}</span>
              </div>
            )}
            <div className="kv-grid">
              <div className="kv"><div className="k">Company</div><div className="v">{openProject.company}</div></div>
              <div className="kv"><div className="k">Period</div><div className="v">{openProject.period}</div></div>
              <div className="kv"><div className="k">Tags</div><div className="v">{openProject.tags.length} 项</div></div>
            </div>
            {openProject.description && (
              <><div className="body-h">概述</div>
              <p style={{ color: "var(--fg-2)", lineHeight: 1.8, fontSize: 15 }}>{openProject.description}</p></>
            )}
            {openProject.tags.length > 0 && (
              <><div className="body-h">技术标签</div>
              <div className="proj-stack">{openProject.tags.map(t => <span key={t} className="tag">{t}</span>)}</div></>
            )}
            {openProject.external_url && (
              <div style={{ marginTop: 28 }}>
                <a href={openProject.external_url} target="_blank" rel="noreferrer" className="expand-btn" style={{ display: "inline-flex" }}>
                  查看项目
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M5 12h14M13 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            )}
          </>
        )}
      </Modal>
    </section>
  );
}
