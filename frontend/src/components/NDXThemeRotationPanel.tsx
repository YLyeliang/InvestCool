"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ThemeRow {
  key: string;
  label: string;
  symbol: string;
  description: string;
  price: number;
  return_5d: number;
  return_20d: number;
  return_60d: number;
  excess_20d: number;
  excess_60d: number;
  correlation_to_qqq: number;
  beta_to_qqq: number;
  hit_ratio_20d: number;
  volatility_20d: number;
  direction: string;
  color: ColorKey;
}

interface ThemeRotationPayload {
  as_of: string;
  price_date: string;
  benchmark_symbol: string;
  benchmark_return_20d: number;
  benchmark_return_60d: number;
  regime: string;
  regime_color: ColorKey;
  leadership_score: number;
  summary: string;
  participation_count: number;
  strong_participation_count: number;
  theme_count: number;
  dispersion_20d: number;
  average_beta: number;
  top_theme: string;
  top_theme_symbol: string;
  top_theme_excess_20d: number;
  weakest_theme: string;
  weakest_theme_symbol: string;
  weakest_theme_excess_20d: number;
  themes: ThemeRow[];
  controls: string[];
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

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const NDXThemeRotationPanel = () => {
  const [payload, setPayload] = useState<ThemeRotationPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchThemeRotation = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/theme-rotation");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX theme rotation:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchThemeRotation();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-52 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="layers-3" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">主题轮动分析正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.leadership_score))}%`;
  const participationWidth = `${Math.max(4, Math.min(100, payload.participation_count / payload.theme_count * 100))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[190px_1fr_190px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Theme Rotation
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.leadership_score.toFixed(1)}
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
            <div>{payload.benchmark_symbol} 20日 {formatSignedPct(payload.benchmark_return_20d)}</div>
            <div>{payload.price_date}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="主题扩散分" value={`${payload.leadership_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="跑赢主题数" value={`${payload.participation_count}/${payload.theme_count}`} width={participationWidth} color={regimeColor.bg} />
          <Gauge label="20日分化" value={`${payload.dispersion_20d.toFixed(2)}pct`} width={`${Math.max(4, Math.min(100, payload.dispersion_20d * 12))}%`} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">NDX 主题相对收益</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">相对 {payload.benchmark_symbol}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <Metric label="领涨主题" value={payload.top_theme} detail={`${payload.top_theme_symbol} ${formatSignedPct(payload.top_theme_excess_20d)}`} tone="green" />
            <Metric label="拖累主题" value={payload.weakest_theme} detail={`${payload.weakest_theme_symbol} ${formatSignedPct(payload.weakest_theme_excess_20d)}`} tone="amber" />
            <Metric label="强扩散数" value={`${payload.strong_participation_count}`} detail="超额 > 1.5%" tone="blue" />
            <Metric label="平均 Beta" value={payload.average_beta.toFixed(2)} detail="vs QQQ" tone="blue" />
          </div>

          <div className="space-y-3">
            {payload.themes.map((theme) => {
              const color = colorMap[theme.color] ?? colorMap.blue;
              const width = `${Math.max(4, Math.min(100, 50 + theme.excess_20d * 4))}%`;
              return (
                <div key={theme.key} className="grid grid-cols-[82px_1fr_72px] md:grid-cols-[100px_1fr_90px_90px] gap-3 items-center rounded-lg bg-[var(--section-bg)] p-3">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{theme.label}</div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{theme.symbol}</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                      <span>{theme.direction}</span>
                      <span>20D {formatSignedPct(theme.return_20d)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                      <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                    </div>
                  </div>
                  <div className={cn("text-sm font-black text-right", color.text)}>
                    {formatSignedPct(theme.excess_20d)}
                  </div>
                  <div className="hidden md:block text-right text-xs font-semibold text-[var(--text-secondary)]">
                    β {theme.beta_to_qqq.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">轮动约束</h4>
          <div className="space-y-2">
            {payload.controls.map((control) => (
              <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                <span>{control}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Gauge = ({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: string;
  width: string;
  color: string;
}) => (
  <div>
    <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width }} />
    </div>
  </div>
);

const Metric = ({
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
  const toneClass = {
    green: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    red: "text-red-700",
  }[tone];

  return (
    <div className="rounded-lg bg-[var(--section-bg)] p-3 min-h-[88px]">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-lg font-black leading-tight", toneClass)}>
        {value}
      </div>
      <div className="text-xs font-semibold text-[var(--text-secondary)] mt-1">
        {detail}
      </div>
    </div>
  );
};
