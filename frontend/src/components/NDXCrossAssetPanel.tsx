"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface CrossAssetItem {
  key: string;
  label: string;
  metric_label: string;
  value: string;
  raw_value: number;
  score: number;
  state: string;
  color: ColorKey;
  detail: string;
}

interface CorrelationItem {
  label: string;
  value: number;
}

interface CrossAssetPayload {
  as_of: string;
  price_date: string;
  regime: string;
  regime_color: ColorKey;
  confirmation_score: number;
  summary: string;
  qqq_return_20d: number;
  qqq_spy_20d: number;
  qqq_iwm_20d: number;
  smh_spy_20d: number;
  credit_ratio_20d: number;
  duration_ratio_20d: number;
  dollar_return_20d: number;
  vix_change_20d: number;
  rates_change_20d_bps: number;
  dollar_symbol: string;
  confirmation_count: number;
  divergence_count: number;
  items: CrossAssetItem[];
  leaders: CrossAssetItem[];
  laggards: CrossAssetItem[];
  correlations: CorrelationItem[];
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

const formatSignedPct = (value: number, digits = 2) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
};

const formatSignedPoint = (value: number, digits = 1) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
};

export const NDXCrossAssetPanel = () => {
  const [payload, setPayload] = useState<CrossAssetPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchCrossAsset = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/cross-asset");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX cross-asset confirmation:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchCrossAsset();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-56 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="git-compare-arrows" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">跨资产确认正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.confirmation_score))}%`;
  const confirmationWidth = `${Math.max(4, Math.min(100, payload.confirmation_count / Math.max(payload.items.length, 1) * 100))}%`;
  const qqqWidth = `${Math.max(4, Math.min(100, 50 + payload.qqq_return_20d * 5))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr_210px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Cross-Asset Confirmation
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.confirmation_score.toFixed(1)}
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
            <div>QQQ 20D {formatSignedPct(payload.qqq_return_20d)}</div>
            <div>{payload.price_date}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="确认质量分" value={`${payload.confirmation_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="确认维度" value={`${payload.confirmation_count}/${payload.items.length}`} width={confirmationWidth} color={regimeColor.bg} />
          <Gauge label="QQQ 20日趋势" value={formatSignedPct(payload.qqq_return_20d)} width={qqqWidth} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">跨资产读数</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              分歧 {payload.divergence_count}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {payload.items.map((item) => {
              const color = colorMap[item.color] ?? colorMap.blue;
              return (
                <article key={item.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                      {item.label}
                    </div>
                    <span className={cn("size-2 rounded-full", color.bg)} />
                  </div>
                  <div className={cn("text-xl font-black leading-tight mb-1", color.text)}>
                    {item.value}
                  </div>
                  <div className="text-sm font-black text-[var(--text-primary)] mb-2">
                    {item.state} · {item.score.toFixed(1)}
                  </div>
                  <p className="text-xs leading-5 text-[var(--text-secondary)] m-0">
                    {item.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">核心价差</h4>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="QQQ/SPY" value={`${formatSignedPoint(payload.qqq_spy_20d, 2)}pt`} tone={payload.qqq_spy_20d >= 0 ? "green" : "amber"} />
              <Metric label="QQQ/IWM" value={`${formatSignedPoint(payload.qqq_iwm_20d, 2)}pt`} tone={payload.qqq_iwm_20d > 6 ? "amber" : "blue"} />
              <Metric label="SMH/SPY" value={`${formatSignedPoint(payload.smh_spy_20d, 2)}pt`} tone={payload.smh_spy_20d >= 0 ? "green" : "amber"} />
              <Metric label="HYG/LQD" value={formatSignedPct(payload.credit_ratio_20d)} tone={payload.credit_ratio_20d >= 0 ? "green" : "red"} />
              <Metric label="TLT/SHY" value={formatSignedPct(payload.duration_ratio_20d)} tone={payload.duration_ratio_20d >= 0 ? "blue" : "amber"} />
              <Metric label={payload.dollar_symbol} value={formatSignedPct(payload.dollar_return_20d)} tone={payload.dollar_return_20d > 0 ? "amber" : "green"} />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">60日相关性</h4>
            <div className="space-y-2">
              {payload.correlations.map((item) => (
                <div key={item.label} className="grid grid-cols-[46px_1fr_46px] gap-3 items-center text-xs font-black">
                  <span className="text-[var(--text-tertiary)]">{item.label}</span>
                  <div className="h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-color)]"
                      style={{ width: `${Math.max(4, Math.min(100, (item.value + 1) * 50))}%` }}
                    />
                  </div>
                  <span className="text-right text-[var(--text-secondary)]">{item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SignalList title="主要支撑" items={payload.leaders} icon="circle-check" />
        <SignalList title="主要短板" items={payload.laggards} icon="triangle-alert" />
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

const SignalList = ({ title, items, icon }: { title: string; items: CrossAssetItem[]; icon: string }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
    <h4 className="text-sm font-black text-[var(--text-primary)] mb-3 flex items-center gap-2">
      <Icon name={icon} size={15} className="text-[var(--accent-color)]" />
      {title}
    </h4>
    <div className="space-y-2">
      {items.map((item) => {
        const color = colorMap[item.color] ?? colorMap.blue;
        return (
          <div key={item.key} className="rounded-lg bg-[var(--section-bg)] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black text-[var(--text-primary)]">{item.label}</span>
              <span className={cn("text-xs font-black", color.text)}>{item.score.toFixed(1)}</span>
            </div>
            <div className="text-xs leading-5 text-[var(--text-secondary)] mt-1">
              {item.state} · {item.value}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
