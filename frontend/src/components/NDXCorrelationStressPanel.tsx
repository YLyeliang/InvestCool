"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface CorrelationPair {
  pair: string;
  corr_20d: number;
  corr_60d: number;
  delta: number;
  color: ColorKey;
}

interface CorrelationSecurity {
  symbol: string;
  name: string;
  corr_to_qqq: number;
  beta_to_qqq: number;
  return_20d: number;
  active_20d: number;
  color: ColorKey;
}

interface CorrelationStressPayload {
  as_of: string;
  price_date: string;
  stress_score: number;
  regime: string;
  regime_color: ColorKey;
  summary: string;
  avg_corr_20d: number;
  avg_corr_60d: number;
  corr_percentile: number;
  qqq_spy_corr: number;
  qqq_smh_corr: number;
  qqq_iwm_corr: number;
  mag7_dispersion: number;
  qqq_realized_vol_20d: number;
  qqq_return_20d: number;
  top_pairs: CorrelationPair[];
  low_pairs: CorrelationPair[];
  securities: CorrelationSecurity[];
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

const formatSigned = (value: number, suffix = "", digits = 2) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
};

export const NDXCorrelationStressPanel = () => {
  const [payload, setPayload] = useState<CorrelationStressPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchCorrelationStress = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/correlation-stress");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX correlation stress:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchCorrelationStress();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-56 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="git-merge" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">相关性压力正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.stress_score))}%`;
  const percentileWidth = `${Math.max(4, Math.min(100, payload.corr_percentile))}%`;
  const corrWidth = `${Math.max(4, Math.min(100, payload.avg_corr_20d * 100))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Correlation Stress
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.stress_score.toFixed(1)}
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
            <div>QQQ 20D {formatSigned(payload.qqq_return_20d, "%")}</div>
            <div>RV20 {payload.qqq_realized_vol_20d.toFixed(1)}% · {payload.price_date}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="相关性压力分" value={`${payload.stress_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="MAG7 20D 平均相关" value={payload.avg_corr_20d.toFixed(2)} width={corrWidth} color={regimeColor.bg} />
          <Gauge label="相关性历史分位" value={`${payload.corr_percentile.toFixed(1)}%`} width={percentileWidth} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">高相关配对</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              60D avg {payload.avg_corr_60d.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {payload.top_pairs.map((pair) => {
              const color = colorMap[pair.color] ?? colorMap.blue;
              return (
                <article key={pair.pair} className={cn("rounded-lg border p-4", color.soft, color.border)}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-black text-[var(--text-primary)]">{pair.pair}</div>
                    <span className={cn("size-2 rounded-full", color.bg)} />
                  </div>
                  <div className={cn("text-2xl font-black leading-none mb-2", color.text)}>
                    {pair.corr_20d.toFixed(2)}
                  </div>
                  <div className="text-xs font-bold text-[var(--text-secondary)]">
                    60D {pair.corr_60d.toFixed(2)} · delta {formatSigned(pair.delta)}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">执行控制线</h4>
          <div className="space-y-2">
            {payload.controls.map((control) => (
              <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="git-merge" size={15} className="mt-1 shrink-0 text-[var(--accent-strong)]" />
                <span>{control}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">单股对 QQQ 同步度</h4>
          <div className="space-y-3">
            {payload.securities.map((security) => {
              const color = colorMap[security.color] ?? colorMap.blue;
              const width = `${Math.max(4, Math.min(100, security.corr_to_qqq * 100))}%`;
              return (
                <div key={security.symbol} className="grid grid-cols-[82px_1fr_76px] md:grid-cols-[104px_1fr_82px_92px] gap-3 items-center rounded-lg bg-[var(--section-bg)] p-3">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{security.symbol}</div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{security.name}</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-1">
                      <span>20D {formatSigned(security.return_20d, "%")} · active {formatSigned(security.active_20d, "pt")}</span>
                      <span>beta {security.beta_to_qqq.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                      <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
                    </div>
                  </div>
                  <div className={cn("text-sm font-black text-right", color.text)}>
                    {security.corr_to_qqq.toFixed(2)}
                  </div>
                  <div className="hidden md:block text-right text-xs font-semibold text-[var(--text-secondary)]">
                    β {security.beta_to_qqq.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">市场同步</h4>
          <div className="grid grid-cols-1 gap-3">
            <Metric label="QQQ / SPY" value={payload.qqq_spy_corr.toFixed(2)} detail="系统性 beta 同步" tone={payload.qqq_spy_corr > 0.86 ? "red" : "blue"} />
            <Metric label="QQQ / SMH" value={payload.qqq_smh_corr.toFixed(2)} detail="半导体链条同步" tone={payload.qqq_smh_corr > 0.78 ? "amber" : "blue"} />
            <Metric label="QQQ / IWM" value={payload.qqq_iwm_corr.toFixed(2)} detail="广义风险偏好同步" tone={payload.qqq_iwm_corr > 0.65 ? "blue" : "green"} />
            <Metric label="MAG7 离散度" value={`${payload.mag7_dispersion.toFixed(2)}pt`} detail="横截面日波动" tone={payload.mag7_dispersion > 2.2 ? "amber" : "blue"} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Gauge = ({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: string;
  width: string;
  color: string;
}) => (
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

const Metric = ({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: ColorKey;
}) => {
  const toneColor = colorMap[tone] ?? colorMap.blue;
  return (
    <div className={cn("rounded-lg border p-4", toneColor.soft, toneColor.border)}>
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
        {label}
      </div>
      <div className={cn("text-xl font-black leading-tight", toneColor.text)}>
        {value}
      </div>
      <div className="text-xs font-bold text-[var(--text-secondary)] mt-1">
        {detail}
      </div>
    </div>
  );
};
