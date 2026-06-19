"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface RangeLabel {
  label?: string;
}

interface Priority {
  key: string;
  label: string;
  color: ColorKey;
  state: string;
  readout: string;
  action: string;
}

interface BriefLevel {
  key: string;
  label: string;
  value: number | null;
  distance_label: string;
  color: ColorKey;
}

interface DeskBriefPayload {
  as_of: string;
  index: number | null;
  desk_score: number;
  stance: string;
  stance_color: ColorKey;
  summary: string;
  opening_action: string;
  data_coverage: string;
  support_score: number;
  pressure_score: number;
  alert_score: number;
  tape_pressure_score: number;
  net_pressure: number;
  target_exposure: RangeLabel;
  cash_buffer: string;
  hedge_coverage: RangeLabel;
  top_priorities: Priority[];
  bull_case: string[];
  bear_case: string[];
  change_mind: string[];
  levels: BriefLevel[];
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

const formatIndex = (value: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatLevel = (value: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
};

export const NDXDeskBriefPanel = () => {
  const [payload, setPayload] = useState<DeskBriefPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchBrief = async () => {
      setPending(true);
      try {
        const response = await fetch("/api/risk/desk-brief");
        const data = await response.json();
        setPayload(response.ok && !data.error ? data : null);
      } catch (error) {
        console.error("Failed to fetch NDX desk brief:", error);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchBrief();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="newspaper" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">Desk Brief 正在初始化...</p>
      </div>
    );
  }

  const stanceColor = colorMap[payload.stance_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.desk_score))}%`;
  const keyLevels = payload.levels.slice(1, 5);

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", stanceColor.soft, stanceColor.border)}>
        <div className="grid grid-cols-1 xl:grid-cols-[210px_1fr_250px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Institutional Desk Brief
            </div>
            <div className={cn("text-3xl font-black leading-none", stanceColor.text)}>
              {payload.stance}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Desk {payload.desk_score.toFixed(1)}
            </div>
          </div>

          <div>
            <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
              {payload.summary}
            </p>
            <p className="text-sm leading-6 text-[var(--text-secondary)] mt-2 mb-0">
              {payload.opening_action}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:block text-sm font-semibold text-[var(--text-secondary)] xl:text-right">
            <div>NDX {formatIndex(payload.index)}</div>
            <div>暴露 {payload.target_exposure?.label ?? "--"}</div>
            <div>现金 {payload.cash_buffer}</div>
            <div>保护 {payload.hedge_coverage?.label ?? "--"}</div>
            <div className="col-span-2 text-xs text-[var(--text-tertiary)] xl:mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>晨会置信分</span>
            <span>{payload.desk_score.toFixed(1)}/100 · {payload.data_coverage}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/75 overflow-hidden">
            <div className={cn("h-full rounded-full", stanceColor.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Metric label="支撑" value={payload.support_score.toFixed(1)} />
        <Metric label="压力" value={payload.pressure_score.toFixed(1)} />
        <Metric label="预警" value={payload.alert_score.toFixed(1)} />
        <Metric label="盘中" value={payload.tape_pressure_score.toFixed(1)} />
        <Metric label="净压力" value={`${payload.net_pressure >= 0 ? "+" : ""}${payload.net_pressure.toFixed(1)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
        {payload.top_priorities.map((priority) => {
          const color = colorMap[priority.color] ?? colorMap.blue;
          return (
            <article key={priority.key} className={cn("rounded-lg border p-4 bg-[var(--card-bg)] shadow-sm", color.border)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase text-[var(--text-tertiary)]">
                    {priority.label}
                  </div>
                  <div className={cn("mt-1 text-lg font-black", color.text)}>
                    {priority.state}
                  </div>
                </div>
                <span className={cn("mt-1 size-2 rounded-full", color.bg)} />
              </div>
              <p className="mt-3 text-xs leading-5 font-bold text-[var(--text-primary)]">
                {priority.readout}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                {priority.action}
              </p>
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1.1fr] gap-4">
        <BriefList title="多头依据" icon="trending-up" color="green" items={payload.bull_case} />
        <BriefList title="空头风险" icon="triangle-alert" color="red" items={payload.bear_case} />
        <BriefList title="改变判断" icon="list-checks" color="amber" items={payload.change_mind} />
      </div>

      {keyLevels.length > 0 && (
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)] mb-3">
            <Icon name="milestone" size={16} className="text-[var(--accent-color)]" />
            关键执行线
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {keyLevels.map((level) => {
              const color = colorMap[level.color] ?? colorMap.blue;
              return (
                <div key={level.key} className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    {level.label}
                  </div>
                  <div className={cn("mt-1 text-xl font-black", color.text)}>
                    {formatLevel(level.value)}
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">
                    {level.distance_label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs leading-6 text-[var(--text-tertiary)]">
        {payload.methodology}
      </p>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-sm">
    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
    <div className="mt-1 text-xl font-black text-[var(--text-primary)]">{value}</div>
  </div>
);

const BriefList = ({
  title,
  icon,
  color,
  items,
}: {
  title: string;
  icon: string;
  color: ColorKey;
  items: string[];
}) => {
  const tone = colorMap[color];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)] mb-3">
        <Icon name={icon} size={16} className={tone.text} />
        {title}
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-3 text-sm leading-6 text-[var(--text-secondary)]">
            <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", tone.bg)} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
