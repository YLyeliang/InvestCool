"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface RelativeBenchmark {
  key: string;
  label: string;
  symbol: string;
  direction: string;
  color: "green" | "blue" | "amber" | "red";
  ndx_return_20d: number;
  benchmark_return_20d: number;
  excess_20d: number;
  excess_60d: number;
  ratio_change_20d: number;
  ratio_change_60d: number;
  correlation: number;
  beta: number;
  hit_ratio: number;
  sample_days: number;
}

interface RelativePayload {
  as_of: string;
  price_date: string;
  index: number;
  leadership_score: number;
  leadership_label: string;
  leadership_color: "green" | "blue" | "amber" | "red";
  summary: string;
  beta_note: string;
  primary_beta: number;
  primary_correlation: number;
  primary_excess_20d: number;
  primary_excess_60d: number;
  benchmarks: RelativeBenchmark[];
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

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatIndex = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const NDXRelativeStrengthPanel = () => {
  const [payload, setPayload] = useState<RelativePayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchRelative = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/relative");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX relative strength:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchRelative();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="bar-chart-3" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">相对强弱正在初始化...</p>
      </div>
    );
  }

  const leadershipColor = colorMap[payload.leadership_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(5, Math.min(100, payload.leadership_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", leadershipColor.soft, leadershipColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Relative Strength
            </div>
            <div className={cn("text-4xl font-black leading-none", leadershipColor.text)}>
              {payload.leadership_score.toFixed(1)}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              {payload.leadership_label}
            </div>
          </div>

          <div>
            <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
              {payload.summary}
            </p>
            <p className="text-sm leading-6 text-[var(--text-secondary)] mt-2 mb-0">
              {payload.methodology}
            </p>
          </div>

          <div className="text-sm font-semibold text-[var(--text-secondary)] md:text-right">
            <div>NDX {formatIndex(payload.index)}</div>
            <div>SPX Beta {payload.primary_beta.toFixed(2)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5 h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
          <div className={cn("h-full rounded-full", leadershipColor.bg)} style={{ width: scoreWidth }} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {payload.benchmarks.map((benchmark) => {
            const color = colorMap[benchmark.color] ?? colorMap.blue;
            const barWidth = `${Math.max(5, Math.min(100, 50 + benchmark.excess_20d * 3))}%`;

            return (
              <div
                key={benchmark.key}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-base font-black text-[var(--text-primary)]">
                      相对 {benchmark.label}
                    </h4>
                    <p className="text-xs font-bold text-[var(--text-tertiary)] mt-1">
                      {benchmark.symbol} · 样本 {benchmark.sample_days} 日
                    </p>
                  </div>
                  <div className={cn("px-2 py-1 rounded-md text-xs font-black", color.soft, color.text)}>
                    {benchmark.direction}
                  </div>
                </div>

                <div className="h-2 rounded-full bg-[var(--section-bg)] overflow-hidden mb-4">
                  <div className={cn("h-full rounded-full", color.bg)} style={{ width: barWidth }} />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Metric label="20日超额" value={formatSignedPct(benchmark.excess_20d)} tone={benchmark.excess_20d >= 0 ? "green" : "red"} />
                  <Metric label="60日超额" value={formatSignedPct(benchmark.excess_60d)} tone={benchmark.excess_60d >= 0 ? "green" : "red"} />
                  <Metric label="Beta" value={benchmark.beta.toFixed(2)} tone={benchmark.beta > 1.3 ? "amber" : "blue"} />
                  <Metric label="相关性" value={benchmark.correlation.toFixed(2)} tone="blue" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[var(--text-tertiary)] font-bold">NDX 20日</div>
                    <div className="text-[var(--text-primary)] font-black mt-0.5">
                      {formatSignedPct(benchmark.ndx_return_20d)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-tertiary)] font-bold">基准20日</div>
                    <div className="text-[var(--text-primary)] font-black mt-0.5">
                      {formatSignedPct(benchmark.benchmark_return_20d)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-tertiary)] font-bold">比率20日</div>
                    <div className="text-[var(--text-primary)] font-black mt-0.5">
                      {formatSignedPct(benchmark.ratio_change_20d)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-tertiary)] font-bold">胜率60日</div>
                    <div className="text-[var(--text-primary)] font-black mt-0.5">
                      {benchmark.hit_ratio.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-5">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">解读要点</h4>
          <div className="space-y-4 text-sm leading-6 text-[var(--text-secondary)]">
            <div className="flex gap-2">
              <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>{payload.beta_note}</span>
            </div>
            <div className="flex gap-2">
              <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>
                相对强弱用于判断 NDX 是否仍是市场领导资产；若超额收益转负且 beta 上升，代表指数更像高 beta 风险资产。
              </span>
            </div>
            <div className="flex gap-2">
              <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>
                SOX 用于观察 AI/半导体主线，RUT 用于观察风险偏好是否扩散到小盘股。
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "amber" | "red";
}) => {
  const toneClass = {
    green: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    red: "text-red-700",
  }[tone];

  return (
    <div className="rounded-lg bg-[var(--section-bg)] p-3">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("text-sm font-black mt-1", toneClass)}>{value}</div>
    </div>
  );
};
