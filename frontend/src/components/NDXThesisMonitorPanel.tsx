"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface ThesisRow {
  key: string;
  title: string;
  color: ColorKey;
  probability: number;
  score: number;
  evidence: string;
  risk: string;
  action: string;
  trigger: string;
}

interface EvidenceItem {
  label: string;
  color: ColorKey;
  value: string;
  detail: string;
}

interface DecisionGate {
  label: string;
  color: ColorKey;
  trigger: string;
  action: string;
}

interface ThesisMonitorPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  primary_thesis: string;
  conviction_score: number;
  regime: string;
  playbook_posture: string;
  risk_reward: number;
  expected_move: number;
  register_score: number;
  net_pressure: number;
  theses: ThesisRow[];
  supports: EvidenceItem[];
  contradictions: EvidenceItem[];
  catalysts: EvidenceItem[];
  decision_gates: DecisionGate[];
  watchlist: string[];
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

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSigned = (value?: number | null, digits = 1) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
};

export const NDXThesisMonitorPanel = () => {
  const [payload, setPayload] = useState<ThesisMonitorPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchThesis = async () => {
      try {
        const response = await fetch("/api/risk/thesis-monitor");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as ThesisMonitorPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX thesis monitor:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchThesis();

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
        <Icon name="book-open-check" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">投资论点监控正在初始化...</p>
      </div>
    );
  }

  const headlineTone = colorMap[payload.headline_color] ?? colorMap.blue;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", headlineTone.soft, headlineTone.border)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_320px] xl:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Investment Thesis
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              {payload.primary_thesis} · 更新 {formatDateTime(payload.as_of)}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            当前主论点是 {payload.primary_thesis}，需要同时跟踪风险回报、风险登记和触发线是否支持升级或降档。
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="Conviction" value={payload.conviction_score.toFixed(1)} tone={payload.headline_color} />
            <MiniMetric label="R/R" value={payload.risk_reward.toFixed(2)} tone="blue" />
            <MiniMetric label="Net Pressure" value={formatSigned(payload.net_pressure)} tone={payload.net_pressure > 7 ? "amber" : "blue"} />
            <MiniMetric label="Risk Register" value={payload.register_score.toFixed(1)} tone={payload.register_score >= 58 ? "red" : "amber"} />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            <span>论点置信度</span>
            <span>{payload.regime} · {payload.playbook_posture}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--card-bg)]/80">
            <div
              className={cn("h-full rounded-full", headlineTone.bg)}
              style={{ width: `${Math.max(4, Math.min(100, payload.conviction_score))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {payload.theses.map((thesis) => (
          <ThesisCard key={thesis.key} thesis={thesis} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <EvidencePanel title="支持论点" icon="badge-check" items={payload.supports} />
        <EvidencePanel title="反证与压力" icon="triangle-alert" items={payload.contradictions} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="git-branch" size={16} className="text-[var(--accent-color)]" />
            改变论点的门槛
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {payload.decision_gates.map((gate) => (
              <DecisionCard key={gate.label} gate={gate} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="calendar-clock" size={16} className="text-[var(--accent-color)]" />
            催化与观察项
          </div>
          <div className="space-y-3">
            {payload.catalysts.map((item) => (
              <CompactEvidence key={`${item.label}-${item.value}`} item={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <Icon name="list-checks" size={16} className="text-[var(--accent-color)]" />
          投委会 Watchlist
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {payload.watchlist.map((item) => (
            <div key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">
              <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        {payload.methodology}
      </div>
    </div>
  );
};

const MiniMetric = ({ label, value, tone }: { label: string; value: string; tone: ColorKey }) => {
  const color = colorMap[tone] ?? colorMap.blue;
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-sm font-black leading-tight", color.text)}>{value}</div>
    </div>
  );
};

const ThesisCard = ({ thesis }: { thesis: ThesisRow }) => {
  const tone = colorMap[thesis.color] ?? colorMap.blue;
  return (
    <article className={cn("rounded-lg border p-5 shadow-sm", tone.soft, tone.border)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            {thesis.key} Thesis
          </div>
          <h4 className={cn("m-0 mt-1 text-xl font-black leading-tight", tone.text)}>{thesis.title}</h4>
        </div>
        <div className="text-right">
          <div className={cn("text-2xl font-black leading-none", tone.text)}>{thesis.probability.toFixed(1)}%</div>
          <div className="mt-1 text-[11px] font-black uppercase text-[var(--text-tertiary)]">Probability</div>
        </div>
      </div>

      <RiskBar label="Thesis Score" value={thesis.score} tone={thesis.color} />
      <p className="mb-2 mt-4 text-sm font-semibold leading-6 text-[var(--text-secondary)]">{thesis.evidence}</p>
      <p className="mb-2 text-xs font-bold leading-5 text-[var(--text-tertiary)]">{thesis.risk}</p>
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3">
        <div className="mb-1 text-[11px] font-black uppercase text-[var(--text-tertiary)]">{thesis.trigger}</div>
        <div className="text-sm font-bold leading-6 text-[var(--text-primary)]">{thesis.action}</div>
      </div>
    </article>
  );
};

const EvidencePanel = ({ title, icon, items }: { title: string; icon: string; items: EvidenceItem[] }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
    <div className="mb-4 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
      <Icon name={icon} size={16} className="text-[var(--accent-color)]" />
      {title}
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item) => (
        <CompactEvidence key={`${item.label}-${item.value}`} item={item} />
      ))}
    </div>
  </div>
);

const CompactEvidence = ({ item }: { item: EvidenceItem }) => {
  const tone = colorMap[item.color] ?? colorMap.blue;
  return (
    <div className={cn("rounded-lg border p-3", tone.soft, tone.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{item.label}</div>
          <div className={cn("mt-1 text-sm font-black leading-tight", tone.text)}>{item.value}</div>
        </div>
      </div>
      <p className="mb-0 mt-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{item.detail}</p>
    </div>
  );
};

const DecisionCard = ({ gate }: { gate: DecisionGate }) => {
  const tone = colorMap[gate.color] ?? colorMap.blue;
  return (
    <article className={cn("rounded-lg border p-4", tone.soft, tone.border)}>
      <div className={cn("mb-2 text-base font-black leading-tight", tone.text)}>{gate.label}</div>
      <p className="mb-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{gate.trigger}</p>
      <p className="mb-0 text-sm font-bold leading-6 text-[var(--text-primary)]">{gate.action}</p>
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
