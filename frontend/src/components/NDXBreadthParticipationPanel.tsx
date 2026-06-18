"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface BreadthIndicator {
  key: string;
  label: string;
  value: string;
  state: string;
  color: "green" | "blue" | "amber" | "red";
  detail: string;
}

interface BreadthPayload {
  as_of: string;
  cap_symbol: string;
  equal_symbol: string;
  price_date: string;
  breadth_score: number;
  breadth_label: string;
  breadth_color: "green" | "blue" | "amber" | "red";
  summary: string;
  methodology: string;
  cap_return_5d: number;
  cap_return_20d: number;
  cap_return_60d: number;
  equal_return_5d: number;
  equal_return_20d: number;
  equal_return_60d: number;
  participation_gap_20d: number;
  participation_gap_60d: number;
  ratio_change_20d: number;
  ratio_change_60d: number;
  participation_days_20d: number;
  participation_rate_20d: number;
  up_days_20d: number;
  down_capture: number | null;
  rolling_corr: number;
  spread_volatility: number;
  indicators: BreadthIndicator[];
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

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const NDXBreadthParticipationPanel = () => {
  const [payload, setPayload] = useState<BreadthPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchBreadth = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/breadth");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX breadth participation:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchBreadth();
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
        <Icon name="network" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">市场广度正在初始化...</p>
      </div>
    );
  }

  const color = colorMap[payload.breadth_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.breadth_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", color.soft, color.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Breadth Participation
            </div>
            <div className={cn("text-3xl font-black leading-none", color.text)}>
              {payload.breadth_label}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.breadth_score.toFixed(1)}
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
            <div>{payload.cap_symbol} vs {payload.equal_symbol}</div>
            <div>{payload.price_date}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>广度确认分</span>
            <span>{payload.breadth_score.toFixed(1)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
            <div className={cn("h-full rounded-full", color.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">等权参与度对比</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Metric label={`${payload.cap_symbol} 20日`} value={formatSignedPct(payload.cap_return_20d)} tone={payload.cap_return_20d >= 0 ? "green" : "red"} />
            <Metric label={`${payload.equal_symbol} 20日`} value={formatSignedPct(payload.equal_return_20d)} tone={payload.equal_return_20d >= 0 ? "green" : "red"} />
            <Metric label="20日参与差" value={formatSignedPct(payload.participation_gap_20d)} tone={payload.participation_gap_20d >= 0 ? "green" : "amber"} />
            <Metric label="60日参与差" value={formatSignedPct(payload.participation_gap_60d)} tone={payload.participation_gap_60d >= 0 ? "green" : "amber"} />
            <Metric label="比率20日" value={formatSignedPct(payload.ratio_change_20d)} tone={payload.ratio_change_20d >= 0 ? "green" : "amber"} />
            <Metric label="跑赢天数" value={`${payload.participation_days_20d}/20`} tone={payload.participation_days_20d >= 10 ? "blue" : "amber"} />
            <Metric label="下跌捕获" value={payload.down_capture === null ? "--" : `${payload.down_capture.toFixed(1)}%`} tone={payload.down_capture !== null && payload.down_capture > 110 ? "red" : "blue"} />
            <Metric label="价差波动" value={`${payload.spread_volatility.toFixed(2)}%`} tone="blue" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">广度约束</h4>
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
          const indicatorColor = colorMap[indicator.color] ?? colorMap.blue;
          return (
            <div key={indicator.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                  {indicator.label}
                </div>
                <span className={cn("px-2 py-1 rounded-md text-[11px] font-black", indicatorColor.soft, indicatorColor.text)}>
                  {indicator.state}
                </span>
              </div>
              <div className={cn("text-2xl font-black leading-none mb-3", indicatorColor.text)}>
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
