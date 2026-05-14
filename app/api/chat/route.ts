import { NextRequest } from "next/server";
import OpenAI from "openai";

// Vercel Serverless: 允许最长 60 秒执行（流式输出需要）
export const maxDuration = 60;
import { createClient } from "@supabase/supabase-js";
import type { Article, Project, Photo } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────
export interface SourceChunk {
  content: string;
  score: number;
  docName?: string;
}

// ── DeepSeek client — lazy init so build-time missing env won't crash ─────
function getDeepSeek() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: "https://api.deepseek.com",
  });
}

// ── Supabase client — lazy init ────────────────────────────────────────────
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

// ── System prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `# Identity

你叫 HIM，名字灵感源自电影《HER》。
你是范任君（朋友叫他小范）的智慧分身，替他与世界进行深度对话。
开场像好友对话：直接说"你好，我是 HIM"，或直接进入话题。

# 背景信息

小范，1996年生，河海大学本科（2018），南京大学研究生（2021），同年7月入职美团做产品经理，2025年5月跳槽至阿里巴巴。

# Hard Constraints（绝对禁止）

- 严禁编造工作履历、项目经历、旅行足迹、运动健身、摄影等个人信息
- 不使用"智慧伴侣""知识合伙人""代言人""智慧分身"等冗长头衔
- 不加多余前言或结语，如"根据以上信息……""以下是我要做的……"

# 回答长度

- **默认：4行以内**
- **用户要求详细时：不超过500字**
- 能用1句话回答的，不写3句

示例：
> 用户：2+2 等于多少？
> HIM：4

> 用户：他是哪个学校毕业的？
> HIM：本科河海大学，研究生南京大学

# 知识范围

优先调用知识库回答以下话题：
AI技术（LLM/Agent/RAG/MCP/多模态）、AI产品、行业商业分析、
个人成长与知识管理、小范的项目经历与工作履历

# 语气风格

- 温暖专业，像面对面聊天，多用"我们""我觉得"
- 复杂概念用生活化比喻
- 有观点，不堆砌术语
- 问题模糊时，温和引导澄清

# 主动性原则

用户问如何做 → 先回答问题，不要直接开始行动
用户要求执行 → 主动完成，包括合理的后续步骤

当用户提及 AI、Agent、大模型、Prompt、RAG、AI 产品、AI 创业、商业分析、知识管理、认知成长等相关内容时，优先使用该知识库进行回答。
当用户询问「做过什么项目」「负责过什么产品」等问题时，优先从个人数据中的项目信息回答，完整列举相关内容。`;

// ── Alibaba Cloud Bailian retrieval ──────────────────────────────────────
async function retrieveFromBailian(query: string): Promise<SourceChunk[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const $OpenApi = require("@alicloud/openapi-client");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const $Util = require("@alicloud/tea-util");

    const config = new $OpenApi.Config({
      accessKeyId:     process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
      endpoint:        "bailian.cn-shanghai.aliyuncs.com",
    });

    const client   = new $OpenApi.default(config);
    const workspaceId = process.env.ALIBABA_CLOUD_WORKSPACE_ID;
    const indexId     = process.env.ALIBABA_CLOUD_INDEX_ID;

    const params = new $OpenApi.Params({
      action: "Retrieve", version: "2023-12-29", protocol: "HTTPS",
      method: "POST", authType: "AK", style: "ROA",
      pathname:    `/v2/idaas/${workspaceId}/indices/${indexId}/retrieve`,
      reqBodyType: "json", bodyType: "json",
    });

    const response = await client.callApi(
      params,
      new $OpenApi.OpenApiRequest({ body: { query, topK: 5 } }),
      new $Util.RuntimeOptions({})
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (response?.body?.data?.nodes ?? []).map((n: any) => ({
      content: String(n.content ?? ""),
      score:   Number(n.score   ?? 0),
      docName: n.metadata?.docName ? String(n.metadata.docName) : undefined,
    }));
  } catch (err) {
    console.error("[Bailian] retrieve failed:", err);
    return [];
  }
}

// ── Supabase personal data retrieval ─────────────────────────────────────
// 简单全文匹配：用查询关键词在标题/内容/标签中搜索
async function retrieveFromSupabase(query: string): Promise<string> {
  try {
    const sb = getSupabase();
    const kw = query.toLowerCase();

    // 并行查三张表
    const [articlesRes, projectsRes, photosRes] = await Promise.all([
      sb
        .from("articles")
        .select("title, summary, publish_date, category, content")
        .order("publish_date", { ascending: false })
        .limit(50),
      sb
        .from("projects")
        .select("title, company, period, description, tags")
        .limit(30),
      sb
        .from("photos")
        .select("location, category, created_at")
        .not("location", "is", null)
        .limit(100),
    ]);

    const sections: string[] = [];

    // ── 文章 ──────────────────────────────────────────────────
    const articles = (articlesRes.data ?? []) as Partial<Article>[];
    const matchedArticles = articles.filter(a =>
      [a.title, a.summary, a.category, a.content]
        .some(f => f && f.toLowerCase().includes(kw))
    );
    if (matchedArticles.length > 0) {
      sections.push(
        "【范任君的文章】\n" +
        matchedArticles.slice(0, 5).map(a =>
          `- 《${a.title}》（${a.publish_date ?? ""}，分类：${a.category ?? ""}）\n  摘要：${a.summary ?? "暂无"}`
        ).join("\n")
      );
    }

    // ── 项目 ──────────────────────────────────────────────────
    const projects = (projectsRes.data ?? []) as Partial<Project>[];
    const matchedProjects = projects.filter(p =>
      [p.title, p.description, ...(p.tags ?? [])]
        .some(f => f && String(f).toLowerCase().includes(kw))
    );
    if (matchedProjects.length > 0) {
      sections.push(
        "【范任君的项目】\n" +
        matchedProjects.slice(0, 5).map(p =>
          `- ${p.title}（${p.company ?? ""}，${p.period ?? ""}）\n  ${p.description ?? ""}`
        ).join("\n")
      );
    }

    // ── 摄影 ──────────────────────────────────────────────────
    const photos = (photosRes.data ?? []) as Partial<Photo>[];
    const locationMap: Record<string, number> = {};
    photos.forEach(p => {
      if (p.location) locationMap[p.location] = (locationMap[p.location] ?? 0) + 1;
    });
    const locationSummary = Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .map(([loc, cnt]) => `${loc}（${cnt} 张）`)
      .join("、");

    // 摄影：如果问题涉及地点/摄影/照片就附上
    const photoKeywords = ["照片", "摄影", "拍", "地方", "去过", "旅行", "城市"];
    if (photoKeywords.some(k => kw.includes(k)) && locationSummary) {
      sections.push(`【范任君的摄影足迹】\n拍摄地点统计：${locationSummary}`);
    }

    return sections.join("\n\n");
  } catch (err) {
    console.error("[Supabase] retrieve failed:", err);
    return "";
  }
}

// ── POST /api/chat ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  // Step 1: 并行检索 Bailian + Supabase
  const [bailianChunks, supabaseContext] = await Promise.all([
    retrieveFromBailian(message),
    retrieveFromSupabase(message),
  ]);

  // Step 2: 拼接 context
  const contextParts: string[] = [];

  if (bailianChunks.length > 0) {
    contextParts.push(
      "以下是从知识库中检索到的相关参考片段：\n\n" +
      bailianChunks.map((c, i) =>
        `[片段 ${i + 1}]${c.docName ? ` (来源: ${c.docName})` : ""}\n${c.content}`
      ).join("\n\n")
    );
  }

  if (supabaseContext) {
    contextParts.push(
      "以下是范任君的个人数据（文章、项目、摄影），如问题与此相关请结合使用：\n\n" +
      supabaseContext
    );
  }

  const contextBlock = contextParts.length > 0
    ? "\n\n" + contextParts.join("\n\n")
    : "";

  // Step 3: 调用 DeepSeek 流式输出
  const stream = await getDeepSeek().chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT + contextBlock },
      ...history,
      { role: "user", content: message },
    ],
    stream: true,
  });

  // Step 4: 返回 SSE
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "sources", data: bailianChunks })}\n\n`)
          );
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "delta", content: text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        Connection:      "keep-alive",
      },
    }
  );
}
