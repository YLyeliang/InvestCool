"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface RangeLabel {
  label?: string;
  lower?: number;
  upper?: number;
}

interface Level {
  key?: string;
  label?: string;
  value?: number;
  distance_label?: string;
  color?: ColorKey;
  usage?: string;
}

interface MatrixRow {
  key: string;
  profile: string;
  horizon: string;
  tone: ColorKey;
  target: string;
  action: string;
  trigger: string;
  risk_control: string;
}

interface RiskDriver {
  label: string;
  value: string;
  tone: ColorKey;
  detail: string;
}

interface PortfolioActionsPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  readiness_score: number;
  stance: string;
  index: number | null;
  target_exposure: RangeLabel;
  cash_buffer_min: number;
  hedge_coverage: RangeLabel;
  max_loss_budget: number;
  alert_score: number;
  regime_score: number;
  tail_score: number;
  net_pressure: number;
  levels: {
    stress?: Level;
    invalidation?: Level;
    repair?: Level;
    confirmation?: Level;
  };
  matrix: MatrixRow[];
  risk_drivers: RiskDriver[];
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

const formatIndex = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatLevel = (level?: Level) => {
  if (!level?.value) return "--";
  return level.value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
};

export const NDXPortfolioActionMatrixPanel = () => {
  const [payload, setPayload] = useState<PortfolioActionsPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchActions = async () => {
      try {
        const response = await fetch("/api/risk/portfolio-actions");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as PortfolioActionsPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX portfolio actions:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchActions();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="table-properties" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">组合动作矩阵正在初始化...</p>
      </div>
    );
  }

  const headlineTone = colorMap[payload.headline_color] ?? colorMap.blue;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", headlineTone.soft, headlineTone.border)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_260px] xl:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Portfolio Action Matrix
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              Readiness {payload.readiness_score.toFixed(1)}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.stance}
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="NDX" value={formatIndex(payload.index)} />
            <MiniMetric label="目标暴露" value={payload.target_exposure?.label ?? "--"} />
            <MiniMetric label="现金缓冲" value={`${payload.cash_buffer_min.toFixed(0)}%+`} />
            <MiniMetric label="保护覆盖" value={payload.hedge_coverage?.label ?? "--"} />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            <span>动作置信度</span>
            <span>更新 {formatDateTime(payload.as_of)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--card-bg)]/80">
            <div
              className={cn("h-full rounded-full", headlineTone.bg)}
              style={{ width: `${Math.max(4, Math.min(100, payload.readiness_score))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        {payload.matrix.map((row) => {
          const tone = colorMap[row.tone] ?? colorMap.blue;
          return (
            <article key={row.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    {row.horizon}
                  </div>
                  <h4 className={cn("mt-1 text-lg font-black leading-tight", tone.text)}>
                    {row.profile}
                  </h4>
                </div>
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", tone.soft, tone.text)}>
                  {row.target}
                </span>
              </div>

              <p className="mb-3 text-sm font-bold leading-6 text-[var(--text-primary)]">
                {row.action}
              </p>

              <div className="space-y-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                <div className="flex gap-2">
                  <Icon name="route" size={14} className="mt-0.5 shrink-0 text-[var(--accent-color)]" />
                  <span>{row.trigger}</span>
                </div>
                <div className="flex gap-2">
                  <Icon name="shield-alert" size={14} className="mt-0.5 shrink-0 text-[var(--warning-color)]" />
                  <span>{row.risk_control}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="milestone" size={16} className="text-[var(--accent-color)]" />
            关键触发线
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Trigger label="压力下沿" value={formatLevel(payload.levels.stress)} detail={payload.levels.stress?.distance_label} tone="red" />
            <Trigger label="失效线" value={formatLevel(payload.levels.invalidation)} detail={payload.levels.invalidation?.distance_label} tone="amber" />
            <Trigger label="修复线" value={formatLevel(payload.levels.repair)} detail={payload.levels.repair?.distance_label} tone="blue" />
            <Trigger label="确认线" value={formatLevel(payload.levels.confirmation)} detail={payload.levels.confirmation?.distance_label} tone="green" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="sliders-horizontal" size={16} className="text-[var(--accent-color)]" />
            动作驱动项
          </div>
          <div className="space-y-2">
            {payload.risk_drivers.map((driver) => {
              const tone = colorMap[driver.tone] ?? colorMap.blue;
              return (
                <div key={driver.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase text-[var(--text-tertiary)]">{driver.label}</span>
                    <span className={cn("text-sm font-black", tone.text)}>{driver.value}</span>
                  </div>
                  <p className="mb-0 mt-1 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                    {driver.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        {payload.methodology}
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

const Trigger = ({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone: ColorKey;
}) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-lg font-black leading-tight", color.text)}>{value}</div>
      <div className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{detail ?? "--"}</div>
    </div>
  );
};
