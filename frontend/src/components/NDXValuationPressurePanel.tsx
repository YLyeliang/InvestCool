"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface ValuationSecurity {
  symbol: string;
  name: string;
  weight: number;
  trailing_pe: number | null;
  forward_pe: number | null;
  price_sales: number | null;
  peg: number | null;
  earnings_growth: number | null;
  revenue_growth: number | null;
  profit_margin: number | null;
  valuation_score: number;
  valuation_label: string;
  pressure_contribution: number;
  color: "green" | "blue" | "amber" | "red";
}

interface GrowthItem {
  symbol: string;
  revenue_growth: number | null;
  earnings_growth: number | null;
}

interface ExpensiveItem {
  symbol: string;
  score: number;
  label: string;
}

interface ValuationPayload {
  as_of: string;
  coverage: string;
  valuation_score: number;
  valuation_label: string;
  valuation_color: "green" | "blue" | "amber" | "red";
  weighted_forward_pe: number | null;
  weighted_trailing_pe: number | null;
  weighted_price_sales: number | null;
  weighted_peg: number | null;
  weighted_revenue_growth: number | null;
  weighted_earnings_growth: number | null;
  weighted_profit_margin: number | null;
  top_pressure_symbol: string;
  top_pressure_contribution: number;
  summary: string;
  methodology: string;
  controls: string[];
  most_expensive: ExpensiveItem[];
  strongest_growth: GrowthItem[];
  securities: ValuationSecurity[];
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

const formatMetric = (value: number | null, suffix = "", digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(digits)}${suffix}`;
};

export const NDXValuationPressurePanel = () => {
  const [payload, setPayload] = useState<ValuationPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchValuation = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/valuation");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX valuation pressure:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchValuation();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="badge-dollar-sign" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">估值压力正在初始化...</p>
      </div>
    );
  }

  const valuationColor = colorMap[payload.valuation_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.valuation_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", valuationColor.soft, valuationColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Valuation Pressure
            </div>
            <div className={cn("text-3xl font-black leading-none", valuationColor.text)}>
              {payload.valuation_label}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.valuation_score.toFixed(1)}
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
            <div>{payload.coverage}</div>
            <div>主压力 {payload.top_pressure_symbol}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>估值压力分</span>
            <span>{payload.valuation_score.toFixed(1)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
            <div className={cn("h-full rounded-full", valuationColor.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">MAG7 加权估值代理</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Metric label="Forward PE" value={formatMetric(payload.weighted_forward_pe, "x")} tone="amber" />
            <Metric label="Trailing PE" value={formatMetric(payload.weighted_trailing_pe, "x")} tone="amber" />
            <Metric label="P/S" value={formatMetric(payload.weighted_price_sales, "x")} tone="blue" />
            <Metric label="PEG" value={formatMetric(payload.weighted_peg, "x", 2)} tone="blue" />
            <Metric label="收入增速" value={formatMetric(payload.weighted_revenue_growth, "%")} tone="green" />
            <Metric label="盈利增速" value={formatMetric(payload.weighted_earnings_growth, "%")} tone="green" />
            <Metric label="利润率" value={formatMetric(payload.weighted_profit_margin, "%")} tone="green" />
            <Metric label="压力贡献" value={`${payload.top_pressure_symbol} ${payload.top_pressure_contribution.toFixed(1)}`} tone="red" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">估值约束</h4>
          <div className="space-y-2">
            {payload.controls.map((control) => (
              <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                <span>{control}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">权重股估值贡献</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">按市值权重排序</span>
          </div>
          <div className="space-y-3">
            {payload.securities.map((security) => {
              const color = colorMap[security.color] ?? colorMap.blue;
              const width = `${Math.max(3, Math.min(100, security.valuation_score))}%`;

              return (
                <div key={security.symbol} className="rounded-lg bg-[var(--section-bg)] p-3">
                  <div className="grid grid-cols-[72px_1fr_72px] gap-3 items-center">
                    <div>
                      <div className="text-sm font-black text-[var(--text-primary)]">{security.symbol}</div>
                      <div className="text-[11px] font-bold text-[var(--text-tertiary)]">
                        W {security.weight.toFixed(1)}%
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-[var(--text-tertiary)] mb-1">
                        <span>FPE {formatMetric(security.forward_pe, "x")}</span>
                        <span>PEG {formatMetric(security.peg, "x", 2)}</span>
                        <span>Rev {formatMetric(security.revenue_growth, "%")}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                        <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                      </div>
                    </div>
                    <div className={cn("text-right text-sm font-black", color.text)}>
                      {security.valuation_score.toFixed(1)}
                      <div className="text-[11px] font-bold text-[var(--text-tertiary)]">
                        {security.valuation_label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <MiniList title="估值压力最高" items={payload.most_expensive.map((item) => `${item.symbol} · ${item.score.toFixed(1)} · ${item.label}`)} />
          <MiniList
            title="成长支撑最强"
            items={payload.strongest_growth.map((item) => {
              const revenue = formatMetric(item.revenue_growth, "%");
              const earnings = formatMetric(item.earnings_growth, "%");
              return `${item.symbol} · Rev ${revenue} · EPS ${earnings}`;
            })}
          />
        </div>
      </div>
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
  tone: "green" | "blue" | "amber" | "red";
}) => {
  const toneClass = {
    green: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    red: "text-red-700",
  }[tone];

  return (
    <div className="rounded-lg bg-[var(--section-bg)] p-3">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("text-sm font-black mt-1", toneClass)}>{value}</div>
    </div>
  );
};

const MiniList = ({ title, items }: { title: string; items: string[] }) => {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
            <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
