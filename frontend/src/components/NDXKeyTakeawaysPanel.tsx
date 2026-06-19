"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface TakeawayItem {
  key: string;
  category: string;
  title: string;
  tone: ColorKey;
  value: string;
  detail: string;
  action: string;
  source: string;
  priority: number;
}

interface KeyTakeawaysPayload {
  as_of: string;
  headline: string;
  pressure_count: number;
  support_count: number;
  watch_count: number;
  primary: TakeawayItem | null;
  takeaways: TakeawayItem[];
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

const toneForCategory = (category: string): ColorKey => {
  if (category.includes("支撑")) return "green";
  if (category.includes("风险") || category.includes("压力") || category.includes("约束")) return "red";
  if (category.includes("事件")) return "amber";
  return "blue";
};

export const NDXKeyTakeawaysPanel = () => {
  const [payload, setPayload] = useState<KeyTakeawaysPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchTakeaways = async () => {
      try {
        const response = await fetch("/api/risk/key-takeaways");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as KeyTakeawaysPayload);
        }
      } catch (e) {
        console.error("Failed to fetch NDX key takeaways:", e);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchTakeaways();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-52 rounded bg-[var(--surface-muted)] animate-pulse" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-[var(--surface-muted)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="list-checks" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">关键看点正在初始化...</p>
      </div>
    );
  }

  const primaryTone = payload.primary ? colorMap[payload.primary.tone] : colorMap.blue;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", primaryTone.soft, primaryTone.border)}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr_210px] lg:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Key Takeaways
            </div>
            <div className={cn("text-3xl font-black leading-none", primaryTone.text)}>
              {payload.primary?.category ?? "观察触发项"}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              {payload.primary?.title ?? "等待聚合"}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.headline}
          </p>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Counter label="压力" value={payload.pressure_count} tone="red" />
            <Counter label="支撑" value={payload.support_count} tone="green" />
            <Counter label="观察" value={payload.watch_count} tone="blue" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {payload.takeaways.map((item) => {
          const itemTone = colorMap[item.tone] ?? colorMap[toneForCategory(item.category)];
          return (
            <article key={item.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    {item.category} · {item.source}
                  </div>
                  <h4 className={cn("mt-1 text-lg font-black leading-tight", itemTone.text)}>
                    {item.title}
                  </h4>
                </div>
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", itemTone.soft, itemTone.text)}>
                  {item.value}
                </span>
              </div>
              <p className="mb-3 text-sm font-bold leading-6 text-[var(--text-primary)]">{item.detail}</p>
              <div className="flex gap-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                <Icon name="check-check" size={14} className="mt-0.5 shrink-0 text-[var(--accent-color)]" />
                <span>{item.action}</span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        更新 {formatDateTime(payload.as_of)} · {payload.methodology}
      </div>
    </div>
  );
};

const Counter = ({ label, value, tone }: { label: string; value: number; tone: ColorKey }) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
      <div className={cn("text-xl font-black leading-none", color.text)}>{value}</div>
      <div className="mt-1 text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
    </div>
  );
};
