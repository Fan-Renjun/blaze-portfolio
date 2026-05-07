"use client";
import { useEffect, useRef, useState, useCallback, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SourceChunk } from "@/app/api/chat/route";

// ── Types ────────────────────────────────────────────────────
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
};

// ── Suggested prompts ────────────────────────────────────────
const SUGGESTIONS = [
  "什么是 RAG？它和 Fine-tuning 有什么区别？",
  "AI Agent 的核心架构是什么？",
  "如何设计 AI Native 产品的用户体验？",
];

// ── Single source chip + expandable detail ───────────────────
function SourceItem({ chunk, index }: { chunk: SourceChunk; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cb-source-item">
      <button
        className={`cb-source-chip${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title={chunk.docName ?? `片段 ${index + 1}`}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M4 2h6l3 3v9H4V2z"/><path d="M10 2v3h3"/>
        </svg>
        <span>{chunk.docName ? chunk.docName.replace(/\.[^.]+$/, "") : `来源 ${index + 1}`}</span>
        <span className="cb-source-score">{(chunk.score * 100).toFixed(0)}%</span>
      </button>
      {open && (
        <div className="cb-source-detail">
          <p>{chunk.content}</p>
        </div>
      )}
    </div>
  );
}

// ── Main ChatBot ─────────────────────────────────────────────
export function ChatBot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    setLoading(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", sources: [] }]);

    abortRef.current = new AbortController();

    try {
      const history = messages
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;

          try {
            const evt = JSON.parse(raw);
            if (evt.type === "sources") {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, sources: evt.data } : m)
              );
            } else if (evt.type === "delta" && evt.content) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: m.content + evt.content } : m)
              );
            }
          } catch {
            // partial JSON in buffer — ignore
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "抱歉，请求出错了，请稍后再试。" } : m
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        className={`cb-trigger${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="AI 知识助手"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10H2l3.5-3.5A9.96 9.96 0 0 1 2 12 10 10 0 0 1 12 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="cb-panel" role="dialog" aria-label="AI 知识助手">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-header-left">
              <span className="cb-header-dot" />
              <span className="cb-header-title">AI 知识助手</span>
            </div>
            <div className="cb-header-right">
              <span className="cb-header-model">DeepSeek V3</span>
              <button className="cb-close" onClick={handleClose} aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="cb-messages">
            {messages.length === 0 && (
              <div className="cb-empty">
                <div className="cb-empty-icon">
                  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    <circle cx="24" cy="24" r="20"/>
                    <path d="M16 20h16M16 28h10"/>
                    <circle cx="32" cy="28" r="4" fill="currentColor" fillOpacity=".15"/>
                    <path d="M30 28h4M32 26v4"/>
                  </svg>
                </div>
                <p className="cb-empty-title">有什么想了解的？</p>
                <p className="cb-empty-sub">基于 AI 技术、产品与商业知识库</p>
                <div className="cb-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="cb-suggestion" onClick={() => sendMessage(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`cb-msg cb-msg-${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="cb-avatar">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <circle cx="10" cy="10" r="8"/>
                      <path d="M7 9h.01M10 9h.01M13 9h.01"/>
                    </svg>
                  </div>
                )}
                <div className="cb-bubble">
                  {msg.role === "assistant" ? (
                    <>
                      {msg.content ? (
                        <div className="cb-md">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="cb-typing"><span/><span/><span/></span>
                      )}
                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="cb-sources">
                          <span className="cb-sources-label">参考来源</span>
                          {msg.sources.map((chunk, i) => (
                            <SourceItem key={i} chunk={chunk} index={i} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="cb-input-wrap">
            <textarea
              ref={inputRef}
              className="cb-input"
              placeholder="输入问题，Enter 发送，Shift+Enter 换行…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="cb-send"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label="发送"
            >
              {loading ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" strokeDasharray="20 40" className="cb-spin"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
