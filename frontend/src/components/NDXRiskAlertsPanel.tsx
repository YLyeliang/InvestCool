"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface AlertItem {
  key: string;
  category: string;
  title: string;
  severity: "critical" | "watch" | "monitor" | "confirm";
  score: number;
  color: ColorKey;
  value: string;
  trigger: string;
  action: string;
  evidence: string;
}

interface AlertsPayload {
  as_of: string;
  alert_score: number;
  alert_level: string;
  alert_color: ColorKey;
  active_count: number;
  critical_count: number;
  watch_count: number;
  monitor_count: number;
  data_coverage: string;
  summary: string;
  alerts: AlertItem[];
  confirmations: string[];
  playbook: string[];
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

const severityLabel = {
  critical: "红色",
  watch: "观察",
  monitor: "监控",
  confirm: "确认",
};

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const NDXRiskAlertsPanel = () => {
  const [payload, setPayload] = useState<AlertsPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchAlerts = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const res = await fetch("/api/risk/alerts");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchAlerts(attempt + 1), 4000);
          return;
        }
        setPayload(null);
      } catch (e) {
        console.error("Failed to fetch NDX risk alerts:", e);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchAlerts(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchAlerts();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-44 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="bell-ring" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">风险预警正在初始化...</p>
      </div>
    );
  }

  const alertColor = colorMap[payload.alert_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.alert_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", alertColor.soft, alertColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr_210px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Alert Deck
            </div>
            <div className={cn("text-3xl font-black leading-none", alertColor.text)}>
              {payload.alert_level}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.alert_score.toFixed(1)}
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

          <div className="text-sm font-semibold text-[var(--text-secondary)] lg:text-right">
            <div>{payload.data_coverage}</div>
            <div>红色 {payload.critical_count} · 观察 {payload.watch_count} · 监控 {payload.monitor_count}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>预警分</span>
            <span>{payload.alert_score.toFixed(1)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
            <div className={cn("h-full rounded-full", alertColor.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">预警清单</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">按优先级排序</span>
          </div>
          <div className="space-y-3">
            {payload.alerts.map((alert) => {
              const color = colorMap[alert.color] ?? colorMap.blue;
              return (
                <article key={alert.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("size-2 rounded-full", color.bg)} />
                        <span className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                          {alert.category} · {severityLabel[alert.severity]}
                        </span>
                      </div>
                      <h5 className="text-base font-black text-[var(--text-primary)] mb-2">
                        {alert.title}
                      </h5>
                      <p className="text-sm leading-6 text-[var(--text-secondary)] m-0">
                        {alert.evidence}
                      </p>
                    </div>
                    <div className="md:text-right">
                      <div className={cn("text-2xl font-black", color.text)}>
                        {alert.score.toFixed(1)}
                      </div>
                      <div className="text-xs font-bold text-[var(--text-tertiary)]">
                        {alert.value}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <MiniNote label="触发条件" text={alert.trigger} />
                    <MiniNote label="执行动作" text={alert.action} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <SideCard title="执行 Playbook" items={payload.playbook} icon="clipboard-check" />
          <SideCard title="正向确认项" items={payload.confirmations} icon="badge-check" />
        </div>
      </div>
    </div>
  );
};

const MiniNote = ({ label, text }: { label: string; text: string }) => (
  <div className="rounded-md bg-[var(--card-bg)]/70 p-3">
    <div className="text-[10px] font-black uppercase text-[var(--text-tertiary)] mb-1">
      {label}
    </div>
    <div className="text-sm leading-6 font-semibold text-[var(--text-secondary)]">
      {text}
    </div>
  </div>
);

const SideCard = ({ title, items, icon }: { title: string; items: string[]; icon: string }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon name={icon} size={16} className="text-[var(--accent-color)]" />
      <h4 className="text-sm font-black text-[var(--text-primary)]">{title}</h4>
    </div>
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
          <Icon name="circle-dot" size={14} className="mt-1 shrink-0 text-[var(--accent-color)]" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  </div>
);
