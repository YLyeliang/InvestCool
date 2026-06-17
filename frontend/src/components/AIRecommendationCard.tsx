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
            <div className="meta flex flex-col items-end text-xs text-[var(--text-tertiary)] font-semibold">
              <span className="time">{formatDate(latest.created_at)}</span>
              <span className="index-pos">执行点位: {latest.index_position}</span>
            </div>
          </div>

          <div className="summary-box bg-[var(--section-bg)] p-5 rounded-lg border-l-4 border-[var(--accent-color)] mb-4">
            <p className="summary-text text-lg leading-8 font-semibold text-[var(--text-primary)] m-0">
              {latest.summary}
            </p>
          </div>

          <div className="card-footer flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
            <span className="hint text-xs text-[var(--text-tertiary)] font-semibold">
              每 2 小时由 Gemini 自动更新
            </span>
            <button
              onClick={fetchData}
              className="refresh-btn text-[var(--text-tertiary)] hover:text-[var(--accent-strong)] transition-all p-1"
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
        <div className="empty-state text-center py-8 text-[var(--text-tertiary)]">
          <Icon name="brain-circuit" size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无实时策略，AI 正在分析市场数据...</p>
        </div>
      ) : null}

      <style jsx>{`
        .ai-recommendation-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-soft);
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
          background: var(--accent-color);
        }
      `}</style>
    </div>
  );
};
