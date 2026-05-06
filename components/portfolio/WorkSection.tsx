"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { WORK } from "@/lib/portfolio-data";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

export function WorkSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const cardRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const circleRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const connectorRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    circleRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.to(el, { scale: i === activeIdx ? 1.1 : 1, duration: 0.28, ease: "power3.out" });
    });
    connectorRefs.current.forEach((el, i) => {
      if (!el) return;
      const drawn   = i < activeIdx;
      const current = i === activeIdx - 1;
      gsap.to(el, {
        scaleY: drawn ? 1 : 0,
        opacity: drawn ? 1 : current ? 0.45 : 0.2,
        duration: current ? 0.6 : 0.3,
        ease: "power2.out",
        transformOrigin: "top center",
      });
    });
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      gsap.to(card, { scale: i === activeIdx ? 1.015 : 1, duration: 0.28, ease: "power3.out" });
    });
  }, [activeIdx]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--wx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--wy", `${e.clientY - r.top}px`);
  }, []);

  return (
    <section className="section" id="work">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="EXPERIENCE / 工作履历"
            title="把 AI 做成真实的产品"
            sub="从美团到阿里，关注消费者侧的 AI 服务体验。"
          />
        </Reveal>

        <Reveal delay={60}>
          <div className="wt-wrapper">

            {/* ── Left: timeline ── */}
            <div className="wt-timeline">
              {WORK.map((w, i) => (
                <div key={i} className="wt-item">
                  <div className="wt-left">
                    <div
                      ref={el => { circleRefs.current[i] = el; }}
                      className={`wt-circle${activeIdx === i ? " is-active" : ""}`}
                      onClick={() => setActiveIdx(i)}
                    >
                      <span className="wt-circle-num">{String(i + 1).padStart(2, "0")}</span>
                      {activeIdx === i && <span className="wt-circle-ring" />}
                    </div>
                    {i < WORK.length - 1 && (
                      <div className="wt-connector-wrap">
                        <div className="wt-connector-bg" />
                        <div
                          ref={el => { connectorRefs.current[i] = el; }}
                          className="wt-connector-fill"
                          style={{ transform: "scaleY(0)", opacity: 0.2 }}
                        />
                      </div>
                    )}
                  </div>
                  <div
                    ref={el => { cardRefs.current[i] = el; }}
                    className={`wt-card${activeIdx === i ? " is-active" : ""}${w.current ? " is-current" : ""}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseMove={onMouseMove}
                  >
                    <div className="wt-card-glow" />
                    <span className="wt-ann top-right">SOURCE MAP</span>
                    <span className="wt-ann bottom-right">trace:{String(i + 1).padStart(3, "0")}</span>
                    <div className="wt-progress-track">
                      <div className="wt-progress-fill" style={{ width: w.current ? "88%" : "46%" }} />
                    </div>
                    <div className="wt-card-header">
                      <span className="wt-date">{w.date}</span>
                      {w.current && <span className="wt-now-badge">NOW</span>}
                    </div>
                    <div className="wt-role">
                      <span className="wt-role-title">{w.role}</span>
                      <span className="wt-at"> @ </span>
                      <span className="wt-company">{w.company}</span>
                    </div>
                    <p className="wt-desc">{w.desc}</p>
                    <div className="wt-tags">
                      {w.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Right: portrait (sticky, vertically centred) ── */}
            <div className="wt-portrait-col">
              <div className="wt-portrait">
                <img src="/portrait.jpg" alt="范任君" className="wt-portrait-img" />
                <div className="wt-portrait-fade" />
                <div className="wt-portrait-label">
                  <span className="wt-portrait-name">范任君</span>
                  <span className="wt-portrait-role">AI Product Manager</span>
                </div>
              </div>
            </div>

          </div>
        </Reveal>
      </div>
    </section>
  );
}
