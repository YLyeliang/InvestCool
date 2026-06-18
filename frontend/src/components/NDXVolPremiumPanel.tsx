"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface VolPremiumMetric {
  key: string;
  label: string;
  value: string;
  score: number;
  color: ColorKey;
  detail: string;
}

interface VolPremiumPayload {
  as_of: string;
  proxy_symbol: string;
  proxy_price?: number | null;
  expiration?: string | null;
  days_to_expiration: number;
  premium_score: number;
  premium_regime: string;
  premium_color: ColorKey;
  summary: string;
  data_coverage: string;
  implied_move: number;
  annualized_iv: number;
  realized_move: number;
  realized_vol_10d: number;
  realized_vol_20d: number;
  realized_vol_60d: number;
  premium_points: number;
  premium_ratio: number;
  underpricing_pressure: number;
  carry_cost: number;
  tail_score: number;
  term_score: number;
  front_ratio: number;
  vvix_z_score: number;
  put_call_oi_ratio: number;
  implied_range_low?: number | null;
  implied_range_high?: number | null;
  metrics: VolPremiumMetric[];
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

const formatPrice = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSigned = (value?: number | null, suffix = "", digits = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
};

export const NDXVolPremiumPanel = () => {
  const [payload, setPayload] = useState<VolPremiumPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchVolPremium = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const res = await fetch("/api/risk/vol-premium");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchVolPremium(attempt + 1), 4000);
          return;
        }
        setPayload(null);
      } catch (e) {
        console.error("Failed to fetch NDX volatility premium:", e);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchVolPremium(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchVolPremium();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
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
        <Icon name="activity" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">波动风险溢价正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.premium_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.premium_score))}%`;
  const underpricingWidth = `${Math.max(4, Math.min(100, payload.underpricing_pressure))}%`;
  const carryWidth = `${Math.max(4, Math.min(100, payload.carry_cost))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Vol Risk Premium
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.premium_regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.premium_score.toFixed(1)}
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

          <div className="text-sm font-semibold text-[var(--text-secondary)] lg:text-right">
            <div>{payload.data_coverage}</div>
            <div>{payload.proxy_symbol} {formatPrice(payload.proxy_price)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="溢价压力分" value={`${payload.premium_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="波动低估压力" value={payload.underpricing_pressure.toFixed(1)} width={underpricingWidth} color="bg-red-500" />
          <Gauge label="保护成本" value={payload.carry_cost.toFixed(1)} width={carryWidth} color="bg-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">隐含 vs 实现</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              {payload.expiration ?? "--"} · {payload.days_to_expiration}D
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Metric label="隐含到期" value={`${payload.implied_move.toFixed(2)}%`} tone="amber" />
            <Metric label="实现折算" value={`${payload.realized_move.toFixed(2)}%`} tone="blue" />
            <Metric label="风险溢价" value={formatSigned(payload.premium_points, "pt")} tone={payload.premium_points < 0 ? "green" : payload.premium_points > 0.8 ? "amber" : "blue"} />
            <Metric label="隐含/实现" value={`${payload.premium_ratio.toFixed(2)}x`} tone={payload.premium_ratio < 0.9 ? "green" : payload.premium_ratio > 1.25 ? "amber" : "blue"} />
            <Metric label="10日实现" value={`${payload.realized_vol_10d.toFixed(1)}%`} tone="blue" />
            <Metric label="20日实现" value={`${payload.realized_vol_20d.toFixed(1)}%`} tone="blue" />
            <Metric label="60日实现" value={`${payload.realized_vol_60d.toFixed(1)}%`} tone="blue" />
            <Metric label="Put/Call OI" value={payload.put_call_oi_ratio.toFixed(2)} tone={payload.put_call_oi_ratio >= 1.25 ? "amber" : "blue"} />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">保护区间</h4>
          <div className="space-y-3">
            <Metric label="隐含下沿" value={formatPrice(payload.implied_range_low)} tone="red" />
            <Metric label="隐含上沿" value={formatPrice(payload.implied_range_high)} tone="green" />
            <Metric label="尾部风险" value={payload.tail_score.toFixed(1)} tone={payload.tail_score >= 55 ? "amber" : "blue"} />
            <Metric label="曲线压力" value={payload.term_score.toFixed(1)} tone={payload.term_score >= 55 ? "amber" : "blue"} />
            <Metric label="VIX/3M" value={`${payload.front_ratio.toFixed(2)}x`} tone={payload.front_ratio >= 0.96 ? "amber" : "green"} />
            <Metric label="VVIX z" value={formatSigned(payload.vvix_z_score, "", 2)} tone={payload.vvix_z_score >= 1 ? "amber" : "blue"} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {payload.metrics.map((metric) => {
          const color = colorMap[metric.color] ?? colorMap.blue;
          const width = `${Math.max(5, Math.min(100, metric.score))}%`;
          return (
            <article key={metric.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                    {metric.label}
                  </div>
                  <div className={cn("text-xl font-black leading-tight", color.text)}>
                    {metric.value}
                  </div>
                </div>
                <span className={cn("size-2 rounded-full mt-1", color.bg)} />
              </div>
              <div className="h-2 rounded-full bg-[var(--card-bg)]/80 overflow-hidden mb-3">
                <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
              </div>
              <p className="text-xs leading-5 text-[var(--text-secondary)] m-0">
                {metric.detail}
              </p>
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
        <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">执行约束</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {payload.controls.map((control) => (
            <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
              <Icon name="circle-dot" size={14} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>{control}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Gauge = ({ label, value, width, color }: { label: string; value: string; width: string; color: string }) => (
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

const Metric = ({ label, value, tone }: { label: string; value: string; tone: ColorKey }) => {
  const color = colorMap[tone] ?? colorMap.blue;
  return (
    <div className="rounded-lg bg-[var(--card-bg)] p-3">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
        {label}
      </div>
      <div className={cn("text-base font-black", color.text)}>
        {value}
      </div>
    </div>
  );
};
