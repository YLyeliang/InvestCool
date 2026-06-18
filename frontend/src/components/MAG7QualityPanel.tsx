"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface QualitySecurity {
  symbol: string;
  name: string;
  weight: number;
  gross_margin: number | null;
  operating_margin: number | null;
  profit_margin: number | null;
  fcf_margin: number | null;
  cashflow_conversion: number | null;
  net_cash_ratio: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
  roe: number | null;
  quality_score: number;
  quality_label: string;
  quality_contribution: number;
  color: ColorKey;
}

interface QualityItem {
  symbol: string;
  score: number;
  fcf_margin: number | null;
}

interface QualityPayload {
  as_of: string;
  coverage: string;
  quality_score: number;
  quality_label: string;
  quality_color: ColorKey;
  weighted_gross_margin: number | null;
  weighted_operating_margin: number | null;
  weighted_profit_margin: number | null;
  weighted_fcf_margin: number | null;
  weighted_cashflow_conversion: number | null;
  weighted_net_cash_ratio: number | null;
  weighted_revenue_growth: number | null;
  weighted_earnings_growth: number | null;
  weighted_roe: number | null;
  top_quality_symbol: string;
  top_contributor_symbol: string;
  top_contributor_score: number;
  summary: string;
  methodology: string;
  controls: string[];
  top_quality: QualityItem[];
  weak_quality: QualityItem[];
  securities: QualitySecurity[];
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

const formatMetric = (value: number | null, suffix = "%", digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(digits)}${suffix}`;
};

export const MAG7QualityPanel = () => {
  const [payload, setPayload] = useState<QualityPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchQuality = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/quality");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch MAG7 quality score:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchQuality();
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
        <Icon name="badge-check" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">盈利质量正在初始化...</p>
      </div>
    );
  }

  const qualityColor = colorMap[payload.quality_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.quality_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", qualityColor.soft, qualityColor.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Quality Score
            </div>
            <div className={cn("text-3xl font-black leading-none", qualityColor.text)}>
              {payload.quality_label}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.quality_score.toFixed(1)}
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
            <div>主支撑 {payload.top_contributor_symbol}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>盈利质量分</span>
            <span>{payload.quality_score.toFixed(1)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
            <div className={cn("h-full rounded-full", qualityColor.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">MAG7 加权质量代理</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Metric label="毛利率" value={formatMetric(payload.weighted_gross_margin)} tone="green" />
            <Metric label="经营利润率" value={formatMetric(payload.weighted_operating_margin)} tone="green" />
            <Metric label="净利率" value={formatMetric(payload.weighted_profit_margin)} tone="green" />
            <Metric label="FCF Margin" value={formatMetric(payload.weighted_fcf_margin)} tone="blue" />
            <Metric label="现金流转换" value={formatMetric(payload.weighted_cashflow_conversion)} tone="blue" />
            <Metric label="净现金率" value={formatMetric(payload.weighted_net_cash_ratio)} tone="blue" />
            <Metric label="收入增速" value={formatMetric(payload.weighted_revenue_growth)} tone="amber" />
            <Metric label="ROE" value={formatMetric(payload.weighted_roe)} tone="amber" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">质量约束</h4>
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
            <h4 className="text-sm font-black text-[var(--text-primary)]">权重股质量贡献</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">按市值权重排序</span>
          </div>
          <div className="space-y-3">
            {payload.securities.map((security) => {
              const color = colorMap[security.color] ?? colorMap.blue;
              const width = `${Math.max(3, Math.min(100, security.quality_score))}%`;

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
                        <span>FCF {formatMetric(security.fcf_margin)}</span>
                        <span>OPM {formatMetric(security.operating_margin)}</span>
                        <span>Rev {formatMetric(security.revenue_growth)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                        <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                      </div>
                    </div>
                    <div className={cn("text-right text-sm font-black", color.text)}>
                      {security.quality_score.toFixed(1)}
                      <div className="text-[11px] font-bold text-[var(--text-tertiary)]">
                        {security.quality_label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <ListCard title="质量支撑最强" items={payload.top_quality} tone="green" />
          <ListCard title="质量薄弱观察" items={payload.weak_quality} tone="amber" />
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
  tone: ColorKey;
}) => {
  const toneClass = {
    green: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    red: "text-red-700",
  }[tone];

  return (
    <div className="rounded-lg bg-[var(--section-bg)] p-3 min-h-[86px]">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-xl font-black leading-tight", toneClass)}>
        {value}
      </div>
    </div>
  );
};

const ListCard = ({
  title,
  items,
  tone,
}: {
  title: string;
  items: QualityItem[];
  tone: ColorKey;
}) => {
  const color = colorMap[tone] ?? colorMap.blue;

  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.symbol} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--section-bg)] p-3">
            <div>
              <div className="text-sm font-black text-[var(--text-primary)]">{item.symbol}</div>
              <div className="text-xs font-semibold text-[var(--text-tertiary)]">
                FCF {formatMetric(item.fcf_margin)}
              </div>
            </div>
            <div className={cn("text-lg font-black", color.text)}>
              {item.score.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
