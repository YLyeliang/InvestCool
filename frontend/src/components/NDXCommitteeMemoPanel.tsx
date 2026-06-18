"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type ColorKey = "green" | "blue" | "amber" | "red";

interface DiagnosticsPayload {
  as_of: string;
  index: number;
  risk_score: number;
  risk_level: string;
  risk_color: ColorKey;
  pillars: Array<{ key: string; label: string; score: number; level: string; comment: string }>;
}

interface FactorPayload {
  pressure_score: number;
  pressure_label: string;
  main_headwind: string;
}

interface RelativePayload {
  leadership_score: number;
  leadership_label: string;
  primary_beta: number;
  primary_excess_20d: number;
}

interface LevelsPayload {
  zone_label: string;
  zone_score: number;
  support_levels: Array<{ label: string; value: number; distance_label: string }>;
  resistance_levels: Array<{ label: string; value: number; distance_label: string }>;
}

interface TailPayload {
  tail_score: number;
  tail_label: string;
  current_drawdown: number;
  var95: number;
  expected_shortfall_95: number;
}

interface ConcentrationPayload {
  concentration_level: string;
  top3_weight: number;
  top1_symbol: string;
  top1_weight: number;
}

interface BudgetPayload {
  risk_level: string;
  stress_downside: number;
  profiles: Array<{
    key: string;
    name: string;
    exposure: { label: string };
    cash_buffer: string;
    max_loss_budget: string;
  }>;
}

interface MemoData {
  diagnostics: DiagnosticsPayload | null;
  factors: FactorPayload | null;
  relative: RelativePayload | null;
  levels: LevelsPayload | null;
  tail: TailPayload | null;
  concentration: ConcentrationPayload | null;
  budget: BudgetPayload | null;
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

const clamp = (value: number, minimum = 0, maximum = 100) => {
  return Math.max(minimum, Math.min(maximum, value));
};

const colorForScore = (score: number): ColorKey => {
  if (score >= 75) return "red";
  if (score >= 55) return "amber";
  if (score >= 35) return "blue";
  return "green";
};

const formatIndex = (value: number) => {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
};

const formatSignedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const technicalRiskScore = (label?: string) => {
  if (!label) return 50;
  if (label.includes("破位")) return 86;
  if (label.includes("支撑")) return 70;
  if (label.includes("均衡")) return 50;
  if (label.includes("高位")) return 45;
  return 35;
};

const concentrationRiskScore = (level?: string) => {
  if (!level) return 50;
  if (level.includes("高度")) return 82;
  if (level.includes("偏")) return 60;
  return 35;
};

export const NDXCommitteeMemoPanel = () => {
  const [data, setData] = useState<MemoData | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const fetchMemoData = async () => {
      setPending(true);
      try {
        const [
          diagnostics,
          factors,
          relative,
          levels,
          tail,
          concentration,
          budget,
        ] = await Promise.all([
          fetchJson<DiagnosticsPayload>("/api/risk/diagnostics"),
          fetchJson<FactorPayload>("/api/risk/factors"),
          fetchJson<RelativePayload>("/api/risk/relative"),
          fetchJson<LevelsPayload>("/api/risk/levels"),
          fetchJson<TailPayload>("/api/risk/tail"),
          fetchJson<ConcentrationPayload>("/api/risk/concentration"),
          fetchJson<BudgetPayload>("/api/risk/budget"),
        ]);

        setData({ diagnostics, factors, relative, levels, tail, concentration, budget });
      } catch (e) {
        console.error("Failed to fetch NDX committee memo:", e);
        setData(null);
      } finally {
        setPending(false);
      }
    };

    void fetchMemoData();
  }, []);

  const memo = useMemo(() => {
    if (!data?.diagnostics) return null;

    const diagnostics = data.diagnostics;
    const macroScore = data.factors?.pressure_score ?? 50;
    const relativeRisk = clamp(100 - (data.relative?.leadership_score ?? 50), 25, 75);
    const levelsRisk = technicalRiskScore(data.levels?.zone_label);
    const tailScore = data.tail?.tail_score ?? 50;
    const concentrationScore = concentrationRiskScore(data.concentration?.concentration_level);
    const riskTemperature = clamp(
      diagnostics.risk_score * 0.34
        + macroScore * 0.14
        + relativeRisk * 0.14
        + levelsRisk * 0.12
        + tailScore * 0.14
        + concentrationScore * 0.12
    );

    const color = colorForScore(riskTemperature);
    const posture = riskTemperature >= 70
      ? "防守优先"
      : riskTemperature >= 55
        ? "控制追高"
        : riskTemperature >= 40
          ? "均衡观察"
          : "逐步进攻";

    const topPillar = [...diagnostics.pillars].sort((a, b) => b.score - a.score)[0];
    const balanced = data.budget?.profiles.find((profile) => profile.key === "balanced");
    const support = data.levels?.support_levels[0];
    const resistance = data.levels?.resistance_levels[0];

    const checks = [
      balanced
        ? `均衡型 NDX 暴露参考 ${balanced.exposure.label}，现金缓冲 ${balanced.cash_buffer}，单轮压力损失预算 ${balanced.max_loss_budget}。`
        : "等待风险预算矩阵完成初始化后，再确定组合暴露区间。",
      support && resistance
        ? `技术位上，最近支撑是 ${support.label} ${formatIndex(support.value)}（${support.distance_label}），最近压力是 ${resistance.label} ${formatIndex(resistance.value)}（${resistance.distance_label}）。`
        : "等待技术位监控完成初始化后，再更新支撑和压力线。",
      data.tail
        ? `尾部风险约束：95% VaR ${formatSignedPct(data.tail.var95)}，预期尾损 ${formatSignedPct(data.tail.expected_shortfall_95)}，当前回撤 ${formatSignedPct(data.tail.current_drawdown)}。`
        : "等待尾部风险数据完成初始化后，再更新 VaR 和回撤约束。",
      data.concentration
        ? `集中度观察：MAG7 代理 Top3 权重 ${data.concentration.top3_weight.toFixed(1)}%，最大权重 ${data.concentration.top1_symbol} ${data.concentration.top1_weight.toFixed(1)}%。`
        : "等待集中度数据完成初始化后，再更新权重股约束。",
    ];

    const signals = [
      {
        label: "核心风险",
        value: `${topPillar.label} ${topPillar.score.toFixed(1)}`,
        detail: topPillar.comment,
        icon: "activity",
      },
      {
        label: "宏观压力",
        value: data.factors ? `${data.factors.pressure_label} · ${data.factors.main_headwind}` : "--",
        detail: "观察美元、利率和波动率是否继续压制成长股估值。",
        icon: "line-chart",
      },
      {
        label: "相对领导力",
        value: data.relative
          ? `${data.relative.leadership_label} · Beta ${data.relative.primary_beta.toFixed(2)}`
          : "--",
        detail: data.relative
          ? `相对 SPX 20 日超额 ${formatSignedPct(data.relative.primary_excess_20d)}。`
          : "等待相对强弱数据完成初始化。",
        icon: "bar-chart-3",
      },
    ];

    return {
      riskTemperature,
      color,
      posture,
      topPillar,
      checks,
      signals,
      index: diagnostics.index,
      asOf: diagnostics.as_of,
    };
  }, [data]);

  if (pending && !memo) {
    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--section-bg)] animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 rounded-lg bg-[var(--section-bg)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!memo) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--border-color)] py-10 text-center text-[var(--text-tertiary)]">
        <Icon name="clipboard-list" size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">投委会摘要正在初始化...</p>
      </div>
    );
  }

  const color = colorMap[memo.color];
  const width = `${Math.max(5, Math.min(100, memo.riskTemperature))}%`;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 shadow-sm", color.soft, color.border)}>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_180px] gap-5 items-center">
          <div>
            <div className="text-xs font-black uppercase text-[var(--text-tertiary)] mb-1">
              Committee Memo
            </div>
            <div className={cn("text-4xl font-black leading-none", color.text)}>
              {memo.riskTemperature.toFixed(1)}
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] mt-2">
              {memo.posture}
            </div>
          </div>

          <div>
            <p className="text-lg leading-8 font-bold text-[var(--text-primary)] m-0">
              以当前 NDX 风险温度、宏观压力、相对强弱、技术位、尾部风险和集中度综合判断，组合应以“{memo.posture}”作为主线。
            </p>
            <p className="text-sm leading-6 text-[var(--text-secondary)] mt-2 mb-0">
              这是规则化投委会摘要，用于把各风险模块压缩成执行清单；它不是交易指令。
            </p>
          </div>

          <div className="text-sm font-semibold text-[var(--text-secondary)] md:text-right">
            <div>NDX {formatIndex(memo.index)}</div>
            <div>主风险 {memo.topPillar.label}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              更新 {new Date(memo.asOf).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        <div className="mt-5 h-2 rounded-full bg-[var(--card-bg)]/70 overflow-hidden">
          <div className={cn("h-full rounded-full", color.bg)} style={{ width }} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {memo.signals.map((signal) => (
            <div key={signal.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Icon name={signal.icon} size={16} className="text-[var(--accent-color)]" />
                <h4 className="text-sm font-black text-[var(--text-primary)]">{signal.label}</h4>
              </div>
              <div className="text-base font-black text-[var(--text-primary)] mb-2">{signal.value}</div>
              <p className="text-sm leading-6 text-[var(--text-secondary)] m-0">{signal.detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] p-5">
          <h4 className="text-sm font-black text-[var(--text-primary)] mb-4">执行检查清单</h4>
          <div className="space-y-3">
            {memo.checks.map((check) => (
              <div key={check} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                <Icon name="check-circle-2" size={15} className="mt-1 shrink-0 text-[var(--accent-color)]" />
                <span>{check}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
