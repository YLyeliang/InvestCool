"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ExposureBand {
  lower: number;
  upper: number;
  label: string;
}

interface HedgeCoverage {
  lower: number;
  upper: number;
  label: string;
}

interface CapacityGate {
  key: string;
  label: string;
  status: "open" | "blocked" | "conditional" | "active" | "standby";
  color: ColorKey;
  trigger: string;
  readout: string;
  action: string;
}

interface CapacityPayload {
  as_of: string;
  index?: number | null;
  capacity_score: number;
  capacity_regime: string;
  capacity_color: ColorKey;
  recommended_profile: string;
  target_exposure: ExposureBand;
  cash_buffer_min: number;
  hedge_coverage: HedgeCoverage;
  max_loss_budget: number;
  stress_downside: number;
  risk_score: number;
  net_pressure: number;
  alert_score: number;
  alert_level?: string | null;
  recovery_score: number;
  recovery_regime?: string | null;
  regime?: string | null;
  hedge_label?: string | null;
  pressure_total: number;
  support_total: number;
  data_coverage: string;
  summary: string;
  gates: CapacityGate[];
  constraints: string[];
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

const statusLabel = {
  open: "开放",
  blocked: "阻断",
  conditional: "条件",
  active: "触发",
  standby: "待命",
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

export const NDXCapacityGatePanel = () => {
  const [payload, setPayload] = useState<CapacityPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchCapacity = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const res = await fetch("/api/risk/capacity");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchCapacity(attempt + 1), 4000);
          return;
        }
        setPayload(null);
      } catch (e) {
        console.error("Failed to fetch NDX risk capacity:", e);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchCapacity(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchCapacity();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-52 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="gauge" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">风险承受力闸门正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.capacity_color] ?? colorMap.blue;
  const exposureWidth = `${Math.max(4, Math.min(100, payload.target_exposure.upper))}%`;
  const cashWidth = `${Math.max(4, Math.min(100, payload.cash_buffer_min))}%`;
  const hedgeWidth = `${Math.max(4, Math.min(100, payload.hedge_coverage.upper))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Capacity Gate
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.capacity_regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.capacity_score.toFixed(1)}
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
          <Gauge label="目标暴露" value={payload.target_exposure.label} width={exposureWidth} color={regimeColor.bg} />
          <Gauge label="现金下限" value={`${payload.cash_buffer_min.toFixed(0)}%+`} width={cashWidth} color="bg-blue-500" />
          <Gauge label="保护覆盖" value={payload.hedge_coverage.label} width={hedgeWidth} color="bg-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">执行闸门</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              推荐 {payload.recommended_profile}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payload.gates.map((gate) => {
              const color = colorMap[gate.color] ?? colorMap.blue;
              return (
                <article key={gate.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className={cn("text-lg font-black leading-tight", color.text)}>
                        {gate.label}
                      </div>
                      <div className="text-xs font-black text-[var(--text-tertiary)] mt-1">
                        {gate.trigger}
                      </div>
                    </div>
                    <span className={cn("px-2 py-1 rounded-md text-xs font-black", color.soft, color.text)}>
                      {statusLabel[gate.status]}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[var(--card-bg)]/70 p-3 text-sm leading-6 font-semibold text-[var(--text-primary)] mb-3">
                    {gate.readout}
                  </div>
                  <p className="text-sm leading-6 text-[var(--text-secondary)] m-0">
                    {gate.action}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">承受力读数</h4>
          <div className="space-y-3">
            <Metric label="压力回撤" value={`-${payload.stress_downside.toFixed(1)}%`} tone="red" />
            <Metric label="最大损失预算" value={`${payload.max_loss_budget.toFixed(1)}%`} tone="amber" />
            <Metric label="净压力" value={formatSigned(payload.net_pressure)} tone={payload.net_pressure >= 0 ? "amber" : "green"} />
            <Metric label="预警层" value={payload.alert_level ?? "--"} tone={payload.alert_score >= 58 ? "amber" : "green"} />
            <Metric label="修复路径" value={payload.recovery_regime ?? "--"} tone={payload.recovery_score >= 52 ? "blue" : "amber"} />
            <Metric label="对冲状态" value={payload.hedge_label ?? "--"} tone="blue" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
        <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">组合约束</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {payload.constraints.map((constraint) => (
            <div key={constraint} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
              <Icon name="circle-dot" size={14} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>{constraint}</span>
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

const Metric = ({ label, value, tone }: { label: string; value: string; tone: ColorKey }) => {
  const color = colorMap[tone] ?? colorMap.blue;
  return (
    <div className="rounded-lg bg-[var(--card-bg)] p-3">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
        {label}
      </div>
      <div className={cn("text-base font-black", color.text)}>
        {value}
      </div>
    </div>
  );
};
