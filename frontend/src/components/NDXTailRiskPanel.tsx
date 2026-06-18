"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface WorstDay {
  date: string;
  return: number;
}

interface MonthReturn {
  month: string;
  return: number;
}

interface TailRiskPayload {
  as_of: string;
  price_date: string;
  index: number;
  daily_change: number;
  tail_score: number;
  tail_label: string;
  tail_color: "green" | "blue" | "amber" | "red";
  summary: string;
  current_drawdown: number;
  max_drawdown_1y: number;
  max_drawdown_2y: number;
  var95: number;
  var99: number;
  expected_shortfall_95: number;
  vol20: number;
  vol60: number;
  downside_vol60: number;
  positive_ratio: number;
  streak_label: string;
  worst_days: WorstDay[];
  recent_months: MonthReturn[];
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

const formatIndex = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const NDXTailRiskPanel = () => {
  const [payload, setPayload] = useState<TailRiskPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchTailRisk = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/tail");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX tail risk:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchTailRisk();
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
        <Icon name="waves" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">尾部风险正在初始化...</p>
      </div>
    );
  }

  const tailColor = colorMap[payload.tail_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(5, Math.min(100, payload.tail_score))}%`;
  const positiveWidth = `${Math.max(5, Math.min(100, payload.positive_ratio))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", tailColor.soft, tailColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Tail Risk
            </div>
            <div className={cn("text-4xl font-black leading-none", tailColor.text)}>
              {payload.tail_score.toFixed(1)}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              {payload.tail_label}
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
            <div>NDX {formatIndex(payload.index)}</div>
            <div>日内 {formatSignedPct(payload.daily_change)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5 h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
          <div className={cn("h-full rounded-full", tailColor.bg)} style={{ width: scoreWidth }} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_280px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">回撤状态</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-3">
            <RiskMetric label="当前回撤" value={formatSignedPct(payload.current_drawdown)} tone="red" />
            <RiskMetric label="1年最大回撤" value={formatSignedPct(payload.max_drawdown_1y)} tone="red" />
            <RiskMetric label="2年最大回撤" value={formatSignedPct(payload.max_drawdown_2y)} tone="red" />
          </div>
          <div className="mt-4 rounded-lg bg-[var(--section-bg)] p-3">
            <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">短线节奏</div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-1">{payload.streak_label}</div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">历史损失分布</h4>
          <div className="grid grid-cols-2 gap-3">
            <RiskMetric label="95% VaR" value={formatSignedPct(payload.var95)} tone="red" />
            <RiskMetric label="99% VaR" value={formatSignedPct(payload.var99)} tone="red" />
            <RiskMetric label="预期尾损" value={formatSignedPct(payload.expected_shortfall_95)} tone="red" />
            <RiskMetric label="60日下行波动" value={`${payload.downside_vol60.toFixed(1)}%`} tone="amber" />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
              <span>60日上涨占比</span>
              <span>{payload.positive_ratio.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--section-bg)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--accent-color)]" style={{ width: positiveWidth }} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">波动率</h4>
            <div className="grid grid-cols-2 gap-3">
              <RiskMetric label="20日" value={`${payload.vol20.toFixed(1)}%`} tone="blue" />
              <RiskMetric label="60日" value={`${payload.vol60.toFixed(1)}%`} tone="blue" />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">最差交易日</h4>
            <div className="space-y-2">
              {payload.worst_days.slice(0, 4).map((day) => (
                <div key={day.date} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-[var(--text-secondary)]">{day.date}</span>
                  <span className="font-black text-red-700">{formatSignedPct(day.return)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">尾部风险控制</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {payload.controls.map((control) => (
              <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                <span>{control}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">近6个月</h4>
          <div className="space-y-2">
            {payload.recent_months.map((month) => (
              <div key={month.month} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-[var(--text-secondary)]">{month.month}</span>
                <span className={cn("font-black", month.return >= 0 ? "text-emerald-700" : "text-red-700")}>
                  {formatSignedPct(month.return)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskMetric = ({
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
