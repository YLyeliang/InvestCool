"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface InterestStrike {
  strike: number;
  call_oi: number;
  put_oi: number;
  total_oi: number;
}

interface OptionsPayload {
  as_of: string;
  proxy_symbol: string;
  proxy_price: number;
  expiration: string;
  days_to_expiration: number;
  regime: string;
  regime_color: "green" | "blue" | "amber" | "red";
  summary: string;
  atm_strike: number;
  call_mid: number;
  put_mid: number;
  straddle_mid: number;
  implied_move: number;
  implied_range_low: number;
  implied_range_high: number;
  annualized_iv_proxy: number;
  atm_iv: number;
  put_call_oi_ratio: number;
  put_call_volume_ratio: number;
  max_pain: number | null;
  high_interest: InterestStrike[];
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

const formatPrice = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

export const NDXOptionsPricingPanel = () => {
  const [payload, setPayload] = useState<OptionsPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      setPending(true);
      try {
        const res = await fetch("/api/risk/options");
        const data = await res.json();
        setPayload(res.ok && !data.error ? data : null);
      } catch (e) {
        console.error("Failed to fetch NDX options pricing:", e);
        setPayload(null);
      } finally {
        setPending(false);
      }
    };

    void fetchOptions();
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
        <p className="text-sm font-semibold">期权隐含定价正在初始化...</p>
      </div>
    );
  }

  const color = colorMap[payload.regime_color] ?? colorMap.blue;
  const moveWidth = `${Math.max(5, Math.min(100, payload.implied_move * 18))}%`;
  const putCallWidth = `${Math.max(5, Math.min(100, payload.put_call_oi_ratio * 28))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", color.soft, color.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Options Pricing
            </div>
            <div className={cn("text-3xl font-black leading-none", color.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Move {payload.implied_move.toFixed(2)}%
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
            <div>{payload.proxy_symbol} {formatPrice(payload.proxy_price)}</div>
            <div>{payload.expiration} · {payload.days_to_expiration}D</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
              <span>隐含到期波动</span>
              <span>{payload.implied_move.toFixed(2)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
              <div className={cn("h-full rounded-full", color.bg)} style={{ width: moveWidth }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
              <span>Put/Call OI</span>
              <span>{payload.put_call_oi_ratio.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
              <div className={cn("h-full rounded-full", color.bg)} style={{ width: putCallWidth }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">QQQ 隐含区间</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <Metric label="下沿" value={formatPrice(payload.implied_range_low)} tone="red" />
            <Metric label="ATM" value={formatPrice(payload.atm_strike)} tone="blue" />
            <Metric label="上沿" value={formatPrice(payload.implied_range_high)} tone="green" />
            <Metric label="最大痛点" value={payload.max_pain ? formatPrice(payload.max_pain) : "--"} tone="amber" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Metric label="Call Mid" value={formatPrice(payload.call_mid)} tone="blue" />
            <Metric label="Put Mid" value={formatPrice(payload.put_mid)} tone="blue" />
            <Metric label="Straddle" value={formatPrice(payload.straddle_mid)} tone="blue" />
            <Metric label="ATM IV" value={`${payload.atm_iv.toFixed(1)}%`} tone="amber" />
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

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-black text-[var(--text-primary)]">高未平仓行权价</h4>
          <span className="text-xs font-black text-[var(--text-tertiary)]">Call / Put OI</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {payload.high_interest.map((strike) => (
            <div key={strike.strike} className="rounded-lg bg-[var(--section-bg)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-[var(--text-primary)]">
                    {formatPrice(strike.strike)}
                  </div>
                  <div className="text-[11px] font-bold text-[var(--text-tertiary)]">
                    Total {strike.total_oi.toLocaleString("zh-CN")}
                  </div>
                </div>
                <div className="text-right text-xs font-black text-[var(--text-secondary)]">
                  <div>C {strike.call_oi.toLocaleString("zh-CN")}</div>
                  <div>P {strike.put_oi.toLocaleString("zh-CN")}</div>
                </div>
              </div>
            </div>
          ))}
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
