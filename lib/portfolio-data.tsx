import type { SVGProps } from "react";

export type Education = { school: string; degree: string; year: string };
export type Profile = {
  nameZh: string; nameEn: string; role: string;
  slogan: string; bio: string; edu: Education[]; status: string;
};
export type SocialLink = {
  id: string; name: string; handle: string; url: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
};
export type WorkItem = {
  date: string; role: string; company: string; desc: string; tags: string[]; current?: boolean;
};
export type Project = {
  id: string; company: string; name: string; summary: string;
  stack: string[]; period: string; role: string; impact: string[]; detail: string[];
};
export type Article = {
  id: string; date: string; title: string; sub: string; tag: string; read: string;
};
export type Photo = {
  id: string; title: string; loc: string; time: string; tag: string; size: number; ph: string;
};
export type FitnessData = {
  weekHours: number; weekDelta: string; totalKm: number;
  bench: PREntry; squat: PREntry; dead: PREntry; ohp: PREntry;
  avgHr: number; kcal: number; heat: number[];
};
export type PREntry = { name: string; val: string; delta: string };
export type TravelCity = {
  id: string; city: string; country: string; lat: number; lng: number; year: number; notes: string;
};
export type TravelData = {
  countries: number; cities: number; km: number; recent: TravelCity[];
};

export const PROFILE: Profile = {
  nameZh: "思齐",
  nameEn: "Blaze Fan",
  role: "AI Product Manager",
  slogan: "真诚且勇敢，热烈而自由",
  bio: "AI 产品经理，专注于让 AI 在真实场景中创造价值。在美团参与到店与到家业务的智能化升级，目前在阿里巴巴构建消费者侧的 AI Agent 体验。",
  edu: [
    { school: "南京大学", degree: "理学硕士", year: "M.Sc." },
    { school: "河海大学", degree: "工学学士", year: "B.Eng." },
  ],
  status: "Hangzhou · 在岗",
};

export const SOCIAL: SocialLink[] = [
  {
    id: "xhs", name: "小红书", handle: "@思齐", url: "#",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M3 4h18v16H3z" fill="none" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M7 9v6M7 9l3.4 6V9M14 9.5h3M14 12h2.6c.6 0 1 .4 1 1v1c0 .6-.4 1-1 1H14V9.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "jike", name: "即刻", handle: "@思齐", url: "#",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...props}>
        <circle cx="12" cy="12" r="9"/>
        <path d="M9 9.5c.6 1.5 2.2 2.5 3.8 2.3M9 14.5c1 1.5 3 2 4.6 1.2"/>
      </svg>
    ),
  },
  {
    id: "twitter", name: "Twitter", handle: "@blazefan", url: "#",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231z"/>
      </svg>
    ),
  },
  {
    id: "github", name: "GitHub", handle: "@blazefan", url: "#",
    icon: (props) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.27-5.24-5.65 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17.91-.25 1.89-.38 2.86-.39.97 0 1.95.13 2.86.39 2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.07 0 4.39-2.69 5.36-5.25 5.64.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.55C20.21 21.39 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
      </svg>
    ),
  },
];

export const WORK: WorkItem[] = [
  {
    date: "2025.05 — 现在",
    role: "AI Product Manager",
    company: "阿里巴巴 · Fliggy",
    desc: "负责飞猪千问对话体验、千问-飞猪 Agent 与 AI 拍照讲解，将大模型能力嵌入真实的旅行决策与服务链路。",
    tags: ["LLM Agent", "Multimodal", "Travel"],
    current: true,
  },
  {
    date: "2021.07 — 2025.04",
    role: "AI Product Manager",
    company: "美团 · 闪购 / 大众点评 / 地图",
    desc: "主导闪购首页推荐与智能化运营，参与大众点评智能助手从 0 到 1，并负责美团地图侧的搜索与推荐体验。",
    tags: ["推荐系统", "Conversational AI", "搜索"],
  },
];

export const PROJECTS: Project[] = [
  {
    id: "p1", company: "Alibaba",
    name: "千问 · 飞猪 Agent",
    summary: "面向旅行场景的多轮对话 Agent，具备工具调用、行程编排与服务办理能力。",
    stack: ["LLM", "Function Calling", "RAG", "Agent Orchestration"],
    period: "2025.06 — Now", role: "Owner",
    impact: ["对话渗透率 ↑ 28%", "意图召回 92.4%", "工具调用准确率 96%"],
    detail: [
      "设计 Agent 的任务分解与工具路由，使复杂行程办理可在一次会话中完成。",
      "搭建针对旅行长尾意图的评测集，结合人工与自动化指标推动模型迭代。",
      "与算法、工程、运营紧密协同，定义 Agent 的能力边界与服务承诺。",
    ],
  },
  {
    id: "p2", company: "Alibaba",
    name: "AI 拍照讲解",
    summary: "拍一张景点照片，即可获得有故事性的语音讲解，重塑\"到达即理解\"的体验。",
    stack: ["VLM", "TTS", "Image Retrieval"],
    period: "2025.07 — Now", role: "Owner",
    impact: ["平均播放时长 1m42s", "用户次日留存 ↑ 18%"],
    detail: [
      "定义\"看见 → 理解 → 共鸣\"的三段式叙事结构，使 AI 输出具备人文质感。",
      "构建景点知识图谱与图像检索增强的多模态生成链路。",
    ],
  },
  {
    id: "p3", company: "Alibaba",
    name: "飞猪千问对话体验",
    summary: "把对话作为旅行决策的入口，重构搜索与服务的关系。",
    stack: ["Conversational UI", "Intent Modeling"],
    period: "2025.05 — Now", role: "Owner",
    impact: ["DAU 进入 AI 对话占比 ↑"],
    detail: ["打通对话与传统搜索/列表的双向跳转，使用户在结构化与自然语言之间自由切换。"],
  },
  {
    id: "p4", company: "Meituan",
    name: "美团闪购首页",
    summary: "重构首页商品/内容混排，把\"即时零售\"做成可被发现的体验。",
    stack: ["推荐系统", "AB 实验", "增长"],
    period: "2023.04 — 2025.04", role: "Co-owner",
    impact: ["首页 CTR ↑ 11.3%", "GMV ↑ 7.2%"],
    detail: [
      "以场景化卡片重塑首页节奏，定义\"扫一眼即买\"的视觉语言。",
      "建立围绕首页的全链路实验体系，统一各业务的衡量口径。",
    ],
  },
  {
    id: "p5", company: "Meituan",
    name: "大众点评智能助手",
    summary: "本地生活第一个端内 AI 助手，从\"点评\"走向\"问问\"。",
    stack: ["LLM", "RAG on POI", "Voice"],
    period: "2024.01 — 2024.12", role: "Co-owner",
    impact: ["渗透率早期突破 6%", "好评率 4.7/5"],
    detail: [
      "结合 POI、UGC、达人内容构建检索增强生成体系。",
      "针对本地生活长尾问题设计兜底策略，确保稳定可用。",
    ],
  },
  {
    id: "p6", company: "Meituan",
    name: "美团地图",
    summary: "为 LBS 业务打底的地图能力，重做搜索与推荐底座。",
    stack: ["LBS", "POI Search"],
    period: "2021.07 — 2023.03", role: "PM",
    impact: ["搜索准确率 ↑ 9.4%"],
    detail: ["参与 POI 搜索召回与排序的全链路重构。"],
  },
];

export const ARTICLES: Article[] = [
  { id: "a1", date: "2026.04.18", title: "当 Agent 不只是聊天：旅行场景下的工具编排", sub: "从 Function Calling 走到行程编排的工程与产品权衡。", tag: "AI · Agent", read: "12 min" },
  { id: "a2", date: "2026.02.02", title: "我把 AI 拍照讲解做成了一个产品", sub: "VLM × 知识图谱 × TTS，三件事撑起一段故事。", tag: "Product", read: "9 min" },
  { id: "a3", date: "2025.12.05", title: "对话即决策：自然语言能否取代列表？", sub: "分析对话与传统搜索的协同与张力。", tag: "UX", read: "7 min" },
  { id: "a4", date: "2025.09.10", title: "做 AI 产品的两种心法", sub: "区分\"能力上线\"与\"体验上线\"的关键决策框架。", tag: "Essay", read: "6 min" },
  { id: "a5", date: "2025.06.21", title: "推荐系统视角下的 LLM", sub: "LLM 是另一个召回器，还是排序器？", tag: "Tech", read: "10 min" },
  { id: "a6", date: "2025.03.15", title: "我的产品笔记 · 1H 25", sub: "一季度的方法、坑与新发现。", tag: "Notes", read: "4 min" },
];

export const PHOTOS: Photo[] = [
  { id: "ph1", title: "霁色",       loc: "Hangzhou · 西湖",   time: "2026.03", tag: "STREET",    size: 1, ph: "湖面长曝光 · 16mm" },
  { id: "ph2", title: "城市切片",   loc: "Shanghai · 陆家嘴", time: "2026.01", tag: "URBAN",     size: 2, ph: "顶楼向下 · 35mm" },
  { id: "ph3", title: "山的厚度",   loc: "Yunnan · 玉龙雪山", time: "2025.10", tag: "LANDSCAPE", size: 3, ph: "侧逆光 · 85mm" },
  { id: "ph4", title: "夜更深一寸", loc: "Tokyo · 涉谷",      time: "2025.08", tag: "STREET",    size: 4, ph: "霓虹反射 · 50mm" },
  { id: "ph5", title: "光",         loc: "Studio",            time: "2025.06", tag: "STILL",     size: 5, ph: "单灯 · 105mm" },
  { id: "ph6", title: "海的呼吸",   loc: "Sanya · 海棠湾",    time: "2025.05", tag: "OCEAN",     size: 6, ph: "ND1000 长曝光" },
  { id: "ph7", title: "无题",       loc: "Beijing",           time: "2025.04", tag: "PORTRAIT",  size: 7, ph: "环境人像 · 35mm" },
];

export const FITNESS: FitnessData = {
  weekHours: 6.4,
  weekDelta: "+0.8h",
  totalKm: 412,
  bench: { name: "卧推 1RM", val: "92.5 kg", delta: "+5.0" },
  squat: { name: "深蹲 1RM", val: "135 kg",  delta: "+7.5" },
  dead:  { name: "硬拉 1RM", val: "160 kg",  delta: "+10"  },
  ohp:   { name: "推举 1RM", val: "60 kg",   delta: "+2.5" },
  avgHr: 142,
  kcal: 738,
  heat: Array.from({ length: 26 * 7 }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    if (r < 0.45) return 0;
    if (r < 0.65) return 1;
    if (r < 0.82) return 2;
    if (r < 0.95) return 3;
    return 4;
  }),
};

export const TRAVEL: TravelData = {
  countries: 12,
  cities: 38,
  km: 86420,
  recent: [
    { id: "t1",  city: "东京",       country: "Japan",       lat: 35.68,  lng: 139.69,  year: 2025, notes: "涉谷夜雨与一杯热可可。" },
    { id: "t2",  city: "京都",       country: "Japan",       lat: 35.01,  lng: 135.77,  year: 2025, notes: "清晨的伏见稻荷神社，几乎无人。" },
    { id: "t3",  city: "清迈",       country: "Thailand",    lat: 18.79,  lng: 98.99,   year: 2024, notes: "在山间寺庙学习呼吸。" },
    { id: "t4",  city: "雷克雅未克", country: "Iceland",     lat: 64.15,  lng: -21.94,  year: 2024, notes: "极光让人沉默。" },
    { id: "t5",  city: "里斯本",     country: "Portugal",    lat: 38.72,  lng: -9.14,   year: 2023, notes: "Tram 28 与一杯 Ginja。" },
    { id: "t6",  city: "新加坡",     country: "Singapore",   lat: 1.35,   lng: 103.82,  year: 2023, notes: "夜里在滨海湾跑步。" },
    { id: "t7",  city: "旧金山",     country: "USA",         lat: 37.77,  lng: -122.42, year: 2023, notes: "Mission 街区的咖啡。" },
    { id: "t8",  city: "墨尔本",     country: "Australia",   lat: -37.81, lng: 144.96,  year: 2022, notes: "Block Arcade 的下午。" },
    { id: "t9",  city: "巴塞罗那",   country: "Spain",       lat: 41.39,  lng: 2.17,    year: 2022, notes: "高迪未完成的圣家堂。" },
    { id: "t10", city: "首尔",       country: "Korea",       lat: 37.57,  lng: 126.98,  year: 2022, notes: "弘大夜里 2 点的烤肉。" },
    { id: "t11", city: "伊斯坦布尔", country: "Türkiye",     lat: 41.01,  lng: 28.98,   year: 2024, notes: "在博斯普鲁斯海峡看日落。" },
    { id: "t12", city: "苏黎世",     country: "Switzerland", lat: 47.38,  lng: 8.54,    year: 2025, notes: "湖边的冷风。" },
  ],
};
