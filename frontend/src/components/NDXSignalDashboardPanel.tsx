"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface LatestPayload {
  status: string;
  summary: string;
  index_position?: number | null;
  created_at: string;
}

interface DiagnosticsPayload {
  risk_score: number;
  risk_level: string;
  risk_color: ColorKey;
}

interface FactorPayload {
  pressure_score: number;
  pressure_label: string;
  main_headwind: string;
}

interface BreadthPayload {
  breadth_score: number;
  breadth_label: string;
  participation_gap_20d: number;
  equal_symbol: string;
}

interface LiquidityPayload {
  flow_score: number;
  regime: string;
  volume_ratio_20: number;
  flow_balance: number;
}

interface ValuationPayload {
  valuation_score: number;
  valuation_label: string;
  weighted_forward_pe: number | null;
  top_pressure_symbol: string;
}

interface OptionsPayload {
  regime: string;
  implied_move: number;
  put_call_oi_ratio: number;
  expiration: string;
}

interface TailPayload {
  tail_score: number;
  tail_label: string;
  var95: number;
  expected_shortfall_95: number;
}

interface ConcentrationPayload {
  concentration_level: string;
  top3_weight: number;
  top1_symbol: string;
}

interface DashboardData {
  latest: LatestPayload | null;
  diagnostics: DiagnosticsPayload | null;
  factors: FactorPayload | null;
  breadth: BreadthPayload | null;
  liquidity: LiquidityPayload | null;
  valuation: ValuationPayload | null;
  options: OptionsPayload | null;
  tail: TailPayload | null;
  concentration: ConcentrationPayload | null;
}

interface SignalTile {
  label: string;
  value: string;
  detail: string;
  color: ColorKey;
  icon: string;
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

const fetchJson = async <T,>(path: string): Promise<T | null> => {
  const response = await fetch(path);
  const payload = await response.json();
  return response.ok && !payload.error ? payload as T : null;
};

const scoreColor = (score: number, inverse = false): ColorKey => {
  if (inverse) {
    if (score >= 75) return "red";
    if (score >= 55) return "amber";
    if (score >= 35) return "blue";
    return "green";
  }

  if (score >= 70) return "green";
  if (score >= 45) return "blue";
  if (score >= 30) return "amber";
  return "red";
};

const labelColor = (label?: string): ColorKey => {
  if (!label) return "blue";
  if (label.includes("高") || label.includes("警戒") || label.includes("破位") || label.includes("走弱")) return "red";
  if (label.includes("偏") || label.includes("不足") || label.includes("窄幅") || label.includes("缩量")) return "amber";
  if (label.includes("舒适") || label.includes("确认") || label.includes("广泛") || label.includes("顺风")) return "green";
  return "blue";
};

const formatIndex = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSignedPct = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const NDXSignalDashboardPanel = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setPending(true);
      try {
        const [
          latest,
          diagnostics,
          factors,
          breadth,
          liquidity,
          valuation,
          options,
          tail,
          concentration,
        ] = await Promise.all([
          fetchJson<LatestPayload>("/api/risk/latest"),
          fetchJson<DiagnosticsPayload>("/api/risk/diagnostics"),
          fetchJson<FactorPayload>("/api/risk/factors"),
          fetchJson<BreadthPayload>("/api/risk/breadth"),
          fetchJson<LiquidityPayload>("/api/risk/liquidity"),
          fetchJson<ValuationPayload>("/api/risk/valuation"),
          fetchJson<OptionsPayload>("/api/risk/options"),
          fetchJson<TailPayload>("/api/risk/tail"),
          fetchJson<ConcentrationPayload>("/api/risk/concentration"),
        ]);

        setData({ latest, diagnostics, factors, breadth, liquidity, valuation, options, tail, concentration });
      } catch (e) {
        console.error("Failed to fetch NDX signal dashboard:", e);
        setData(null);
      } finally {
        setPending(false);
      }
    };

    void fetchDashboard();
  }, []);

  const dashboard = useMemo(() => {
    if (!data) return null;

    const riskScore = data.diagnostics?.risk_score ?? 50;
    const macroScore = data.factors?.pressure_score ?? 50;
    const tailScore = data.tail?.tail_score ?? 50;
    const valuationScore = data.valuation?.valuation_score ?? 50;
    const supportiveScores = [
      data.breadth?.breadth_score ?? 50,
      data.liquidity?.flow_score ?? 50,
    ];
    const pressureScores = [riskScore, macroScore, tailScore, valuationScore];
    const pressureAverage = pressureScores.reduce((sum, score) => sum + score, 0) / pressureScores.length;
    const supportAverage = supportiveScores.reduce((sum, score) => sum + score, 0) / supportiveScores.length;
    const commandScore = Math.max(0, Math.min(100, 50 + supportAverage * 0.35 - pressureAverage * 0.35));

    const posture = commandScore >= 65
      ? "风险可用"
      : commandScore >= 48
        ? "均衡观察"
        : commandScore >= 35
          ? "控制追高"
          : "防守优先";
    const postureColor = commandScore >= 65 ? "green" : commandScore >= 48 ? "blue" : commandScore >= 35 ? "amber" : "red";

    const tiles: SignalTile[] = [
      {
        label: "综合风险",
        value: data.diagnostics ? `${data.diagnostics.risk_score.toFixed(1)}` : "--",
        detail: data.diagnostics?.risk_level ?? "等待风险诊断",
        color: data.diagnostics ? data.diagnostics.risk_color : "blue",
        icon: "radar",
      },
      {
        label: "宏观压力",
        value: data.factors ? data.factors.pressure_label : "--",
        detail: data.factors ? `主因子 ${data.factors.main_headwind}` : "等待宏观因子",
        color: data.factors ? scoreColor(data.factors.pressure_score, true) : "blue",
        icon: "line-chart",
      },
      {
        label: "广度参与",
        value: data.breadth ? data.breadth.breadth_label : "--",
        detail: data.breadth ? `${data.breadth.equal_symbol} 差 ${formatSignedPct(data.breadth.participation_gap_20d)}` : "等待等权代理",
        color: data.breadth ? scoreColor(data.breadth.breadth_score) : "blue",
        icon: "network",
      },
      {
        label: "流动性",
        value: data.liquidity ? data.liquidity.regime : "--",
        detail: data.liquidity ? `量能 ${data.liquidity.volume_ratio_20.toFixed(2)}x · 平衡 ${formatSignedPct(data.liquidity.flow_balance)}` : "等待成交确认",
        color: data.liquidity ? scoreColor(data.liquidity.flow_score) : "blue",
        icon: "activity",
      },
      {
        label: "期权定价",
        value: data.options ? data.options.regime : "--",
        detail: data.options ? `隐含 ${data.options.implied_move.toFixed(2)}% · PCR ${data.options.put_call_oi_ratio.toFixed(2)}` : "等待期权链",
        color: data.options ? labelColor(data.options.regime) : "blue",
        icon: "badge-dollar-sign",
      },
      {
        label: "估值压力",
        value: data.valuation ? data.valuation.valuation_label : "--",
        detail: data.valuation ? `FPE ${data.valuation.weighted_forward_pe?.toFixed(1) ?? "--"}x · ${data.valuation.top_pressure_symbol}` : "等待基本面",
        color: data.valuation ? labelColor(data.valuation.valuation_label) : "blue",
        icon: "scale",
      },
      {
        label: "尾部风险",
        value: data.tail ? data.tail.tail_label : "--",
        detail: data.tail ? `VaR ${formatSignedPct(data.tail.var95)} · ES ${formatSignedPct(data.tail.expected_shortfall_95)}` : "等待损失分布",
        color: data.tail ? scoreColor(data.tail.tail_score, true) : "blue",
        icon: "waves",
      },
      {
        label: "集中度",
        value: data.concentration ? data.concentration.concentration_level : "--",
        detail: data.concentration ? `Top3 ${data.concentration.top3_weight.toFixed(1)}% · ${data.concentration.top1_symbol}` : "等待权重代理",
        color: data.concentration ? labelColor(data.concentration.concentration_level) : "blue",
        icon: "pie-chart",
      },
    ];

    const mainLine = data.latest?.summary
      ? data.latest.summary
      : "等待 NDX 风险引擎完成最新一轮聚合。";

    return { commandScore, posture, postureColor: postureColor as ColorKey, tiles, mainLine };
  }, [data]);

  if (pending && !dashboard) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-52 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="radar" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">机构信号总览正在初始化...</p>
      </div>
    );
  }

  const postureColor = colorMap[dashboard.postureColor];

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", postureColor.soft, postureColor.border)}>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              NDX Signal Dashboard
            </div>
            <div className={cn("text-3xl font-black leading-none", postureColor.text)}>
              {dashboard.posture}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              Command {dashboard.commandScore.toFixed(1)}
            </div>
          </div>

          <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
            {dashboard.mainLine}
          </p>

          <div className="text-sm font-semibold text-[var(--text-secondary)] lg:text-right">
            <div>NDX {formatIndex(data?.latest?.index_position)}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {formatDateTime(data?.latest?.created_at)}
            </div>
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
          <div className={cn("h-full rounded-full", postureColor.bg)} style={{ width: `${Math.max(4, dashboard.commandScore)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {dashboard.tiles.map((tile) => {
          const tileColor = colorMap[tile.color] ?? colorMap.blue;
          return (
            <div key={tile.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Icon name={tile.icon} size={15} className="text-[var(--accent-color)]" />
                  <div className="text-[11px] font-black uppercase text-[var(--text-tertiary)]">
                    {tile.label}
                  </div>
                </div>
                <span className={cn("size-2 rounded-full", tileColor.bg)} />
              </div>
              <div className={cn("text-xl font-black leading-tight mb-2", tileColor.text)}>
                {tile.value}
              </div>
              <div className="text-xs leading-5 font-semibold text-[var(--text-secondary)]">
                {tile.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
