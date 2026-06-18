"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface TapeIndicator {
  key: string;
  label: string;
  value: string;
  state: string;
  color: ColorKey;
  detail: string;
}

interface IntradayTapePayload {
  as_of: string;
  proxy_symbol: string;
  session_date: string;
  last_bar_time: string;
  previous_close: number;
  open: number;
  last_price: number;
  high: number;
  low: number;
  opening_gap: number;
  intraday_return: number;
  daily_return: number;
  range_pct: number;
  avg_range_20: number;
  range_expansion: number;
  range_position: number;
  vwap: number;
  vwap_distance: number;
  first_hour_high: number;
  first_hour_low: number;
  balance_state: string;
  volume: number;
  avg_volume_20: number;
  volume_pace: number;
  elapsed_minutes: number;
  realized_vol_intraday: number;
  tape_pressure_score: number;
  regime: string;
  regime_color: ColorKey;
  summary: string;
  indicators: TapeIndicator[];
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

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatVolume = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString("zh-CN");
};

export const NDXIntradayTapePanel = () => {
  const [payload, setPayload] = useState<IntradayTapePayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchTape = async () => {
      setPending(true);
      try {
        const response = await fetch("/api/risk/intraday-tape");
        const data = await response.json();
        setPayload(response.ok && !data.error ? data : null);
      } catch (error) {
        console.error("Failed to fetch NDX intraday tape:", error);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchTape();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="activity" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">盘中交易台正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const pressureWidth = `${Math.max(4, Math.min(100, payload.tape_pressure_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Intraday Tape
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Pressure {payload.tape_pressure_score.toFixed(1)}
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

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)] lg:text-right">
            <div className="lg:col-span-2">
              {payload.proxy_symbol} {formatPrice(payload.last_price)}
            </div>
            <div>日内 {formatSignedPct(payload.daily_return)}</div>
            <div>VWAP {formatPrice(payload.vwap)}</div>
            <div>区间 {formatPrice(payload.low)}</div>
            <div>{formatPrice(payload.high)}</div>
            <div className="col-span-2 text-xs text-[var(--text-tertiary)]">
              最后 5m {formatDateTime(payload.last_bar_time)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>盘中压力分</span>
            <span>{payload.tape_pressure_score.toFixed(1)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/75 overflow-hidden">
            <div className={cn("h-full rounded-full", regimeColor.bg)} style={{ width: pressureWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">QQQ 盘中执行仪表盘</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">{payload.session_date}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="开盘缺口" value={formatSignedPct(payload.opening_gap)} tone={payload.opening_gap >= 0 ? "green" : "red"} />
            <Metric label="开盘后" value={formatSignedPct(payload.intraday_return)} tone={payload.intraday_return >= 0 ? "green" : "red"} />
            <Metric label="VWAP 偏离" value={formatSignedPct(payload.vwap_distance)} tone={payload.vwap_distance >= 0 ? "green" : "red"} />
            <Metric label="成交节奏" value={`${payload.volume_pace.toFixed(2)}x`} tone={payload.volume_pace >= 1.25 ? "amber" : "blue"} />
            <Metric label="日内振幅" value={`${payload.range_pct.toFixed(2)}%`} tone={payload.range_expansion >= 1.35 ? "amber" : "blue"} />
            <Metric label="振幅倍率" value={`${payload.range_expansion.toFixed(2)}x`} tone={payload.range_expansion >= 1.35 ? "amber" : "blue"} />
            <Metric label="区间位置" value={`${payload.range_position.toFixed(0)}%`} tone={payload.range_position >= 65 ? "green" : payload.range_position <= 35 ? "red" : "blue"} />
            <Metric label="已成交" value={formatVolume(payload.volume)} tone="blue" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">执行约束</h4>
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
        {payload.indicators.map((indicator) => {
          const color = colorMap[indicator.color] ?? colorMap.blue;
          return (
            <div key={indicator.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                  {indicator.label}
                </div>
                <span className={cn("px-2 py-1 rounded-md text-[11px] font-black", color.soft, color.text)}>
                  {indicator.state}
                </span>
              </div>
              <div className={cn("text-2xl font-black leading-none mb-3", color.text)}>
                {indicator.value}
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
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-xl font-black", toneClass)}>
        {value}
      </div>
    </div>
  );
};
