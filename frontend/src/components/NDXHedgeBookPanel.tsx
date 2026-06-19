"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface HedgeStructure {
  key: string;
  name: string;
  color: ColorKey;
  score: number;
  protection: number;
  cost: number;
  complexity: number;
  horizon: string;
  construction: string;
  use_when: string;
  avoid_when: string;
  trigger: string;
  effect: string;
}

interface ContextItem {
  label: string;
  color: ColorKey;
  value: string;
  detail: string;
}

interface TriggerItem {
  label: string;
  color: ColorKey;
  value: string;
  action: string;
}

interface HedgeBookPayload {
  as_of: string;
  headline: string;
  headline_color: ColorKey;
  posture: string;
  proxy_symbol: string;
  proxy_price: number;
  expiration: string;
  days_to_expiration: number;
  hedge_score: number;
  register_score: number;
  skew_score: number;
  gamma_score: number;
  premium_score: number;
  term_score: number;
  implied_move: number;
  stress_downside: number;
  protection_lower: number;
  protection_upper: number;
  recommended: HedgeStructure | null;
  structures: HedgeStructure[];
  market_context: ContextItem[];
  trigger_map: TriggerItem[];
  guardrails: string[];
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

const formatPrice = (value?: number | null, digits = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: digits });
};

export const NDXHedgeBookPanel = () => {
  const [payload, setPayload] = useState<HedgeBookPayload | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchHedgeBook = async () => {
      try {
        const response = await fetch("/api/risk/hedge-book");
        const data = await response.json();
        if (!cancelled && response.ok && !data.error) {
          setPayload(data as HedgeBookPayload);
        }
      } catch (error) {
        console.error("Failed to fetch NDX hedge book:", error);
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void fetchHedgeBook();

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
        <Icon name="shield-plus" size={30} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold">对冲方案簿正在初始化...</p>
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
              Hedge Book
            </div>
            <div className={cn("text-3xl font-black leading-none", headlineTone.text)}>
              {payload.headline}
            </div>
            <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
              {payload.posture} · 更新 {formatDateTime(payload.as_of)}
            </div>
          </div>

          <p className="m-0 text-base font-bold leading-7 text-[var(--text-primary)]">
            推荐方案：{payload.recommended?.name ?? "--"}。保护覆盖目标 {payload.protection_lower.toFixed(0)}-{payload.protection_upper.toFixed(0)}%，用成本、复杂度和触发条件约束执行。
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <MiniMetric label="Hedge" value={payload.hedge_score.toFixed(1)} tone="blue" />
            <MiniMetric label="Register" value={payload.register_score.toFixed(1)} tone={payload.register_score >= 58 ? "red" : "amber"} />
            <MiniMetric label="Skew" value={payload.skew_score.toFixed(1)} tone={payload.skew_score >= 85 ? "red" : "amber"} />
            <MiniMetric label="Gamma" value={payload.gamma_score.toFixed(1)} tone={payload.gamma_score >= 65 ? "amber" : "blue"} />
          </div>
        </div>
      </div>

      {payload.recommended ? <RecommendedCard structure={payload.recommended} payload={payload} /> : null}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        {payload.structures.map((structure) => (
          <StructureCard key={structure.key} structure={structure} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="radar" size={16} className="text-[var(--accent-color)]" />
            市场上下文
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {payload.market_context.map((item) => (
              <ContextCard key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
            <Icon name="crosshair" size={16} className="text-[var(--accent-color)]" />
            保护触发位
          </div>
          <div className="space-y-3">
            {payload.trigger_map.map((item) => (
              <TriggerCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <Icon name="shield-check" size={16} className="text-[var(--accent-color)]" />
          对冲护栏
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {payload.guardrails.map((item) => (
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

const RecommendedCard = ({ structure, payload }: { structure: HedgeStructure; payload: HedgeBookPayload }) => {
  const tone = colorMap[structure.color] ?? colorMap.blue;
  return (
    <article className={cn("rounded-lg border p-5 shadow-sm", tone.soft, tone.border)}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[240px_1fr_280px] xl:items-start">
        <div>
          <div className="mb-1 text-xs font-black uppercase text-[var(--text-tertiary)]">Recommended Structure</div>
          <h4 className={cn("m-0 text-2xl font-black leading-tight", tone.text)}>{structure.name}</h4>
          <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">
            {payload.proxy_symbol} {formatPrice(payload.proxy_price)} · {payload.expiration ?? "--"} · {payload.days_to_expiration ?? "--"}D
          </div>
        </div>
        <div>
          <p className="m-0 text-sm font-bold leading-6 text-[var(--text-primary)]">{structure.construction}</p>
          <p className="mb-0 mt-2 text-sm font-semibold leading-6 text-[var(--text-secondary)]">{structure.effect}</p>
        </div>
        <div className="space-y-3">
          <Bar label="保护力" value={structure.protection} tone={structure.color} />
          <Bar label="成本压力" value={structure.cost} tone={structure.cost >= 55 ? "red" : "amber"} />
          <Bar label="复杂度" value={structure.complexity} tone={structure.complexity >= 55 ? "amber" : "blue"} />
        </div>
      </div>
    </article>
  );
};

const StructureCard = ({ structure }: { structure: HedgeStructure }) => {
  const tone = colorMap[structure.color] ?? colorMap.blue;
  return (
    <article className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{structure.horizon}</div>
          <h4 className={cn("m-0 mt-1 text-base font-black leading-tight", tone.text)}>{structure.name}</h4>
        </div>
        <div className={cn("text-xl font-black leading-none", tone.text)}>{structure.score.toFixed(1)}</div>
      </div>
      <Bar label="保护力" value={structure.protection} tone={structure.color} />
      <div className="mt-3 space-y-2">
        <p className="mb-0 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{structure.use_when}</p>
        <p className="mb-0 text-xs font-bold leading-5 text-[var(--text-tertiary)]">{structure.avoid_when}</p>
      </div>
      <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-3">
        <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{structure.trigger}</div>
        <div className="mt-1 text-xs font-bold leading-5 text-[var(--text-primary)]">{structure.construction}</div>
      </div>
    </article>
  );
};

const ContextCard = ({ item }: { item: ContextItem }) => {
  const tone = colorMap[item.color] ?? colorMap.blue;
  return (
    <div className={cn("rounded-lg border p-3", tone.soft, tone.border)}>
      <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{item.label}</div>
      <div className={cn("mt-1 text-sm font-black leading-tight", tone.text)}>{item.value}</div>
      <p className="mb-0 mt-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{item.detail}</p>
    </div>
  );
};

const TriggerCard = ({ item }: { item: TriggerItem }) => {
  const tone = colorMap[item.color] ?? colorMap.blue;
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">{item.label}</div>
        <div className={cn("text-sm font-black", tone.text)}>{item.value}</div>
      </div>
      <p className="mb-0 mt-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">{item.action}</p>
    </div>
  );
};

const Bar = ({ label, value, tone }: { label: string; value: number; tone: ColorKey }) => {
  const color = colorMap[tone] ?? colorMap.blue;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] font-black uppercase text-[var(--text-tertiary)]">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--section-bg)]">
        <div
          className={cn("h-full rounded-full", color.bg)}
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
};
