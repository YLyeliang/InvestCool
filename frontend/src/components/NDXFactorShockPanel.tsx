"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ShockContributor {
  key: string;
  label: string;
  unit: string;
  shock: number;
  beta: number;
  contribution: number;
  color: ColorKey;
}

interface ShockScenario {
  key: string;
  label: string;
  description: string;
  estimated_move: number;
  estimated_price: number;
  contributors: ShockContributor[];
  color: ColorKey;
}

interface ShockBeta {
  key: string;
  label: string;
  unit: string;
  beta: number;
  recent_20d_move: number;
  recent_20d_impact: number;
  color: ColorKey;
}

interface FactorShockPayload {
  as_of: string;
  price_date: string;
  proxy_symbol: string;
  proxy_price: number;
  dollar_symbol: string;
  regression_days: number;
  shock_score: number;
  regime: string;
  regime_color: ColorKey;
  stress_move: number;
  relief_move: number;
  worst_case_label: string;
  worst_case_move: number;
  best_case_label: string;
  best_case_move: number;
  r_squared: number;
  summary: string;
  scenarios: ShockScenario[];
  betas: ShockBeta[];
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
const formatSignedPoint = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}pt`;

export const NDXFactorShockPanel = () => {
  const [payload, setPayload] = useState<FactorShockPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchFactorShock = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/factor-shock");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX factor shock:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchFactorShock();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-56 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="flask-conical" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">因子冲击实验室正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.shock_score))}%`;
  const stressWidth = `${Math.max(4, Math.min(100, 50 + payload.stress_move * 8))}%`;
  const reliefWidth = `${Math.max(4, Math.min(100, 50 + payload.relief_move * 8))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Factor Shock Lab
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.shock_score.toFixed(1)}
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
            <div>{payload.proxy_symbol} {formatPrice(payload.proxy_price)}</div>
            <div>{payload.regression_days}D model · R2 {payload.r_squared.toFixed(2)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="冲击敏感分" value={`${payload.shock_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="压力组合" value={formatSignedPct(payload.stress_move)} width={stressWidth} color={regimeColor.bg} />
          <Gauge label="缓和组合" value={formatSignedPct(payload.relief_move)} width={reliefWidth} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">情景冲击估算</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              {payload.price_date} · {payload.dollar_symbol}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {payload.scenarios.map((scenario) => {
              const color = colorMap[scenario.color] ?? colorMap.blue;
              const mainContributor = [...scenario.contributors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))[0];
              return (
                <article key={scenario.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-black text-[var(--text-primary)] leading-tight">
                        {scenario.label}
                      </div>
                      <p className="text-xs leading-5 text-[var(--text-secondary)] mt-1 mb-0">
                        {scenario.description}
                      </p>
                    </div>
                    <span className={cn("mt-1 size-2 rounded-full shrink-0", color.bg)} />
                  </div>
                  <div className={cn("text-2xl font-black leading-none mb-2", color.text)}>
                    {formatSignedPct(scenario.estimated_move)}
                  </div>
                  <div className="text-xs font-bold text-[var(--text-tertiary)] mb-3">
                    Target {formatPrice(scenario.estimated_price)}
                  </div>
                  <div className="rounded-md bg-[var(--card-bg)]/70 p-3">
                    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                      主贡献
                    </div>
                    <div className="text-sm font-black text-[var(--text-primary)]">
                      {mainContributor?.label ?? "--"} {mainContributor ? formatSignedPoint(mainContributor.contribution) : "--"}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">交易台控制线</h4>
          <div className="space-y-2">
            {payload.controls.map((control) => (
              <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="flask-conical" size={15} className="mt-1 shrink-0 text-[var(--accent-strong)]" />
                <span>{control}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">模型敏感度</h4>
          <div className="space-y-3">
            {payload.betas.map((beta) => {
              const color = colorMap[beta.color] ?? colorMap.blue;
              const width = `${Math.max(4, Math.min(100, 50 + beta.recent_20d_impact * 8))}%`;
              return (
                <div key={beta.key} className="grid grid-cols-[106px_1fr_80px] md:grid-cols-[140px_1fr_82px_92px] gap-3 items-center rounded-lg bg-[var(--section-bg)] p-3">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{beta.label}</div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{beta.unit}</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                      <span>20D move {beta.recent_20d_move.toFixed(2)}</span>
                      <span>impact {formatSignedPoint(beta.recent_20d_impact)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                      <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                    </div>
                  </div>
                  <div className={cn("text-sm font-black text-right", color.text)}>
                    β {beta.beta.toFixed(2)}
                  </div>
                  <div className="hidden md:block text-right text-xs font-semibold text-[var(--text-secondary)]">
                    {formatSignedPoint(beta.recent_20d_impact)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">边界情景</h4>
          <div className="grid grid-cols-1 gap-3">
            <Metric label="最弱情景" value={payload.worst_case_label} detail={formatSignedPct(payload.worst_case_move)} tone={payload.worst_case_move < -2 ? "red" : "amber"} />
            <Metric label="最强情景" value={payload.best_case_label} detail={formatSignedPct(payload.best_case_move)} tone={payload.best_case_move > 1 ? "green" : "blue"} />
            <Metric label="模型解释度" value={`${(payload.r_squared * 100).toFixed(0)}%`} detail={`${payload.regression_days}D regression`} tone="blue" />
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
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: ColorKey;
}) => {
  const toneColor = colorMap[tone] ?? colorMap.blue;
  return (
    <div className={cn("rounded-lg border p-4", toneColor.soft, toneColor.border)}>
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-base font-black leading-tight", toneColor.text)}>
        {value}
      </div>
      <div className="text-xs font-bold text-[var(--text-secondary)] mt-1">
        {detail}
      </div>
    </div>
  );
};
