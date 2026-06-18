"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface SecurityDispersion {
  symbol: string;
  name: string;
  return_20d: number;
  return_60d: number;
  active_20d: number;
  beta_to_ndx: number;
  correlation_to_ndx: number;
}

interface DispersionPayload {
  as_of: string;
  price_date: string;
  regime: string;
  regime_color: "green" | "blue" | "amber" | "red";
  summary: string;
  avg_corr_20d: number;
  avg_corr_60d: number;
  dispersion_20d: number;
  dispersion_60d: number;
  ndx_return_20d: number;
  leaders: SecurityDispersion[];
  laggards: SecurityDispersion[];
  securities: SecurityDispersion[];
  controls: string[];
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

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const MAG7DispersionPanel = () => {
  const [payload, setPayload] = useState<DispersionPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchDispersion = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/dispersion");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch MAG7 dispersion:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchDispersion();
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
        <Icon name="scatter-chart" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">MAG7 离散度正在初始化...</p>
      </div>
    );
  }

  const color = colorMap[payload.regime_color] ?? colorMap.blue;
  const corrWidth = `${Math.max(5, Math.min(100, payload.avg_corr_20d * 100))}%`;
  const dispersionWidth = `${Math.max(5, Math.min(100, payload.dispersion_20d * 18))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", color.soft, color.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Dispersion
            </div>
            <div className={cn("text-3xl font-black leading-none", color.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Corr {payload.avg_corr_20d.toFixed(2)}
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
            <div>NDX 20日 {formatSignedPct(payload.ndx_return_20d)}</div>
            <div>离散度 {payload.dispersion_20d.toFixed(2)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
              <span>20日平均相关</span>
              <span>{payload.avg_corr_20d.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
              <div className={cn("h-full rounded-full", color.bg)} style={{ width: corrWidth }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
              <span>20日横截面离散</span>
              <span>{payload.dispersion_20d.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
              <div className={cn("h-full rounded-full", color.bg)} style={{ width: dispersionWidth }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">MAG7 主动收益排序</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">相对 NDX 20日</span>
          </div>
          <div className="space-y-3">
            {payload.securities.map((security) => {
              const width = `${Math.max(5, Math.min(100, 50 + security.active_20d * 2.5))}%`;
              const activeTone = security.active_20d >= 0 ? "text-emerald-700" : "text-red-700";

              return (
                <div key={security.symbol} className="grid grid-cols-[72px_1fr_80px] gap-3 items-center">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{security.symbol}</div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)] truncate">{security.name}</div>
                  </div>
                  <div>
                    <div className="h-2 rounded-full bg-[var(--section-bg)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--accent-color)]" style={{ width }} />
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--text-tertiary)]">
                      20日 {formatSignedPct(security.return_20d)} · Beta {security.beta_to_ndx.toFixed(2)} · Corr {security.correlation_to_ndx.toFixed(2)}
                    </div>
                  </div>
                  <div className={cn("text-right text-sm font-black", activeTone)}>
                    {formatSignedPct(security.active_20d)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">结构指标</h4>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="60日相关" value={payload.avg_corr_60d.toFixed(2)} tone="blue" />
              <Metric label="60日离散" value={payload.dispersion_60d.toFixed(2)} tone="blue" />
              <Metric label="领涨" value={payload.leaders[0]?.symbol || "--"} tone="green" />
              <Metric label="拖累" value={payload.laggards[0]?.symbol || "--"} tone="red" />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">风险提示</h4>
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
