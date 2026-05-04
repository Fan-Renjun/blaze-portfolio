"use client";
import { useState } from "react";
import { PROJECTS, type Project } from "@/lib/portfolio-data";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { ProjectCard } from "./ProjectCard";
import { Modal } from "./Modal";

export function ProjectsSection() {
  const [showAll, setShowAll] = useState(false);
  const [openProject, setOpenProject] = useState<Project | null>(null);
  const visible = showAll ? PROJECTS : PROJECTS.slice(0, 3);

  return (
    <section className="section" id="projects">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="PROJECTS / 项目经历"
            title="已发布与正在发生"
            sub="目前主要聚焦在AI Agent的开发、AI native的探索与落地。"
            action={
              <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                <span>{showAll ? "收起" : `查看全部 (${PROJECTS.length})`}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                </svg>
              </button>
            }
          />
        </Reveal>
        <div className="grid-projects">
          {visible.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <ProjectCard p={p} onOpen={setOpenProject} />
            </Reveal>
          ))}
        </div>
      </div>

      <Modal
        open={!!openProject}
        onClose={() => setOpenProject(null)}
        eyebrow={openProject ? `${openProject.company} · PROJECT` : ""}
        title={openProject?.name}
      >
        {openProject && (
          <>
            <div className="proj-detail-hero">
              <span className="bn">{openProject.company} · {openProject.period}</span>
            </div>
            <div className="kv-grid">
              <div className="kv"><div className="k">Period</div><div className="v">{openProject.period}</div></div>
              <div className="kv"><div className="k">Role</div><div className="v">{openProject.role}</div></div>
              <div className="kv"><div className="k">Stack</div><div className="v">{openProject.stack.length} 项</div></div>
            </div>
            <div className="body-h">概述</div>
            <p style={{ color: "var(--fg-2)", lineHeight: 1.8, fontSize: 15, textWrap: "pretty" }}>
              {openProject.summary}
            </p>
            <div className="body-h">关键工作</div>
            <ul className="bullet-list">
              {openProject.detail.map((d) => <li key={d}>{d}</li>)}
            </ul>
            <div className="body-h">影响</div>
            <div className="proj-stack">
              {openProject.impact.map((m) => <span key={m} className="tag accent">{m}</span>)}
            </div>
            <div className="body-h">技术栈</div>
            <div className="proj-stack">
              {openProject.stack.map((s) => <span key={s} className="tag">{s}</span>)}
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
