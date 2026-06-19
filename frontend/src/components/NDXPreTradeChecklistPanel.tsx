"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";
type GateStatus = "pass" | "watch" | "fail";

interface RangeLabel {
  label?: string;
  lower?: number;
  upper?: number;
}

interface ChecklistGate {
  key: string;
  group: string;
  label: string;
  status: GateStatus;
  color: ColorKey;
  value: string;
  evidence: string;
  action: string;
  priority: number;
}

interface PreTradeChecklistPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  verdict: string;
  readiness_score: number;
  index: number;
  pass_count: number;
  watch_count: number;
  fail_count: number;
  posture: string;
  target_exposure: RangeLabel;
  cash_buffer_min: number;
  hedge_coverage: RangeLabel;
  gates: ChecklistGate[];
  allowed_actions: string[];
  blocked_actions: string[];
  next_confirmations: string[];
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

const statusMeta: Record<GateStatus, { label: string; icon: string }> = {
  pass: { label: "Pass", icon: "check-circle-2" },
  watch: { label: "Watch", icon: "circle-alert" },
  fail: { label: "Fail", icon: "x-circle" },
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

const formatIndex = (value?: number | null, digits = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: digits });
};

export const NDXPreTradeChecklistPanel = () => {
  const [payload, setPayload] = useState<PreTradeChecklistPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchChecklist = async () => {
      try {
        const response = await fetch("/api/risk/pre-trade-checklist");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as PreTradeChecklistPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX pre-trade checklist:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchChecklist();

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
            <div key={index} className="h-36 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="clipboard-check" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">投前检查清单正在初始化...</p>
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
              Pre-Trade Checklist
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              Readiness {payload.readiness_score.toFixed(1)} · {payload.posture}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.verdict}
          </p>

          <div className="grid grid-cols-3 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <ScoreBox label="Pass" value={payload.pass_count} tone="green" />
            <ScoreBox label="Watch" value={payload.watch_count} tone="amber" />
            <ScoreBox label="Fail" value={payload.fail_count} tone="red" />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            <span>执行通过度</span>
            <span>更新 {formatDateTime(payload.as_of)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--card-bg)]/80">
            <div
              className={cn("h-full rounded-full", headlineTone.bg)}
              style={{ width: `${Math.max(4, Math.min(100, payload.readiness_score))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MiniMetric label="NDX" value={formatIndex(payload.index, 2)} detail="当前检查基准" />
        <MiniMetric label="目标暴露" value={payload.target_exposure?.label ?? "--"} detail="Playbook target" />
        <MiniMetric label="现金/保护" value={`${payload.cash_buffer_min.toFixed(0)}%+ / ${payload.hedge_coverage?.label ?? "--"}`} detail="组合约束" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {payload.gates.map((gate) => (
          <GateCard key={gate.key} gate={gate} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActionList title="允许动作" icon="check-check" tone="green" items={payload.allowed_actions} />
        <ActionList title="禁止动作" icon="ban" tone="red" items={payload.blocked_actions} />
        <ActionList title="下一确认" icon="flag" tone="blue" items={payload.next_confirmations} />
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        {payload.methodology}
      </div>
    </div>
  );
};

const ScoreBox = ({ label, value, tone }: { label: string; value: number; tone: ColorKey }) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-center shadow-sm">
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-1 text-xl font-black leading-tight", color.text)}>{value}</div>
    </div>
  );
};

const MiniMetric = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
    <div className="mt-1 text-lg font-black leading-tight text-[var(--text-primary)]">{value}</div>
    <div className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{detail}</div>
  </div>
);

const GateCard = ({ gate }: { gate: ChecklistGate }) => {
  const color = colorMap[gate.color] ?? colorMap.blue;
  const meta = statusMeta[gate.status];
  return (
    <article className={cn("rounded-lg border p-4 shadow-sm", color.soft, color.border)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
            {gate.group}
          </div>
          <h4 className={cn("mt-1 text-lg font-black leading-tight", color.text)}>
            {gate.label}
          </h4>
        </div>
        <span className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-black", color.soft, color.text)}>
          <Icon name={meta.icon} size={13} />
          {meta.label}
        </span>
      </div>

      <div className="mb-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2">
        <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Value</div>
        <div className={cn("mt-1 text-lg font-black", color.text)}>{gate.value}</div>
      </div>

      <p className="mb-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        {gate.evidence}
      </p>
      <p className="mb-0 text-sm font-bold leading-6 text-[var(--text-primary)]">
        {gate.action}
      </p>
    </article>
  );
};

const ActionList = ({
  title,
  icon,
  tone,
  items,
}: {
  title: string;
  icon: string;
  tone: ColorKey;
  items: string[];
}) => {
  const color = colorMap[tone];
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
        <Icon name={icon} size={16} className={color.text} />
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">
            <Icon name="circle-dot" size={15} className={cn("mt-1 shrink-0", color.text)} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
