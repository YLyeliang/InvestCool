"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface OverlayAction {
  key: string;
  label: string;
  value: string;
  color: ColorKey;
  detail: string;
}

interface HedgeOverlayPayload {
  as_of: string;
  hedge_score: number;
  hedge_label: string;
  hedge_color: ColorKey;
  summary: string;
  protection_lower: number;
  protection_upper: number;
  proxy_symbol: string;
  proxy_price: number;
  expiration: string;
  days_to_expiration: number;
  implied_move: number;
  implied_range_low: number;
  implied_range_high: number;
  put_call_oi_ratio: number;
  vix: number;
  front_ratio: number;
  vvix_z_score: number;
  tail_score: number;
  var95: number;
  expected_shortfall_95: number;
  stress_downside: number;
  balanced_exposure: string;
  ndx_support: number | null;
  ndx_resistance: number | null;
  put_spread_long: number;
  put_spread_short: number;
  overlays: OverlayAction[];
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

const formatPrice = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSignedPct = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

export const NDXHedgeOverlayPanel = () => {
  const [payload, setPayload] = useState<HedgeOverlayPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchHedgeOverlay = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/hedge-overlay");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX hedge overlay:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchHedgeOverlay();
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-52 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="shield-check" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">对冲覆盖建议正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.hedge_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.hedge_score))}%`;
  const protectionWidth = `${Math.max(4, Math.min(100, payload.protection_upper))}%`;
  const putCallWidth = `${Math.max(4, Math.min(100, payload.put_call_oi_ratio * 32))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Hedge Overlay
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.hedge_label}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.hedge_score.toFixed(1)}
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
            <div>{payload.proxy_symbol} {formatPrice(payload.proxy_price)}</div>
            <div>{payload.expiration} · {payload.days_to_expiration}D</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <Gauge label="保护分" value={`${payload.hedge_score.toFixed(1)}/100`} width={scoreWidth} color={regimeColor.bg} />
          <Gauge label="建议覆盖" value={`${payload.protection_lower}% - ${payload.protection_upper}%`} width={protectionWidth} color={regimeColor.bg} />
          <Gauge label="Put/Call OI" value={payload.put_call_oi_ratio.toFixed(2)} width={putCallWidth} color={regimeColor.bg} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">对冲覆盖框架</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">
              Stress -{payload.stress_downside.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Metric label="保护覆盖" value={`${payload.protection_lower}% - ${payload.protection_upper}%`} tone={payload.hedge_color} />
            <Metric label="Put Spread" value={`${payload.put_spread_long.toFixed(2)}/${payload.put_spread_short.toFixed(2)}`} tone="amber" />
            <Metric label="均衡暴露" value={payload.balanced_exposure} tone="blue" />
            <Metric label="NDX 支撑" value={formatPrice(payload.ndx_support)} tone={payload.ndx_support ? "blue" : "amber"} />
            <Metric label="NDX 阻力" value={formatPrice(payload.ndx_resistance)} tone="green" />
            <Metric label="隐含下沿" value={formatPrice(payload.implied_range_low)} tone="red" />
            <Metric label="VIX / 3M" value={`${payload.front_ratio.toFixed(2)}x`} tone={payload.front_ratio >= 1 ? "red" : payload.front_ratio >= 0.96 ? "amber" : "blue"} />
            <Metric label="VaR 95" value={formatSignedPct(payload.var95)} tone="red" />
            <Metric label="ES 95" value={formatSignedPct(payload.expected_shortfall_95)} tone="red" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">执行约束</h4>
          <div className="space-y-2">
            {payload.controls.map((control) => (
              <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="shield-check" size={15} className="mt-1 shrink-0 text-[var(--accent-strong)]" />
                <span>{control}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {payload.overlays.map((overlay) => {
          const color = colorMap[overlay.color] ?? colorMap.blue;
          return (
            <article key={overlay.key} className={cn("rounded-lg border p-4", color.soft, color.border)}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                  {overlay.label}
                </div>
                <span className={cn("size-2 rounded-full", color.bg)} />
              </div>
              <div className={cn("text-xl font-black leading-tight mb-2", color.text)}>
                {overlay.value}
              </div>
              <p className="text-xs leading-5 text-[var(--text-secondary)] m-0">
                {overlay.detail}
              </p>
            </article>
          );
        })}
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
