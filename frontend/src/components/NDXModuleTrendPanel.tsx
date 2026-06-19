"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface TrendModule {
  key: string;
  label: string;
  direction: string;
  current_score: number;
  current_label: string;
  current_color: ColorKey;
  previous_score: number | null;
  previous_label: string | null;
  delta: number | null;
  trend: string;
  tone: ColorKey;
  summary: string;
  action: string;
  sample_count: number;
  previous_at: string | null;
  current_as_of: string | null;
  age_minutes: number | null;
}

interface ModuleTrendPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  available_modules: number;
  history_ready_modules: number;
  warming_count: number;
  cooling_count: number;
  stable_count: number;
  modules: TrendModule[];
  watchlist: TrendModule[];
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

const formatDelta = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "等待";
  return `${value >= 0 ? "+" : ""}${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)}`;
};

export const NDXModuleTrendPanel = () => {
  const [payload, setPayload] = useState<ModuleTrendPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchTrends = async () => {
      try {
        const response = await fetch("/api/risk/module-trends");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as ModuleTrendPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX module trends:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchTrends();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="activity" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">模块趋势正在初始化...</p>
      </div>
    );
  }

  const tone = colorMap[payload.headline_color] ?? colorMap.blue;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", tone.soft, tone.border)}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_1fr_240px] lg:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Module Trend Monitor
            </div>
            <div className={cn("text-3xl font-black leading-none", tone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              历史覆盖 {payload.history_ready_modules}/{payload.available_modules}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            追踪关键风险模块的上一条不同快照，识别风险升温、缓和和稳定项。历史覆盖不足时，面板会明确标记等待下一次快照。
          </p>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Counter label="升温" value={payload.warming_count} tone="red" />
            <Counter label="缓和" value={payload.cooling_count} tone="green" />
            <Counter label="稳定" value={payload.stable_count} tone="blue" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {payload.watchlist.map((item) => (
          <TrendCard key={item.key} item={item} />
        ))}
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <Icon name="list-filter" size={16} className="text-[var(--accent-color)]" />
          关键模块趋势表
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {payload.modules.map((item) => {
            const itemTone = colorMap[item.tone] ?? colorMap.blue;
            return (
              <div key={item.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[var(--text-primary)]">{item.label}</div>
                  <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", itemTone.soft, itemTone.text)}>
                    {formatDelta(item.delta)}
                  </span>
                </div>
                <div className="mt-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                  {item.current_label} · 当前 {item.current_score.toFixed(1)} · {item.trend}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        更新 {formatDateTime(payload.as_of)} · {payload.methodology}
      </div>
    </div>
  );
};

const TrendCard = ({ item }: { item: TrendModule }) => {
  const tone = colorMap[item.tone] ?? colorMap.blue;
  return (
    <article className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            {item.direction} · 样本 {item.sample_count}
          </div>
          <h4 className={cn("mt-1 text-lg font-black leading-tight", tone.text)}>{item.label}</h4>
        </div>
        <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", tone.soft, tone.text)}>
          {item.trend}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Mini label="当前" value={item.current_score.toFixed(1)} />
        <Mini label="前值" value={item.previous_score !== null ? item.previous_score.toFixed(1) : "--"} />
        <Mini label="变化" value={formatDelta(item.delta)} />
      </div>
      <p className="mb-3 text-sm font-bold leading-6 text-[var(--text-primary)]">{item.summary || item.current_label}</p>
      <div className="flex gap-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        <Icon name="route" size={14} className="mt-0.5 shrink-0 text-[var(--accent-color)]" />
        <span>{item.action}</span>
      </div>
    </article>
  );
};

const Counter = ({ label, value, tone }: { label: string; value: number; tone: ColorKey }) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
      <div className={cn("text-xl font-black leading-none", color.text)}>{value}</div>
      <div className="mt-1 text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
    </div>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] px-2 py-2">
    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
    <div className="mt-1 text-sm font-black leading-tight text-[var(--text-primary)]">{value}</div>
  </div>
);
