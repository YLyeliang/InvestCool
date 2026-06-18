"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface RateDriver {
  key: string;
  label: string;
  score: number;
  color: ColorKey;
  value: string;
  detail: string;
}

interface RateSensitivityPayload {
  as_of: string;
  index?: number | null;
  rate_sensitivity_score: number;
  rate_sensitivity_regime: string;
  rate_sensitivity_color: ColorKey;
  summary: string;
  data_coverage: string;
  rate_level?: number | null;
  rate_change_20d_bps: number;
  rate_factor_pressure: number;
  rate_sensitivity: number;
  dollar_pressure: number;
  weighted_forward_pe?: number | null;
  weighted_peg?: number | null;
  weighted_revenue_growth?: number | null;
  weighted_earnings_growth?: number | null;
  valuation_score: number;
  quality_score: number;
  valuation_duration: number;
  rate_shock_pressure: number;
  quality_buffer: number;
  earnings_required: number;
  pe_compression_50bps: number;
  ndx_multiple_risk: number;
  drivers: RateDriver[];
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

const formatIndex = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatMetric = (value?: number | null, suffix = "", digits = 1) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value.toFixed(digits)}${suffix}`;
};

const formatSigned = (value?: number | null, suffix = "", digits = 1) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
};

export const NDXRateSensitivityPanel = () => {
  const [payload, setPayload] = useState<RateSensitivityPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchRateSensitivity = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const res = await fetch("/api/risk/rate-sensitivity");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchRateSensitivity(attempt + 1), 4000);
          return;
        }
        setPayload(null);
      } catch (e) {
        console.error("Failed to fetch NDX rate sensitivity:", e);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchRateSensitivity(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchRateSensitivity();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  const maxDriverScore = useMemo(() => {
    if (!payload) return 100;
    return Math.max(20, ...payload.drivers.map((driver) => driver.score));
  }, [payload]);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-56 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="percent" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">估值-利率敏感度正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.rate_sensitivity_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.rate_sensitivity_score))}%`;
  const durationWidth = `${Math.max(4, Math.min(100, payload.valuation_duration))}%`;
  const bufferWidth = `${Math.max(4, Math.min(100, payload.quality_buffer))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Valuation / Rates
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.rate_sensitivity_regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.rate_sensitivity_score.toFixed(1)}
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
            <div>NDX {formatIndex(payload.index)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="敏感度分" value={`${payload.rate_sensitivity_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="估值久期" value={payload.valuation_duration.toFixed(1)} width={durationWidth} color="bg-amber-500" />
          <Gauge label="质量缓冲" value={payload.quality_buffer.toFixed(1)} width={bufferWidth} color="bg-emerald-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">敏感度驱动</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              50bps shock
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payload.drivers.map((driver) => {
              const color = colorMap[driver.color] ?? colorMap.blue;
              const width = `${Math.max(5, Math.min(100, driver.score / maxDriverScore * 100))}%`;
              return (
                <article key={driver.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className={cn("text-lg font-black leading-tight", color.text)}>
                        {driver.label}
                      </div>
                      <div className="text-xs font-black text-[var(--text-tertiary)] mt-1">
                        {driver.value}
                      </div>
                    </div>
                    <div className={cn("text-base font-black", color.text)}>
                      {driver.score.toFixed(1)}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--card-bg)]/80 overflow-hidden mb-3">
                    <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                  </div>
                  <p className="text-sm leading-6 text-[var(--text-secondary)] m-0">
                    {driver.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">50bps 情景</h4>
          <div className="space-y-3">
            <Metric label="10Y 水平" value={formatMetric(payload.rate_level, "%", 2)} tone="blue" />
            <Metric label="20日变化" value={formatSigned(payload.rate_change_20d_bps, "bps", 0)} tone={payload.rate_change_20d_bps > 0 ? "amber" : "green"} />
            <Metric label="FPE 压缩" value={`${payload.pe_compression_50bps.toFixed(1)}x`} tone="amber" />
            <Metric label="倍数风险" value={`${payload.ndx_multiple_risk.toFixed(1)}%`} tone={payload.ndx_multiple_risk >= 4 ? "red" : "amber"} />
            <Metric label="所需盈利增速" value={`${payload.earnings_required.toFixed(1)}%+`} tone="green" />
            <Metric label="美元压力" value={payload.dollar_pressure.toFixed(1)} tone={payload.dollar_pressure >= 55 ? "amber" : "blue"} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">估值支撑读数</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Metric label="Forward PE" value={formatMetric(payload.weighted_forward_pe, "x")} tone="amber" />
          <Metric label="PEG" value={formatMetric(payload.weighted_peg, "x", 2)} tone="amber" />
          <Metric label="收入增速" value={formatMetric(payload.weighted_revenue_growth, "%")} tone="green" />
          <Metric label="盈利增速" value={formatMetric(payload.weighted_earnings_growth, "%")} tone="green" />
          <Metric label="估值压力" value={payload.valuation_score.toFixed(1)} tone={payload.valuation_score >= 58 ? "amber" : "blue"} />
          <Metric label="盈利质量" value={payload.quality_score.toFixed(1)} tone={payload.quality_score >= 58 ? "green" : "amber"} />
          <Metric label="利率压力" value={payload.rate_factor_pressure.toFixed(1)} tone={payload.rate_factor_pressure >= 55 ? "amber" : "blue"} />
          <Metric label="历史敏感度" value={formatSigned(payload.rate_sensitivity, "%", 2)} tone={payload.rate_sensitivity < 0 ? "red" : "blue"} />
        </div>
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
