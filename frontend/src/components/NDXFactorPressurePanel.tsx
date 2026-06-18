"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface FactorItem {
  key: string;
  label: string;
  symbol: string;
  level: string;
  change_5d: string;
  change_20d: string;
  correlation: number;
  correlation_label: string;
  sensitivity: number;
  sensitivity_label: string;
  pressure_score: number;
  pressure_label: string;
  color: "green" | "blue" | "amber" | "red";
  direction: string;
  comment: string;
  sample_days: number;
}

interface FactorPayload {
  as_of: string;
  index_level: number;
  index_20d_return: number;
  lookback_days: number;
  pressure_score: number;
  pressure_label: string;
  pressure_color: "green" | "blue" | "amber" | "red";
  main_headwind: string;
  main_sensitivity: string;
  summary: string;
  methodology: string;
  factors: FactorItem[];
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

const formatIndex = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const NDXFactorPressurePanel = () => {
  const [payload, setPayload] = useState<FactorPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchFactors = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/factors");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX factor pressure:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchFactors();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-44 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="line-chart" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">宏观因子压力正在初始化...</p>
      </div>
    );
  }

  const pressureColor = colorMap[payload.pressure_color] ?? colorMap.blue;
  const width = `${Math.max(5, Math.min(100, payload.pressure_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", pressureColor.soft, pressureColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Macro Factors
            </div>
            <div className={cn("text-4xl font-black leading-none", pressureColor.text)}>
              {payload.pressure_score.toFixed(1)}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              {payload.pressure_label}
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
            <div>NDX {formatIndex(payload.index_level)}</div>
            <div>20日 {formatSignedPct(payload.index_20d_return)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5 h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
          <div className={cn("h-full rounded-full", pressureColor.bg)} style={{ width }} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {payload.factors.map((factor) => {
          const color = colorMap[factor.color] ?? colorMap.blue;
          const factorWidth = `${Math.max(5, Math.min(100, factor.pressure_score))}%`;
          const sensitivityColor = factor.sensitivity <= 0 ? "text-red-700" : "text-emerald-700";

          return (
            <div
              key={factor.key}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-base font-black text-[var(--text-primary)]">
                    {factor.label}
                  </h4>
                  <p className="text-xs font-bold text-[var(--text-tertiary)] mt-1">
                    {factor.symbol} · {factor.level}
                  </p>
                </div>
                <div className={cn("px-2 py-1 rounded-md text-xs font-black", color.soft, color.text)}>
                  {factor.direction}
                </div>
              </div>

              <div className="h-2 rounded-full bg-[var(--section-bg)] overflow-hidden mb-4">
                <div className={cn("h-full rounded-full", color.bg)} style={{ width: factorWidth }} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    5日变化
                  </div>
                  <div className="text-sm font-black text-[var(--text-primary)] mt-1">
                    {factor.change_5d}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    20日变化
                  </div>
                  <div className="text-sm font-black text-[var(--text-primary)] mt-1">
                    {factor.change_20d}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    60日相关
                  </div>
                  <div className="text-sm font-black text-[var(--text-primary)] mt-1">
                    {factor.correlation.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    敏感度
                  </div>
                  <div className={cn("text-sm font-black mt-1", sensitivityColor)}>
                    {factor.sensitivity_label}
                  </div>
                </div>
              </div>

              <p className="text-sm leading-6 text-[var(--text-secondary)] mb-4">
                {factor.comment}
              </p>

              <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3 text-xs font-bold text-[var(--text-tertiary)]">
                <span>{factor.correlation_label}</span>
                <span>样本 {factor.sample_days} 日</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
