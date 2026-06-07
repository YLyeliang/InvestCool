"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface AIRecommendation {
  status: string;
  summary: string;
  created_at: string;
  index_position: number;
  error?: string;
}

export const AIRecommendationCard = () => {
  const [latest, setLatest] = useState<AIRecommendation | null>(null);
  const [pending, setPending] = useState(true);

  const fetchData = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/ai/latest");
      if (res.ok) {
        setLatest(await res.json());
      }
    } catch (e) {
      console.error("AI recommendation fetch error:", e);
    } finally {
      setPending(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes("看多")) return "#10b981"; // Green
    if (status.includes("看空")) return "#ef4444"; // Red
    if (status.includes("中性")) return "#f59e0b"; // Yellow
    return "#6b7280"; // Gray
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className={cn("ai-recommendation-card", pending && "opacity-70")}>
      {latest && !latest.error ? (
        <div className="card-body">
          <div className="header flex justify-between items-center mb-5">
            <div
              className="status-badge flex items-center gap-2 px-4 py-1.5 rounded-full text-white font-extrabold text-sm shadow-sm"
              style={{ backgroundColor: getStatusColor(latest.status) }}
            >
              <Icon name="bot" size={18} />
              {latest.status}
            </div>
            <div className="meta flex flex-col items-end text-[10px] text-slate-500">
              <span className="time">{formatDate(latest.created_at)}</span>
              <span className="index-pos">执行点位: {latest.index_position}</span>
            </div>
          </div>

          <div className="summary-box bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border-l-4 border-blue-500 mb-4">
            <p className="summary-text text-lg leading-relaxed font-medium text-slate-800 dark:text-slate-100 m-0">
              {latest.summary}
            </p>
          </div>

          <div className="card-footer flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="hint text-[10px] text-slate-400">
              每 2 小时由 Gemini 自动更新
            </span>
            <button
              onClick={fetchData}
              className="refresh-btn text-slate-500 hover:text-blue-500 transition-all p-1"
              disabled={pending}
            >
              <Icon
                name="refresh-cw"
                size={16}
                className={cn(pending && "animate-spin")}
              />
            </button>
          </div>
        </div>
      ) : !pending ? (
        <div className="empty-state text-center py-8 text-slate-400">
          <Icon name="brain-circuit" size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无实时策略，AI 正在分析市场数据...</p>
        </div>
      ) : null}

      <style jsx>{`
        .ai-recommendation-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }
        .ai-recommendation-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent-color), #8b5cf6);
        }
      `}</style>
    </div>
  );
};
