"use client";
import { WORK } from "@/lib/portfolio-data";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

export function WorkSection() {
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
        <Reveal delay={80}>
          <div className="timeline">
            {WORK.map((w, i) => (
              <div key={i} className={`tl-item ${w.current ? "tl-current" : ""}`}>
                <div className="tl-date">{w.date}</div>
                <div className="tl-role">
                  <span className="role">{w.role}</span>
                  <span className="at">@</span>
                  <span className="company">{w.company}</span>
                </div>
                <div className="tl-desc">{w.desc}</div>
                <div className="tl-tags">
                  {w.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
