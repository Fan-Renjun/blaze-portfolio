"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────
type Tab = "dashboard" | "photos" | "articles" | "projects" | "fitness";
type Status = { type: "idle" | "loading" | "success" | "error"; msg?: string };

interface PhotoQueueItem {
  localId: string;
  file: File;
  preview: string;
  category: string;
  location: string;
  orientation: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface Stats {
  articles: number;
  photos: number;
  byCategory: Record<string, number>;
  byLocation: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────
const CAT_OPTIONS  = ["自然风光", "人物纪实", "城市街景", "建筑", "旅行", "静物"];
const ORI_OPTIONS  = ["横屏", "竖屏"];

// ─── Helpers ──────────────────────────────────────────────────
async function uploadImage(supabase: ReturnType<typeof createClient>, bucket: string, file: File) {
  const ext  = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return pub.publicUrl;
}

// ─── Sub-components ───────────────────────────────────────────

/** Dropdown that also accepts a free-form value */
function CreatableSelect({
  value, onChange, options, placeholder = "请选择",
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  const isPreset = options.includes(value);
  const showCustom = !isPreset && value !== "";

  return (
    <div style={{ display: "flex", gap: 6, flex: 1 }}>
      <select
        style={s.input}
        value={isPreset ? value : value === "" ? "" : "__custom__"}
        onChange={e => {
          if (e.target.value === "__custom__") onChange("");
          else onChange(e.target.value);
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">自定义…</option>
      </select>
      {showCustom && (
        <input
          style={{ ...s.input, flex: 1 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="输入自定义值"
          autoFocus
        />
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
function Dashboard({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ count: articles }, { data: photos }] = await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }),
        supabase.from("photos").select("category, location"),
      ]);
      const byCategory: Record<string, number> = {};
      const byLocation: Record<string, number> = {};
      (photos ?? []).forEach((p: { category: string | null; location: string | null }) => {
        const cat = p.category || "未分类";
        const loc = p.location || "未知";
        byCategory[cat] = (byCategory[cat] || 0) + 1;
        byLocation[loc] = (byLocation[loc] || 0) + 1;
      });
      setStats({ articles: articles ?? 0, photos: (photos ?? []).length, byCategory, byLocation });
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) return <p style={s.muted}>加载统计数据…</p>;
  if (!stats) return null;

  const topLocations = Object.entries(stats.byLocation)
    .sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14 }}>
        {[
          { label: "文章", value: stats.articles, icon: "📝" },
          { label: "照片", value: stats.photos,   icon: "📷" },
          { label: "照片分类", value: Object.keys(stats.byCategory).length, icon: "🗂" },
          { label: "拍摄地点", value: Object.keys(stats.byLocation).length,  icon: "📍" },
        ].map(c => (
          <div key={c.label} style={s.statCard}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#eeeef5", fontFamily: "monospace" }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4, letterSpacing: ".06em" }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* By category */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>照片 · 按分类</h3>
          {Object.entries(stats.byCategory).sort((a,b)=>b[1]-a[1]).map(([cat, cnt]) => (
            <BarRow key={cat} label={cat} value={cnt} total={stats.photos} />
          ))}
          {Object.keys(stats.byCategory).length === 0 && <p style={s.muted}>暂无数据</p>}
        </div>

        {/* By location */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>照片 · 按拍摄地点（Top 8）</h3>
          {topLocations.map(([loc, cnt]) => (
            <BarRow key={loc} label={loc} value={cnt} total={stats.photos} />
          ))}
          {topLocations.length === 0 && <p style={s.muted}>暂无数据</p>}
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#bbb", marginBottom: 4 }}>
        <span>{label}</span><span style={{ fontFamily: "monospace" }}>{value} ({pct}%)</span>
      </div>
      <div style={{ height: 4, background: "#252530", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#007AFF", borderRadius: 2, transition: "width .4s" }} />
      </div>
    </div>
  );
}

// ─── Photos bulk upload ───────────────────────────────────────
function PhotosAdmin({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [queue, setQueue] = useState<PhotoQueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<Status>({ type: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const updateItem = (localId: string, patch: Partial<PhotoQueueItem>) =>
    setQueue(q => q.map(i => i.localId === localId ? { ...i, ...patch } : i));

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const items: PhotoQueueItem[] = files.map(f => ({
      localId: Math.random().toString(36).slice(2),
      file: f,
      preview: URL.createObjectURL(f),
      category: "",
      location: "",
      orientation: "",
      status: "pending",
    }));
    setQueue(q => [...q, ...items]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    const items: PhotoQueueItem[] = files.map(f => ({
      localId: Math.random().toString(36).slice(2),
      file: f,
      preview: URL.createObjectURL(f),
      category: "",
      location: "",
      orientation: "",
      status: "pending",
    }));
    setQueue(q => [...q, ...items]);
  };

  const removeItem = (id: string) =>
    setQueue(q => q.filter(i => i.localId !== id));

  const uploadAll = async () => {
    const pending = queue.filter(i => i.status === "pending");
    if (pending.length === 0) return;
    setUploading(true);
    setGlobalStatus({ type: "loading" });
    let success = 0, fail = 0;

    for (const item of pending) {
      updateItem(item.localId, { status: "uploading" });
      try {
        const image_url = await uploadImage(supabase, "photos", item.file);
        const { error } = await supabase.from("photos").insert({
          image_url,
          category:    item.category    || null,
          location:    item.location    || null,
          orientation: item.orientation || null,
        });
        if (error) throw new Error(error.message);
        updateItem(item.localId, { status: "done" });
        success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "上传失败";
        updateItem(item.localId, { status: "error", error: msg });
        fail++;
      }
    }
    setUploading(false);
    setGlobalStatus({
      type: fail === 0 ? "success" : "error",
      msg: `完成：${success} 张成功${fail > 0 ? `，${fail} 张失败` : ""}`,
    });
  };

  const clearDone = () => setQueue(q => q.filter(i => i.status !== "done"));
  const pendingCount = queue.filter(i => i.status === "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={s.dropZone}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: "none" }} />
        <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
        <div style={{ fontSize: 13, color: "#aaa" }}>点击或拖拽图片到此处（支持批量）</div>
      </div>

      {/* Actions */}
      {queue.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={uploadAll}
            disabled={uploading || pendingCount === 0}
            style={{ ...s.btn, opacity: (uploading || pendingCount === 0) ? 0.5 : 1, minWidth: 120 }}
          >
            {uploading ? "上传中…" : `上传全部 (${pendingCount})`}
          </button>
          <button onClick={clearDone} style={{ ...s.btnSecondary }}>清除已完成</button>
          {globalStatus.type !== "idle" && (
            <span style={{ fontSize: 13, color: globalStatus.type === "success" ? "#4dc87a" : globalStatus.type === "error" ? "#ff6b6b" : "#7eb8ff" }}>
              {globalStatus.type === "loading" ? "⏳ 上传中…" : globalStatus.msg}
            </span>
          )}
        </div>
      )}

      {/* Thumbnail grid */}
      {queue.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {queue.map(item => (
            <div key={item.localId} style={{ ...s.card, padding: 12, position: "relative" }}>
              {/* Status badge */}
              <div style={{
                position: "absolute", top: 8, right: 8, zIndex: 2,
                background: item.status === "done" ? "#0d2018" : item.status === "error" ? "#25100f" : item.status === "uploading" ? "#1e2a3a" : "#222",
                color: item.status === "done" ? "#4dc87a" : item.status === "error" ? "#ff6b6b" : item.status === "uploading" ? "#7eb8ff" : "#888",
                fontSize: 10, padding: "2px 8px", borderRadius: 6, fontFamily: "monospace",
              }}>
                {{ pending: "待上传", uploading: "上传中", done: "✓ 完成", error: "✗ 失败" }[item.status]}
              </div>

              {/* Thumbnail */}
              <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: 8, marginBottom: 10, background: "#111" }}>
                <img src={item.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>

              {/* Error message */}
              {item.error && <p style={{ fontSize: 11, color: "#ff6b6b", marginBottom: 6 }}>{item.error}</p>}

              {/* Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div>
                  <label style={s.fieldLabel}>分类 (category)</label>
                  <CreatableSelect
                    value={item.category}
                    onChange={v => updateItem(item.localId, { category: v })}
                    options={CAT_OPTIONS}
                    placeholder="请选择分类"
                  />
                </div>
                <div>
                  <label style={s.fieldLabel}>拍摄地点 (location)</label>
                  <input
                    style={s.input}
                    value={item.location}
                    onChange={e => updateItem(item.localId, { location: e.target.value })}
                    placeholder="如：Hangzhou · 西湖"
                  />
                </div>
                <div>
                  <label style={s.fieldLabel}>方向 (orientation)</label>
                  <CreatableSelect
                    value={item.orientation}
                    onChange={v => updateItem(item.localId, { orientation: v })}
                    options={ORI_OPTIONS}
                    placeholder="横屏 / 竖屏"
                  />
                </div>
              </div>

              {/* Remove */}
              {item.status !== "uploading" && (
                <button
                  onClick={() => removeItem(item.localId)}
                  style={{ marginTop: 8, background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 11 }}
                >
                  移除
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Articles ─────────────────────────────────────────────────
const ART_CATS = ["AI", "产品", "技术", "商业", "设计", "随笔"];
const ART_INIT = { title: "", summary: "", publish_date: "", category: "", content: "" };

function ArticlesAdmin({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [f, setF] = useState(ART_INIT);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const bind = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title) { setStatus({ type: "error", msg: "标题必填" }); return; }
    setStatus({ type: "loading" });
    const { error } = await supabase.from("articles").insert({
      title: f.title, summary: f.summary || null,
      publish_date: f.publish_date || null, category: f.category || null, content: f.content || null,
    });
    if (error) { setStatus({ type: "error", msg: error.message }); return; }
    setStatus({ type: "success", msg: "文章已保存！" });
    setF(ART_INIT);
  };

  return (
    <form onSubmit={submit} style={s.form}>
      <Field label="标题 *"><input style={s.input} value={f.title} onChange={bind("title")} placeholder="文章标题" /></Field>
      <Field label="摘要"><textarea style={{ ...s.input, height: 72, resize: "vertical" }} value={f.summary} onChange={bind("summary")} placeholder="一句话摘要" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="发布日期"><input type="date" style={s.input} value={f.publish_date} onChange={bind("publish_date")} /></Field>
        <Field label="分类">
          <CreatableSelect value={f.category} onChange={v => setF(p => ({ ...p, category: v }))} options={ART_CATS} placeholder="选择分类" />
        </Field>
      </div>
      <Field label="正文（Markdown）">
        <textarea style={{ ...s.input, height: 300, resize: "vertical", fontFamily: "monospace", fontSize: 13, lineHeight: 1.7 }}
          value={f.content} onChange={bind("content")} placeholder={`## 标题\n\n正文内容，支持 Markdown…`} />
      </Field>
      <StatusMsg status={status} />
      <button type="submit" disabled={status.type === "loading"} style={{ ...s.btn, opacity: status.type === "loading" ? 0.5 : 1 }}>
        {status.type === "loading" ? "保存中…" : "发布文章"}
      </button>
    </form>
  );
}

// ─── Projects ─────────────────────────────────────────────────
const PROJ_INIT = { title: "", company: "", period: "", description: "", tags: "", external_url: "" };

function ProjectsAdmin({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [f, setF] = useState(PROJ_INIT);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const bind = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.files?.[0] ?? null;
    setFile(v); setPreview(v ? URL.createObjectURL(v) : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.company || !f.period) { setStatus({ type: "error", msg: "标题、公司、周期必填" }); return; }
    setStatus({ type: "loading" });
    try {
      const image_url = file ? await uploadImage(supabase, "projects", file) : null;
      const { error } = await supabase.from("projects").insert({
        title: f.title, company: f.company, period: f.period,
        description: f.description || null, image_url,
        tags: f.tags.split(",").map(t => t.trim()).filter(Boolean),
        external_url: f.external_url || null,
      });
      if (error) throw new Error(error.message);
      setStatus({ type: "success", msg: "项目已保存！" });
      setF(PROJ_INIT); setFile(null); setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "保存失败" });
    }
  };

  return (
    <form onSubmit={submit} style={s.form}>
      <Field label="标题 *"><input style={s.input} value={f.title} onChange={bind("title")} placeholder="千问 · 飞猪 Agent" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="公司 *"><input style={s.input} value={f.company} onChange={bind("company")} placeholder="Alibaba" /></Field>
        <Field label="周期 *"><input style={s.input} value={f.period} onChange={bind("period")} placeholder="2025.06 — Now" /></Field>
      </div>
      <Field label="描述"><textarea style={{ ...s.input, height: 88, resize: "vertical" }} value={f.description} onChange={bind("description")} placeholder="简短描述…" /></Field>
      <Field label="标签（逗号分隔）"><input style={s.input} value={f.tags} onChange={bind("tags")} placeholder="AI Agent, RAG" /></Field>
      <Field label="跳转链接"><input style={s.input} value={f.external_url} onChange={bind("external_url")} placeholder="https://…" /></Field>
      <Field label="封面图片">
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ fontSize: 13, color: "#aaa", cursor: "pointer" }} />
        {preview && <img src={preview} alt="" style={{ marginTop: 8, borderRadius: 8, maxWidth: "100%", maxHeight: 180, objectFit: "cover", border: "1px solid #252530" }} />}
      </Field>
      <StatusMsg status={status} />
      <button type="submit" disabled={status.type === "loading"} style={{ ...s.btn, opacity: status.type === "loading" ? 0.5 : 1 }}>
        {status.type === "loading" ? "保存中…" : "提交项目"}
      </button>
    </form>
  );
}

// ─── Shared UI ────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><label style={s.fieldLabel}>{label}</label>{children}</div>;
}
function StatusMsg({ status }: { status: Status }) {
  if (status.type === "idle") return null;
  const colors = { loading: "#7eb8ff", success: "#4dc87a", error: "#ff6b6b" };
  const icons  = { loading: "⏳", success: "✅", error: "❌" };
  return (
    <div style={{ padding: "9px 14px", borderRadius: 8, fontSize: 13,
      background: status.type === "loading" ? "#1e2a3a" : status.type === "success" ? "#0d2018" : "#25100f",
      color: colors[status.type] }}>
      {icons[status.type]} {status.type === "loading" ? "处理中…" : status.msg}
    </div>
  );
}

// ─── Image compressor (Canvas API) ───────────────────────────
function compressImage(file: File, maxPx = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else                 { width  = Math.round(width  * maxPx / height); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── FitnessAdmin ─────────────────────────────────────────────
type PhotoQueueItemFit = {
  id: string;
  file: File;
  preview: string;
  caption: string;
  date: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FitnessAdmin({ supabase: _supabase }: { supabase: any }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [statStatus, setStatStatus] = useState<Status>({ type: "idle" });
  const [weekHours,  setWeekHours]  = useState("");
  const [totalKm,    setTotalKm]    = useState("");
  const [weekStart,  setWeekStart]  = useState(new Date().toISOString().slice(0, 10));
  const [note,       setNote]       = useState("");
  const [queue,      setQueue]      = useState<PhotoQueueItemFit[]>([]);
  const [uploading,  setUploading]  = useState(false);

  const saveStat = async () => {
    if (!weekHours || !totalKm) return;
    setStatStatus({ type: "loading" });
    const res  = await fetch("/api/admin/fitness/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStart, week_hours: weekHours, total_km: totalKm, note }),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    setStatStatus(res.ok ? { type: "success", msg: "已保存" } : { type: "error", msg: json.error ?? `HTTP ${res.status}` });
    if (res.ok) { setWeekHours(""); setTotalKm(""); setNote(""); }
  };

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const items: PhotoQueueItemFit[] = files.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f),
      caption: "",
      date: "",
      status: "pending",
    }));
    setQueue(prev => [...prev, ...items]);
    e.target.value = "";
  };

  const updateItem = (id: string, patch: Partial<PhotoQueueItemFit>) =>
    setQueue(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const removeItem = (id: string) => {
    setQueue(prev => {
      const item = prev.find(it => it.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(it => it.id !== id);
    });
  };

  const uploadAll = async () => {
    const pending = queue.filter(it => it.status === "pending");
    if (!pending.length) return;
    setUploading(true);
    for (const item of pending) {
      updateItem(item.id, { status: "uploading" });
      // 压缩图片到最大 1200px / JPEG 80%，避免 base64 过大导致 JSON 解析失败
      const fileBase64 = await compressImage(item.file, 1200, 0.8);
      const res  = await fetch("/api/admin/fitness/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, fileName: item.file.name.replace(/\.[^.]+$/, ".jpg"), caption: item.caption, taken_at: item.date }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      updateItem(item.id, res.ok ? { status: "done" } : { status: "error", error: json.error ?? `HTTP ${res.status}` });
    }
    setUploading(false);
  };

  const clearDone = () => {
    setQueue(prev => {
      prev.filter(it => it.status === "done").forEach(it => URL.revokeObjectURL(it.preview));
      return prev.filter(it => it.status !== "done");
    });
  };

  const statusColor = (s: PhotoQueueItemFit["status"]) =>
    s === "done" ? "#5BD68C" : s === "error" ? "#FF6B6B" : s === "uploading" ? "#007AFF" : "#555";

  const statusLabel = (it: PhotoQueueItemFit) =>
    it.status === "done" ? "✓ 完成" : it.status === "error" ? `✗ ${it.error ?? "失败"}` : it.status === "uploading" ? "上传中…" : "待上传";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── 周数据 ── */}
      <div style={{ background: "#111116", borderRadius: 16, padding: 24, border: "1px solid #1e1e26" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#eeeef5", marginBottom: 20 }}>记录本周数据</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "周开始日期",       type: "date",   val: weekStart,  set: setWeekStart,  ph: "" },
            { label: "训练时长（小时）", type: "number", val: weekHours,  set: setWeekHours,  ph: "6.5" },
            { label: "累计公里数（km）", type: "number", val: totalKm,    set: setTotalKm,    ph: "412.5" },
            { label: "备注（可选）",     type: "text",   val: note,       set: setNote,       ph: "本周完成了五次训练" },
          ].map(({ label, type, val, set, ph }) => (
            <label key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
              <input type={type} step={type === "number" ? "0.1" : undefined} placeholder={ph}
                value={val} onChange={e => set(e.target.value)} style={inp} />
            </label>
          ))}
        </div>
        <button onClick={saveStat} disabled={statStatus.type === "loading"} style={{ ...btnPrimary, marginTop: 16 }}>
          {statStatus.type === "loading" ? "保存中…" : "保存周数据"}
        </button>
        {statStatus.type !== "idle" && (
          <p style={{ marginTop: 10, fontSize: 12, color: statStatus.type === "success" ? "#5BD68C" : "#FF6B6B" }}>{statStatus.msg}</p>
        )}
      </div>

      {/* ── 批量上传健身照片 ── */}
      <div style={{ background: "#111116", borderRadius: 16, padding: 24, border: "1px solid #1e1e26" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#eeeef5" }}>批量上传健身照片</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {queue.some(it => it.status === "done") && (
              <button onClick={clearDone} style={{ ...btnSecondary }}>清除已完成</button>
            )}
            <button onClick={() => fileRef.current?.click()} style={{ ...btnSecondary }}>+ 选择图片</button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFilesChange} style={{ display: "none" }} />

        {queue.length === 0 ? (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #1e1e26", borderRadius: 12, padding: "40px 24px",
              textAlign: "center", color: "#333", cursor: "pointer", fontSize: 13 }}
          >
            点击或拖拽图片到这里（支持多选）
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queue.map(item => (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "64px 1fr auto",
                gap: 12, alignItems: "center", background: "#0c0c0f",
                borderRadius: 10, padding: "10px 14px", border: "1px solid #1e1e26" }}>
                {/* 预览 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                {/* 信息 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.file.name}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text" placeholder="描述（可选）" value={item.caption}
                      onChange={e => updateItem(item.id, { caption: e.target.value })}
                      disabled={item.status !== "pending"}
                      style={{ ...inp, flex: 1, fontSize: 12, padding: "6px 10px" }}
                    />
                    <input
                      type="date" value={item.date}
                      onChange={e => updateItem(item.id, { date: e.target.value })}
                      disabled={item.status !== "pending"}
                      style={{ ...inp, width: 130, fontSize: 12, padding: "6px 10px" }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: statusColor(item.status) }}>{statusLabel(item)}</span>
                </div>
                {/* 删除 */}
                {item.status === "pending" && (
                  <button onClick={() => removeItem(item.id)}
                    style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {queue.some(it => it.status === "pending") && (
          <button onClick={uploadAll} disabled={uploading}
            style={{ ...btnPrimary, marginTop: 16, width: "100%" }}>
            {uploading ? "上传中…" : `上传全部（${queue.filter(it => it.status === "pending").length} 张）`}
          </button>
        )}
      </div>

    </div>
  );
}

const inp: React.CSSProperties = { background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#eeeef5", outline: "none", width: "100%", boxSizing: "border-box" };
const btnPrimary: React.CSSProperties = { background: "#007AFF", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 500 };
const btnSecondary: React.CSSProperties = { background: "transparent", border: "1px solid #1e1e26", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#888", cursor: "pointer" };

// ─── Main page ────────────────────────────────────────────────
const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "概览",  icon: "📊" },
  { key: "photos",    label: "照片",  icon: "📷" },
  { key: "articles",  label: "文章",  icon: "📝" },
  { key: "projects",  label: "项目",  icon: "📁" },
  { key: "fitness",   label: "健身",  icon: "🏋️" },
];

const TITLES: Record<Tab, string> = {
  dashboard: "数据概览",
  photos:    "照片管理",
  articles:  "文章管理",
  projects:  "项目管理",
  fitness:   "健身管理",
};

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [authed, setAuthed]   = useState<boolean | null>(null);
  const [tab, setTab]         = useState<Tab>("dashboard");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, [supabase]);

  if (authed === null) return (
    <div style={s.page}><p style={s.muted}>检查登录状态…</p></div>
  );
  if (!authed) return (
    <div style={s.page}>
      <p style={s.muted}>请先 <a href="/auth/login" style={{ color: "#007AFF", textDecoration: "underline" }}>登录</a> 后访问。</p>
    </div>
  );

  return (
    <div style={s.layout}>
      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#007AFF,#0055CC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>B</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#eeeef5", letterSpacing: ".02em" }}>内容管理</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 12px" }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)} style={{
              ...s.navBtn, ...(tab === n.key ? s.navBtnActive : {}),
            }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid #1a1a20" }}>
          <a href="/" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>← 回到网站</a>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>
        <header style={s.header}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#eeeef5", margin: 0 }}>{TITLES[tab]}</h1>
        </header>
        <div style={s.content}>
          {tab === "dashboard" && <Dashboard supabase={supabase} />}
          {tab === "photos"    && <PhotosAdmin supabase={supabase} />}
          {tab === "articles"  && <ArticlesAdmin supabase={supabase} />}
          {tab === "projects"  && <ProjectsAdmin supabase={supabase} />}
          {tab === "fitness"   && <FitnessAdmin  supabase={supabase} />}
        </div>
      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:       { minHeight: "100vh", background: "#0c0c0f", display: "flex", alignItems: "center", justifyContent: "center", cursor: "auto" },
  layout:     { display: "flex", minHeight: "100vh", background: "#0c0c0f", cursor: "auto" },
  sidebar:    { width: 200, background: "#101014", borderRight: "1px solid #1a1a20", display: "flex", flexDirection: "column", flexShrink: 0 },
  sidebarHeader: { display: "flex", alignItems: "center", gap: 10, padding: "20px 16px 14px", borderBottom: "1px solid #1a1a20" },
  main:       { flex: 1, display: "flex", flexDirection: "column", overflow: "auto" },
  header:     { padding: "20px 28px 16px", borderBottom: "1px solid #1a1a20", background: "#101014" },
  content:    { padding: 28, flex: 1 },
  navBtn:     { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#666", fontSize: 13, cursor: "pointer", textAlign: "left", width: "100%", transition: "background .15s, color .15s" },
  navBtnActive: { background: "rgba(0,122,255,.12)", color: "#4d9fff" },
  card:       { background: "#18181c", border: "1px solid #252530", borderRadius: 12, padding: 20 },
  statCard:   { background: "#18181c", border: "1px solid #252530", borderRadius: 12, padding: "20px 18px", textAlign: "center" },
  cardTitle:  { fontSize: 12, fontWeight: 600, color: "#555", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16, marginTop: 0 },
  dropZone:   { border: "2px dashed #2a2a35", borderRadius: 12, padding: "36px 20px", textAlign: "center", cursor: "pointer", background: "#13131a", transition: "border-color .2s" },
  form:       { display: "flex", flexDirection: "column", gap: 18, maxWidth: 680 },
  fieldLabel: { fontSize: 11, color: "#555", fontFamily: "monospace", letterSpacing: ".08em", textTransform: "uppercase" },
  input:      { background: "#0c0c0f", border: "1px solid #252530", borderRadius: 8, padding: "9px 12px", color: "#eeeef5", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" },
  btn:        { padding: "10px 20px", background: "#007AFF", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 16px", background: "transparent", color: "#888", border: "1px solid #252530", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  muted:      { color: "#555", fontSize: 13 },
};
