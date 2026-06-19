"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ExposureRange {
  lower: number;
  upper: number;
  label: string;
}

interface HedgeRange {
  lower: number;
  upper: number;
  label: string;
}

interface AccountProfile {
  key: string;
  label: string;
  action: string;
  color: ColorKey;
  target_exposure: ExposureRange;
  cash_buffer: string;
  hedge_coverage: string;
  max_loss_budget: string;
  mandate: string;
}

interface ActionTicket {
  key: string;
  label: string;
  color: ColorKey;
  trigger: string;
  action: string;
}

interface PlaybookLevel {
  key: string;
  label: string;
  value: number | null;
  distance_label: string;
  color: ColorKey;
  usage?: string;
}

interface PlaybookPayload {
  as_of: string;
  index: number | null;
  playbook_score: number;
  posture: string;
  posture_color: ColorKey;
  summary: string;
  headline_action: string;
  data_coverage: string;
  target_exposure: ExposureRange;
  cash_buffer_min: number;
  hedge_coverage: HedgeRange;
  max_loss_budget: number;
  stress_downside: number;
  capacity_score: number;
  regime_score: number;
  recovery_score: number;
  alert_score: number;
  net_pressure: number;
  tape_pressure_score: number;
  regime: string;
  alert_level: string;
  recovery_regime: string;
  hedge_label: string;
  intraday_regime: string;
  levels: PlaybookLevel[];
  account_profiles: AccountProfile[];
  action_tickets: ActionTicket[];
  guardrails: string[];
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

export const NDXExecutionPlaybookPanel = () => {
  const [payload, setPayload] = useState<PlaybookPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchPlaybook = async () => {
      setPending(true);
      try {
        const response = await fetch("/api/risk/playbook");
        const data = await response.json();
        setPayload(response.ok && !data.error ? data : null);
      } catch (error) {
        console.error("Failed to fetch NDX execution playbook:", error);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchPlaybook();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-52 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="clipboard-list" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">执行 Playbook 正在初始化...</p>
      </div>
    );
  }

  const postureColor = colorMap[payload.posture_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.playbook_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", postureColor.soft, postureColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Execution Playbook
            </div>
            <div className={cn("text-3xl font-black leading-none", postureColor.text)}>
              {payload.posture}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.playbook_score.toFixed(1)}
            </div>
          </div>

          <div>
            <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
              {payload.summary}
            </p>
            <p className="text-sm leading-6 text-[var(--text-secondary)] mt-2 mb-0">
              {payload.headline_action}
            </p>
          </div>

          <div className="text-sm font-semibold text-[var(--text-secondary)] lg:text-right">
            <div>NDX {formatIndex(payload.index)}</div>
            <div>目标 {payload.target_exposure.label}</div>
            <div>现金 {payload.cash_buffer_min.toFixed(0)}%+</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>执行置信分</span>
            <span>{payload.playbook_score.toFixed(1)}/100 · {payload.data_coverage}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/75 overflow-hidden">
            <div className={cn("h-full rounded-full", postureColor.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {payload.account_profiles.map((profile) => {
          const color = colorMap[profile.color] ?? colorMap.blue;
          return (
            <div key={profile.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h4 className="text-sm font-black text-[var(--text-primary)]">{profile.label}</h4>
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", color.soft, color.text)}>
                  {profile.action}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Metric label="目标暴露" value={profile.target_exposure.label} tone={profile.color} />
                <Metric label="现金缓冲" value={profile.cash_buffer} tone="blue" />
                <Metric label="保护覆盖" value={profile.hedge_coverage} tone="amber" />
                <Metric label="压力损失" value={profile.max_loss_budget} tone="red" />
              </div>
              <p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">
                {profile.mandate}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">执行票据</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">{payload.intraday_regime}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payload.action_tickets.map((ticket) => {
              const color = colorMap[ticket.color] ?? colorMap.blue;
              return (
                <div key={ticket.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className={cn("text-sm font-black mb-2", color.text)}>{ticket.label}</div>
                  <p className="text-xs leading-5 text-[var(--text-secondary)] mb-2">{ticket.trigger}</p>
                  <p className="text-sm leading-6 font-semibold text-[var(--text-primary)] m-0">{ticket.action}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">组合约束</h4>
          <div className="space-y-2">
            {payload.guardrails.map((item) => (
              <div key={item} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {payload.levels.map((level) => {
          const color = colorMap[level.color] ?? colorMap.blue;
          return (
            <div key={level.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
              <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
                {level.label}
              </div>
              <div className={cn("text-xl font-black", color.text)}>{formatLevel(level.value)}</div>
              <div className="text-xs font-semibold text-[var(--text-secondary)] mt-1">{level.distance_label}</div>
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-5 text-[var(--text-tertiary)] m-0">
        {payload.methodology}
      </p>
    </div>
  );
};

const Metric = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: ColorKey;
}) => {
  const toneClass = {
    green: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    red: "text-red-700",
  }[tone];

  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-lg font-black", toneClass)}>
        {value}
      </div>
    </div>
  );
};
