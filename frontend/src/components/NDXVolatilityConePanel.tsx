"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ConeBucket {
  key: string;
  label: string;
  window: number;
  current_vol: number;
  percentile: number;
  p20: number;
  p50: number;
  p80: number;
  color: ColorKey;
}

interface RiskRange {
  key: string;
  label: string;
  days: number;
  blended_vol: number;
  one_sigma_pct: number;
  two_sigma_pct: number;
  one_sigma_low: number;
  one_sigma_high: number;
  two_sigma_low: number;
  two_sigma_high: number;
}

interface VolatilityConePayload {
  as_of: string;
  price_date: string;
  proxy_symbol: string;
  proxy_price: number;
  cone_score: number;
  regime: string;
  regime_color: ColorKey;
  summary: string;
  data_coverage: string;
  annualized_iv: number;
  iv_percentile: number;
  realized_vol_10d: number;
  realized_vol_20d: number;
  realized_vol_60d: number;
  realized_vol_120d: number;
  rv20_percentile: number;
  vol_slope: number;
  compression_score: number;
  expansion_score: number;
  term_score: number;
  tail_score: number;
  front_ratio: number;
  cone: ConeBucket[];
  ranges: RiskRange[];
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

export const NDXVolatilityConePanel = () => {
  const [payload, setPayload] = useState<VolatilityConePayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchCone = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/volatility-cone");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX volatility cone:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchCone();
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
        <Icon name="chart-spline" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">波动锥正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.cone_score))}%`;
  const expansionWidth = `${Math.max(4, Math.min(100, payload.expansion_score))}%`;
  const compressionWidth = `${Math.max(4, Math.min(100, payload.compression_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Volatility Cone
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.cone_score.toFixed(1)}
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
            <div>{payload.data_coverage} · {payload.price_date}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="波动锥压力分" value={`${payload.cone_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="扩张压力" value={payload.expansion_score.toFixed(1)} width={expansionWidth} color="bg-red-500" />
          <Gauge label="低波拥挤" value={payload.compression_score.toFixed(1)} width={compressionWidth} color="bg-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">前瞻价格风险区间</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              IV {payload.annualized_iv.toFixed(1)}% · Pctl {payload.iv_percentile.toFixed(1)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {payload.ranges.map((range) => (
              <article key={range.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-black text-[var(--text-primary)]">{range.label}</div>
                  <span className="text-[11px] font-black text-[var(--text-tertiary)]">
                    Vol {range.blended_vol.toFixed(1)}%
                  </span>
                </div>
                <div className="text-2xl font-black text-[var(--text-primary)] leading-none mb-2">
                  {range.one_sigma_pct.toFixed(2)}%
                </div>
                <div className="text-xs font-bold text-[var(--text-tertiary)] mb-3">
                  one sigma move
                </div>
                <div className="space-y-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>1 sigma</span>
                    <span>{formatPrice(range.one_sigma_low)} - {formatPrice(range.one_sigma_high)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2 sigma</span>
                    <span>{formatPrice(range.two_sigma_low)} - {formatPrice(range.two_sigma_high)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">执行控制线</h4>
          <div className="space-y-2">
            {payload.controls.map((control) => (
              <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="chart-spline" size={15} className="mt-1 shrink-0 text-[var(--accent-strong)]" />
                <span>{control}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">实现波动锥</h4>
          <div className="space-y-3">
            {payload.cone.map((bucket) => {
              const color = colorMap[bucket.color] ?? colorMap.blue;
              const width = `${Math.max(4, Math.min(100, bucket.percentile))}%`;
              return (
                <div key={bucket.key} className="grid grid-cols-[78px_1fr_78px] md:grid-cols-[96px_1fr_92px_110px] gap-3 items-center rounded-lg bg-[var(--section-bg)] p-3">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{bucket.label}</div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{bucket.window} days</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                      <span>P20 {bucket.p20.toFixed(1)} · P50 {bucket.p50.toFixed(1)} · P80 {bucket.p80.toFixed(1)}</span>
                      <span>Pctl {bucket.percentile.toFixed(1)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                      <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                    </div>
                  </div>
                  <div className={cn("text-sm font-black text-right", color.text)}>
                    {bucket.current_vol.toFixed(1)}%
                  </div>
                  <div className="hidden md:block text-right text-xs font-semibold text-[var(--text-secondary)]">
                    {bucket.percentile.toFixed(1)} pct
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">波动状态</h4>
          <div className="grid grid-cols-1 gap-3">
            <Metric label="20D 实现波动" value={`${payload.realized_vol_20d.toFixed(1)}%`} detail={`Pctl ${payload.rv20_percentile.toFixed(1)}`} tone={payload.rv20_percentile > 75 ? "red" : payload.rv20_percentile < 25 ? "green" : "blue"} />
            <Metric label="隐含波动" value={`${payload.annualized_iv.toFixed(1)}%`} detail={`Pctl ${payload.iv_percentile.toFixed(1)}`} tone={payload.iv_percentile > 75 ? "amber" : "blue"} />
            <Metric label="短长波动差" value={formatSigned(payload.vol_slope, "pt")} detail={`10D - 60D · Front ${payload.front_ratio.toFixed(2)}x`} tone={payload.vol_slope > 6 ? "red" : payload.vol_slope > 1 ? "amber" : "blue"} />
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
  const toneColor = colorMap[tone] ?? colorMap.blue;
  return (
    <div className={cn("rounded-lg border p-4", toneColor.soft, toneColor.border)}>
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-xl font-black leading-tight", toneColor.text)}>
        {value}
      </div>
      <div className="text-xs font-bold text-[var(--text-secondary)] mt-1">
        {detail}
      </div>
    </div>
  );
};
