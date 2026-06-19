"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface CatalystEvent {
  key: string;
  title: string;
  category: string;
  color: ColorKey;
  event_type: "dated" | "conditional" | string;
  date: string | null;
  date_label: string;
  days_to_event: number | null;
  probability: number;
  impact: number;
  priority: number;
  trigger: string;
  action: string;
  source: string;
  evidence: string;
}

interface Bucket {
  key: string;
  label: string;
  color: ColorKey;
  count: number;
}

interface CatalystCalendarPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  calendar_score: number;
  dated_count: number;
  conditional_count: number;
  critical_count: number;
  near_count: number;
  events: CatalystEvent[];
  buckets: Bucket[];
  agenda: string[];
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

export const NDXCatalystCalendarPanel = () => {
  const [payload, setPayload] = useState<CatalystCalendarPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchCalendar = async () => {
      try {
        const response = await fetch("/api/risk/catalyst-calendar");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as CatalystCalendarPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX catalyst calendar:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchCalendar();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="calendar-clock" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">催化日历正在初始化...</p>
      </div>
    );
  }

  const headlineTone = colorMap[payload.headline_color] ?? colorMap.blue;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", headlineTone.soft, headlineTone.border)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_320px] xl:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Catalyst Calendar
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              Score {payload.calendar_score.toFixed(1)} · 更新 {formatDateTime(payload.as_of)}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            当前有 {payload.dated_count} 个日期型事件、{payload.conditional_count} 个条件型事件；先处理 0-7D 与红色高优先级催化，再复核投资论点。
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="Near" value={String(payload.near_count)} tone={payload.near_count >= 2 ? "red" : "amber"} />
            <MiniMetric label="Critical" value={String(payload.critical_count)} tone={payload.critical_count >= 2 ? "red" : "amber"} />
            <MiniMetric label="Dated" value={String(payload.dated_count)} tone="blue" />
            <MiniMetric label="Conditional" value={String(payload.conditional_count)} tone="blue" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {payload.buckets.map((bucket) => {
          const tone = colorMap[bucket.color] ?? colorMap.blue;
          return (
            <div key={bucket.key} className={cn("rounded-lg border p-4 shadow-sm", tone.soft, tone.border)}>
              <div className={cn("text-3xl font-black leading-none", tone.text)}>{bucket.count}</div>
              <div className="mt-2 text-xs font-black uppercase text-[var(--text-tertiary)]">{bucket.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="calendar-days" size={16} className="text-[var(--accent-color)]" />
              催化事件队列
            </div>
            <div className="text-xs font-semibold text-[var(--text-tertiary)]">按优先级排序</div>
          </div>

          <div className="space-y-3">
            {payload.events.map((event) => (
              <EventRow key={event.key} event={event} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="clipboard-list" size={16} className="text-[var(--accent-color)]" />
              投委会议程
            </div>
            <div className="space-y-2">
              {payload.agenda.map((item) => (
                <div key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">
                  <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
            {payload.methodology}
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniMetric = ({ label, value, tone }: { label: string; value: string; tone: ColorKey }) => {
  const color = colorMap[tone] ?? colorMap.blue;
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-xl font-black leading-tight", color.text)}>{value}</div>
    </div>
  );
};

const EventRow = ({ event }: { event: CatalystEvent }) => {
  const tone = colorMap[event.color] ?? colorMap.blue;
  const typeLabel = event.event_type === "conditional" ? "条件型" : "日期型";

  return (
    <article className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_1fr_220px] lg:items-start">
        <div>
          <div className={cn("inline-flex rounded-md px-2 py-1 text-[11px] font-black", tone.soft, tone.text)}>
            {event.date_label}
          </div>
          <h4 className="mb-1 mt-3 text-base font-black leading-tight text-[var(--text-primary)]">{event.title}</h4>
          <div className="text-xs font-bold text-[var(--text-tertiary)]">
            {event.category} · {event.source} · {typeLabel}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">{event.trigger}</div>
          <p className="mb-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">{event.evidence}</p>
          <p className="mb-0 text-sm font-bold leading-6 text-[var(--text-primary)]">{event.action}</p>
        </div>

        <div className="space-y-2">
          <Bar label="概率" value={event.probability} tone={event.color} />
          <Bar label="影响" value={event.impact} tone={event.color} />
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            <span>Priority</span>
            <span className={tone.text}>{event.priority.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

const Bar = ({ label, value, tone }: { label: string; value: number; tone: ColorKey }) => {
  const color = colorMap[tone] ?? colorMap.blue;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--card-bg)]">
        <div
          className={cn("h-full rounded-full", color.bg)}
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
};
