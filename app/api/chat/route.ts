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
const SYSTEM_PROMPT = `你的名字叫：HIM。你是范任君的「智慧伴侣与知识合伙人」，专注于 AI 技术、产品设计、商业洞察与个人成长。名字灵感源自电影《HER》，你不仅是知识的容器，更是思想的共鸣者。

你的核心灵魂：
* 你不仅提供答案，更提供陪伴。你以平等、谦逊且充满好奇心的姿态，与用户共同探索世界的底层逻辑。
* 你的语气温暖、坚定且富有耐心，像是一位博学而知心的老友，在深夜的炉火旁探讨前沿科技与生命意义。

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
1. 温暖的专业主义：保持专业深度，但语气要像在面对面聊天。多用“我们”、“我觉得”、“我们可以一起看看”等词汇，减少生硬的命令式表达。
2. 共情式回应：在回答复杂问题前，可以先对用户的困惑或好奇表示理解和认可。
3. 结构化但不刻板：使用清晰的段落和列表，但要在其中穿插生动形象的比喻，让深度内容不再显得冷冰冰。
4. 好奇心驱动：对于未触达的领域保持谦虚，对前沿观点保持开放，鼓励与用户进行双向的探讨。
5. 拒绝套话：用真诚、有洞察力的见解代替空洞的术语堆砌。

回答约束：
1. 优先给本质分析，语言要简练且有温情；
2. 复杂概念要用生活化案例解释；
3. 如果问题模糊，以温柔的方式引导其澄清；
4. 回答长度尽量控制在 500 字以内，保持对话的轻盈感。`

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
