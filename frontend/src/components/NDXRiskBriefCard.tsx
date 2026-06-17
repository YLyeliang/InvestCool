"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface NDXRiskBrief {
  status: string;
  summary: string;
  created_at: string;
  index_position?: number | null;
  error?: string;
}

export const NDXRiskBriefCard = () => {
  const [latest, setLatest] = useState<NDXRiskBrief | null>(null);
  const [pending, setPending] = useState(true);

  const fetchData = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/risk/latest");
      const payload = await res.json();
      setLatest(res.ok && !payload.error ? payload : null);
    } catch (e) {
      console.error("NDX risk brief fetch error:", e);
      setLatest(null);
    } finally {
      setPending(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes("风险偏高") || status.includes("看空")) return "#dc2626";
    if (status.includes("谨慎") || status.includes("防守") || status.includes("观察")) return "#d97706";
    if (status.includes("机会") || status.includes("看多")) return "#059669";
    if (status.includes("中性")) return "#2563eb";
    return "#64748b";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatIndex = (value?: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className={cn("ndx-risk-card", pending && "opacity-70")}>
      {latest ? (
        <div className="card-body">
          <div className="header flex justify-between items-center gap-4 mb-5">
            <div
              className="status-badge flex items-center gap-2 px-4 py-1.5 rounded-full text-white font-extrabold text-sm shadow-sm"
              style={{ backgroundColor: getStatusColor(latest.status) }}
            >
              <Icon name="radar" size={18} />
              {latest.status}
            </div>
            <div className="meta flex flex-col items-end text-xs text-[var(--text-tertiary)] font-semibold">
              <span className="time">{formatDate(latest.created_at)}</span>
              <span className="index-pos">NDX 点位: {formatIndex(latest.index_position)}</span>
            </div>
          </div>

          <div className="summary-box bg-[var(--section-bg)] p-5 rounded-lg border-l-4 border-[var(--accent-color)] mb-4">
            <p className="summary-text text-lg leading-8 font-semibold text-[var(--text-primary)] m-0">
              {latest.summary}
            </p>
          </div>

          <div className="card-footer flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
            <span className="hint text-xs text-[var(--text-tertiary)] font-semibold">
              每 2 小时由 NDX 风险引擎更新
            </span>
            <button
              onClick={fetchData}
              className="refresh-btn text-[var(--text-tertiary)] hover:text-[var(--accent-strong)] transition-all p-1"
              disabled={pending}
              aria-label="刷新 NDX 风险简报"
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
          <Icon name="radar" size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无实时风险简报，系统正在整理市场数据...</p>
        </div>
      ) : null}

      <style jsx>{`
        .ndx-risk-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-soft);
          position: relative;
          overflow: hidden;
        }
        .ndx-risk-card::before {
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
