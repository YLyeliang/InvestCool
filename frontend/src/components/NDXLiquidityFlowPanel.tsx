"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface LiquiditySignal {
  key: string;
  label: string;
  value: string;
  state: string;
  color: "green" | "blue" | "amber" | "red";
  detail: string;
}

interface LiquidityPayload {
  as_of: string;
  proxy_symbol: string;
  price_date: string;
  price: number;
  daily_return: number;
  return_5d: number;
  return_20d: number;
  volume: number;
  volume_avg20: number;
  volume_avg60: number;
  volume_ratio_20: number;
  volume_z_score: number;
  dollar_volume_bn: number;
  range_pct: number;
  avg_range20: number;
  range_expansion: number;
  flow_balance: number;
  accumulation_days: number;
  distribution_days: number;
  obv_20_change: number;
  flow_score: number;
  regime: string;
  regime_color: "green" | "blue" | "amber" | "red";
  summary: string;
  methodology: string;
  signals: LiquiditySignal[];
  controls: string[];
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

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatVolume = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString("zh-CN");
};

export const NDXLiquidityFlowPanel = () => {
  const [payload, setPayload] = useState<LiquidityPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchLiquidity = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/liquidity");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX liquidity flow:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchLiquidity();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="activity" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">流动性确认正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.flow_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Liquidity Flow
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.flow_score.toFixed(1)}
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
            <div>{payload.proxy_symbol} {formatPrice(payload.price)}</div>
            <div>20日 {formatSignedPct(payload.return_20d)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>成交确认分</span>
            <span>{payload.flow_score.toFixed(1)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
            <div className={cn("h-full rounded-full", regimeColor.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">QQQ 量价仪表盘</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">{payload.price_date}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Metric label="日涨跌" value={formatSignedPct(payload.daily_return)} tone={payload.daily_return >= 0 ? "green" : "red"} />
            <Metric label="5日" value={formatSignedPct(payload.return_5d)} tone={payload.return_5d >= 0 ? "green" : "red"} />
            <Metric label="成交额" value={`$${payload.dollar_volume_bn.toFixed(2)}B`} tone="blue" />
            <Metric label="成交量" value={formatVolume(payload.volume)} tone="blue" />
            <Metric label="20日均量" value={formatVolume(payload.volume_avg20)} tone="blue" />
            <Metric label="60日均量" value={formatVolume(payload.volume_avg60)} tone="blue" />
            <Metric label="量能 Z" value={payload.volume_z_score.toFixed(2)} tone={payload.volume_z_score >= 1 ? "amber" : "blue"} />
            <Metric label="振幅" value={`${payload.range_pct.toFixed(2)}%`} tone={payload.range_expansion >= 1.25 ? "amber" : "blue"} />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">交易台约束</h4>
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {payload.signals.map((signal) => {
          const color = colorMap[signal.color] ?? colorMap.blue;
          return (
            <div key={signal.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                  {signal.label}
                </div>
                <span className={cn("px-2 py-1 rounded-md text-[11px] font-black", color.soft, color.text)}>
                  {signal.state}
                </span>
              </div>
              <div className={cn("text-2xl font-black leading-none mb-3", color.text)}>
                {signal.value}
              </div>
              <p className="text-xs leading-5 text-[var(--text-secondary)] m-0">
                {signal.detail}
              </p>
            </div>
          );
        })}
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
