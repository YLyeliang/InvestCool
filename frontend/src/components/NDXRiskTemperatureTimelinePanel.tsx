"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ScorePoint {
  id: number;
  created_at: string;
  status: string;
  status_rank: number;
  risk_temperature: number | null;
  index_position: number | null;
  summary: string;
}

interface ScoreHistoryPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  latest: ScorePoint;
  previous: ScorePoint | null;
  risk_temperature_delta: number | null;
  index_delta_pct: number | null;
  avg_temperature: number | null;
  min_temperature: number | null;
  max_temperature: number | null;
  duplicate_ratio: number;
  status_counts: Record<string, number>;
  points: ScorePoint[];
  insight: string;
  methodology: string;
}

const colorMap = {
  green: {
    text: "text-emerald-700",
    bg: "bg-emerald-500",
    soft: "bg-emerald-500/10",
    border: "border-emerald-500/25",
  },
  blue: {
    text: "text-blue-700",
    bg: "bg-blue-500",
    soft: "bg-blue-500/10",
    border: "border-blue-500/25",
  },
  amber: {
    text: "text-amber-700",
    bg: "bg-amber-500",
    soft: "bg-amber-500/10",
    border: "border-amber-500/25",
  },
  red: {
    text: "text-red-700",
    bg: "bg-red-500",
    soft: "bg-red-500/10",
    border: "border-red-500/25",
  },
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSigned = (value?: number | null, suffix = "") => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)}${suffix}`;
};

const toneForTemperature = (value?: number | null): ColorKey => {
  if (typeof value !== "number") return "blue";
  if (value >= 70) return "red";
  if (value >= 55) return "amber";
  if (value >= 35) return "blue";
  return "green";
};

export const NDXRiskTemperatureTimelinePanel = () => {
  const [payload, setPayload] = useState<ScoreHistoryPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchScoreHistory = async () => {
      try {
        const response = await fetch("/api/risk/score-history?limit=30");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as ScoreHistoryPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX risk score history:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchScoreHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="h-40 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="chart-spline" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">风险温度轨迹正在初始化...</p>
      </div>
    );
  }

  const tone = colorMap[payload.headline_color] ?? colorMap.blue;
  const latestTemp = payload.latest.risk_temperature;
  const latestTone = colorMap[toneForTemperature(latestTemp)];
  const visiblePoints = payload.points.slice(-24);

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", tone.soft, tone.border)}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_1fr_260px] lg:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Risk Temperature
            </div>
            <div className={cn("text-3xl font-black leading-none", tone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              {payload.latest.status} · {formatDateTime(payload.latest.created_at)}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.insight}
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <MiniMetric label="当前温度" value={latestTemp !== null ? latestTemp.toFixed(1) : "--"} detail={formatSigned(payload.risk_temperature_delta)} tone={toneForTemperature(latestTemp)} />
            <MiniMetric label="区间均值" value={payload.avg_temperature !== null ? payload.avg_temperature.toFixed(1) : "--"} detail={`${payload.points.length} 条`} tone="blue" />
            <MiniMetric label="温度区间" value={`${payload.min_temperature ?? "--"}-${payload.max_temperature ?? "--"}`} detail="min-max" tone="amber" />
            <MiniMetric label="NDX 变化" value={formatSigned(payload.index_delta_pct, "%")} detail="vs previous" tone={payload.index_delta_pct && payload.index_delta_pct < 0 ? "red" : "green"} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="activity" size={16} className="text-[var(--accent-color)]" />
            最近风险温度轨迹
          </div>
          <div className="text-xs font-semibold text-[var(--text-tertiary)]">
            重复样本 {payload.duplicate_ratio.toFixed(1)}%
          </div>
        </div>

        <div className="grid min-h-[180px] grid-cols-12 items-end gap-2 md:grid-cols-24">
          {visiblePoints.map((point) => {
            const value = point.risk_temperature ?? 0;
            const barTone = colorMap[toneForTemperature(point.risk_temperature)];
            return (
              <div key={point.id} className="flex min-w-0 flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end rounded-md bg-[var(--section-bg)] px-1 py-1">
                  <div
                    className={cn("w-full rounded-sm", barTone.bg)}
                    style={{ height: `${Math.max(5, Math.min(100, value))}%` }}
                    title={`${formatDateTime(point.created_at)} · ${point.status} · ${point.risk_temperature ?? "--"}`}
                  />
                </div>
                <div className={cn("text-[10px] font-black leading-none", barTone.text)}>
                  {point.risk_temperature !== null ? point.risk_temperature.toFixed(0) : "--"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(payload.status_counts).map(([status, count]) => (
          <div key={status} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Status Count</div>
            <div className={cn("mt-1 text-lg font-black", latestTone.text)}>{status}</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">{count} 次</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        更新 {formatDateTime(payload.as_of)} · {payload.methodology}
      </div>
    </div>
  );
};

const MiniMetric = ({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: ColorKey;
}) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-sm font-black leading-tight", color.text)}>{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
};
