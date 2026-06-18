"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ConditionItem {
  key: string;
  label: string;
  value: string;
  raw_value: number;
  score: number;
  state: string;
  color: ColorKey;
  favorable_when: string;
  detail: string;
}

interface ConditionScenario {
  key: string;
  label: string;
  sample_count: number;
  same_day_return: number;
  forward_5d_return: number;
  positive_rate_5d: number;
  state: string;
  color: ColorKey;
}

interface ConditionMatrixPayload {
  as_of: string;
  price_date: string;
  regime: string;
  regime_color: ColorKey;
  condition_score: number;
  summary: string;
  qqq_return_5d: number;
  qqq_return_20d: number;
  rates_change_20d_bps: number;
  dollar_return_20d: number;
  vix_change_20d: number;
  semis_active_20d: number;
  breadth_gap_20d: number;
  equal_symbol: string;
  conditions: ConditionItem[];
  scenarios: ConditionScenario[];
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

const formatSigned = (value: number, digits = 1) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
};

export const NDXConditionMatrixPanel = () => {
  const [payload, setPayload] = useState<ConditionMatrixPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchConditionMatrix = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/condition-matrix");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX condition matrix:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchConditionMatrix();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="grid-3x3" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">条件风险矩阵正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.condition_score))}%`;
  const trendWidth = `${Math.max(4, Math.min(100, 50 + payload.qqq_return_20d * 5))}%`;
  const breadthWidth = `${Math.max(4, Math.min(100, 50 + payload.breadth_gap_20d * 12))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_190px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Condition Matrix
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.condition_score.toFixed(1)}
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
          <Gauge label="条件风险分" value={`${payload.condition_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="QQQ 20日趋势" value={formatSignedPct(payload.qqq_return_20d)} width={trendWidth} color={regimeColor.bg} />
          <Gauge label={`${payload.equal_symbol}/QQQ`} value={`${formatSigned(payload.breadth_gap_20d, 2)}pt`} width={breadthWidth} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">当前条件读数</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              5D {formatSignedPct(payload.qqq_return_5d)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {payload.conditions.map((condition) => {
              const color = colorMap[condition.color] ?? colorMap.blue;
              return (
                <article key={condition.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                      {condition.label}
                    </div>
                    <span className={cn("size-2 rounded-full", color.bg)} />
                  </div>
                  <div className={cn("text-xl font-black leading-tight mb-1", color.text)}>
                    {condition.value}
                  </div>
                  <div className="text-sm font-black text-[var(--text-primary)] mb-2">
                    {condition.state} · {condition.score.toFixed(1)}
                  </div>
                  <p className="text-xs leading-5 text-[var(--text-secondary)] m-0">
                    {condition.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">交易台约束</h4>
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

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-black text-[var(--text-primary)]">条件组合历史偏斜</h4>
          <span className="text-xs font-black text-[var(--text-tertiary)]">Forward 5D</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {payload.scenarios.map((scenario) => {
            const color = colorMap[scenario.color] ?? colorMap.blue;
            return (
              <article key={scenario.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h5 className="text-sm font-black leading-5 text-[var(--text-primary)]">
                    {scenario.label}
                  </h5>
                  <span className={cn("size-2 rounded-full mt-1", color.bg)} />
                </div>
                <div className={cn("text-xl font-black leading-tight mb-1", color.text)}>
                  {formatSignedPct(scenario.forward_5d_return)}
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">
                  {scenario.state} · 样本 {scenario.sample_count}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-black text-[var(--text-tertiary)]">
                  <div>同日 {formatSignedPct(scenario.same_day_return)}</div>
                  <div>胜率 {scenario.positive_rate_5d.toFixed(1)}%</div>
                </div>
              </article>
            );
          })}
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
