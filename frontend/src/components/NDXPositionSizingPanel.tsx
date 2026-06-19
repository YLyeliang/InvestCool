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

interface Constraint {
  key: string;
  label: string;
  loss_pct: number;
  max_exposure: number;
  raw_exposure: number;
  tone: ColorKey;
  detail: string;
}

interface AccountProfile {
  key: string;
  name: string;
  color: ColorKey;
  max_total_exposure: number;
  single_tranche: number;
  cash_buffer: string;
  rule: string;
}

interface SizingStep {
  key: string;
  label: string;
  trigger: string;
  size: string;
  color: ColorKey;
  action: string;
}

interface RiskMetric {
  label: string;
  value: string;
  tone: ColorKey;
  detail: string;
}

interface PositionSizingPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  stance: string;
  index: number;
  target_exposure: RangeLabel;
  cash_buffer_min: number;
  max_loss_budget: number;
  hard_cap: number;
  current_floor: number;
  binding_constraint: Constraint;
  max_single_tranche: number;
  initial_tranche: number;
  one_day_sigma: number;
  ten_day_sigma: number;
  constraints: Constraint[];
  profiles: AccountProfile[];
  sizing_ladder: SizingStep[];
  risk_metrics: RiskMetric[];
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

export const NDXPositionSizingPanel = () => {
  const [payload, setPayload] = useState<PositionSizingPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSizing = async () => {
      try {
        const response = await fetch("/api/risk/position-sizing");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as PositionSizingPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX position sizing:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchSizing();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="calculator" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">仓位 sizing 正在初始化...</p>
      </div>
    );
  }

  const headlineTone = colorMap[payload.headline_color] ?? colorMap.blue;
  const bindingTone = colorMap[payload.binding_constraint.tone] ?? colorMap.amber;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", headlineTone.soft, headlineTone.border)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_310px] xl:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Position Sizing
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              Hard Cap {payload.hard_cap.toFixed(1)}% · Tranche {payload.max_single_tranche.toFixed(1)}%
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.stance}
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="NDX" value={formatIndex(payload.index, 2)} />
            <MiniMetric label="目标暴露" value={payload.target_exposure?.label ?? "--"} />
            <MiniMetric label="损失预算" value={`${payload.max_loss_budget.toFixed(1)}%`} />
            <MiniMetric label="现金下限" value={`${payload.cash_buffer_min.toFixed(0)}%+`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="ruler" size={16} className="text-[var(--accent-color)]" />
              暴露上限约束
            </div>
            <div className="text-xs font-semibold text-[var(--text-tertiary)]">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>

          <div className={cn("mb-4 rounded-lg border p-4", bindingTone.soft, bindingTone.border)}>
            <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Binding Constraint</div>
            <div className={cn("mt-1 text-2xl font-black", bindingTone.text)}>
              {payload.binding_constraint.label} · {payload.binding_constraint.max_exposure.toFixed(1)}%
            </div>
            <p className="mb-0 mt-2 text-sm font-semibold leading-6 text-[var(--text-primary)]">
              {payload.binding_constraint.detail}
            </p>
          </div>

          <div className="space-y-3">
            {payload.constraints.map((constraint) => {
              const tone = colorMap[constraint.tone] ?? colorMap.blue;
              const width = `${Math.max(4, Math.min(100, constraint.max_exposure))}%`;
              return (
                <div key={constraint.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-[var(--text-primary)]">{constraint.label}</div>
                      <div className="text-[11px] font-semibold text-[var(--text-tertiary)]">{constraint.detail}</div>
                    </div>
                    <div className={cn("text-lg font-black", tone.text)}>{constraint.max_exposure.toFixed(1)}%</div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--card-bg)]">
                    <div className={cn("h-full rounded-full", tone.bg)} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="activity" size={16} className="text-[var(--accent-color)]" />
              风险尺度
            </div>
            <div className="grid grid-cols-2 gap-2">
              {payload.risk_metrics.map((metric) => {
                const tone = colorMap[metric.tone] ?? colorMap.blue;
                return (
                  <div key={metric.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3">
                    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{metric.label}</div>
                    <div className={cn("mt-1 text-lg font-black", tone.text)}>{metric.value}</div>
                    <div className="mt-1 text-[11px] font-semibold text-[var(--text-secondary)]">{metric.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="gauge" size={16} className="text-[var(--accent-color)]" />
              建议初始 tranche
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.initial_tranche.toFixed(1)}%
            </div>
            <div className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
              单笔上限 {payload.max_single_tranche.toFixed(1)}%，总暴露硬上限 {payload.hard_cap.toFixed(1)}%。
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {payload.profiles.map((profile) => {
          const tone = colorMap[profile.color] ?? colorMap.blue;
          return (
            <article key={profile.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Account</div>
                  <h4 className={cn("mt-1 text-lg font-black", tone.text)}>{profile.name}</h4>
                </div>
                <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", tone.soft, tone.text)}>
                  {profile.max_total_exposure.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniMetric label="单笔" value={`${profile.single_tranche.toFixed(1)}%`} />
                <MiniMetric label="现金" value={profile.cash_buffer} />
              </div>
              <p className="mb-0 mt-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                {profile.rule}
              </p>
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <Icon name="list-checks" size={16} className="text-[var(--accent-color)]" />
          分批执行阶梯
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {payload.sizing_ladder.map((step) => {
            const tone = colorMap[step.color] ?? colorMap.blue;
            return (
              <div key={step.key} className={cn("rounded-lg border p-4", tone.soft, tone.border)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{step.label}</div>
                    <div className={cn("mt-1 text-2xl font-black", tone.text)}>{step.size}</div>
                  </div>
                  <Icon name="flag" size={18} className={tone.text} />
                </div>
                <p className="mb-2 mt-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{step.trigger}</p>
                <p className="mb-0 text-sm font-bold leading-6 text-[var(--text-primary)]">{step.action}</p>
              </div>
            );
          })}
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
