"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface AnalogMetric {
  key: string;
  label: string;
  value: string;
  percentile: number;
  state: string;
  color: ColorKey;
  detail: string;
}

interface AnalogRow {
  date: string;
  distance: number;
  qqq_return_20d: number;
  realized_vol_20d: number;
  vix_level: number;
  rates_change_20d_bps: number;
  forward_5d: number;
  forward_10d: number;
  forward_20d: number;
  color: ColorKey;
}

interface RegimeAnalogPayload {
  as_of: string;
  price_date: string;
  proxy_symbol: string;
  proxy_price: number;
  regime: string;
  regime_color: ColorKey;
  analog_score: number;
  summary: string;
  lookback_years: number;
  candidate_count: number;
  analog_count: number;
  avg_distance: number;
  forward_5d_avg: number;
  forward_10d_avg: number;
  forward_20d_avg: number;
  forward_20d_median: number;
  win_rate_20d: number;
  downside_tail_20d: number;
  upside_tail_20d: number;
  current_features: {
    qqq_return_20d: number;
    qqq_return_60d: number;
    realized_vol_20d: number;
    drawdown_60d: number;
    vix_level: number;
    vix_change_20d: number;
    rates_change_20d_bps: number;
    dollar_return_20d: number;
    qqq_spy_20d: number;
    smh_spy_20d: number;
  };
  metrics: AnalogMetric[];
  analogs: AnalogRow[];
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

const formatSignedPct = (value: number, digits = 2) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
};

const formatSignedPoint = (value: number, digits = 1) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
};

export const NDXRegimeAnalogPanel = () => {
  const [payload, setPayload] = useState<RegimeAnalogPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchAnalog = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/regime-analog");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX regime analog:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchAnalog();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-56 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="history" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">历史相似情景正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.analog_score))}%`;
  const winWidth = `${Math.max(4, Math.min(100, payload.win_rate_20d))}%`;
  const distanceWidth = `${Math.max(4, Math.min(100, 100 - payload.avg_distance * 12))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Regime Analog
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.analog_score.toFixed(1)}
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
            <div>{payload.price_date} · {payload.lookback_years}Y</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="类比分数" value={`${payload.analog_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="20日胜率" value={`${payload.win_rate_20d.toFixed(1)}%`} width={winWidth} color={regimeColor.bg} />
          <Gauge label="相似度" value={`距离 ${payload.avg_distance.toFixed(2)}`} width={distanceWidth} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">当前特征位置</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              候选 {payload.candidate_count} · 类比 {payload.analog_count}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                    {metric.state} · Pctl {metric.percentile.toFixed(1)}
                  </div>
                  <p className="text-xs leading-5 text-[var(--text-secondary)] m-0">
                    {metric.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">条件分布</h4>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="5D 均值" value={formatSignedPct(payload.forward_5d_avg)} tone={payload.forward_5d_avg >= 0 ? "green" : "red"} />
              <Metric label="10D 均值" value={formatSignedPct(payload.forward_10d_avg)} tone={payload.forward_10d_avg >= 0 ? "green" : "red"} />
              <Metric label="20D 均值" value={formatSignedPct(payload.forward_20d_avg)} tone={payload.forward_20d_avg >= 0 ? "green" : "red"} />
              <Metric label="20D 中位" value={formatSignedPct(payload.forward_20d_median)} tone={payload.forward_20d_median >= 0 ? "blue" : "amber"} />
              <Metric label="20% 分位" value={formatSignedPct(payload.downside_tail_20d)} tone="red" />
              <Metric label="80% 分位" value={formatSignedPct(payload.upside_tail_20d)} tone="green" />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">控制线</h4>
            <div className="space-y-2">
              {payload.controls.map((control) => (
                <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                  <Icon name="circle-alert" size={15} className="mt-1 shrink-0 text-[var(--accent-strong)]" />
                  <span>{control}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-black text-[var(--text-primary)]">最相似历史窗口</h4>
          <span className="text-xs font-black text-[var(--text-tertiary)]">Forward 5D / 10D / 20D</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {payload.analogs.map((analog) => {
            const color = colorMap[analog.color] ?? colorMap.blue;
            return (
              <article key={analog.date} className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
                <div className="grid grid-cols-[92px_1fr] md:grid-cols-[92px_1fr_210px] gap-3 items-center">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{analog.date}</div>
                    <div className="text-[11px] font-black text-[var(--text-tertiary)]">距离 {analog.distance.toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-black text-[var(--text-secondary)]">
                    <span>20D {formatSignedPct(analog.qqq_return_20d)}</span>
                    <span>Vol {analog.realized_vol_20d.toFixed(1)}%</span>
                    <span>VIX {analog.vix_level.toFixed(1)}</span>
                    <span>10Y {formatSignedPoint(analog.rates_change_20d_bps)}bps</span>
                  </div>
                  <div className={cn("grid grid-cols-3 gap-2 text-right text-sm font-black", color.text)}>
                    <span>{formatSignedPct(analog.forward_5d)}</span>
                    <span>{formatSignedPct(analog.forward_10d)}</span>
                    <span>{formatSignedPct(analog.forward_20d)}</span>
                  </div>
                </div>
              </article>
            );
          })}
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
