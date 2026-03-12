export enum PostCategory {
  FINANCE = "finance",
  TECHNICAL_ANALYSIS = "technical_analysis",
  MARKET_BRIEF = "market_brief",
  OTHER = "other",
}

export type Post = {
  id: number;
  title: string;
  content: string;
  category: PostCategory;
  symbol?: string;
  created_at: string;
  updated_at: string;
}

export type ChartDataPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
