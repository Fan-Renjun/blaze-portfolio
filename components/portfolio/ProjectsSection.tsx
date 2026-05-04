"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { ProjectCard } from "./ProjectCard";
import { Modal } from "./Modal";

export function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [openProject, setOpenProject] = useState<Project | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProjects((data as Project[]) ?? []);
        setLoading(false);
      });
  }, []);

  const visible = showAll ? projects : projects.slice(0, 3);

  return (
    <section className="section" id="projects">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="PROJECTS / 项目经历"
            title="已发布与正在发生"
            sub="目前主要聚焦在AI Agent的开发、AI native的探索与落地。"
            action={
              projects.length > 3 ? (
                <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                  <span>{showAll ? "收起" : `查看全部 (${projects.length})`}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                  </svg>
                </button>
              ) : null
            }
          />
        </Reveal>

        {loading ? (
          // 骨架占位
          <div className="grid-projects">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card" style={{ minHeight: 200, opacity: 0.4 }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p style={{ color: "var(--fg-3)", fontSize: 14 }}>暂无项目数据。</p>
        ) : (
          <div className="grid-projects">
            {visible.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <ProjectCard p={p} onOpen={setOpenProject} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!openProject}
        onClose={() => setOpenProject(null)}
        eyebrow={openProject ? `${openProject.company} · PROJECT` : ""}
        title={openProject?.title}
      >
        {openProject && (
          <>
            <div
              className="proj-detail-hero"
              style={openProject.image_url ? {
                backgroundImage: `url(${openProject.image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              } : undefined}
            >
              <span className="bn">{openProject.company} · {openProject.period}</span>
            </div>

            <div className="kv-grid">
              <div className="kv">
                <div className="k">Company</div>
                <div className="v">{openProject.company}</div>
              </div>
              <div className="kv">
                <div className="k">Period</div>
                <div className="v">{openProject.period}</div>
              </div>
              <div className="kv">
                <div className="k">Tags</div>
                <div className="v">{openProject.tags.length} 项</div>
              </div>
            </div>

            {openProject.description && (
              <>
                <div className="body-h">概述</div>
                <p style={{ color: "var(--fg-2)", lineHeight: 1.8, fontSize: 15, textWrap: "pretty" }}>
                  {openProject.description}
                </p>
              </>
            )}

            {openProject.tags.length > 0 && (
              <>
                <div className="body-h">技术标签</div>
                <div className="proj-stack">
                  {openProject.tags.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
              </>
            )}

            {openProject.external_url && (
              <div style={{ marginTop: 28 }}>
                <a
                  href={openProject.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="expand-btn"
                  style={{ display: "inline-flex" }}
                >
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
