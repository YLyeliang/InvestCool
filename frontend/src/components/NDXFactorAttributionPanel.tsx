"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface AttributionFactor {
  key: string;
  label: string;
  unit: string;
  description: string;
  factor_move_20d: number;
  beta: number;
  contribution: number;
  color: ColorKey;
}

interface AttributionPayload {
  as_of: string;
  price_date: string;
  window_days: number;
  regression_days: number;
  regime: string;
  regime_color: ColorKey;
  actual_return: number;
  predicted_return: number;
  factor_total: number;
  intercept_contribution: number;
  residual: number;
  macro_contribution: number;
  semis_contribution: number;
  r_squared: number;
  summary: string;
  factors: AttributionFactor[];
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

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const formatSignedPoint = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}pt`;

export const NDXFactorAttributionPanel = () => {
  const [payload, setPayload] = useState<AttributionPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchAttribution = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/attribution");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX factor attribution:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchAttribution();
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
        <Icon name="split" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">因子归因正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const explainedWidth = `${Math.max(4, Math.min(100, payload.r_squared * 100))}%`;
  const returnWidth = `${Math.max(4, Math.min(100, 50 + payload.actual_return * 6))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[190px_1fr_190px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Factor Attribution
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              20D {formatSignedPct(payload.actual_return)}
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
            <div>{payload.window_days}D attribution</div>
            <div>R2 {payload.r_squared.toFixed(2)} · {payload.regression_days}D</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="实际收益" value={formatSignedPct(payload.actual_return)} width={returnWidth} color={regimeColor.bg} />
          <Gauge label="模型解释度" value={`${(payload.r_squared * 100).toFixed(0)}%`} width={explainedWidth} color={regimeColor.bg} />
          <Gauge label="残差" value={formatSignedPoint(payload.residual)} width={`${Math.max(4, Math.min(100, 50 + payload.residual * 8))}%`} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">20日收益归因</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">{payload.price_date}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <Metric label="因子合计" value={formatSignedPoint(payload.factor_total)} tone={payload.factor_total >= 0 ? "green" : "red"} />
            <Metric label="宏观合计" value={formatSignedPoint(payload.macro_contribution)} tone={payload.macro_contribution >= 0 ? "green" : "red"} />
            <Metric label="半导体贡献" value={formatSignedPoint(payload.semis_contribution)} tone={payload.semis_contribution >= 0 ? "green" : "red"} />
            <Metric label="截距" value={formatSignedPoint(payload.intercept_contribution)} tone="blue" />
          </div>
          <div className="space-y-3">
            {payload.factors.map((factor) => {
              const color = colorMap[factor.color] ?? colorMap.blue;
              const width = `${Math.max(4, Math.min(100, 50 + factor.contribution * 7))}%`;
              return (
                <div key={factor.key} className="grid grid-cols-[94px_1fr_76px] md:grid-cols-[120px_1fr_88px_88px] gap-3 items-center rounded-lg bg-[var(--section-bg)] p-3">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{factor.label}</div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{factor.unit}</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                      <span>{factor.description}</span>
                      <span>Move {factor.factor_move_20d.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                      <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                    </div>
                  </div>
                  <div className={cn("text-sm font-black text-right", color.text)}>
                    {formatSignedPoint(factor.contribution)}
                  </div>
                  <div className="hidden md:block text-right text-xs font-semibold text-[var(--text-secondary)]">
                    β {factor.beta.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">归因约束</h4>
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
