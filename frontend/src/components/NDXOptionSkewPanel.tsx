"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface SkewMetric {
  key: string;
  label: string;
  value: string;
  score: number;
  color: ColorKey;
  detail: string;
}

interface OptionSkewPayload {
  as_of: string;
  proxy_symbol: string;
  proxy_price: number;
  expiration: string;
  days_to_expiration: number;
  skew_score: number;
  regime: string;
  regime_color: ColorKey;
  summary: string;
  atm_iv: number;
  put_95_iv: number;
  put_90_iv: number;
  call_105_iv: number;
  call_110_iv: number;
  put_skew: number;
  deep_put_skew: number;
  call_skew: number;
  risk_reversal: number;
  tail_oi_ratio: number;
  tail_volume_ratio: number;
  downside_put_oi: number;
  upside_call_oi: number;
  downside_put_volume: number;
  upside_call_volume: number;
  put_spread_cost: number;
  put_spread_cost_pct: number;
  put_95_strike: number;
  put_90_strike: number;
  call_105_strike: number;
  put_95_distance: number;
  put_90_distance: number;
  call_105_distance: number;
  metrics: SkewMetric[];
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

const formatPrice = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSigned = (value: number, suffix = "", digits = 1) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
};

const formatCompact = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
};

export const NDXOptionSkewPanel = () => {
  const [payload, setPayload] = useState<OptionSkewPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchSkew = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/option-skew");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX option skew:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchSkew();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-56 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="shield-alert" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">期权偏斜正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.skew_score))}%`;
  const rrWidth = `${Math.max(4, Math.min(100, 50 + payload.risk_reversal * 4))}%`;
  const oiWidth = `${Math.max(4, Math.min(100, payload.tail_oi_ratio * 36))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Option Skew
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.skew_score.toFixed(1)}
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
            <div>{payload.proxy_symbol} {formatPrice(payload.proxy_price)}</div>
            <div>{payload.expiration} · {payload.days_to_expiration}D</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="Skew 压力分" value={`${payload.skew_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="5% 风险逆转" value={formatSigned(payload.risk_reversal, " vol pts")} width={rrWidth} color={regimeColor.bg} />
          <Gauge label="OTM Put/Call OI" value={`${payload.tail_oi_ratio.toFixed(2)}x`} width={oiWidth} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">偏斜指标</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              ATM IV {payload.atm_iv.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {payload.metrics.map((metric) => {
              const color = colorMap[metric.color] ?? colorMap.blue;
              return (
                <article key={metric.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                      {metric.label}
                    </div>
                    <span className={cn("size-2 rounded-full", color.bg)} />
                  </div>
                  <div className={cn("text-xl font-black leading-tight mb-1", color.text)}>
                    {metric.value}
                  </div>
                  <div className="text-sm font-black text-[var(--text-primary)] mb-2">
                    Score {metric.score.toFixed(1)}
                  </div>
                  <p className="text-xs leading-5 text-[var(--text-secondary)] m-0">
                    {metric.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">交易台控制线</h4>
          <div className="space-y-2">
            {payload.controls.map((control) => (
              <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="shield-alert" size={15} className="mt-1 shrink-0 text-[var(--accent-strong)]" />
                <span>{control}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">IV 曲面截面</h4>
          <div className="grid grid-cols-2 gap-3">
            <Metric label={`${payload.put_90_strike.toFixed(0)} Put`} value={`${payload.put_90_iv.toFixed(1)}%`} tone="red" />
            <Metric label={`${payload.put_95_strike.toFixed(0)} Put`} value={`${payload.put_95_iv.toFixed(1)}%`} tone="amber" />
            <Metric label="ATM" value={`${payload.atm_iv.toFixed(1)}%`} tone="blue" />
            <Metric label={`${payload.call_105_strike.toFixed(0)} Call`} value={`${payload.call_105_iv.toFixed(1)}%`} tone="green" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">尾部需求</h4>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="下方 Put OI" value={formatCompact(payload.downside_put_oi)} tone="amber" />
            <Metric label="上方 Call OI" value={formatCompact(payload.upside_call_oi)} tone="blue" />
            <Metric label="Put 成交" value={formatCompact(payload.downside_put_volume)} tone="amber" />
            <Metric label="Call 成交" value={formatCompact(payload.upside_call_volume)} tone="blue" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">保护成本</h4>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="95 Put 距离" value={formatSigned(payload.put_95_distance, "%", 2)} tone="amber" />
            <Metric label="90 Put 距离" value={formatSigned(payload.put_90_distance, "%", 2)} tone="red" />
            <Metric label="95/90 Spread" value={formatPrice(payload.put_spread_cost)} tone="blue" />
            <Metric label="成本/现价" value={`${payload.put_spread_cost_pct.toFixed(2)}%`} tone="blue" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Gauge = ({ label, value, width, color }: { label: string; value: string; width: string; color: string }) => (
  <div className="rounded-lg bg-[var(--card-bg)]/80 border border-[var(--border-color)] p-3">
    <div className="flex justify-between gap-3 text-xs font-black text-[var(--text-secondary)] mb-2">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-2.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width }} />
    </div>
  </div>
);

const Metric = ({ label, value, tone }: { label: string; value: string; tone: ColorKey }) => {
  const color = colorMap[tone] ?? colorMap.blue;
  return (
    <div className={cn("rounded-lg border p-3", color.soft, color.border)}>
      <div className="text-[11px] font-black text-[var(--text-tertiary)] mb-1">{label}</div>
      <div className={cn("text-sm font-black", color.text)}>{value}</div>
    </div>
  );
};
