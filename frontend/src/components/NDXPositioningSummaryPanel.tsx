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

interface PositioningLane {
  key: string;
  label: string;
  horizon: string;
  color: ColorKey;
  action: string;
  trigger: string;
  risk_control: string;
}

interface PositioningLevel {
  key: string;
  label: string;
  value: number;
  distance_label: string;
  color: ColorKey;
  usage: string;
}

interface PositioningPayload {
  as_of: string;
  stance: string;
  stance_color: ColorKey;
  posture: string;
  positioning_score: number;
  summary: string;
  target_exposure: RangeLabel;
  cash_buffer_min: number;
  hedge_coverage: RangeLabel;
  alert_level: string;
  alert_score: number;
  regime: string;
  regime_score: number;
  net_pressure: number;
  recovery_score: number;
  tail_score: number;
  hedge_score: number;
  data_snapshots: number;
  levels: PositioningLevel[];
  lanes: PositioningLane[];
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

const formatSigned = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
};

export const NDXPositioningSummaryPanel = () => {
  const [payload, setPayload] = useState<PositioningPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      try {
        const response = await fetch("/api/risk/positioning-summary");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as PositioningPayload);
        }
      } catch (e) {
        console.error("Failed to fetch NDX positioning summary:", e);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-52 rounded bg-[var(--surface-muted)] animate-pulse" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 rounded-lg bg-[var(--surface-muted)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="route" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">仓位动作摘要正在初始化...</p>
      </div>
    );
  }

  const tone = colorMap[payload.stance_color] ?? colorMap.blue;
  const targetLabel = payload.target_exposure?.label ?? "--";
  const hedgeLabel = payload.hedge_coverage?.label ?? "--";

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", tone.soft, tone.border)}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_1fr_180px] lg:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Positioning Summary
            </div>
            <div className={cn("text-3xl font-black leading-none", tone.text)}>
              {payload.stance}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              Score {payload.positioning_score.toFixed(1)}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.summary}
          </p>

          <div className="text-sm font-semibold text-[var(--text-secondary)] lg:text-right">
            <div>{payload.posture}</div>
            <div className="mt-1 text-xs text-[var(--text-tertiary)]">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--card-bg)]/80">
          <div className={cn("h-full rounded-full", tone.bg)} style={{ width: `${Math.max(4, payload.positioning_score)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon="target" label="目标暴露" value={targetLabel} detail={`净压力 ${formatSigned(payload.net_pressure)}`} tone={payload.net_pressure > 8 ? "amber" : "blue"} />
        <Metric icon="wallet-cards" label="现金缓冲" value={`${payload.cash_buffer_min.toFixed(0)}%+`} detail={`数据快照 ${payload.data_snapshots}`} />
        <Metric icon="shield-check" label="保护覆盖" value={hedgeLabel} detail={`对冲分 ${payload.hedge_score.toFixed(1)}`} tone="amber" />
        <Metric icon="bell-ring" label="预警状态" value={payload.alert_level} detail={`预警分 ${payload.alert_score.toFixed(1)}`} tone={payload.alert_score >= 70 ? "red" : payload.alert_score >= 55 ? "amber" : "blue"} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {payload.lanes.map((lane) => {
          const laneTone = colorMap[lane.color] ?? colorMap.blue;
          return (
            <article key={lane.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{lane.horizon}</div>
                  <h4 className={cn("mt-1 text-lg font-black leading-tight", laneTone.text)}>{lane.label}</h4>
                </div>
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", laneTone.soft, laneTone.text)}>
                  {lane.color}
                </span>
              </div>
              <p className="mb-3 text-sm font-bold leading-6 text-[var(--text-primary)]">{lane.action}</p>
              <div className="space-y-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                <div className="flex gap-2">
                  <Icon name="zap" size={14} className="mt-0.5 shrink-0 text-[var(--accent-color)]" />
                  <span>{lane.trigger}</span>
                </div>
                <div className="flex gap-2">
                  <Icon name="shield-alert" size={14} className="mt-0.5 shrink-0 text-[var(--warning-color)]" />
                  <span>{lane.risk_control}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {payload.levels.length ? (
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="milestone" size={16} className="text-[var(--accent-color)]" />
            执行触发线
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            {payload.levels.map((level) => {
              const levelTone = colorMap[level.color] ?? colorMap.blue;
              return (
                <div key={level.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{level.label}</div>
                  <div className={cn("mt-1 text-lg font-black", levelTone.text)}>
                    {Number(level.value).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{level.distance_label}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Metric = ({
  icon,
  label,
  value,
  detail,
  tone = "blue",
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone?: ColorKey;
}) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Icon name={icon} size={15} className="text-[var(--accent-color)]" />
        <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      </div>
      <div className={cn("text-lg font-black leading-tight", color.text)}>{value}</div>
      <div className="mt-1 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
};
