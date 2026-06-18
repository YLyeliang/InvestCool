"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface VolatilityIndicator {
  key: string;
  label: string;
  value: string;
  state: string;
  color: ColorKey;
  detail: string;
}

interface VolatilityTermPayload {
  as_of: string;
  price_date: string;
  regime: string;
  regime_color: ColorKey;
  term_score: number;
  summary: string;
  vix: number;
  vix3m: number;
  vix6m: number;
  vvix: number;
  front_ratio: number;
  mid_ratio: number;
  front_spread: number;
  mid_spread: number;
  front_ratio_percentile: number;
  vvix_z_score: number;
  vix_change_5d: number;
  vix_change_20d: number;
  vvix_change_20d: number;
  indicators: VolatilityIndicator[];
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

const formatSigned = (value: number, digits = 2) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;

export const NDXVolatilityTermPanel = () => {
  const [payload, setPayload] = useState<VolatilityTermPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchVolatilityTerm = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/volatility-term");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch VIX term structure:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchVolatilityTerm();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-52 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="waves" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">波动率期限结构正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.term_score))}%`;
  const frontWidth = `${Math.max(4, Math.min(100, payload.front_ratio * 70))}%`;
  const vvixWidth = `${Math.max(4, Math.min(100, 50 + payload.vvix_z_score * 18))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[190px_1fr_190px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Volatility Term
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.term_score.toFixed(1)}
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
            <div>VIX {payload.vix.toFixed(2)}</div>
            <div>{payload.price_date}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="期限压力分" value={`${payload.term_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="VIX / VIX3M" value={`${payload.front_ratio.toFixed(2)}x`} width={frontWidth} color={regimeColor.bg} />
          <Gauge label="VVIX z-score" value={formatSigned(payload.vvix_z_score)} width={vvixWidth} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">VIX 曲线读数</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">3M-VIX {formatSigned(payload.front_spread)}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Metric label="VIX" value={payload.vix.toFixed(2)} tone={payload.vix >= 24 ? "red" : payload.vix >= 19 ? "amber" : "blue"} />
            <Metric label="VIX3M" value={payload.vix3m.toFixed(2)} tone="blue" />
            <Metric label="VIX6M" value={payload.vix6m.toFixed(2)} tone="blue" />
            <Metric label="VVIX" value={payload.vvix.toFixed(1)} tone={payload.vvix_z_score >= 1 ? "amber" : "blue"} />
            <Metric label="前端百分位" value={`${payload.front_ratio_percentile.toFixed(1)}%`} tone={payload.front_ratio_percentile >= 80 ? "red" : payload.front_ratio_percentile >= 65 ? "amber" : "blue"} />
            <Metric label="中段比率" value={`${payload.mid_ratio.toFixed(2)}x`} tone={payload.mid_ratio >= 1 ? "red" : "blue"} />
            <Metric label="VIX 5日" value={formatSigned(payload.vix_change_5d, 1)} tone={payload.vix_change_5d > 1.5 ? "amber" : payload.vix_change_5d < -1.5 ? "green" : "blue"} />
            <Metric label="VIX 20日" value={formatSigned(payload.vix_change_20d, 1)} tone={payload.vix_change_20d > 2 ? "amber" : payload.vix_change_20d < -2 ? "green" : "blue"} />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">曲线约束</h4>
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {payload.indicators.map((indicator) => {
          const color = colorMap[indicator.color] ?? colorMap.blue;
          return (
            <div key={indicator.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                  {indicator.label}
                </div>
                <span className={cn("size-2 rounded-full", color.bg)} />
              </div>
              <div className={cn("text-xl font-black leading-tight mb-1", color.text)}>
                {indicator.value}
              </div>
              <div className="text-sm font-black text-[var(--text-primary)] mb-2">
                {indicator.state}
              </div>
              <p className="text-xs leading-5 text-[var(--text-secondary)] m-0">
                {indicator.detail}
              </p>
            </div>
          );
        })}
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
  tone,
}: {
  label: string;
  value: string;
  tone: ColorKey;
}) => {
  const toneClass = {
    green: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    red: "text-red-700",
  }[tone];

  return (
    <div className="rounded-lg bg-[var(--section-bg)] p-3 min-h-[86px]">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-xl font-black leading-tight", toneClass)}>
        {value}
      </div>
    </div>
  );
};
