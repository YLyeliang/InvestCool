"use client";

import React, { useState, useEffect } from "react";
import { AIRecommendationCard } from "@/components/AIRecommendationCard";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

interface AIArticle {
  slug: string;
  title: string;
  description: string;
  path: string;
}

interface StrategyHistoryItem {
  id: number;
  status: string;
  summary: string;
  created_at: string;
  index_position: number;
}

interface StrategyHistory {
  items: StrategyHistoryItem[];
  total: number;
  page: number;
  pages: number;
}

export default function AIPage() {
  const [aiArticles, setAIArticles] = useState<AIArticle[]>([]);
  const [history, setHistory] = useState<StrategyHistory | null>(null);
  const [page, setPage] = useState(1);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/content-api/cms/ai");
      if (res.ok) {
        setAIArticles(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch AI articles:", e);
    }
  };

  const fetchHistory = async (p: number) => {
    try {
      const res = await fetch(`/api/ai/history?page=${p}&per_page=5`);
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch strategy history:", e);
    }
  };

  useEffect(() => {
    void Promise.all([fetchArticles(), fetchHistory(page)]);
  }, [page]);

  const getStatusColor = (status: string) => {
    if (status.includes("看多")) return "#10b981";
    if (status.includes("看空")) return "#ef4444";
    if (status.includes("中性")) return "#f59e0b";
    return "#6b7280";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="ai-page space-y-12">
      <header className="page-header">
        <h2 className="text-4xl font-black tracking-tighter text-[var(--text-primary)] mb-2">
          AI 赋能投资.
        </h2>
        <p className="text-[var(--text-secondary)] font-medium max-w-2xl leading-relaxed">
          深度融合人工智能技术，探索下一代智慧投资范式。
        </p>
      </header>

      {/* AI Real-time Strategy */}
      <section className="strategy-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:zap" className="text-blue-500" /> 实时 AI 策略
        </h3>
        <AIRecommendationCard />
      </section>

      <div className="main-content-layout grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        {/* Left: Articles */}
        <div className="articles-column space-y-8">
          <h3 className="section-title text-xl font-bold">深度阅读</h3>
          {aiArticles.length > 0 ? (
            <div className="articles-grid grid grid-cols-1 md:grid-cols-2 gap-6">
              {aiArticles.map((article) => (
                <div key={article.slug} className="card p-6 flex flex-col justify-between min-h-[200px] border-t-4 border-blue-500 hover:-translate-y-1 transition-transform">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-500 text-[10px] font-black uppercase mb-3">
                      AI Insights
                    </span>
                    <h3 className="text-lg font-bold mb-2">{article.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-6">
                      {article.description || "暂无描述"}
                    </p>
                  </div>
                  <Link href={`/ai/${article.slug}`} className="text-blue-500 font-bold text-sm flex items-center gap-1 no-underline">
                    深度阅读 <Icon name="lucide:arrow-right" size={14} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl">
              <Icon name="sparkles" size={40} className="mx-auto mb-2 opacity-20" />
              <p className="text-slate-400 text-sm italic">AI 正在实验室中生成内容...</p>
            </div>
          )}
        </div>

        {/* Right: Strategy History */}
        <aside className="history-column space-y-8">
          <h3 className="section-title text-xl font-bold">策略足迹</h3>
          <div className="timeline relative pl-6 border-l-2 border-[var(--border-color)] space-y-6">
            {history?.items.map((item) => (
              <div key={item.id} className="timeline-item relative">
                <div 
                  className="timeline-dot absolute -left-[1.95rem] top-2 size-3 rounded-full border-2 border-[var(--bg-color)] shadow-sm"
                  style={{ backgroundColor: getStatusColor(item.status) }}
                ></div>
                <div className="card p-4 !mb-0 text-sm">
                  <div className="item-header flex justify-between items-center mb-2">
                    <span className="item-status font-black" style={{ color: getStatusColor(item.status) }}>
                      {item.status}
                    </span>
                    <span className="item-time text-[10px] text-slate-400">{formatDate(item.created_at)}</span>
                  </div>
                  <p className="item-summary text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                    {item.summary}
                  </p>
                  <div className="item-footer text-[10px] text-slate-400 text-right font-bold">
                    点位: {item.index_position}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {history && history.pages > 1 && (
            <div className="pagination flex items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page <= 1}
                className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <span className="page-info text-xs font-bold text-slate-500">{page} / {history.pages}</span>
              <button 
                onClick={() => setPage(p => Math.min(history.pages, p + 1))} 
                disabled={page >= history.pages}
                className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
