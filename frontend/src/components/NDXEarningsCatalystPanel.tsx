"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface EarningsSecurity {
  symbol: string;
  name: string;
  earnings_date: string;
  days_to_event: number;
  weight: number;
  eps_average: number | null;
  eps_low: number | null;
  eps_high: number | null;
  eps_dispersion: number | null;
  revenue_average_bn: number | null;
  revenue_dispersion: number | null;
  event_score: number;
  weighted_event_score: number;
}

interface EarningsPayload {
  as_of: string;
  coverage: string;
  event_score: number;
  event_label: string;
  event_color: ColorKey;
  summary: string;
  nearest_symbol: string;
  nearest_date: string;
  nearest_days: number;
  event_weight_14d: number;
  event_weight_30d: number;
  event_weight_45d: number;
  weighted_eps_dispersion: number | null;
  securities: EarningsSecurity[];
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

const formatEventDate = (dateStr: string) => {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
};

const eventTone = (days: number): ColorKey => {
  if (days <= 14) return "red";
  if (days <= 30) return "amber";
  if (days <= 45) return "blue";
  return "green";
};

export const NDXEarningsCatalystPanel = () => {
  const [payload, setPayload] = useState<EarningsPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/earnings");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch MAG7 earnings catalyst:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchEarnings();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-52 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="calendar-clock" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">财报催化风险正在初始化...</p>
      </div>
    );
  }

  const eventColor = colorMap[payload.event_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.event_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", eventColor.soft, eventColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[190px_1fr_190px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Earnings Catalyst
            </div>
            <div className={cn("text-3xl font-black leading-none", eventColor.text)}>
              {payload.event_label}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.event_score.toFixed(1)}
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
            <div>{payload.coverage}</div>
            <div>{payload.nearest_symbol} · {payload.nearest_days} 天</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>财报催化压力</span>
            <span>{payload.event_score.toFixed(1)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
            <div className={cn("h-full rounded-full", eventColor.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">MAG7 财报窗口暴露</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">{payload.nearest_date}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <Metric label="14天权重" value={`${payload.event_weight_14d.toFixed(1)}%`} tone={payload.event_weight_14d > 25 ? "red" : "blue"} />
            <Metric label="30天权重" value={`${payload.event_weight_30d.toFixed(1)}%`} tone={payload.event_weight_30d > 35 ? "amber" : "blue"} />
            <Metric label="45天权重" value={`${payload.event_weight_45d.toFixed(1)}%`} tone={payload.event_weight_45d > 55 ? "amber" : "blue"} />
            <Metric label="EPS 分歧" value={payload.weighted_eps_dispersion ? `${payload.weighted_eps_dispersion.toFixed(1)}%` : "--"} tone="blue" />
          </div>
          <div className="space-y-3">
            {payload.securities.slice(0, 7).map((item) => {
              const tone = eventTone(item.days_to_event);
              const color = colorMap[tone];
              return (
                <div key={item.symbol} className="grid grid-cols-[70px_1fr_72px] md:grid-cols-[82px_1fr_80px_90px] gap-3 items-center rounded-lg bg-[var(--section-bg)] p-3">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{item.symbol}</div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{formatEventDate(item.earnings_date)}</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                      <span>{item.name}</span>
                      <span>{item.weight.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                      <div className={cn("h-full rounded-full", color.bg)} style={{ width: `${Math.max(4, Math.min(100, item.event_score))}%` }} />
                    </div>
                  </div>
                  <div className={cn("text-sm font-black text-right", color.text)}>
                    {item.days_to_event} 天
                  </div>
                  <div className="hidden md:block text-right text-xs font-semibold text-[var(--text-secondary)]">
                    EPS {item.eps_average?.toFixed(2) ?? "--"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">事件约束</h4>
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
    <div className="rounded-lg bg-[var(--section-bg)] p-3 min-h-[86px]">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-xl font-black leading-tight", toneClass)}>
        {value}
      </div>
    </div>
  );
};
