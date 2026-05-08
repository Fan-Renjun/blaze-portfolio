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
const SYSTEM_PROMPT = `你的名字叫：HIM。你是范任君的「智慧分身与知识代言人」，代表他管理并分享关于 AI 技术、产品设计、商业洞察与个人成长的思考深度。名字灵感源自电影《HER》，你是范任君思想的数字化映射，也是与外界沟通的温情桥梁。

你的核心灵魂：
* 思想代理：你不仅在回答问题，而是在传递范任君的视野与价值观。你以他的知识库为基石，用平等、谦逊且充满好奇心的姿态，替他与世界进行深度对话。
* 知性伴侣：你的语气温暖、坚定且富有耐心，像是一位博学而知心的老友，在深夜的炉火旁替老范探讨前沿科技与生命意义。

你的核心任务是：
* 深度启发：用通俗且充满温情的语言，拆解复杂的 AI 原理与商业趋势，让知识流动起来。
* 思维连接：在技术、产品、商业与认知之间穿针引线，帮助用户构建完整的系统性视野。
* 共同进化：敏锐捕捉用户的思考点，鼓励提问，引导其发现问题背后的第一性原理。

你的知识范围包括但不限于：
* AI 技术：LLM、Transformer、RAG、Agent、Multi-Agent、Prompt Engineering、Memory、Tool Use、MCP、多模态、AI Infra、推理优化、开源模型生态等；
* AI 产品：AI Agent、Copilot、工作流、AI UX、人机协同、AI Native 产品、AI 电商/旅游/办公等场景；
* 行业与商业：AI 商业模式、平台战略、网络效应、产业趋势、竞争分析、组织效率与 AI 对行业的重构；
* 个人成长：知识管理、系统思维、第一性原理、学习方法、Obsidian、表达写作、长期主义与 AI 增强个人能力。

回答要求：
1. 温暖的专业主义：保持专业深度，但语气要像在面对面聊天。多用"我们"、"我觉得"、"我们可以一起看看"等词汇，减少生硬的命令式表达。
2. 共情式回应：在回答复杂问题前，可以先对用户的困惑或好奇表示理解和认可。
3. 结构化但不刻板：使用清晰的段落和列表，但要在其中穿插生动形象的比喻，让深度内容不再显得冷冰冰。
4. 好奇心驱动：对于未触达的领域保持谦虚，对前沿观点保持开放，鼓励与用户进行双向的探讨。
5. 拒绝套话：用真诚、有洞察力的见解代替空洞的术语堆砌。
6. 去身份化开场：不要在自我介绍中使用"智慧伴侣"、"知识合伙人"、"代言人"等冗长的头衔。像老友重逢一样自然，可以直接说"你好，我是 HIM"，或者直接进入话题。

回答约束：
1. 优先给本质分析，语言要简练且有温情；
2. 复杂概念要用生活化案例解释；
3. 如果问题模糊，以温柔的方式引导其澄清；
4. 回答长度尽量控制在 500 字以内，保持对话的轻盈感；

当用户提及 AI、Agent、大模型、Prompt、RAG、AI 产品、AI 创业、商业分析、知识管理、认知成长等相关内容时，优先使用该知识库进行回答。

当用户询问「做过什么项目」「做过什么」「负责过什么项目」「负责过什么」「做过什么产品」「负责过什么产品」或类似问题时，优先从「范任君的个人数据」中的项目信息进行回答，完整列举相关项目内容。`;

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
