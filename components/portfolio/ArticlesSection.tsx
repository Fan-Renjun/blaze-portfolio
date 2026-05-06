"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Article } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { Modal } from "./Modal";

// ── easing ────────────────────────────────────────────────
const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── stagger variants ──────────────────────────────────────
const bodyVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};
const childVariant = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: EXPO } },
};

// ── single accordion item ─────────────────────────────────
function AccordionItem({
  article,
  isOpen,
  onOpen,
  onClose,
  onRead,
  isFirst,
}: {
  article: Article;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onRead: (a: Article) => void;
  isFirst: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      className={`acc-item${isOpen ? " is-open" : ""}${isFirst ? " is-first" : ""}`}
      onMouseEnter={() => { setHovered(true); onOpen(); }}
      onMouseLeave={() => { setHovered(false); onClose(); }}
    >
      {/* top 1px inner highlight on hover */}
      <motion.div
        className="acc-highlight"
        animate={{ opacity: hovered || isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* ── always-visible: row 1 (header) + row 2 (summary) ── */}
      <div
        className="acc-header"
        onClick={() => onRead(article)}   /* click → open full article */
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && onRead(article)}
        aria-expanded={isOpen}
      >
        {/* row 1 */}
        <div className="acc-row">
          <span className="acc-date">{article.publish_date ?? "—"}</span>
          <span className="acc-title">{article.title}</span>
          {article.category && <span className="acc-cat">{article.category}</span>}
          <motion.span
            className="acc-chevron"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.32, ease: EXPO }}
            aria-hidden
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 6l4 4 4-4"/>
            </svg>
          </motion.span>
        </div>

        {/* row 2: summary — always visible, aligned with title */}
        {article.summary && (
          <div className="acc-summary-row">
            <p className="acc-summary">{article.summary}</p>
          </div>
        )}
      </div>

      {/* ── expanded: body preview below summary ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EXPO }}
            style={{ overflow: "hidden" }}
          >
            <motion.div
              className="acc-body"
              variants={bodyVariants}
              initial="hidden"
              animate="show"
            >
              {article.content && (
                <motion.p className="acc-preview" variants={childVariant}>
                  {article.content.replace(/[#*`>\n]/g, " ").slice(0, 160).trim()}
                  {article.content.length > 160 ? "…" : ""}
                </motion.p>
              )}
              {article.category && (
                <motion.div className="acc-footer" variants={childVariant}>
                  <span className="acc-body-tag">{article.category}</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── main section ──────────────────────────────────────────
export function ArticlesSection() {
  const [articles, setArticles]         = useState<Article[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [openId, setOpenId]             = useState<string | null>(null);
  const [readArticle, setReadArticle]   = useState<Article | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("articles")
      .select("*")
      .order("publish_date", { ascending: false })
      .then(({ data }) => setArticles((data as Article[]) ?? []));
  }, []);

  const categories = Array.from(
    new Set(articles.map(a => a.category).filter(Boolean) as string[])
  );

  const handleFilter = (v: string | null) => {
    setActiveFilter(v);
    setOpenId(null);
  };

  const [showAll, setShowAll] = useState(false);

  const filtered = activeFilter
    ? articles.filter(a => a.category === activeFilter)
    : articles;

  const visible = showAll ? filtered : filtered.slice(0, 5);

  const openItem  = (id: string) => setOpenId(id);
  const closeItem = (id: string) => setOpenId(prev => prev === id ? null : prev);

  return (
    <section className="section" id="articles">
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="WRITING / 文章"
            title="想法的延长线"
            sub="不定期更新关于 AI、产品、开发、设计的思考。"
          />
        </Reveal>

        {/* filter bar */}
        {categories.length > 0 && (
          <Reveal delay={20}>
            <div className="photo-filter-bar" style={{ marginBottom: 0 }}>
              <div className="photo-filters">
                <button
                  className={`photo-filter-btn${activeFilter === null ? " active" : ""}`}
                  onClick={() => handleFilter(null)}
                >全部</button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`photo-filter-btn${activeFilter === cat ? " active" : ""}`}
                    onClick={() => handleFilter(cat)}
                  >{cat}</button>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* accordion list */}
        <Reveal delay={40}>
          <motion.div className="acc-list" layout>
            {visible.map((a, i) => (
              <AccordionItem
                key={a.id}
                article={a}
                isOpen={openId === a.id}
                onOpen={() => openItem(a.id)}
                onClose={() => closeItem(a.id)}
                onRead={setReadArticle}
                isFirst={i === 0}
              />
            ))}
            {filtered.length === 0 && (
              <p style={{ color: "var(--fg-3)", fontSize: 14, padding: "24px 0" }}>
                该分类暂无文章。
              </p>
            )}
          </motion.div>

          {/* 查看全部 */}
          {filtered.length > 5 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <button
                className="expand-btn"
                onClick={() => { setShowAll(v => !v); setOpenId(null); }}
              >
                <span>{showAll ? "收起" : `查看全部文章 (${filtered.length})`}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d={showAll ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}/>
                </svg>
              </button>
            </div>
          )}
        </Reveal>
      </div>

      {/* full article modal */}
      <Modal
        open={!!readArticle}
        onClose={() => setReadArticle(null)}
        eyebrow={readArticle ? `${readArticle.category ?? "文章"} · ${readArticle.publish_date ?? ""}` : ""}
        title={readArticle?.title}
      >
        {readArticle && (
          <>
            <div style={{ display: "flex", gap: 14, color: "var(--fg-3)", fontSize: 13, marginBottom: 24 }}>
              {readArticle.publish_date && (
                <span style={{ fontFamily: "var(--font-mono)" }}>{readArticle.publish_date}</span>
              )}
              {readArticle.category && <><span>·</span><span>{readArticle.category}</span></>}
            </div>
            {readArticle.summary && (
              <p style={{ color: "var(--fg-2)", fontSize: 16, lineHeight: 1.85, textWrap: "pretty", marginBottom: 24 }}>
                {readArticle.summary}
              </p>
            )}
            {readArticle.content && (
              <div className="md-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {readArticle.content}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </Modal>
    </section>
  );
}
