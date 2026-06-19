"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ModuleQuality {
  key: string;
  label: string;
  status: "fresh" | "stale" | "missing";
  status_label: string;
  updated_at: string | null;
  age_minutes: number | null;
  sla_minutes: number;
}

interface DataQualityPayload {
  as_of: string;
  status: string;
  status_color: ColorKey;
  health_score: number;
  total_modules: number;
  snapshot_modules: number;
  fresh_modules: number;
  stale_modules: number;
  missing_modules: number;
  newest_update: string | null;
  oldest_update: string | null;
  latest_brief_at: string | null;
  modules: ModuleQuality[];
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

const formatAge = (minutes: number | null) => {
  if (minutes === null) return "--";
  if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} 分钟`;
  return `${(minutes / 60).toFixed(1)} 小时`;
};

const statusColor = (status: ModuleQuality["status"]): ColorKey => {
  if (status === "fresh") return "green";
  if (status === "stale") return "amber";
  return "red";
};

export const NDXDataQualityPanel = () => {
  const [payload, setPayload] = useState<DataQualityPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchQuality = async () => {
      try {
        const response = await fetch("/api/risk/data-quality");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as DataQualityPayload);
        }
      } catch (e) {
        console.error("Failed to fetch NDX data quality:", e);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchQuality();

    return () => {
      cancelled = true;
    };
  }, []);

  const watchList = useMemo(() => {
    if (!payload) return [];
    return payload.modules
      .filter((item) => item.status !== "fresh")
      .slice(0, 6);
  }, [payload]);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-48 rounded bg-[var(--surface-muted)] animate-pulse" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-lg bg-[var(--surface-muted)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="database-zap" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">数据质量状态正在初始化...</p>
      </div>
    );
  }

  const tone = colorMap[payload.status_color] ?? colorMap.blue;

  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <div className={cn("rounded-lg border p-4", tone.soft, tone.border)}>
          <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-2">
            Data Quality
          </div>
          <div className={cn("text-3xl font-black leading-none", tone.text)}>
            {payload.status}
          </div>
          <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
            Health {payload.health_score.toFixed(1)}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--card-bg)]/80">
            <div className={cn("h-full rounded-full", tone.bg)} style={{ width: `${Math.max(4, payload.health_score)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric icon="blocks" label="覆盖模块" value={`${payload.snapshot_modules}/${payload.total_modules}`} detail={`新鲜 ${payload.fresh_modules}`} />
          <Metric icon="timer-reset" label="最新更新" value={formatDateTime(payload.newest_update)} detail={`最旧 ${formatDateTime(payload.oldest_update)}`} />
          <Metric icon="alert-triangle" label="陈旧模块" value={`${payload.stale_modules}`} detail={`缺失 ${payload.missing_modules}`} tone={payload.stale_modules || payload.missing_modules ? "amber" : "green"} />
          <Metric icon="newspaper" label="风险简报" value={formatDateTime(payload.latest_brief_at)} detail={`校验 ${formatDateTime(payload.as_of)}`} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
        {watchList.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {watchList.map((item) => {
              const itemTone = colorMap[statusColor(item.status)];
              return (
                <div key={item.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-[var(--text-primary)]">{item.label}</div>
                    <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", itemTone.soft, itemTone.text)}>
                      {item.status_label}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                    更新 {formatDateTime(item.updated_at)} · 年龄 {formatAge(item.age_minutes)} · SLA {item.sla_minutes} 分钟
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <Icon name="check-circle-2" size={16} className="text-[var(--success-color)]" />
            所有风险模块均在当前刷新窗口内。
          </div>
        )}
      </div>
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
