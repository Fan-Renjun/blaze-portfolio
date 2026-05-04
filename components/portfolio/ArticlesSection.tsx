"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import type { Article } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { Modal } from "./Modal";

export function ArticlesSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [showAll, setShowAll]   = useState(false);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("articles")
      .select("*")
      .order("publish_date", { ascending: false })
      .then(({ data }) => setArticles((data as Article[]) ?? []));
  }, []);

  const visible = showAll ? articles : articles.slice(0, 3);

  return (
    <section className="section" id="articles">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="WRITING / 文章"
            title="想法的延长线"
            sub="不定期更新关于 AI、产品、开发、设计的随笔。"
            action={
              articles.length > 3 ? (
                <button className="expand-btn" onClick={() => setShowAll(!showAll)}>
                  <span>{showAll ? "收起" : "全部文章"}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                  </svg>
                </button>
              ) : null
            }
          />
        </Reveal>

        <div className="grid-articles">
          {visible.map((a, i) => (
            <Reveal key={a.id} delay={i * 50}>
              <div className="article-row" onClick={() => setOpenArticle(a)}>
                <div className="ar-date">{a.publish_date ?? ""}</div>
                <div>
                  <div className="ar-title">{a.title}</div>
                  <div className="ar-sub">
                    {a.summary}
                    {(a.category || a.publish_date) && (
                      <span style={{ color: "var(--fg-4)", marginLeft: 6 }}>
                        {a.category ? `· ${a.category}` : ""}
                      </span>
                    )}
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
        eyebrow={openArticle ? `${openArticle.category ?? "文章"} · ${openArticle.publish_date ?? ""}` : ""}
        title={openArticle?.title}
      >
        {openArticle && (
          <>
            <div style={{ display: "flex", gap: 14, color: "var(--fg-3)", fontSize: 13, marginBottom: 24 }}>
              {openArticle.publish_date && (
                <span style={{ fontFamily: "var(--font-mono)" }}>{openArticle.publish_date}</span>
              )}
              {openArticle.category && <><span>·</span><span>{openArticle.category}</span></>}
            </div>

            {openArticle.summary && (
              <p style={{ color: "var(--fg-2)", fontSize: 16, lineHeight: 1.85, textWrap: "pretty", marginBottom: 24 }}>
                {openArticle.summary}
              </p>
            )}

            {openArticle.content && (
              <div className="md-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {openArticle.content}
                </ReactMarkdown>
              </div>
            )}

            {openArticle.category && (
              <>
                <div className="body-h" style={{ marginTop: 28 }}>分类</div>
                <div className="proj-stack">
                  <span className="tag">{openArticle.category}</span>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </section>
  );
}
