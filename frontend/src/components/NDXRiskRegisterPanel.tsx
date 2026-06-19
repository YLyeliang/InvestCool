"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface RiskItem {
  key: string;
  category: string;
  title: string;
  severity: string;
  color: ColorKey;
  probability: number;
  impact: number;
  score: number;
  trigger: string;
  evidence: string;
  mitigation: string;
  owner: string;
  status: "open" | "watch" | string;
  horizon: string;
  priority: number;
}

interface HeatmapBucket {
  key: string;
  label: string;
  color: ColorKey;
  count: number;
}

interface RiskRegisterPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  register_score: number;
  open_count: number;
  critical_count: number;
  watch_count: number;
  top_risk: RiskItem | null;
  risks: RiskItem[];
  heatmap: HeatmapBucket[];
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

const statusMap = {
  open: { label: "Open", icon: "circle-alert", tone: "red" as ColorKey },
  watch: { label: "Watch", icon: "eye", tone: "amber" as ColorKey },
  closed: { label: "Closed", icon: "circle-check", tone: "green" as ColorKey },
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const NDXRiskRegisterPanel = () => {
  const [payload, setPayload] = useState<RiskRegisterPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchRegister = async () => {
      try {
        const response = await fetch("/api/risk/risk-register");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as RiskRegisterPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX risk register:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchRegister();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="shield-alert" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">风险登记簿正在初始化...</p>
      </div>
    );
  }

  const headlineTone = colorMap[payload.headline_color] ?? colorMap.blue;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", headlineTone.soft, headlineTone.border)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_300px] xl:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Risk Register
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              Score {payload.register_score.toFixed(1)} · 更新 {formatDateTime(payload.as_of)}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.top_risk
              ? `${payload.top_risk.title} 是当前首要登记风险；先处理触发条件和缓释动作，再决定是否提升执行权限。`
              : "当前没有需要登记的主要风险项。"}
          </p>

          <div className="grid grid-cols-3 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="Critical" value={String(payload.critical_count)} tone="red" />
            <MiniMetric label="Open" value={String(payload.open_count)} tone="amber" />
            <MiniMetric label="Watch" value={String(payload.watch_count)} tone="blue" />
          </div>
        </div>
      </div>

      {payload.top_risk ? <TopRiskCard risk={payload.top_risk} /> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="list-checks" size={16} className="text-[var(--accent-color)]" />
              登记风险清单
            </div>
            <div className="text-xs font-semibold text-[var(--text-tertiary)]">
              按优先级排序
            </div>
          </div>

          <div className="space-y-3">
            {payload.risks.map((risk) => (
              <RiskRow key={risk.key} risk={risk} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="grid-3x3" size={16} className="text-[var(--accent-color)]" />
              概率 / 影响热区
            </div>
            <div className="grid grid-cols-2 gap-3">
              {payload.heatmap.map((bucket) => {
                const tone = colorMap[bucket.color] ?? colorMap.blue;
                return (
                  <div key={bucket.key} className={cn("rounded-lg border p-3", tone.soft, tone.border)}>
                    <div className={cn("text-2xl font-black", tone.text)}>{bucket.count}</div>
                    <div className="mt-1 text-xs font-black text-[var(--text-primary)]">{bucket.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="shield-check" size={16} className="text-[var(--accent-color)]" />
              控制项
            </div>
            <div className="space-y-2">
              {payload.controls.map((item) => (
                <div key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">
                  <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        {payload.methodology}
      </div>
    </div>
  );
};

const MiniMetric = ({ label, value, tone }: { label: string; value: string; tone: ColorKey }) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-xl font-black leading-tight", color.text)}>{value}</div>
    </div>
  );
};

const TopRiskCard = ({ risk }: { risk: RiskItem }) => {
  const tone = colorMap[risk.color] ?? colorMap.blue;
  const status = statusMap[risk.status as keyof typeof statusMap] ?? statusMap.watch;
  const statusTone = colorMap[status.tone];

  return (
    <article className={cn("rounded-lg border p-5 shadow-sm", tone.soft, tone.border)}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[230px_1fr_250px] xl:items-start">
        <div>
          <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
            Top Risk · {risk.category}
          </div>
          <h4 className={cn("m-0 text-2xl font-black leading-tight", tone.text)}>{risk.title}</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-black", statusTone.soft, statusTone.text)}>
              <Icon name={status.icon} size={13} />
              {status.label}
            </span>
            <span className="rounded-md bg-[var(--card-bg)] px-2 py-1 text-[11px] font-black text-[var(--text-secondary)]">
              {risk.horizon}
            </span>
          </div>
        </div>

        <div>
          <p className="m-0 text-sm font-bold leading-6 text-[var(--text-primary)]">{risk.evidence}</p>
          <p className="mb-0 mt-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">{risk.mitigation}</p>
        </div>

        <div className="space-y-3">
          <RiskBar label="概率" value={risk.probability} tone={risk.color} />
          <RiskBar label="影响" value={risk.impact} tone={risk.color} />
          <div className="text-xs font-black uppercase text-[var(--text-tertiary)]">
            Owner <span className="text-[var(--text-primary)]">{risk.owner}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

const RiskRow = ({ risk }: { risk: RiskItem }) => {
  const tone = colorMap[risk.color] ?? colorMap.blue;
  const status = statusMap[risk.status as keyof typeof statusMap] ?? statusMap.watch;
  const statusTone = colorMap[status.tone];

  return (
    <article className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_220px] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-md px-2 py-1 text-[11px] font-black", tone.soft, tone.text)}>
              {risk.severity}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-black", statusTone.soft, statusTone.text)}>
              <Icon name={status.icon} size={13} />
              {status.label}
            </span>
          </div>
          <h4 className="mb-1 mt-3 text-base font-black leading-tight text-[var(--text-primary)]">{risk.title}</h4>
          <div className="text-xs font-bold text-[var(--text-tertiary)]">
            {risk.category} · {risk.owner} · {risk.horizon}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
            触发条件：{risk.trigger}
          </div>
          <p className="mb-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">{risk.evidence}</p>
          <p className="mb-0 text-sm font-bold leading-6 text-[var(--text-primary)]">{risk.mitigation}</p>
        </div>

        <div className="space-y-2">
          <RiskBar label="概率" value={risk.probability} tone={risk.color} />
          <RiskBar label="影响" value={risk.impact} tone={risk.color} />
          <div className="flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            <span>Score</span>
            <span className={tone.text}>{risk.score.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

const RiskBar = ({ label, value, tone }: { label: string; value: number; tone: ColorKey }) => {
  const color = colorMap[tone] ?? colorMap.blue;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--card-bg)]">
        <div
          className={cn("h-full rounded-full", color.bg)}
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
};
