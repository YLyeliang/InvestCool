"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface ExposureBand {
  lower: number;
  upper: number;
  label: string;
}

interface BudgetProfile {
  key: string;
  name: string;
  color: "green" | "blue" | "amber" | "red";
  exposure: ExposureBand;
  cash_buffer: string;
  max_loss_budget: string;
  rebalance_trigger: string;
  hedge_note: string;
  suitable_for: string;
}

interface BudgetPayload {
  as_of: string;
  index: number;
  risk_score: number;
  risk_level: string;
  stress_downside: number;
  stress_upside: number;
  summary: string;
  profiles: BudgetProfile[];
  controls: string[];
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

const formatIndex = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const NDXRiskBudgetPanel = () => {
  const [payload, setPayload] = useState<BudgetPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchBudget = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/budget");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX risk budget:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchBudget();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-40 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-48 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="scale" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">风险预算正在初始化...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-2">
              Risk Budget
            </div>
            <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
              {payload.summary}
            </p>
          </div>
          <div className="text-sm font-semibold text-[var(--text-secondary)] md:text-right">
            <div>NDX {formatIndex(payload.index)}</div>
            <div>压力回撤 -{payload.stress_downside.toFixed(1)}%</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {payload.profiles.map((profile) => {
          const color = colorMap[profile.color] ?? colorMap.blue;
          const width = `${Math.max(4, Math.min(100, profile.exposure.upper))}%`;

          return (
            <article
              key={profile.key}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-lg font-black text-[var(--text-primary)]">
                    {profile.name}
                  </h4>
                  <p className="text-xs leading-5 text-[var(--text-tertiary)] font-bold mt-1 mb-0">
                    {profile.suitable_for}
                  </p>
                </div>
                <div className={cn("px-2.5 py-1 rounded-md text-xs font-black", color.soft, color.text)}>
                  NDX {profile.exposure.label}
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between text-xs font-black text-[var(--text-tertiary)] mb-2">
                  <span>暴露区间</span>
                  <span>{profile.exposure.label}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--section-bg)] overflow-hidden">
                  <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                    Cash Buffer
                  </div>
                  <div className="text-base font-black text-[var(--text-primary)]">
                    {profile.cash_buffer}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                    Loss Budget
                  </div>
                  <div className={cn("text-base font-black", color.text)}>
                    {profile.max_loss_budget}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <div>
                  <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
                    再平衡规则
                  </div>
                  <p className="m-0">{profile.rebalance_trigger}</p>
                </div>
                <div>
                  <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
                    风险对冲
                  </div>
                  <p className="m-0">{profile.hedge_note}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
        <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">
          风控备忘
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {payload.controls.map((control) => (
            <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
              <Icon name="shield-check" size={15} className="mt-1 shrink-0 text-[var(--accent-strong)]" />
              <span>{control}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
