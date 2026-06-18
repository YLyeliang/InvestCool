"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface AxisInput {
  label: string;
  value: string;
}

interface CompassAxis {
  key: string;
  label: string;
  score: number;
  state: string;
  color: ColorKey;
  detail: string;
  inputs: AxisInput[];
}

interface DecisionStep {
  label: string;
  trigger: string;
  action: string;
  color: ColorKey;
}

interface RegimeCompassPayload {
  as_of: string;
  regime: string;
  regime_color: ColorKey;
  regime_score: number;
  support_score: number;
  pressure_score: number;
  data_coverage: string;
  summary: string;
  axes: CompassAxis[];
  actions: string[];
  decision_ladder: DecisionStep[];
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

export const NDXRegimeCompassPanel = () => {
  const [payload, setPayload] = useState<RegimeCompassPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchCompass = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const res = await fetch("/api/risk/regime-compass");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchCompass(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } catch (e) {
        console.error("Failed to fetch NDX regime compass:", e);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchCompass(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchCompass();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="compass" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">市场状态罗盘正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_190px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Regime Compass
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.regime_score.toFixed(1)}
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
            <div>{payload.data_coverage}</div>
            <div>支撑 {payload.support_score.toFixed(1)} / 压力 {payload.pressure_score.toFixed(1)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="罗盘分" value={payload.regime_score} color={regimeColor.bg} />
          <Gauge label="支撑分" value={payload.support_score} color="bg-emerald-500" />
          <Gauge label="压力分" value={payload.pressure_score} color="bg-red-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">四轴状态</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">Higher is better</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payload.axes.map((axis) => {
              const axisColor = colorMap[axis.color] ?? colorMap.blue;
              const width = `${Math.max(4, Math.min(100, axis.score))}%`;

              return (
                <article key={axis.key} className={cn("rounded-lg border p-4", axisColor.soft, axisColor.border)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                        {axis.label}
                      </div>
                      <div className={cn("text-2xl font-black leading-tight", axisColor.text)}>
                        {axis.state}
                      </div>
                    </div>
                    <div className={cn("text-lg font-black", axisColor.text)}>
                      {axis.score.toFixed(1)}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--card-bg)]/75 overflow-hidden mb-3">
                    <div className={cn("h-full rounded-full", axisColor.bg)} style={{ width }} />
                  </div>
                  <p className="text-sm leading-6 text-[var(--text-secondary)] m-0">
                    {axis.detail}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {axis.inputs.map((input) => (
                      <div key={`${axis.key}-${input.label}`} className="rounded-md bg-[var(--card-bg)]/65 p-2">
                        <div className="text-[10px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                          {input.label}
                        </div>
                        <div className="text-sm font-black text-[var(--text-primary)]">
                          {input.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">执行动作</h4>
          <div className="space-y-2">
            {payload.actions.map((action) => (
              <div key={action} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-black text-[var(--text-primary)]">决策阶梯</h4>
          <span className="text-xs font-black text-[var(--text-tertiary)]">Portfolio posture</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {payload.decision_ladder.map((step) => {
            const stepColor = colorMap[step.color] ?? colorMap.blue;
            return (
              <article key={step.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h5 className={cn("text-sm font-black", stepColor.text)}>{step.label}</h5>
                  <span className={cn("size-2 rounded-full", stepColor.bg)} />
                </div>
                <p className="text-xs leading-5 text-[var(--text-secondary)] font-semibold m-0">
                  {step.trigger}
                </p>
                <div className="mt-3 rounded-md bg-[var(--card-bg)] p-3 text-sm leading-6 font-bold text-[var(--text-primary)]">
                  {step.action}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Gauge = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const width = `${Math.max(4, Math.min(100, value))}%`;

  return (
    <div>
      <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        <span>{label}</span>
        <span>{value.toFixed(1)}/100</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width }} />
      </div>
    </div>
  );
};
