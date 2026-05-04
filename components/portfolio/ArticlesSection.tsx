"use client";
import { useState } from "react";
import { ARTICLES, type Article } from "@/lib/portfolio-data";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { Modal } from "./Modal";

export function ArticlesSection() {
  const [showAll, setShowAll] = useState(false);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const visible = showAll ? ARTICLES : ARTICLES.slice(0, 3);

  return (
    <section className="section" id="articles">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="WRITING / 文章"
            title="想法的延长线"
            sub="不定期更新关于 AI、产品、开发、设计的随笔。"
            action={
              <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                <span>{showAll ? "收起" : "全部文章"}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                </svg>
              </button>
            }
          />
        </Reveal>
        <div className="grid-articles">
          {visible.map((a, i) => (
            <Reveal key={a.id} delay={i * 50}>
              <div className="article-row" onClick={() => setOpenArticle(a)}>
                <div className="ar-date">{a.date}</div>
                <div>
                  <div className="ar-title">{a.title}</div>
                  <div className="ar-sub">
                    {a.sub}{" "}
                    <span style={{ color: "var(--fg-4)", marginLeft: 6 }}>· {a.tag} · {a.read}</span>
                  </div>
                </div>
                <div className="ar-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M5 12h14M13 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <Modal
        open={!!openArticle}
        onClose={() => setOpenArticle(null)}
        eyebrow={openArticle ? `${openArticle.tag} · ${openArticle.date}` : ""}
        title={openArticle?.title}
      >
        {openArticle && (
          <>
            <div style={{ display: "flex", gap: 14, color: "var(--fg-3)", fontSize: 13, marginBottom: 24 }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>{openArticle.date}</span>
              <span>·</span>
              <span>{openArticle.read} read</span>
              <span>·</span>
              <span>{openArticle.tag}</span>
            </div>
            <p style={{ color: "var(--fg-2)", fontSize: 16, lineHeight: 1.85, textWrap: "pretty" }}>
              {openArticle.sub}
            </p>
            <p style={{ color: "var(--fg-3)", fontSize: 14, lineHeight: 1.85, marginTop: 18, textWrap: "pretty" }}>
              这里是文章正文的占位段落。完整内容会从博客系统中加载，目前作为弹窗预览的占位呈现。
            </p>
            <div className="body-h" style={{ marginTop: 28 }}>关键词</div>
            <div className="proj-stack">
              <span className="tag">{openArticle.tag}</span>
              <span className="tag">Long-form</span>
              <span className="tag">2026</span>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
