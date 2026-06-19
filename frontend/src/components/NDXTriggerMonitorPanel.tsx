"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";
type SideKey = "upside" | "downside";

interface TriggerLine {
  key: string;
  label: string;
  value: number;
  side: SideKey;
  color: ColorKey;
  state: string;
  state_color: ColorKey;
  distance_pct: number;
  distance_label: string;
  points_to_trigger: number;
  trigger: string;
  action: string;
  priority: number;
  position_pct: number;
}

interface ActionItem {
  label: string;
  color: ColorKey;
  detail: string;
  action: string;
}

interface TriggerMonitorPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  index: number;
  posture: string;
  alert_level: string;
  alert_score: number;
  regime: string;
  net_pressure: number;
  nearest: TriggerLine | null;
  nearest_down: TriggerLine | null;
  nearest_up: TriggerLine | null;
  index_position_pct: number;
  ladder_min: number;
  ladder_max: number;
  lines: TriggerLine[];
  action_stack: ActionItem[];
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

const formatSignedPoints = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatIndex(value, 0)}`;
};

export const NDXTriggerMonitorPanel = () => {
  const [payload, setPayload] = useState<TriggerMonitorPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchMonitor = async () => {
      try {
        const response = await fetch("/api/risk/trigger-monitor");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as TriggerMonitorPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX trigger monitor:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchMonitor();

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedLines = useMemo(() => {
    return [...(payload?.lines ?? [])].sort((a, b) => a.value - b.value);
  }, [payload]);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_340px]">
          <div className="h-48 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          <div className="h-48 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="crosshair" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">触发线监控正在初始化...</p>
      </div>
    );
  }

  const headlineTone = colorMap[payload.headline_color] ?? colorMap.blue;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", headlineTone.soft, headlineTone.border)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_280px] xl:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Trigger Monitor
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              {payload.posture} · {payload.regime}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            当前 NDX {formatIndex(payload.index, 2)}。最近下行线为 {payload.nearest_down?.label ?? "--"}，
            最近上行线为 {payload.nearest_up?.label ?? "--"}；先用触发距离决定动作，不用单日噪音改仓位。
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="NDX" value={formatIndex(payload.index, 2)} />
            <MiniMetric label="预警" value={`${payload.alert_level} ${payload.alert_score.toFixed(1)}`} />
            <MiniMetric label="下行最近" value={payload.nearest_down?.distance_label ?? "--"} />
            <MiniMetric label="上行最近" value={payload.nearest_up?.distance_label ?? "--"} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="milestone" size={16} className="text-[var(--accent-color)]" />
              触发线阶梯
            </div>
            <div className="text-xs font-semibold text-[var(--text-tertiary)]">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>

          <div className="relative mb-5 h-10 rounded-lg bg-[var(--section-bg)] px-3">
            <div className="absolute left-3 right-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--border-color)]" />
            {orderedLines.map((line) => {
              const tone = colorMap[line.state_color] ?? colorMap.blue;
              return (
                <div
                  key={line.key}
                  className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--card-bg)]", tone.bg)}
                  style={{ left: `calc(12px + (100% - 24px) * ${line.position_pct / 100})` }}
                  title={`${line.label} ${formatIndex(line.value)} ${line.distance_label}`}
                />
              );
            })}
            <div
              className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--card-bg)] bg-[var(--text-primary)] shadow-sm"
              style={{ left: `calc(12px + (100% - 24px) * ${payload.index_position_pct / 100})` }}
              title={`NDX ${formatIndex(payload.index, 2)}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {orderedLines.map((line) => (
              <TriggerLineCard key={line.key} line={line} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="list-checks" size={16} className="text-[var(--accent-color)]" />
            动作清单
          </div>
          <div className="space-y-3">
            {payload.action_stack.map((item) => {
              const tone = colorMap[item.color] ?? colorMap.blue;
              return (
                <div key={item.label} className={cn("rounded-lg border p-3", tone.soft, tone.border)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase text-[var(--text-tertiary)]">{item.label}</span>
                    <span className={cn("text-xs font-black", tone.text)}>{item.detail}</span>
                  </div>
                  <p className="mb-0 mt-2 text-sm font-semibold leading-6 text-[var(--text-primary)]">
                    {item.action}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3">
            <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Net Pressure</div>
            <div className={cn("mt-1 text-xl font-black", payload.net_pressure > 0 ? "text-amber-700" : "text-emerald-700")}>
              {payload.net_pressure >= 0 ? "+" : ""}{payload.net_pressure.toFixed(1)}
            </div>
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

const TriggerLineCard = ({ line }: { line: TriggerLine }) => {
  const tone = colorMap[line.state_color] ?? colorMap.blue;
  const lineTone = colorMap[line.color] ?? colorMap.blue;
  return (
    <article className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            {line.side === "downside" ? "下行触发" : "上行触发"}
          </div>
          <h4 className={cn("mt-1 text-lg font-black leading-tight", lineTone.text)}>
            {line.label}
          </h4>
        </div>
        <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", tone.soft, tone.text)}>
          {line.state}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3">
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Level</div>
          <div className="mt-1 text-xl font-black text-[var(--text-primary)]">{formatIndex(line.value)}</div>
        </div>
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3">
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Distance</div>
          <div className={cn("mt-1 text-xl font-black", tone.text)}>{line.distance_label}</div>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        <div className="flex gap-2">
          <Icon name="crosshair" size={14} className="mt-0.5 shrink-0 text-[var(--accent-color)]" />
          <span>{line.trigger}</span>
        </div>
        <div className="flex gap-2">
          <Icon name="route" size={14} className="mt-0.5 shrink-0 text-[var(--warning-color)]" />
          <span>{line.action}</span>
        </div>
        <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
          点数差 {formatSignedPoints(line.points_to_trigger)}
        </div>
      </div>
    </article>
  );
};
