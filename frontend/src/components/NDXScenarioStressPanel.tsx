"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface ScenarioRange {
  low: number;
  high: number;
  label: string;
}

interface StressScenario {
  key: string;
  name: string;
  category: string;
  color: "green" | "blue" | "amber" | "red";
  probability: string;
  estimated_move: string;
  midpoint_move: number;
  ndx_range: ScenarioRange;
  triggers: string[];
  response: string;
  rationale: string;
}

interface ScenarioPayload {
  as_of: string;
  index: number;
  risk_score: number;
  risk_level: string;
  summary: string;
  scenarios: StressScenario[];
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

export const NDXScenarioStressPanel = () => {
  const [payload, setPayload] = useState<ScenarioPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchScenarios = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/scenarios");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX stress scenarios:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchScenarios();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-44 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="git-branch" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">压力测试正在初始化...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-2">
              Scenario Lab
            </div>
            <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
              {payload.summary}
            </p>
          </div>
          <div className="text-sm font-semibold text-[var(--text-secondary)] md:text-right">
            <div>NDX {formatIndex(payload.index)}</div>
            <div>风险分 {payload.risk_score.toFixed(1)} / 100</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {payload.scenarios.map((scenario) => {
          const color = colorMap[scenario.color] ?? colorMap.blue;
          const isPositive = scenario.midpoint_move >= 0;

          return (
            <article
              key={scenario.key}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("size-2 rounded-full", color.bg)} />
                    <span className="text-xs font-black uppercase text-[var(--text-tertiary)]">
                      {scenario.category}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-[var(--text-primary)]">
                    {scenario.name}
                  </h4>
                </div>
                <div className={cn("px-2.5 py-1 rounded-md text-xs font-black", color.soft, color.text)}>
                  概率 {scenario.probability}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black text-[var(--text-tertiary)] uppercase mb-1">
                    NDX Range
                  </div>
                  <div className="text-base font-black text-[var(--text-primary)]">
                    {scenario.ndx_range.label}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="text-[11px] font-black text-[var(--text-tertiary)] uppercase mb-1">
                    Est. Move
                  </div>
                  <div className={cn("text-base font-black", isPositive ? "text-emerald-700" : color.text)}>
                    {scenario.estimated_move}
                  </div>
                </div>
              </div>

              <p className="text-sm leading-6 text-[var(--text-secondary)] mb-4">
                {scenario.rationale}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-2">
                    触发条件
                  </h5>
                  <ul className="space-y-2">
                    {scenario.triggers.map((trigger) => (
                      <li key={trigger} className="flex items-start gap-2 text-sm text-[var(--text-secondary)] leading-6">
                        <Icon name="circle-dot" size={13} className={cn("mt-1 shrink-0", color.text)} />
                        <span>{trigger}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-2">
                    组合响应
                  </h5>
                  <p className="text-sm leading-6 text-[var(--text-secondary)] m-0">
                    {scenario.response}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
