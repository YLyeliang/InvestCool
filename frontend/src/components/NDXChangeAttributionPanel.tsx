"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface Brief {
  id: number;
  status: string;
  summary: string;
  index_position: number | null;
  created_at: string;
}

interface ChangeDriver {
  key: string;
  label: string;
  tone: ColorKey;
  value: string;
  detail: string;
  action: string;
  source: string;
  priority: number;
}

interface ChangeAttributionPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  latest: Brief;
  previous: Brief | null;
  elapsed_minutes: number | null;
  status_delta: number;
  risk_temperature: number | null;
  risk_temperature_delta: number | null;
  index_delta: number | null;
  index_delta_pct: number | null;
  drivers: ChangeDriver[];
  watch_items: string[];
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

const formatSigned = (value?: number | null, digits = 1) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
};

export const NDXChangeAttributionPanel = () => {
  const [payload, setPayload] = useState<ChangeAttributionPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchChangeAttribution = async () => {
      try {
        const response = await fetch("/api/risk/change-attribution");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as ChangeAttributionPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX change attribution:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchChangeAttribution();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="git-compare-arrows" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">变化归因正在初始化...</p>
      </div>
    );
  }

  const tone = colorMap[payload.headline_color] ?? colorMap.blue;
  const latestIndex = payload.latest.index_position?.toLocaleString("zh-CN", { maximumFractionDigits: 2 }) ?? "--";
  const previousLabel = payload.previous ? payload.previous.status : "无前值";

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", tone.soft, tone.border)}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_1fr_240px] lg:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Change Attribution
            </div>
            <div className={cn("text-3xl font-black leading-none", tone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              {previousLabel} → {payload.latest.status}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.latest.summary}
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <MiniMetric label="NDX" value={latestIndex} detail={formatSigned(payload.index_delta, 2)} tone={payload.index_delta && payload.index_delta < 0 ? "red" : "green"} />
            <MiniMetric label="温度" value={payload.risk_temperature !== null ? `${payload.risk_temperature.toFixed(1)}` : "--"} detail={formatSigned(payload.risk_temperature_delta)} tone={payload.risk_temperature_delta && payload.risk_temperature_delta > 0 ? "amber" : "blue"} />
            <MiniMetric label="状态差" value={formatSigned(payload.status_delta, 0)} detail="rank" tone={payload.status_delta > 0 ? "red" : payload.status_delta < 0 ? "green" : "blue"} />
            <MiniMetric label="间隔" value={payload.elapsed_minutes !== null ? `${payload.elapsed_minutes.toFixed(1)}m` : "--"} detail={formatDateTime(payload.latest.created_at)} tone="blue" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {payload.drivers.map((driver) => {
          const driverTone = colorMap[driver.tone] ?? colorMap.blue;
          return (
            <article key={driver.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    {driver.source}
                  </div>
                  <h4 className={cn("mt-1 text-lg font-black leading-tight", driverTone.text)}>
                    {driver.label}
                  </h4>
                </div>
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", driverTone.soft, driverTone.text)}>
                  {driver.value}
                </span>
              </div>
              <p className="mb-3 text-sm font-bold leading-6 text-[var(--text-primary)]">{driver.detail}</p>
              <div className="flex gap-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                <Icon name="route" size={14} className="mt-0.5 shrink-0 text-[var(--accent-color)]" />
                <span>{driver.action}</span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <Icon name="list-todo" size={16} className="text-[var(--accent-color)]" />
          下一次更新重点
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {payload.watch_items.map((item) => (
            <div key={item} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        {payload.methodology}
      </div>
    </div>
  );
};

const MiniMetric = ({
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
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-sm font-black leading-tight", color.text)}>{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-[var(--text-secondary)]">{detail}</div>
    </div>
  );
};
