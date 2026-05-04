"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab    = "project" | "article" | "photo";
type Status = { type: "idle" | "loading" | "success" | "error"; message?: string };

// ─── helpers ──────────────────────────────────────────────────
function useStatus() {
  const [status, setStatus] = useState<Status>({ type: "idle" });
  return { status, setStatus };
}

async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  file: File,
): Promise<string> {
  const ext  = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(`图片上传失败：${error.message}`);
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return pub.publicUrl;
}

// ─── page ─────────────────────────────────────────────────────
export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab]       = useState<Tab>("project");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, [supabase]);

  if (authed === null) return <Shell><p style={s.muted}>检查登录状态…</p></Shell>;
  if (!authed) return (
    <Shell>
      <p style={s.muted}>请先 <a href="/auth/login" style={s.link}>登录</a> 后访问管理页面。</p>
    </Shell>
  );

  return (
    <Shell>
      <h1 style={s.h1}>内容管理</h1>

      <div style={s.tabs}>
        {(["project", "article", "photo"] as Tab[]).map((t) => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {{ project: "📁 项目", article: "📝 文章", photo: "📷 照片" }[t]}
          </button>
        ))}
      </div>

      {tab === "project" && <ProjectForm supabase={supabase} />}
      {tab === "article" && <ArticleForm supabase={supabase} />}
      {tab === "photo"   && <PhotoForm   supabase={supabase} />}
    </Shell>
  );
}

// ─── Project form ─────────────────────────────────────────────
const PROJ_INIT = { title: "", company: "", period: "", description: "", tags: "", external_url: "" };

function ProjectForm({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [fields, setFields]   = useState(PROJ_INIT);
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { status, setStatus } = useStatus();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f); setPreview(f ? URL.createObjectURL(f) : null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.title || !fields.company || !fields.period) {
      setStatus({ type: "error", message: "标题、公司、周期为必填项" }); return;
    }
    setStatus({ type: "loading" });
    try {
      const image_url = file ? await uploadImage(supabase, "projects", file) : null;
      const { error } = await supabase.from("projects").insert({
        title: fields.title, company: fields.company, period: fields.period,
        description: fields.description || null, image_url,
        tags: fields.tags.split(",").map((t) => t.trim()).filter(Boolean),
        external_url: fields.external_url || null,
      });
      if (error) throw new Error(error.message);
      setStatus({ type: "success", message: "项目已保存！" });
      setFields(PROJ_INIT); setFile(null); setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "未知错误" });
    }
  };

  return (
    <form onSubmit={onSubmit} style={s.form}>
      <Row label="标题 *"><input style={s.input} value={fields.title}       onChange={set("title")}       placeholder="千问 · 飞猪 Agent" /></Row>
      <Row label="公司 *"><input style={s.input} value={fields.company}     onChange={set("company")}     placeholder="Alibaba" /></Row>
      <Row label="周期 *"><input style={s.input} value={fields.period}      onChange={set("period")}      placeholder="2025.06 — Now" /></Row>
      <Row label="描述">
        <textarea style={{ ...s.input, height: 90, resize: "vertical" }} value={fields.description} onChange={set("description")} placeholder="简短描述…" />
      </Row>
      <Row label="标签（逗号分隔）">
        <input style={s.input} value={fields.tags} onChange={set("tags")} placeholder="AI Agent, RAG, Function Calling" />
      </Row>
      <Row label="跳转链接">
        <input style={s.input} value={fields.external_url} onChange={set("external_url")} placeholder="https://…" />
      </Row>
      <Row label="封面图片">
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={s.fileInput} />
        {preview && <img src={preview} alt="preview" style={s.preview} />}
      </Row>
      <StatusBanner status={status} />
      <button type="submit" disabled={status.type === "loading"} style={{ ...s.btn, opacity: status.type === "loading" ? 0.6 : 1 }}>
        {status.type === "loading" ? "提交中…" : "提交项目"}
      </button>
    </form>
  );
}

// ─── Article form ─────────────────────────────────────────────
const ART_INIT = { title: "", summary: "", publish_date: "", category: "", content: "" };
const ART_CATS = ["AI", "产品", "技术", "商业", "设计", "随笔"];

function ArticleForm({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [fields, setFields] = useState(ART_INIT);
  const { status, setStatus } = useStatus();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.title) { setStatus({ type: "error", message: "标题为必填项" }); return; }
    setStatus({ type: "loading" });
    try {
      const { error } = await supabase.from("articles").insert({
        title:        fields.title,
        summary:      fields.summary      || null,
        publish_date: fields.publish_date || null,
        category:     fields.category     || null,
        content:      fields.content      || null,
      });
      if (error) throw new Error(error.message);
      setStatus({ type: "success", message: "文章已保存！" });
      setFields(ART_INIT);
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "未知错误" });
    }
  };

  return (
    <form onSubmit={onSubmit} style={s.form}>
      <Row label="标题 *">
        <input style={s.input} value={fields.title} onChange={set("title")} placeholder="当 Agent 不只是聊天…" />
      </Row>
      <Row label="摘要">
        <textarea style={{ ...s.input, height: 72, resize: "vertical" }} value={fields.summary} onChange={set("summary")} placeholder="一句话概括文章…" />
      </Row>
      <Row label="发布日期">
        <input type="date" style={s.input} value={fields.publish_date} onChange={set("publish_date")} />
      </Row>
      <Row label="分类">
        <select style={{ ...s.input, cursor: "pointer" }} value={fields.category} onChange={set("category")}>
          <option value="">请选择分类</option>
          {ART_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Row>
      <Row label="正文（支持 Markdown）">
        <textarea
          style={{ ...s.input, height: 260, resize: "vertical", fontFamily: "monospace", fontSize: 13, lineHeight: 1.7 }}
          value={fields.content}
          onChange={set("content")}
          placeholder={`## 标题\n\n正文内容，支持 Markdown 语法…`}
        />
      </Row>
      <StatusBanner status={status} />
      <button type="submit" disabled={status.type === "loading"} style={{ ...s.btn, opacity: status.type === "loading" ? 0.6 : 1 }}>
        {status.type === "loading" ? "提交中…" : "发布文章"}
      </button>
    </form>
  );
}

// ─── Photo form ───────────────────────────────────────────────
const PHO_INIT = { category: "", location: "" };
const PHO_CATS = ["城市街景", "自然风光", "人物纪实", "建筑", "旅行", "静物"];

function PhotoForm({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [fields, setFields]   = useState(PHO_INIT);
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { status, setStatus } = useStatus();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f); setPreview(f ? URL.createObjectURL(f) : null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setStatus({ type: "error", message: "请选择要上传的图片" }); return; }
    setStatus({ type: "loading" });
    try {
      const image_url = await uploadImage(supabase, "photos", file);
      const { error } = await supabase.from("photos").insert({
        image_url,
        category: fields.category || null,
        location: fields.location || null,
      });
      if (error) throw new Error(error.message);
      setStatus({ type: "success", message: "照片已保存！" });
      setFields(PHO_INIT); setFile(null); setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "未知错误" });
    }
  };

  return (
    <form onSubmit={onSubmit} style={s.form}>
      <Row label="图片 *">
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={s.fileInput} />
        {preview && <img src={preview} alt="preview" style={s.preview} />}
      </Row>
      <Row label="分类">
        <select style={{ ...s.input, cursor: "pointer" }} value={fields.category} onChange={set("category")}>
          <option value="">请选择分类</option>
          {PHO_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Row>
      <Row label="拍摄地点">
        <input style={s.input} value={fields.location} onChange={set("location")} placeholder="Hangzhou · 西湖" />
      </Row>
      <StatusBanner status={status} />
      <button type="submit" disabled={status.type === "loading"} style={{ ...s.btn, opacity: status.type === "loading" ? 0.6 : 1 }}>
        {status.type === "loading" ? "上传中…" : "上传照片"}
      </button>
    </form>
  );
}

// ─── shared UI ────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={s.page}>
      <div style={s.card}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

function StatusBanner({ status }: { status: Status }) {
  if (status.type === "idle") return null;
  return (
    <div style={{ ...s.banner, ...s[status.type] }}>
      {status.type === "loading" && "⏳ 正在上传，请稍候…"}
      {status.type === "success" && `✅ ${status.message}`}
      {status.type === "error"   && `❌ ${status.message}`}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:      { minHeight: "100vh", background: "#0f0f12", display: "flex", justifyContent: "center", padding: "48px 16px", cursor: "auto" },
  card:      { width: "100%", maxWidth: 620, background: "#18181c", borderRadius: 12, padding: 32, border: "1px solid #2a2a30" },
  h1:        { fontSize: 20, fontWeight: 600, color: "#f0f0f5", marginBottom: 20, letterSpacing: "-.02em" },
  tabs:      { display: "flex", gap: 8, marginBottom: 28, borderBottom: "1px solid #2a2a30", paddingBottom: 16 },
  tab:       { padding: "7px 16px", borderRadius: 8, border: "1px solid #2a2a30", background: "transparent", color: "#888", fontSize: 13, cursor: "pointer" },
  tabActive: { background: "#007AFF22", borderColor: "#007AFF", color: "#7eb8ff" },
  form:      { display: "flex", flexDirection: "column", gap: 18 },
  label:     { fontSize: 11, color: "#666", fontFamily: "monospace", letterSpacing: ".08em", textTransform: "uppercase" },
  input:     { background: "#0f0f12", border: "1px solid #2a2a30", borderRadius: 8, padding: "10px 12px",
               color: "#f0f0f5", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" },
  fileInput: { fontSize: 13, color: "#aaa", cursor: "pointer" },
  preview:   { marginTop: 10, borderRadius: 8, maxWidth: "100%", maxHeight: 220, objectFit: "cover", border: "1px solid #2a2a30" },
  btn:       { marginTop: 6, padding: "12px 0", background: "#007AFF", color: "#fff", border: "none",
               borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  banner:    { padding: "10px 14px", borderRadius: 8, fontSize: 13 },
  loading:   { background: "#1e2a3a", color: "#7eb8ff" },
  success:   { background: "#0f2a1e", color: "#5bd68c" },
  error:     { background: "#2a1216", color: "#ff6b6b" },
  muted:     { color: "#888", fontSize: 14 },
  link:      { color: "#007AFF", textDecoration: "underline" },
};
