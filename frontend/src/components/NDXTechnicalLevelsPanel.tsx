"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface LevelItem {
  label: string;
  value: number;
  type: "support" | "resistance";
  distance: number;
  distance_label: string;
}

interface MovingAverage {
  label: string;
  window: number;
  value: number;
  distance: number;
  distance_label: string;
  state: string;
}

interface TechnicalLevelsPayload {
  as_of: string;
  price_date: string;
  index: number;
  daily_change: number;
  zone_score: number;
  zone_label: string;
  zone_color: "green" | "blue" | "amber" | "red";
  summary: string;
  atr14: number;
  atr_pct: number;
  channel_position: number;
  channel_label: string;
  support_levels: LevelItem[];
  resistance_levels: LevelItem[];
  moving_averages: MovingAverage[];
  triggers: string[];
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

const formatIndex = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const NDXTechnicalLevelsPanel = () => {
  const [payload, setPayload] = useState<TechnicalLevelsPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchLevels = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/levels");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX technical levels:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchLevels();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-40 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="milestone" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">技术位监控正在初始化...</p>
      </div>
    );
  }

  const zoneColor = colorMap[payload.zone_color] ?? colorMap.blue;
  const channelWidth = `${Math.max(4, Math.min(100, payload.channel_position))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", zoneColor.soft, zoneColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Technical Map
            </div>
            <div className={cn("text-3xl font-black leading-none", zoneColor.text)}>
              {payload.zone_label}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              区间位置 {payload.channel_label}
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

          <div className="text-sm font-semibold text-[var(--text-secondary)] md:text-right">
            <div>NDX {formatIndex(payload.index)}</div>
            <div>日内 {formatSignedPct(payload.daily_change)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>60日区间低位</span>
            <span>60日区间高位</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
            <div className={cn("h-full rounded-full", zoneColor.bg)} style={{ width: channelWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_280px] gap-4">
        <LevelColumn title="最近支撑" icon="shield" levels={payload.support_levels} tone="support" />
        <LevelColumn title="最近压力" icon="arrow-up-right" levels={payload.resistance_levels} tone="resistance" />

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-sm font-black text-[var(--text-primary)]">均线结构</h4>
              <span className="text-xs font-black text-[var(--text-tertiary)]">MA Stack</span>
            </div>
            <div className="space-y-3">
              {payload.moving_averages.map((average) => {
                const isAbove = average.state === "上方";
                return (
                  <div key={average.window} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-[var(--text-primary)]">
                        {average.label}
                      </div>
                      <div className="text-[11px] font-bold text-[var(--text-tertiary)]">
                        {formatIndex(average.value)}
                      </div>
                    </div>
                    <div className={cn("text-right text-sm font-black", isAbove ? "text-emerald-700" : "text-red-700")}>
                      {average.state}
                      <div className="text-[11px] font-bold text-[var(--text-tertiary)]">
                        {average.distance_label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">波动缓冲</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[var(--card-bg)] p-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">ATR 14</div>
                <div className="text-sm font-black text-[var(--text-primary)] mt-1">{formatIndex(payload.atr14)}</div>
              </div>
              <div className="rounded-lg bg-[var(--card-bg)] p-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">ATR%</div>
                <div className="text-sm font-black text-[var(--text-primary)] mt-1">{payload.atr_pct.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">交易台触发线</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {payload.triggers.map((trigger) => (
            <div key={trigger} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
              <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>{trigger}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LevelColumn = ({
  title,
  icon,
  levels,
  tone,
}: {
  title: string;
  icon: string;
  levels: LevelItem[];
  tone: "support" | "resistance";
}) => {
  const toneClass = tone === "support" ? "text-emerald-700" : "text-red-700";

  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon name={icon} size={16} className={toneClass} />
        <h4 className="text-sm font-black text-[var(--text-primary)]">{title}</h4>
      </div>
      <div className="space-y-3">
        {levels.map((level) => (
          <div key={`${level.label}-${level.value}`} className="rounded-lg bg-[var(--section-bg)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-[var(--text-primary)]">{level.label}</div>
                <div className="text-xs font-bold text-[var(--text-tertiary)] mt-1">
                  距当前 {level.distance_label}
                </div>
              </div>
              <div className={cn("text-right text-sm font-black", toneClass)}>
                {formatIndex(level.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
