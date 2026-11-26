export interface PresetCover {
  id: string;
  label: string;
  category: string;
  path: string;
  description: string;
}

export const PRESET_COVERS: PresetCover[] = [
  {
    id: "daily-market",
    label: "纳指盘面",
    category: "每日信息",
    path: "/covers/daily-market.jpg",
    description: "深蓝青色市场趋势光带，适合每日锦报与纳指盘面复盘",
  },
  {
    id: "daily-macro",
    label: "宏观利率",
    category: "每日信息",
    path: "/covers/daily-macro.jpg",
    description: "午夜蓝与暖金建筑光影，适合美联储、债市与宏观日评",
  },
  {
    id: "analysis-deep",
    label: "深度分析",
    category: "深度分析",
    path: "/covers/analysis-deep.jpg",
    description: "翠绿棱镜与折射光束，适合深度研究报告与行业洞察",
  },
  {
    id: "analysis-beginner",
    label: "投资入门",
    category: "投资入门",
    path: "/covers/analysis-beginner.jpg",
    description: "浅蓝阶梯与复利成长意象，适合指数基金与入门指南",
  },
  {
    id: "analysis-fundamentals",
    label: "公司基本面",
    category: "公司基本面",
    path: "/covers/analysis-fundamentals.jpg",
    description: "靛蓝与银白立体几何结构，适合财报拆解与护城河分析",
  },
  {
    id: "analysis-ai",
    label: "AI 产业",
    category: "AI 产业",
    path: "/covers/analysis-ai.jpg",
    description: "深蓝晶圆与电光青光轨，适合半导体、算力与 AI 主题",
  },
  {
    id: "analysis-macro",
    label: "宏观策略",
    category: "宏观策略",
    path: "/covers/analysis-macro.jpg",
    description: "岩灰青铜等高线波纹，适合周期、配置与宏观策略",
  },
  {
    id: "tutorial-tech",
    label: "技术与量化",
    category: "技术教程",
    path: "/covers/tutorial-tech.jpg",
    description: "石墨蓝模块化节点连线，适合架构教程与量化工具",
  },
];

const CATEGORY_COVER_POOLS: Record<string, string[]> = {
  每日信息: [
    "/covers/daily-market.jpg",
    "/covers/daily-macro.jpg",
    "/covers/analysis-ai.jpg",
    "/covers/analysis-macro.jpg",
  ],
  深度分析: ["/covers/analysis-deep.jpg", "/covers/analysis-fundamentals.jpg"],
  投资入门: ["/covers/analysis-beginner.jpg"],
  公司基本面: ["/covers/analysis-fundamentals.jpg", "/covers/analysis-deep.jpg"],
  "AI 产业": ["/covers/analysis-ai.jpg"],
  AI产业: ["/covers/analysis-ai.jpg"],
  宏观策略: ["/covers/analysis-macro.jpg", "/covers/daily-macro.jpg"],
  技术教程: ["/covers/tutorial-tech.jpg"],
  量化工具: ["/covers/tutorial-tech.jpg", "/covers/daily-market.jpg"],
};

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export interface CoverContext {
  category?: string | null;
  title?: string | null;
  slug?: string | null;
  contentType?: string | null;
}

export function getPresetCoverForContext(ctx?: CoverContext): string {
  const category = (ctx?.category || "").trim();
  const seed = `${ctx?.slug || ""}|${ctx?.title || ""}|${category}`;

  if (category && CATEGORY_COVER_POOLS[category]) {
    const pool = CATEGORY_COVER_POOLS[category];
    return pool[stableHash(seed) % pool.length];
  }

  const lowerCat = category.toLowerCase();
  if (lowerCat.includes("ai") || lowerCat.includes("算力") || lowerCat.includes("芯片")) {
    return "/covers/analysis-ai.jpg";
  }
  if (lowerCat.includes("入门") || lowerCat.includes("指南") || lowerCat.includes("qdii")) {
    return "/covers/analysis-beginner.jpg";
  }
  if (lowerCat.includes("基本面") || lowerCat.includes("财报")) {
    return "/covers/analysis-fundamentals.jpg";
  }
  if (lowerCat.includes("宏观") || lowerCat.includes("策略")) {
    return "/covers/analysis-macro.jpg";
  }
  if (lowerCat.includes("每日") || lowerCat.includes("简报") || lowerCat.includes("锦报")) {
    const pool = CATEGORY_COVER_POOLS["每日信息"];
    return pool[stableHash(seed) % pool.length];
  }
  if (
    ctx?.contentType === "tutorial" ||
    lowerCat.includes("技术") ||
    lowerCat.includes("架构") ||
    lowerCat.includes("教程")
  ) {
    return "/covers/tutorial-tech.jpg";
  }

  return PRESET_COVERS[stableHash(seed || "investcool") % PRESET_COVERS.length].path;
}

export const getReliableCover = (cover?: string | null, ctx?: CoverContext): string => {
  const trimmed = (cover || "").trim();
  if (
    trimmed &&
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    trimmed !== "/nasdaq_war_impact.jpg"
  ) {
    return trimmed;
  }
  return getPresetCoverForContext(ctx);
};
