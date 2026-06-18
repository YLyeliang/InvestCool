"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";
type Direction = "pressure" | "support";

interface ContributionDriver {
  key: string;
  label: string;
  direction: Direction;
  score: number;
  weight: number;
  impact: number;
  signed_impact: number;
  color: ColorKey;
  evidence: string;
  action: string;
}

interface ContributionPayload {
  as_of: string;
  index?: number | null;
  risk_contribution_score: number;
  contribution_regime: string;
  contribution_color: ColorKey;
  net_pressure: number;
  pressure_total: number;
  support_total: number;
  data_coverage: string;
  summary: string;
  top_pressures: ContributionDriver[];
  top_supports: ContributionDriver[];
  drivers: ContributionDriver[];
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

const formatIndex = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSigned = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
};

export const NDXContributionPanel = () => {
  const [payload, setPayload] = useState<ContributionPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchContribution = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const res = await fetch("/api/risk/contribution");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchContribution(attempt + 1), 4000);
          return;
        }
        setPayload(null);
      } catch (e) {
        console.error("Failed to fetch NDX risk contribution:", e);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchContribution(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchContribution();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  const maxImpact = useMemo(() => {
    if (!payload) return 1;
    return Math.max(1, ...payload.drivers.map((driver) => driver.impact));
  }, [payload]);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-52 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-72 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="chart-no-axes-combined" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">风险贡献拆解正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.contribution_color] ?? colorMap.blue;
  const pressureWidth = `${Math.max(4, Math.min(100, payload.pressure_total * 4))}%`;
  const supportWidth = `${Math.max(4, Math.min(100, payload.support_total * 4))}%`;
  const netWidth = `${Math.max(4, Math.min(100, 50 + payload.net_pressure * 3))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Risk Contribution
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.contribution_regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.risk_contribution_score.toFixed(1)}
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
            <div>NDX {formatIndex(payload.index)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="压力贡献" value={payload.pressure_total.toFixed(1)} width={pressureWidth} color="bg-red-500" />
          <Gauge label="缓冲贡献" value={payload.support_total.toFixed(1)} width={supportWidth} color="bg-emerald-500" />
          <Gauge label="净压力" value={formatSigned(payload.net_pressure)} width={netWidth} color={payload.net_pressure >= 0 ? "bg-amber-500" : "bg-emerald-500"} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
        <DriverColumn
          title="主要风险来源"
          icon="triangle-alert"
          drivers={payload.top_pressures}
          maxImpact={maxImpact}
        />
        <DriverColumn
          title="缓冲来源"
          icon="shield-check"
          drivers={payload.top_supports}
          maxImpact={maxImpact}
        />
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-black text-[var(--text-primary)]">贡献栈</h4>
          <span className="text-xs font-black text-[var(--text-tertiary)]">Impact weighted by module weight</span>
        </div>
        <div className="space-y-3">
          {payload.drivers.map((driver) => {
            const driverColor = colorMap[driver.color] ?? colorMap.blue;
            const width = `${Math.max(5, Math.min(100, driver.impact / maxImpact * 100))}%`;
            return (
              <article key={driver.key} className="grid grid-cols-1 lg:grid-cols-[150px_1fr_80px] gap-3 lg:items-center">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", driverColor.bg)} />
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{driver.label}</div>
                    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                      {driver.direction === "pressure" ? "Pressure" : "Support"} · W {driver.weight}
                    </div>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[var(--section-bg)] overflow-hidden">
                  <div className={cn("h-full rounded-full", driverColor.bg)} style={{ width }} />
                </div>
                <div className={cn("text-sm font-black lg:text-right", driverColor.text)}>
                  {formatSigned(driver.signed_impact)}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
        <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">执行控制项</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {payload.controls.map((control) => (
            <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
              <Icon name="circle-dot" size={14} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>{control}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Gauge = ({ label, value, width, color }: { label: string; value: string; width: string; color: string }) => (
  <div>
    <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width }} />
    </div>
  </div>
);

const DriverColumn = ({
  title,
  icon,
  drivers,
  maxImpact,
}: {
  title: string;
  icon: string;
  drivers: ContributionDriver[];
  maxImpact: number;
}) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <Icon name={icon} size={16} className="text-[var(--accent-color)]" />
      <h4 className="text-sm font-black text-[var(--text-primary)]">{title}</h4>
    </div>
    <div className="space-y-3">
      {drivers.map((driver) => {
        const driverColor = colorMap[driver.color] ?? colorMap.blue;
        const width = `${Math.max(6, Math.min(100, driver.impact / maxImpact * 100))}%`;
        return (
          <article key={driver.key} className={cn("rounded-lg border p-4", driverColor.soft, driverColor.border)}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className={cn("text-lg font-black leading-tight", driverColor.text)}>
                  {driver.label}
                </div>
                <div className="text-xs font-black text-[var(--text-tertiary)] mt-1">
                  Score {driver.score.toFixed(1)} · Impact {driver.impact.toFixed(1)}
                </div>
              </div>
              <span className={cn("px-2 py-1 rounded-md text-xs font-black", driverColor.soft, driverColor.text)}>
                W {driver.weight}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--card-bg)]/80 overflow-hidden mb-3">
              <div className={cn("h-full rounded-full", driverColor.bg)} style={{ width }} />
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)] m-0">
              {driver.evidence}
            </p>
            <div className="mt-3 rounded-lg bg-[var(--card-bg)]/70 p-3 text-sm leading-6 font-semibold text-[var(--text-primary)]">
              {driver.action}
            </div>
          </article>
        );
      })}
    </div>
  </div>
);
