"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface Contributor {
  symbol: string;
  contribution: number;
}

interface SecurityWeight {
  symbol: string;
  name: string;
  weight: number;
  percent: number;
  contribution: number;
  market_cap: number;
}

interface ConcentrationPayload {
  as_of: string;
  coverage: string;
  methodology: string;
  concentration_level: string;
  concentration_color: "green" | "blue" | "amber" | "red";
  top3_weight: number;
  top1_symbol: string;
  top1_weight: number;
  hhi: number;
  market_weighted_return: number;
  equal_weight_return: number;
  leadership_gap: number;
  top_contributors: Contributor[];
  top_detractors: Contributor[];
  securities: SecurityWeight[];
  flags: string[];
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

const formatPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const NDXConcentrationPanel = () => {
  const [payload, setPayload] = useState<ConcentrationPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchConcentration = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/concentration");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX concentration:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchConcentration();
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
        <Icon name="pie-chart" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">集中度分析正在初始化...</p>
      </div>
    );
  }

  const color = colorMap[payload.concentration_color] ?? colorMap.amber;
  const strongest = payload.top_contributors[0];
  const weakest = payload.top_detractors[0];
  const strongestColor = strongest && strongest.contribution >= 0 ? "text-emerald-700" : "text-red-700";

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", color.soft, color.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Concentration
            </div>
            <div className={cn("text-3xl font-black leading-none", color.text)}>
              {payload.concentration_level}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Top3 {payload.top3_weight.toFixed(1)}%
            </div>
          </div>

          <div>
            <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
              {payload.top1_symbol} 为当前最大权重代理，权重约 {payload.top1_weight.toFixed(1)}%；
              MAG7 市值加权回报 {formatPct(payload.market_weighted_return)}，等权回报 {formatPct(payload.equal_weight_return)}。
            </p>
            <p className="text-sm leading-6 text-[var(--text-secondary)] mt-2 mb-0">
              {payload.methodology}
            </p>
          </div>

          <div className="text-sm font-semibold text-[var(--text-secondary)] md:text-right">
            <div>覆盖 {payload.coverage}</div>
            <div>HHI {payload.hhi}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">
              MAG7 市值权重代理
            </h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              贡献单位为百分点
            </span>
          </div>

          <div className="space-y-3">
            {payload.securities.map((security) => {
              const width = `${Math.max(4, Math.min(100, security.weight))}%`;
              const contributionColor = security.contribution >= 0 ? "text-emerald-700" : "text-red-700";

              return (
                <div key={security.symbol} className="grid grid-cols-[72px_1fr_70px] gap-3 items-center">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">
                      {security.symbol}
                    </div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)] truncate">
                      {security.name}
                    </div>
                  </div>
                  <div>
                    <div className="h-2 rounded-full bg-[var(--section-bg)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--accent-color)]" style={{ width }} />
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--text-tertiary)]">
                      权重 {security.weight.toFixed(1)}% · 涨跌 {formatPct(security.percent)}
                    </div>
                  </div>
                  <div className={cn("text-right text-sm font-black", contributionColor)}>
                    {security.contribution >= 0 ? "+" : ""}{security.contribution.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">
              贡献观察
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[var(--section-bg)] p-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                  相对支撑
                </div>
                <div className="text-base font-black text-[var(--text-primary)]">
                  {strongest?.symbol || "--"}
                </div>
                <div className={cn("text-xs font-black mt-1", strongestColor)}>
                  {strongest ? `${strongest.contribution >= 0 ? "+" : ""}${strongest.contribution.toFixed(2)}` : "--"}
                </div>
              </div>
              <div className="rounded-lg bg-[var(--section-bg)] p-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                  最大拖累
                </div>
                <div className="text-base font-black text-[var(--text-primary)]">
                  {weakest?.symbol || "--"}
                </div>
                <div className="text-xs font-black text-red-700 mt-1">
                  {weakest ? weakest.contribution.toFixed(2) : "--"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">
              风险提示
            </h4>
            <div className="space-y-2">
              {payload.flags.map((flag) => (
                <div key={flag} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                  <Icon name="alert-circle" size={15} className={cn("mt-1 shrink-0", color.text)} />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
