"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface RangeLabel {
  label?: string;
  lower?: number;
  upper?: number;
}

interface Constraint {
  label: string;
  max_exposure: number;
  tone: ColorKey;
  detail: string;
}

interface TriggerLine {
  label?: string;
  value?: number;
  distance_label?: string;
  state?: string;
  state_color?: ColorKey;
}

interface TicketOrder {
  key: string;
  label: string;
  color: ColorKey;
  size: string;
  trigger: string;
  action: string;
  status: "enabled" | "waiting" | "locked" | "blocked" | "armed";
}

interface ExecutionTicketPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  ticket_type: string;
  bias: string;
  summary: string;
  index: number;
  readiness_score: number;
  hard_cap: number;
  max_single_tranche: number;
  initial_tranche: number;
  target_exposure: RangeLabel;
  binding_constraint: Constraint;
  nearest_down: TriggerLine | null;
  nearest_up: TriggerLine | null;
  orders: TicketOrder[];
  guardrails: string[];
  allowed_actions: string[];
  blocked_actions: string[];
  next_confirmations: string[];
  risk_control: string;
  hedge_note: string;
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
  enabled: { label: "Enabled", icon: "play-circle", tone: "green" as ColorKey },
  waiting: { label: "Waiting", icon: "clock", tone: "blue" as ColorKey },
  locked: { label: "Locked", icon: "lock", tone: "amber" as ColorKey },
  blocked: { label: "Blocked", icon: "ban", tone: "red" as ColorKey },
  armed: { label: "Armed", icon: "shield-alert", tone: "red" as ColorKey },
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

export const NDXExecutionTicketPanel = () => {
  const [payload, setPayload] = useState<ExecutionTicketPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchTicket = async () => {
      try {
        const response = await fetch("/api/risk/execution-ticket");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as ExecutionTicketPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX execution ticket:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchTicket();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pending && !payload) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 h-5 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-8 text-center text-[var(--text-tertiary)]">
        <Icon name="file-check-2" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">执行票据正在初始化...</p>
      </div>
    );
  }

  const headlineTone = colorMap[payload.headline_color] ?? colorMap.blue;
  const bindingTone = colorMap[payload.binding_constraint?.tone ?? "amber"] ?? colorMap.amber;

  return (
    <div className="space-y-4">
      <div className={cn("rounded-lg border p-5 shadow-sm", headlineTone.soft, headlineTone.border)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[240px_1fr_310px] xl:items-center">
          <div>
            <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">
              Execution Ticket
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              {payload.ticket_type} · {payload.bias}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            {payload.summary}
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="NDX" value={formatIndex(payload.index, 2)} />
            <MiniMetric label="Readiness" value={payload.readiness_score.toFixed(1)} />
            <MiniMetric label="Hard Cap" value={`${payload.hard_cap.toFixed(1)}%`} />
            <MiniMetric label="Tranche" value={`${payload.max_single_tranche.toFixed(1)}%`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="clipboard-check" size={16} className="text-[var(--accent-color)]" />
              订单执行序列
            </div>
            <div className="text-xs font-semibold text-[var(--text-tertiary)]">
              更新 {formatDateTime(payload.as_of)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            {payload.orders.map((order) => (
              <OrderCard key={order.key} order={order} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className={cn("rounded-lg border p-4 shadow-sm", bindingTone.soft, bindingTone.border)}>
            <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">Binding Constraint</div>
            <div className={cn("mt-1 text-xl font-black", bindingTone.text)}>
              {payload.binding_constraint?.label ?? "--"}
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              上限 {payload.binding_constraint?.max_exposure?.toFixed(1) ?? "--"}%
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
              <Icon name="milestone" size={16} className="text-[var(--accent-color)]" />
              最近触发线
            </div>
            <LineMetric label="下行" line={payload.nearest_down} tone="amber" />
            <LineMetric label="上行" line={payload.nearest_up} tone="blue" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActionList title="风控护栏" icon="shield-check" tone="blue" items={payload.guardrails} />
        <ActionList title="允许动作" icon="check-check" tone="green" items={payload.allowed_actions} />
        <ActionList title="禁止动作" icon="ban" tone="red" items={payload.blocked_actions} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="flag" size={16} className="text-[var(--accent-color)]" />
            下一确认条件
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {payload.next_confirmations.map((item) => (
              <div key={item} className="flex gap-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">
                <Icon name="circle-dot" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="shield-alert" size={16} className="text-[var(--warning-color)]" />
            风险控制
          </div>
          <p className="mb-2 text-sm font-semibold leading-6 text-[var(--text-primary)]">{payload.risk_control}</p>
          <p className="mb-0 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{payload.hedge_note}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
        {payload.methodology}
      </div>
    </div>
  );
};

const MiniMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 shadow-sm">
    <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{label}</div>
    <div className="mt-1 text-sm font-black leading-tight text-[var(--text-primary)]">{value}</div>
  </div>
);

const OrderCard = ({ order }: { order: TicketOrder }) => {
  const tone = colorMap[order.color] ?? colorMap.blue;
  const status = statusMap[order.status] ?? statusMap.waiting;
  const statusTone = colorMap[status.tone];
  return (
    <article className={cn("rounded-lg border p-4 shadow-sm", tone.soft, tone.border)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{order.label}</div>
          <div className={cn("mt-1 text-2xl font-black", tone.text)}>{order.size}</div>
        </div>
        <span className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-black", statusTone.soft, statusTone.text)}>
          <Icon name={status.icon} size={13} />
          {status.label}
        </span>
      </div>
      <p className="mb-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{order.trigger}</p>
      <p className="mb-0 text-sm font-bold leading-6 text-[var(--text-primary)]">{order.action}</p>
    </article>
  );
};

const LineMetric = ({ label, line, tone }: { label: string; line: TriggerLine | null; tone: ColorKey }) => {
  const color = colorMap[line?.state_color ?? tone] ?? colorMap[tone];
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2">
      <span className="text-xs font-black uppercase text-[var(--text-tertiary)]">{label} {line?.label ?? "--"}</span>
      <span className={cn("text-sm font-black", color.text)}>
        {formatIndex(line?.value)} · {line?.distance_label ?? "--"}
      </span>
    </div>
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
