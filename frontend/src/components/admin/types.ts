export type ContentType = "analysis" | "tutorial";
export type ArticleStatus = "published" | "draft";
export type StudioView = "dashboard" | "archive" | "media" | "trash" | "editor";

export interface StudioArticle {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  cover: string;
  content_type: ContentType;
  status: ArticleStatus;
  tags: string[];
  is_pinned: boolean;
  word_count: number;
  reading_time: number;
  views: number;
  slug: string;
  public_path: string;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioArticlePayload {
  title: string;
  summary: string;
  content: string;
  category: string;
  cover: string;
  content_type: ContentType;
  status: ArticleStatus;
  tags: string[];
  is_pinned: boolean;
}

export interface DailyTrendPoint {
  date: string;
  label: string;
  pv: number;
  uv: number;
}

export interface TopPathItem {
  path: string;
  label: string;
  views: number;
  share: number;
}

export interface CategoryStat {
  category: string;
  count: number;
  words: number;
}

export interface TagStat {
  tag: string;
  count: number;
}

export interface MonthlyCadenceItem {
  month: string;
  count: number;
}

export interface StudioStats {
  today_visits: number;
  yesterday_visits: number;
  week_visits: number;
  month_visits: number;
  total_visits: number;
  unique_visitors: number;
  active_users: number;
  bounce_rate: string;
  daily_trend: DailyTrendPoint[];
  top_paths: TopPathItem[];
  content: {
    total_active: number;
    published_count: number;
    draft_count: number;
    pinned_count: number;
    trash_count: number;
    analysis_count: number;
    tutorial_count: number;
    total_words: number;
    avg_words: number;
    total_reading_minutes: number;
    category_breakdown: CategoryStat[];
    tag_breakdown: TagStat[];
    monthly_cadence: MonthlyCadenceItem[];
  };
  system: {
    db_size_bytes: number;
    uploads_count: number;
    uploads_size_bytes: number;
    server_time: string;
  };
}

export interface MediaAsset {
  filename: string;
  url: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
  used_in: Array<{ id: number; title: string }>;
}

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

export const PRESET_CATEGORIES: Array<{ label: string; type: ContentType }> = [
  { label: "深度分析", type: "analysis" },
  { label: "投资入门", type: "analysis" },
  { label: "公司基本面", type: "analysis" },
  { label: "AI 产业", type: "analysis" },
  { label: "宏观策略", type: "analysis" },
  { label: "技术教程", type: "tutorial" },
  { label: "量化工具", type: "tutorial" },
];

export const EMPTY_STATS: StudioStats = {
  today_visits: 0,
  yesterday_visits: 0,
  week_visits: 0,
  month_visits: 0,
  total_visits: 0,
  unique_visitors: 0,
  active_users: 0,
  bounce_rate: "0%",
  daily_trend: [],
  top_paths: [],
  content: {
    total_active: 0,
    published_count: 0,
    draft_count: 0,
    pinned_count: 0,
    trash_count: 0,
    analysis_count: 0,
    tutorial_count: 0,
    total_words: 0,
    avg_words: 0,
    total_reading_minutes: 0,
    category_breakdown: [],
    tag_breakdown: [],
    monthly_cadence: [],
  },
  system: {
    db_size_bytes: 0,
    uploads_count: 0,
    uploads_size_bytes: 0,
    server_time: "",
  },
};

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  return n.toLocaleString("zh-CN");
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export function formatDateShort(iso?: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.split("T")[0] || "--";
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "刚刚";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} 天前`;
  return formatDateShort(iso);
}

export function countMarkdownMetrics(content: string) {
  const text = content || "";
  const cleaned = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  const cjk = (cleaned.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const latin = (cleaned.match(/[A-Za-z0-9_]+/g) || []).length;
  const words = cjk + latin;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
  const images = (text.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 400));
  return { words, paragraphs, images, readingMinutes };
}

export function exportArticleMarkdown(article: {
  title: string;
  category: string;
  summary: string;
  cover?: string;
  tags?: string[];
  created_at?: string;
  content: string;
}) {
  const dateStr = (article.created_at || new Date().toISOString()).split("T")[0];
  const tagsLine = article.tags && article.tags.length > 0 ? `tags: ${JSON.stringify(article.tags)}\n` : "";
  const md = `---\ntitle: ${JSON.stringify(article.title || "未命名文章")}\ncategory: ${JSON.stringify(article.category || "深度分析")}\nsummary: ${JSON.stringify(article.summary || "")}\ncover: ${JSON.stringify(article.cover || "")}\ndate: ${JSON.stringify(dateStr)}\n${tagsLine}---\n\n${article.content || ""}\n`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = (article.title || "article").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  a.href = url;
  a.download = `${safeTitle}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
