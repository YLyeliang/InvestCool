"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface GammaStrike {
  strike: number;
  call_gamma: number;
  put_gamma: number;
  net_gamma: number;
  total_abs_gamma: number;
  distance_pct: number;
  color: ColorKey;
}

interface GammaPayload {
  as_of: string;
  proxy_symbol: string;
  proxy_price: number;
  expiration: string;
  days_to_expiration: number;
  gamma_score: number;
  regime: string;
  regime_color: ColorKey;
  summary: string;
  net_gamma: number;
  call_gamma: number;
  put_gamma: number;
  net_gamma_ratio: number;
  gamma_wall: GammaStrike;
  put_wall: GammaStrike;
  max_abs_wall: GammaStrike;
  nearest_wall: GammaStrike;
  flip_strike: number;
  flip_cumulative: number;
  positive_walls: GammaStrike[];
  negative_walls: GammaStrike[];
  strikes: GammaStrike[];
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

const formatSigned = (value?: number | null, suffix = "", digits = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
};

export const NDXGammaMapPanel = () => {
  const [payload, setPayload] = useState<GammaPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchGamma = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const response = await fetch("/api/risk/gamma-map");
        const data = await response.json();
        if (cancelled) return;
        if (response.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchGamma(attempt + 1), 4000);
          return;
        }
        setPayload(null);
      } catch (error) {
        console.error("Failed to fetch NDX gamma map:", error);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchGamma(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchGamma();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
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
        <Icon name="crosshair" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">Gamma 定位图正在初始化...</p>
      </div>
    );
  }

  const color = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.gamma_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", color.soft, color.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_220px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Gamma Positioning
            </div>
            <div className={cn("text-3xl font-black leading-none", color.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.gamma_score.toFixed(1)}
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

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>Gamma 风险分</span>
            <span>{payload.gamma_score.toFixed(1)}/100 · 净比 {formatSigned(payload.net_gamma_ratio * 100, "%", 1)}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/75 overflow-hidden">
            <div className={cn("h-full rounded-full", color.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric label="净 Gamma" value={`${formatSigned(payload.net_gamma, "M", 1)}`} tone={payload.net_gamma >= 0 ? "green" : "red"} />
        <Metric label="Call Gamma" value={`${payload.call_gamma.toFixed(1)}M`} tone="blue" />
        <Metric label="Put Gamma" value={`${payload.put_gamma.toFixed(1)}M`} tone="amber" />
        <Metric label="Flip 代理" value={formatPrice(payload.flip_strike)} tone="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">关键 Gamma 行权价</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <WallCard title="Gamma Wall" wall={payload.gamma_wall} color="green" />
            <WallCard title="Put Wall" wall={payload.put_wall} color="red" />
            <WallCard title="最大墙" wall={payload.max_abs_wall} color="amber" />
            <WallCard title="最近墙" wall={payload.nearest_wall} color="blue" />
          </div>

          <div className="space-y-2">
            {payload.strikes.map((row) => {
              const rowColor = colorMap[row.color] ?? colorMap.blue;
              const width = `${Math.max(4, Math.min(100, row.total_abs_gamma * 4))}%`;
              return (
                <div key={row.strike} className="grid grid-cols-[74px_1fr_86px] md:grid-cols-[88px_1fr_96px_96px] gap-3 items-center rounded-lg bg-[var(--section-bg)] p-3">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">{formatPrice(row.strike)}</div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{formatSigned(row.distance_pct, "%")}</div>
                  </div>
                  <div>
                    <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                      <div className={cn("h-full rounded-full", rowColor.bg)} style={{ width }} />
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--text-tertiary)]">
                      Call {formatSigned(row.call_gamma, "M", 1)} · Put {formatSigned(row.put_gamma, "M", 1)}
                    </div>
                  </div>
                  <div className={cn("text-right text-sm font-black", rowColor.text)}>
                    {formatSigned(row.net_gamma, "M", 1)}
                  </div>
                  <div className="hidden md:block text-right text-xs font-bold text-[var(--text-tertiary)]">
                    Abs {row.total_abs_gamma.toFixed(1)}M
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">交易台提示</h4>
            <div className="space-y-2">
              {payload.controls.map((control) => (
                <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                  <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                  <span>{control}</span>
                </div>
              ))}
            </div>
          </div>

          <WallList title="正 Gamma 墙" rows={payload.positive_walls} tone="green" />
          <WallList title="负 Gamma 墙" rows={payload.negative_walls} tone="red" />
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
  const toneClass = colorMap[tone]?.text ?? colorMap.blue.text;
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-xl font-black", toneClass)}>{value}</div>
    </div>
  );
};

const WallCard = ({ title, wall, color }: { title: string; wall: GammaStrike; color: ColorKey }) => {
  const tone = colorMap[color];
  return (
    <div className="rounded-lg bg-[var(--section-bg)] p-3">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{title}</div>
      <div className={cn("mt-1 text-xl font-black", tone.text)}>{formatPrice(wall.strike)}</div>
      <div className="text-xs font-semibold text-[var(--text-secondary)]">
        {formatSigned(wall.distance_pct, "%")} · {formatSigned(wall.net_gamma, "M", 1)}
      </div>
    </div>
  );
};

const WallList = ({ title, rows, tone }: { title: string; rows: GammaStrike[]; tone: ColorKey }) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">{title}</h4>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm font-semibold text-[var(--text-tertiary)]">暂无显著墙位</div>
        ) : rows.map((row) => (
          <div key={`${title}-${row.strike}`} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--section-bg)] p-3">
            <div>
              <div className="text-sm font-black text-[var(--text-primary)]">{formatPrice(row.strike)}</div>
              <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{formatSigned(row.distance_pct, "%")}</div>
            </div>
            <div className={cn("text-sm font-black", color.text)}>{formatSigned(row.net_gamma, "M", 1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
