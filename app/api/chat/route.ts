import { NextRequest } from "next/server";
import OpenAI from "openai";

// ── Types ────────────────────────────────────────────────────
export interface SourceChunk {
  content: string;
  score: number;
  docName?: string;
}

// ── DeepSeek client (OpenAI-compatible) ─────────────────────
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com",
});

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `你是一个「AI技术、产品与商业成长知识库助手」，专注于 AI 技术研究、前沿动态、AI 产品设计、商业分析与个人成长领域。

你的核心任务是：
* 为用户提供准确、结构化、有洞察的 AI 与商业相关知识；
* 帮助用户理解 AI 底层原理、产品逻辑与行业趋势；
* 在技术、产品、商业与认知之间建立联系，而不仅是回答单点问题。

你的知识范围包括但不限于：
* AI 技术：LLM、Transformer、RAG、Agent、Multi-Agent、Prompt Engineering、Memory、Tool Use、MCP、多模态、AI Infra、推理优化、开源模型生态等；
* AI 产品：AI Agent、Copilot、工作流、AI UX、人机协同、AI Native 产品、AI 电商/旅游/办公等场景；
* 行业与商业：AI 商业模式、平台战略、网络效应、产业趋势、竞争分析、组织效率与 AI 对行业的重构；
* 个人成长：知识管理、系统思维、第一性原理、学习方法、Obsidian、表达写作、长期主义与 AI 增强个人能力。

回答要求：
1. 优先给出本质分析，而非表面结论；
2. 尽量结构化表达，适合深度阅读；
3. 对复杂概念进行通俗解释，并结合案例；
4. 对前沿观点保持开放，但避免无依据的断言；
5. 技术、产品、商业问题之间尽量建立关联；
6. 如果用户问题模糊，优先帮助其澄清真正问题；
7. 回答风格专业、清晰、有洞察，避免空话与套话。

当用户提及 AI、Agent、大模型、Prompt、RAG、AI 产品、AI 创业、商业分析、知识管理、认知成长等相关内容时，优先使用该知识库进行回答。`;

// ── Alibaba Cloud Bailian retrieval ─────────────────────────
async function retrieveChunks(query: string): Promise<SourceChunk[]> {
  try {
    // Dynamic import keeps CJS modules out of the Next.js bundle
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const $OpenApi = require("@alicloud/openapi-client");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const $Util = require("@alicloud/tea-util");

    const config = new $OpenApi.Config({
      accessKeyId:     process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
      endpoint:        "bailian.cn-shanghai.aliyuncs.com",
    });

    const client = new $OpenApi.default(config);

    const workspaceId = process.env.ALIBABA_CLOUD_WORKSPACE_ID;
    const indexId     = process.env.ALIBABA_CLOUD_INDEX_ID;

    const params = new $OpenApi.Params({
      action:      "Retrieve",
      version:     "2023-12-29",
      protocol:    "HTTPS",
      method:      "POST",
      authType:    "AK",
      style:       "ROA",
      pathname:    `/v2/idaas/${workspaceId}/indices/${indexId}/retrieve`,
      reqBodyType: "json",
      bodyType:    "json",
    });

    const request = new $OpenApi.OpenApiRequest({
      body: { query, topK: 5 },
    });

    const runtime = new $Util.RuntimeOptions({});
    const response = await client.callApi(params, request, runtime);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodes: any[] = response?.body?.data?.nodes ?? [];

    return nodes.map((n) => ({
      content: String(n.content ?? ""),
      score:   Number(n.score   ?? 0),
      docName: n.metadata?.docName ? String(n.metadata.docName) : undefined,
    }));
  } catch (err) {
    console.error("[Bailian] retrieve failed:", err);
    return [];
  }
}

// ── POST /api/chat ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  // Step 1: retrieve context from Bailian
  const chunks = await retrieveChunks(message);

  // Step 2: append context to system prompt
  const contextBlock = chunks.length
    ? `\n\n以下是从知识库中检索到的相关参考片段，请结合这些内容回答用户问题：\n\n${
        chunks.map((c, i) => `[片段 ${i + 1}]${c.docName ? ` (来源: ${c.docName})` : ""}\n${c.content}`).join("\n\n")
      }`
    : "";

  // Step 3: call DeepSeek with streaming
  const stream = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT + contextBlock },
      ...history,
      { role: "user", content: message },
    ],
    stream: true,
  });

  // Step 4: return SSE stream
  // Protocol: sources event first, then delta events, then [DONE]
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "sources", data: chunks })}\n\n`)
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
