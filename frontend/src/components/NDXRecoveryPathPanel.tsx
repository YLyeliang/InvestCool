"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface RecoveryLevel {
  key: string;
  label: string;
  value: number;
  distance: number;
  distance_label: string;
  color: ColorKey;
  usage: string;
}

interface RecoveryStep {
  key: string;
  label: string;
  color: ColorKey;
  trigger: string;
  max_exposure: string;
  action: string;
}

interface RecoveryPayload {
  as_of: string;
  index: number;
  recovery_score: number;
  recovery_regime: string;
  recovery_color: ColorKey;
  summary: string;
  data_coverage: string;
  stress_downside: number;
  expected_move: number;
  current_drawdown?: number | null;
  max_drawdown_1y?: number | null;
  weighted_low?: number | null;
  weighted_high?: number | null;
  hedge_label?: string | null;
  protection_lower?: number | null;
  protection_upper?: number | null;
  alert_level?: string | null;
  regime?: string | null;
  levels: RecoveryLevel[];
  ladder: RecoveryStep[];
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

const formatSignedPct = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

export const NDXRecoveryPathPanel = () => {
  const [payload, setPayload] = useState<RecoveryPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchRecoveryPath = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const res = await fetch("/api/risk/recovery-path");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchRecoveryPath(attempt + 1), 4000);
          return;
        }
        setPayload(null);
      } catch (e) {
        console.error("Failed to fetch NDX recovery path:", e);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchRecoveryPath(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchRecoveryPath();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="route" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">回撤修复路径正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.recovery_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.recovery_score))}%`;
  const levelDistanceMax = Math.max(1, ...payload.levels.map((level) => Math.abs(level.distance)));

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Recovery Path
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.recovery_regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.recovery_score.toFixed(1)}
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
          <Gauge label="修复分" value={payload.recovery_score.toFixed(1)} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="压力回撤" value={`-${payload.stress_downside.toFixed(1)}%`} width={`${Math.max(4, Math.min(100, payload.stress_downside * 8))}%`} color="bg-red-500" />
          <Gauge label="概率涨跌" value={formatSignedPct(payload.expected_move)} width={`${Math.max(4, Math.min(100, 50 + payload.expected_move * 8))}%`} color={payload.expected_move >= 0 ? "bg-emerald-500" : "bg-amber-500"} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">关键路径线</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">相对当前点位</span>
          </div>
          <div className="space-y-3">
            {payload.levels.map((level) => {
              const color = colorMap[level.color] ?? colorMap.blue;
              const width = `${Math.max(6, Math.min(100, Math.abs(level.distance) / levelDistanceMax * 100))}%`;

              return (
                <article key={level.key} className="rounded-lg bg-[var(--section-bg)] p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("size-2 rounded-full", color.bg)} />
                        <h5 className="text-base font-black text-[var(--text-primary)] m-0">
                          {level.label}
                        </h5>
                      </div>
                      <p className="text-sm leading-6 text-[var(--text-secondary)] m-0">
                        {level.usage}
                      </p>
                    </div>
                    <div className="md:text-right">
                      <div className="text-lg font-black text-[var(--text-primary)]">
                        {formatIndex(level.value)}
                      </div>
                      <div className={cn("text-sm font-black", color.text)}>
                        {level.distance_label}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                    <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <InfoCard
            title="路径读数"
            icon="milestone"
            items={[
              `概率下沿 ${formatIndex(payload.weighted_low)}`,
              `概率上沿 ${formatIndex(payload.weighted_high)}`,
              `当前回撤 ${formatSignedPct(payload.current_drawdown)}`,
              `1年最大回撤 ${formatSignedPct(payload.max_drawdown_1y)}`,
            ]}
          />
          <InfoCard
            title="状态约束"
            icon="shield-alert"
            items={[
              `罗盘：${payload.regime ?? "--"}`,
              `预警：${payload.alert_level ?? "--"}`,
              `对冲：${payload.hedge_label ?? "--"}`,
              `保护：${payload.protection_lower ?? "--"}%-${payload.protection_upper ?? "--"}%`,
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {payload.ladder.map((step) => {
          const color = colorMap[step.color] ?? colorMap.blue;
          return (
            <article key={step.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className={cn("text-base font-black", color.text)}>{step.label}</h4>
                <span className={cn("px-2 py-1 rounded-md text-xs font-black", color.soft, color.text)}>
                  {step.max_exposure}
                </span>
              </div>
              <p className="text-sm leading-6 text-[var(--text-secondary)] mb-3">
                {step.trigger}
              </p>
              <div className="rounded-lg bg-[var(--section-bg)] p-3 text-sm leading-6 font-semibold text-[var(--text-primary)]">
                {step.action}
              </div>
            </article>
          );
        })}
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

const InfoCard = ({ title, icon, items }: { title: string; icon: string; items: string[] }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <Icon name={icon} size={16} className="text-[var(--accent-color)]" />
      <h4 className="text-sm font-black text-[var(--text-primary)]">{title}</h4>
    </div>
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="text-sm leading-6 text-[var(--text-secondary)]">
          {item}
        </div>
      ))}
    </div>
  </div>
);
