"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ScenarioRow {
  key: string;
  name: string;
  category: string;
  color: ColorKey;
  probability_pct: number;
  range_low: number;
  range_high: number;
  range_label: string;
  midpoint_return: number;
  downside_pct: number;
  upside_pct: number;
  expected_contribution: number;
  response: string;
  rationale: string;
}

interface RiskBand {
  key: string;
  label: string;
  days: number;
  one_sigma_pct: number;
  two_sigma_pct: number;
  blended_vol: number;
}

interface BudgetRow {
  key: string;
  name: string;
  color: ColorKey;
  exposure: string;
  cash_buffer: string;
  max_loss_budget: string;
  fit: string;
  action: string;
}

interface Level {
  label?: string;
  value?: number;
  distance_label?: string;
  color?: ColorKey;
}

interface RiskRewardPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  stance: string;
  index: number;
  expected_move: number;
  downside_probability: number;
  upside_probability: number;
  probability_weighted_low: number;
  probability_weighted_high: number;
  weighted_low_pct: number;
  weighted_high_pct: number;
  reward_to_risk: number;
  bear_case: ScenarioRow;
  base_case: ScenarioRow;
  bull_case: ScenarioRow;
  scenarios: ScenarioRow[];
  risk_bands: RiskBand[];
  budget_rows: BudgetRow[];
  levels: {
    invalidation?: Level;
    repair?: Level;
    confirmation?: Level;
  };
  regime: string;
  alert_level: string;
  alert_score: number;
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

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatIndex = (value?: number | null, digits = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: digits });
};

const formatSignedPct = (value?: number | null, digits = 1) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
};

export const NDXRiskRewardPanel = () => {
  const [payload, setPayload] = useState<RiskRewardPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchRiskReward = async () => {
      try {
        const response = await fetch("/api/risk/risk-reward");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as RiskRewardPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX risk reward framework:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchRiskReward();

    return () => {
      cancelled = true;
    };
  }, []);

  const headlineTone = colorMap[payload?.headline_color ?? "blue"];
  const scenarioCards = useMemo(() => {
    if (!payload) return [];
    return [
      { title: "Bear Case", row: payload.bear_case, icon: "trending-down" },
      { title: "Base Case", row: payload.base_case, icon: "move-horizontal" },
      { title: "Bull Case", row: payload.bull_case, icon: "trending-up" },
    ];
  }, [payload]);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="scale" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">风险回报框架正在初始化...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", headlineTone.soft, headlineTone.border)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_300px] xl:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Risk / Reward
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              R/R {payload.reward_to_risk.toFixed(2)} · {payload.regime}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.stance}
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="NDX" value={formatIndex(payload.index, 2)} />
            <MiniMetric label="期望路径" value={formatSignedPct(payload.expected_move, 2)} />
            <MiniMetric label="下行概率" value={`${payload.downside_probability.toFixed(1)}%`} />
            <MiniMetric label="上行概率" value={`${payload.upside_probability.toFixed(1)}%`} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <RangeMetric
            label="概率加权下沿"
            value={formatIndex(payload.probability_weighted_low)}
            detail={formatSignedPct(payload.weighted_low_pct, 2)}
            tone={payload.weighted_low_pct < -2 ? "red" : "amber"}
          />
          <RangeMetric
            label="当前点位"
            value={formatIndex(payload.index)}
            detail={`更新 ${formatDateTime(payload.as_of)}`}
            tone="blue"
          />
          <RangeMetric
            label="概率加权上沿"
            value={formatIndex(payload.probability_weighted_high)}
            detail={formatSignedPct(payload.weighted_high_pct, 2)}
            tone={payload.weighted_high_pct > 2 ? "green" : "blue"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {scenarioCards.map(({ title, row, icon }) => (
          <ScenarioCard key={`${title}-${row.key}`} title={title} row={row} icon={icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="workflow" size={16} className="text-[var(--accent-color)]" />
            情景概率分布
          </div>
          <div className="space-y-3">
            {payload.scenarios.map((row) => {
              const tone = colorMap[row.color] ?? colorMap.blue;
              return (
                <div key={row.key} className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 md:grid-cols-[150px_1fr_88px] md:items-center">
                  <div>
                    <div className={cn("text-sm font-black", tone.text)}>{row.name}</div>
                    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                      {row.category}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                      <span>{row.range_label}</span>
                      <span>{formatSignedPct(row.midpoint_return, 1)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--card-bg)]">
                      <div className={cn("h-full rounded-full", tone.bg)} style={{ width: `${Math.max(4, row.probability_pct)}%` }} />
                    </div>
                  </div>
                  <div className={cn("text-right text-lg font-black", tone.text)}>
                    {row.probability_pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="chart-spline" size={16} className="text-[var(--accent-color)]" />
              波动预算
            </div>
            <div className="grid grid-cols-2 gap-2">
              {payload.risk_bands.map((band) => (
                <div key={band.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{band.label}</div>
                  <div className="mt-1 text-lg font-black text-[var(--text-primary)]">±{band.one_sigma_pct.toFixed(2)}%</div>
                  <div className="mt-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    2σ ±{band.two_sigma_pct.toFixed(2)}% · vol {band.blended_vol.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="milestone" size={16} className="text-[var(--accent-color)]" />
              确认线
            </div>
            <div className="space-y-2">
              <LevelRow label="失效线" level={payload.levels.invalidation} tone="amber" />
              <LevelRow label="修复线" level={payload.levels.repair} tone="blue" />
              <LevelRow label="确认线" level={payload.levels.confirmation} tone="green" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {payload.budget_rows.map((row) => {
          const tone = colorMap[row.color] ?? colorMap.blue;
          return (
            <article key={row.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Budget</div>
                  <h4 className={cn("mt-1 text-lg font-black", tone.text)}>{row.name}</h4>
                </div>
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", tone.soft, tone.text)}>
                  {row.fit}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <MiniMetric label="暴露" value={row.exposure} />
                <MiniMetric label="现金" value={row.cash_buffer} />
                <MiniMetric label="损失预算" value={row.max_loss_budget} />
              </div>
              <p className="mb-0 mt-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                {row.action}
              </p>
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <Icon name="list-checks" size={16} className="text-[var(--accent-color)]" />
          风控要点
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {payload.controls.map((control) => (
            <div key={control} className="flex gap-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">
              <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>{control}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        预警 {payload.alert_level} {payload.alert_score.toFixed(1)} · {payload.methodology}
      </div>
    </div>
  );
};

const MiniMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
    <div className="mt-1 text-sm font-black leading-tight text-[var(--text-primary)]">{value}</div>
  </div>
);

const RangeMetric = ({
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
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-2xl font-black leading-tight", color.text)}>{value}</div>
      <div className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
};

const ScenarioCard = ({ title, row, icon }: { title: string; row: ScenarioRow; icon: string }) => {
  const tone = colorMap[row.color] ?? colorMap.blue;
  return (
    <article className={cn("rounded-lg border p-5 shadow-sm", tone.soft, tone.border)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase text-[var(--text-tertiary)]">{title}</div>
          <h4 className={cn("mt-1 text-xl font-black leading-tight", tone.text)}>{row.name}</h4>
        </div>
        <Icon name={icon} size={20} className={cn("shrink-0", tone.text)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric label="概率" value={`${row.probability_pct.toFixed(1)}%`} />
        <MiniMetric label="区间" value={row.range_label} />
        <MiniMetric label="中点" value={formatSignedPct(row.midpoint_return, 1)} />
      </div>
      <p className="mb-0 mt-3 text-sm font-semibold leading-6 text-[var(--text-primary)]">
        {row.response}
      </p>
    </article>
  );
};

const LevelRow = ({ label, level, tone }: { label: string; level?: Level; tone: ColorKey }) => {
  const color = colorMap[level?.color ?? tone] ?? colorMap[tone];
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2">
      <span className="text-xs font-black uppercase text-[var(--text-tertiary)]">{level?.label ?? label}</span>
      <span className={cn("text-sm font-black", color.text)}>
        {formatIndex(level?.value)} · {level?.distance_label ?? "--"}
      </span>
    </div>
  );
};
