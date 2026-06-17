"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface DiagnosticMetric {
  label: string;
  value: string;
}

interface DiagnosticPillar {
  key: string;
  label: string;
  score: number;
  level: string;
  color: "green" | "blue" | "amber" | "red";
  comment: string;
  metrics: DiagnosticMetric[];
}

interface RiskDiagnostics {
  as_of: string;
  price_date: string;
  index: number;
  risk_score: number;
  risk_level: string;
  risk_color: "green" | "blue" | "amber" | "red";
  summary: string;
  pillars: DiagnosticPillar[];
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

export const NDXRiskDiagnosticsPanel = () => {
  const [diagnostics, setDiagnostics] = useState<RiskDiagnostics | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/diagnostics");
        const payload = await res.json();
        setDiagnostics(res.ok && !payload.error ? payload : null);
      } catch (e) {
        console.error("Failed to fetch NDX risk diagnostics:", e);
        setDiagnostics(null);
      } finally {
        setPending(false);
      }
    };

    void fetchDiagnostics();
  }, []);

  if (pending && !diagnostics) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-40 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="activity" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">风险诊断正在初始化...</p>
      </div>
    );
  }

  const riskColor = colorMap[diagnostics.risk_color] ?? colorMap.blue;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", riskColor.soft, riskColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_170px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Composite Risk
            </div>
            <div className={cn("text-4xl font-black leading-none", riskColor.text)}>
              {diagnostics.risk_score.toFixed(1)}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              {diagnostics.risk_level}
            </div>
          </div>

          <div>
            <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
              {diagnostics.summary}
            </p>
            <p className="text-sm leading-6 text-[var(--text-secondary)] mt-2 mb-0">
              以趋势、波动、回撤和 MAG7 广度拆解风险来源，分数越高表示需要越保守的风险预算。
            </p>
          </div>

          <div className="text-sm font-semibold text-[var(--text-secondary)] md:text-right">
            <div>NDX {formatIndex(diagnostics.index)}</div>
            <div>行情日 {diagnostics.price_date}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(diagnostics.as_of)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {diagnostics.pillars.map((pillar) => {
          const color = colorMap[pillar.color] ?? colorMap.blue;
          const width = `${Math.max(4, Math.min(100, pillar.score))}%`;

          return (
            <div
              key={pillar.key}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-sm font-black text-[var(--text-primary)]">
                    {pillar.label}
                  </h4>
                  <p className={cn("text-xs font-black mt-1", color.text)}>
                    {pillar.level}
                  </p>
                </div>
                <div className={cn("px-2 py-1 rounded-md text-sm font-black", color.soft, color.text)}>
                  {pillar.score.toFixed(1)}
                </div>
              </div>

              <div className="h-2 rounded-full bg-[var(--section-bg)] overflow-hidden mb-4">
                <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
              </div>

              <p className="text-sm leading-6 text-[var(--text-secondary)] mb-4">
                {pillar.comment}
              </p>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {pillar.metrics.map((metric) => (
                  <div key={`${pillar.key}-${metric.label}`}>
                    <div className="text-[var(--text-tertiary)] font-bold">
                      {metric.label}
                    </div>
                    <div className="text-[var(--text-primary)] font-black mt-0.5">
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
