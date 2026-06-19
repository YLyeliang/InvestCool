"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ProfileNode {
  price: number;
  low: number;
  high: number;
  volume: number;
  volume_share: number;
  relative_volume: number;
  in_value_area: boolean;
}

interface SessionProfile {
  date: string;
  close: number;
  return: number;
  poc: number;
  value_area_low: number;
  value_area_high: number;
  volume: number;
}

interface VolumeProfilePayload {
  as_of: string;
  proxy_symbol: string;
  session_date: string;
  last_bar_time: string;
  last_price: number;
  open: number;
  session_return: number;
  session_low: number;
  session_high: number;
  session_vwap: number;
  profile_score: number;
  regime: string;
  regime_color: ColorKey;
  summary: string;
  poc: number;
  value_area_low: number;
  value_area_high: number;
  value_area_volume_pct: number;
  value_area_width_pct: number;
  distance_to_poc: number;
  distance_to_value_low: number;
  distance_to_value_high: number;
  total_volume: number;
  session_poc: number;
  session_value_area_low: number;
  session_value_area_high: number;
  nearest_node: ProfileNode;
  high_volume_nodes: ProfileNode[];
  low_volume_gaps: ProfileNode[];
  nodes: ProfileNode[];
  sessions: SessionProfile[];
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

const formatVolume = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString("zh-CN");
};

export const NDXVolumeProfilePanel = () => {
  const [payload, setPayload] = useState<VolumeProfilePayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchProfile = async (attempt = 0) => {
      if (attempt === 0) setPending(true);
      try {
        const response = await fetch("/api/risk/volume-profile");
        const data = await response.json();
        if (cancelled) return;
        if (response.ok && !data.error) {
          setPayload(data);
          setPending(false);
          return;
        }
        if (attempt < 4) {
          retryTimer = setTimeout(() => void fetchProfile(attempt + 1), 4000);
          return;
        }
        setPayload(null);
      } catch (error) {
        console.error("Failed to fetch NDX volume profile:", error);
        if (!cancelled && attempt < 4) {
          retryTimer = setTimeout(() => void fetchProfile(attempt + 1), 4000);
          return;
        }
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled && attempt >= 4) setPending(false);
      }
    };

    void fetchProfile();

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
            <div key={index} className="h-32 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="bar-chart-3" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">成交量价格分布正在初始化...</p>
      </div>
    );
  }

  const regimeColor = colorMap[payload.regime_color] ?? colorMap.blue;
  const scoreWidth = `${Math.max(4, Math.min(100, payload.profile_score))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", regimeColor.soft, regimeColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_230px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Volume Profile
            </div>
            <div className={cn("text-3xl font-black leading-none", regimeColor.text)}>
              {payload.regime}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Score {payload.profile_score.toFixed(1)}
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

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)] lg:text-right">
            <div className="lg:col-span-2">{payload.proxy_symbol} {formatPrice(payload.last_price)}</div>
            <div>POC {formatPrice(payload.poc)}</div>
            <div>VWAP {formatPrice(payload.session_vwap)}</div>
            <div>VAL {formatPrice(payload.value_area_low)}</div>
            <div>VAH {formatPrice(payload.value_area_high)}</div>
            <div className="col-span-2 text-xs text-[var(--text-tertiary)]">
              更新 {formatDateTime(payload.last_bar_time)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-2">
            <span>成交分布压力</span>
            <span>{payload.profile_score.toFixed(1)}/100 · 价值区 {payload.value_area_volume_pct.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-bg)]/75 overflow-hidden">
            <div className={cn("h-full rounded-full", regimeColor.bg)} style={{ width: scoreWidth }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric label="距 POC" value={formatSigned(payload.distance_to_poc, "%")} tone={Math.abs(payload.distance_to_poc) <= 0.35 ? "blue" : "amber"} />
        <Metric label="距 VAL" value={formatSigned(payload.distance_to_value_low, "%")} tone={payload.distance_to_value_low >= 0 ? "green" : "red"} />
        <Metric label="距 VAH" value={formatSigned(payload.distance_to_value_high, "%")} tone={payload.distance_to_value_high >= 0 ? "green" : "blue"} />
        <Metric label="价值区宽度" value={`${payload.value_area_width_pct.toFixed(2)}%`} tone="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-black text-[var(--text-primary)]">5日成交量价格分布</h4>
            <span className="text-xs font-black text-[var(--text-tertiary)]">Total {formatVolume(payload.total_volume)}</span>
          </div>

          <div className="space-y-2">
            {payload.nodes.map((node) => {
              const isPoc = Math.abs(node.price - payload.poc) < 0.01;
              const width = `${Math.max(4, Math.min(100, node.relative_volume))}%`;
              const tone = isPoc ? colorMap.amber : node.in_value_area ? colorMap.blue : colorMap.green;
              return (
                <div key={node.price} className="grid grid-cols-[82px_1fr_76px] md:grid-cols-[96px_1fr_86px_92px] gap-3 items-center rounded-lg bg-[var(--section-bg)] p-3">
                  <div>
                    <div className={cn("text-sm font-black", isPoc ? tone.text : "text-[var(--text-primary)]")}>
                      {formatPrice(node.price)}
                    </div>
                    <div className="text-[11px] font-bold text-[var(--text-tertiary)]">
                      {node.in_value_area ? "Value" : "Edge"}
                    </div>
                  </div>
                  <div>
                    <div className="h-2 rounded-full bg-[var(--card-bg)] overflow-hidden">
                      <div className={cn("h-full rounded-full", tone.bg)} style={{ width }} />
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--text-tertiary)]">
                      {formatPrice(node.low)} - {formatPrice(node.high)}
                    </div>
                  </div>
                  <div className="text-right text-sm font-black text-[var(--text-primary)]">
                    {node.volume_share.toFixed(1)}%
                  </div>
                  <div className="hidden md:block text-right text-xs font-bold text-[var(--text-tertiary)]">
                    {formatVolume(node.volume)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">执行提示</h4>
            <div className="space-y-2">
              {payload.controls.map((control) => (
                <div key={control} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                  <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                  <span>{control}</span>
                </div>
              ))}
            </div>
          </div>

          <NodeList title="成交密集节点" nodes={payload.high_volume_nodes} />
          <NodeList title="附近低量区" nodes={payload.low_volume_gaps} />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">最近交易日价值区</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {payload.sessions.map((session) => (
            <div key={session.date} className="rounded-lg bg-[var(--section-bg)] p-3">
              <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{session.date.slice(5)}</div>
              <div className="mt-1 text-lg font-black text-[var(--text-primary)]">{formatPrice(session.close)}</div>
              <div className={cn("text-xs font-bold", session.return >= 0 ? "text-emerald-700" : "text-red-700")}>
                {formatSigned(session.return, "%")}
              </div>
              <div className="mt-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                POC {formatPrice(session.poc)}
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                {formatPrice(session.value_area_low)} - {formatPrice(session.value_area_high)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Metric = ({ label, value, tone }: { label: string; value: string; tone: ColorKey }) => {
  const toneClass = colorMap[tone]?.text ?? colorMap.blue.text;
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-xl font-black", toneClass)}>{value}</div>
    </div>
  );
};

const NodeList = ({ title, nodes }: { title: string; nodes: ProfileNode[] }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
    <h4 className="text-sm font-black text-[var(--text-primary)] mb-3">{title}</h4>
    <div className="space-y-2">
      {nodes.length === 0 ? (
        <div className="text-sm font-semibold text-[var(--text-tertiary)]">暂无显著节点</div>
      ) : nodes.map((node) => (
        <div key={`${title}-${node.price}`} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--section-bg)] p-3">
          <div>
            <div className="text-sm font-black text-[var(--text-primary)]">{formatPrice(node.price)}</div>
            <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{formatPrice(node.low)} - {formatPrice(node.high)}</div>
          </div>
          <div className="text-sm font-black text-blue-700">{node.volume_share.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  </div>
);
