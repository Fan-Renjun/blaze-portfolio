"use client";
import {
  useCallback, useEffect, useRef, useState, KeyboardEvent,
} from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Application } from "@splinetool/runtime";
import type { SplineProps } from "@splinetool/react-spline";

const Spline = dynamic<SplineProps>(
  () => import("@splinetool/react-spline"),
  { ssr: false, loading: () => null }
);

const SCENE  = "https://prod.spline.design/GCN6opbKSvziT6Vw/scene.splinecode";
const SIZE   = 80;
const PANELW = 480;
const BOTTOM = "max(28px, calc(env(safe-area-inset-bottom) + 12px))";

type Phase   = "idle" | "active";
type Message = { id: string; role: "user" | "assistant"; content: string };

export function ChatBot() {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [shown, setShown]       = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);

  const splineRef    = useRef<Application | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const abortRef     = useRef<AbortController | null>(null);

  // ── Scroll: hide while scrolling ─────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setShown(false);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(true), 380);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(timer); };
  }, []);

  // ── Click outside → idle ──────────────────────────────────
  useEffect(() => {
    if (phase !== "active") return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        abortRef.current?.abort();
        setPhase("idle");
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 80);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Auto-scroll messages ──────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus input when active ───────────────────────────────
  useEffect(() => {
    if (phase === "active") setTimeout(() => inputRef.current?.focus(), 200);
  }, [phase]);

  // ── Spline onLoad ─────────────────────────────────────────
  const handleLoad = useCallback((spline: Application) => {
    if (spline.getAllObjects().length === 0) return;
    splineRef.current = spline;
  }, []);

  // ── Send message ──────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    const aId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: aId, role: "assistant", content: "" }]);

    abortRef.current = new AbortController();
    try {
      const history = messages.filter(m => m.content).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body!.getReader();
      const dec    = new TextDecoder();
      let   buf    = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === "delta" && evt.content)
              setMessages(p => p.map(m => m.id === aId ? { ...m, content: m.content + evt.content } : m));
          } catch { /* partial */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError")
        setMessages(p => p.map(m => m.id === aId ? { ...m, content: "请求出错，请稍后再试。" } : m));
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleStop = () => { abortRef.current?.abort(); setLoading(false); };

  // ── Render ────────────────────────────────────────────────
  const shownStyle = { opacity: shown ? 1 : 0, transition: "opacity 0.3s ease, transform 0.3s ease" };

  return (
    <>
      {/* ── 球体（始终挂载，idle 时可见） ── */}
      <motion.div
        animate={{ opacity: shown && phase === "idle" ? 1 : 0, scale: phase === "idle" ? 1 : 0.85 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={() => phase === "idle" && setPhase("active")}
        style={{
          position:     "fixed",
          bottom:       BOTTOM,
          left:         "50%",
          translateX:   "-50%",
          zIndex:       200,
          width:        SIZE,
          height:       SIZE,
          borderRadius: "50%",
          overflow:     "hidden",
          cursor:       "pointer",
          pointerEvents: phase === "idle" ? "auto" : "none",
        }}
      >
        <Spline scene={SCENE} onLoad={handleLoad} />
      </motion.div>

      {/* ── 输入框 + 对话面板 ── */}
      <AnimatePresence>
        {phase === "active" && (
          <motion.div
            key="chat"
            ref={containerRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 10 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              position:   "fixed",
              bottom:     BOTTOM,
              left:       "50%",
              translateX: "-50%",
              zIndex:     200,
              width:      PANELW,
              maxWidth:   "calc(100vw - 32px)",
            }}
            className="flex flex-col gap-2"
          >
            {/* ── 对话面板 ── */}
            <AnimatePresence>
              {messages.length > 0 && (
                <motion.div
                  key="panel"
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ type: "spring" as const, damping: 30, stiffness: 320 }}
                  className="rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    maxHeight: "42vh",
                    background: "rgba(4,8,22,0.90)",
                    backdropFilter: "blur(48px) saturate(180%)",
                    WebkitBackdropFilter: "blur(48px) saturate(180%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 16px 56px rgba(0,3,18,0.7)",
                    ...shownStyle,
                  }}
                >
                  {/* 面板 header */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                      style={{ boxShadow: "0 0 6px rgba(52,211,153,0.9)" }}
                    />
                    <span className="text-white/65 text-[12px] font-light tracking-[0.14em]">HIM</span>
                    {loading && (
                      <span className="text-white/25 text-[10px] font-mono ml-1">生成中…</span>
                    )}
                  </div>

                  {/* 消息列表 */}
                  <div
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className="max-w-[88%] rounded-xl px-3.5 py-2 text-[13px] leading-relaxed"
                          style={msg.role === "user"
                            ? { background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.85)" }
                            : { color: "rgba(255,255,255,0.70)" }
                          }
                        >
                          {msg.content ? (
                            msg.role === "assistant" ? (
                              <div className="prose prose-invert prose-xs max-w-none
                                [&_p]:mb-1.5 [&_p:last-child]:mb-0
                                [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_code]:text-[11px]
                                [&_strong]:text-white/90 [&_ul]:pl-3.5 [&_li]:mb-0.5
                                [&_h1]:text-[13px] [&_h1]:font-semibold [&_h1]:text-white/90
                                [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-white/90">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                              </div>
                            ) : msg.content
                          ) : (
                            <span className="flex gap-1 items-center h-4">
                              {[0, 140, 280].map(d => (
                                <span key={d} className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
                                  style={{ animationDelay: `${d}ms` }} />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 输入框 ── */}
            <div
              className="flex items-center gap-2.5 rounded-2xl px-4"
              style={{
                minHeight:          52,
                background:         "rgba(5,10,26,0.85)",
                backdropFilter:     "blur(40px) saturate(160%)",
                WebkitBackdropFilter: "blur(40px) saturate(160%)",
                border:             "1px solid rgba(255,255,255,0.11)",
                boxShadow:          "0 8px 40px rgba(0,3,20,0.55)",
                ...shownStyle,
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="问问 HIM 吧~"
                disabled={loading}
                className="flex-1 bg-transparent text-white/82 placeholder-white/30 text-[13px]
                  resize-none outline-none leading-relaxed py-3.5 disabled:opacity-40"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />

              {/* 发送 / 停止 按钮 */}
              {loading ? (
                <button
                  onClick={handleStop}
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}
                  title="停止生成"
                >
                  {/* 方形 stop 图标（参考 Claude/ChatGPT 风格） */}
                  <svg viewBox="0 0 10 10" className="w-3 h-3">
                    <rect x="1" y="1" width="8" height="8" rx="1.5" fill="rgba(255,255,255,0.85)" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                    transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{
                    background:   input.trim() ? "rgba(100,140,255,0.28)" : "rgba(255,255,255,0.07)",
                    border:       `1px solid ${input.trim() ? "rgba(100,140,255,0.45)" : "rgba(255,255,255,0.10)"}`,
                  }}
                  title="发送"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.82)"
                    strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
