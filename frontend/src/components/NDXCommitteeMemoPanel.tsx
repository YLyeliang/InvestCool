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

interface BreadthPayload {
  breadth_score: number;
  breadth_label: string;
  participation_gap_20d: number;
  equal_symbol: string;
}

interface ThemeRotationPayload {
  leadership_score: number;
  regime: string;
  top_theme: string;
  top_theme_excess_20d: number;
  participation_count: number;
  theme_count: number;
}

interface LiquidityPayload {
  flow_score: number;
  regime: string;
  volume_ratio_20: number;
  flow_balance: number;
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

interface OptionsPayload {
  regime: string;
  implied_move: number;
  put_call_oi_ratio: number;
}

interface VolatilityTermPayload {
  regime: string;
  term_score: number;
  front_ratio: number;
  vvix_z_score: number;
}

interface ConcentrationPayload {
  concentration_level: string;
  top3_weight: number;
  top1_symbol: string;
  top1_weight: number;
}

interface ValuationPayload {
  valuation_score: number;
  valuation_label: string;
  weighted_forward_pe: number | null;
  top_pressure_symbol: string;
}

interface EarningsPayload {
  event_score: number;
  event_label: string;
  nearest_symbol: string;
  nearest_days: number;
  event_weight_45d: number;
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
  breadth: BreadthPayload | null;
  themeRotation: ThemeRotationPayload | null;
  liquidity: LiquidityPayload | null;
  levels: LevelsPayload | null;
  tail: TailPayload | null;
  options: OptionsPayload | null;
  volatilityTerm: VolatilityTermPayload | null;
  concentration: ConcentrationPayload | null;
  valuation: ValuationPayload | null;
  earnings: EarningsPayload | null;
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

const inverseRiskScore = (score?: number) => {
  if (typeof score !== "number" || Number.isNaN(score)) return 50;
  return clamp(100 - score, 20, 80);
};

const optionsRiskScore = (payload?: OptionsPayload | null) => {
  if (!payload) return 50;
  return clamp(32 + payload.implied_move * 8 + Math.max(0, payload.put_call_oi_ratio - 0.9) * 18, 25, 85);
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
          breadth,
          themeRotation,
          liquidity,
          levels,
          tail,
          options,
          volatilityTerm,
          concentration,
          valuation,
          earnings,
          budget,
        ] = await Promise.all([
          fetchJson<DiagnosticsPayload>("/api/risk/diagnostics"),
          fetchJson<FactorPayload>("/api/risk/factors"),
          fetchJson<RelativePayload>("/api/risk/relative"),
          fetchJson<BreadthPayload>("/api/risk/breadth"),
          fetchJson<ThemeRotationPayload>("/api/risk/theme-rotation"),
          fetchJson<LiquidityPayload>("/api/risk/liquidity"),
          fetchJson<LevelsPayload>("/api/risk/levels"),
          fetchJson<TailPayload>("/api/risk/tail"),
          fetchJson<OptionsPayload>("/api/risk/options"),
          fetchJson<VolatilityTermPayload>("/api/risk/volatility-term"),
          fetchJson<ConcentrationPayload>("/api/risk/concentration"),
          fetchJson<ValuationPayload>("/api/risk/valuation"),
          fetchJson<EarningsPayload>("/api/risk/earnings"),
          fetchJson<BudgetPayload>("/api/risk/budget"),
        ]);

        setData({
          diagnostics,
          factors,
          relative,
          breadth,
          themeRotation,
          liquidity,
          levels,
          tail,
          options,
          volatilityTerm,
          concentration,
          valuation,
          earnings,
          budget,
        });
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
    const relativeRisk = inverseRiskScore(data.relative?.leadership_score);
    const breadthRisk = inverseRiskScore(data.breadth?.breadth_score);
    const themeRisk = inverseRiskScore(data.themeRotation?.leadership_score);
    const liquidityRisk = inverseRiskScore(data.liquidity?.flow_score);
    const internalRisk = (relativeRisk + breadthRisk + themeRisk + liquidityRisk) / 4;
    const levelsRisk = technicalRiskScore(data.levels?.zone_label);
    const tailScore = data.tail?.tail_score ?? 50;
    const concentrationScore = concentrationRiskScore(data.concentration?.concentration_level);
    const optionsScore = optionsRiskScore(data.options);
    const volatilityTermScore = data.volatilityTerm?.term_score ?? 50;
    const pricingRisk = (tailScore + optionsScore + volatilityTermScore) / 3;
    const valuationScore = data.valuation?.valuation_score ?? 50;
    const earningsScore = data.earnings?.event_score ?? 50;
    const riskTemperature = clamp(
      diagnostics.risk_score * 0.24
        + macroScore * 0.1
        + internalRisk * 0.18
        + levelsRisk * 0.1
        + pricingRisk * 0.14
        + concentrationScore * 0.07
        + valuationScore * 0.08
        + earningsScore * 0.05
        + liquidityRisk * 0.04
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
        ? `定价与尾部约束：95% VaR ${formatSignedPct(data.tail.var95)}，预期尾损 ${formatSignedPct(data.tail.expected_shortfall_95)}，期权定价为 ${data.options?.regime ?? "待确认"}，VIX 曲线为 ${data.volatilityTerm?.regime ?? "待确认"}。`
        : "等待尾部风险和定价数据完成初始化后，再更新 VaR、期权和波动率曲线约束。",
      data.concentration
        ? `集中度观察：MAG7 代理 Top3 权重 ${data.concentration.top3_weight.toFixed(1)}%，最大权重 ${data.concentration.top1_symbol} ${data.concentration.top1_weight.toFixed(1)}%。`
        : "等待集中度数据完成初始化后，再更新权重股约束。",
      data.themeRotation && data.breadth
        ? `内部扩散检查：主题轮动为 ${data.themeRotation.regime}，${data.themeRotation.participation_count}/${data.themeRotation.theme_count} 个主题跑赢 QQQ；${data.breadth.equal_symbol} 20 日参与差 ${formatSignedPct(data.breadth.participation_gap_20d)}。`
        : "等待主题轮动和等权广度数据完成初始化后，再判断上涨是否扩散。",
      data.valuation && data.earnings
        ? `基本面催化：估值状态 ${data.valuation.valuation_label}，加权 Forward PE ${data.valuation.weighted_forward_pe?.toFixed(1) ?? "--"}x；最近财报窗口为 ${data.earnings.nearest_symbol}，距离 ${data.earnings.nearest_days} 天。`
        : "等待估值和财报日历完成初始化后，再更新基本面催化约束。",
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
        label: "内部扩散",
        value: data.themeRotation && data.breadth
          ? `${data.themeRotation.regime} · ${data.breadth.breadth_label}`
          : "--",
        detail: data.themeRotation
          ? `领涨主题 ${data.themeRotation.top_theme}，20 日超额 ${formatSignedPct(data.themeRotation.top_theme_excess_20d)}。`
          : "等待主题轮动和广度数据完成初始化。",
        icon: "layers-3",
      },
      {
        label: "流动性确认",
        value: data.liquidity ? `${data.liquidity.regime} · ${data.liquidity.volume_ratio_20.toFixed(2)}x` : "--",
        detail: data.liquidity
          ? `20 日成交平衡 ${formatSignedPct(data.liquidity.flow_balance)}，用于确认价格突破质量。`
          : "等待成交结构数据完成初始化。",
        icon: "activity",
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
      {
        label: "定价压力",
        value: data.volatilityTerm && data.options
          ? `${data.volatilityTerm.regime} · ${data.options.regime}`
          : "--",
        detail: data.volatilityTerm
          ? `VIX/3M ${data.volatilityTerm.front_ratio.toFixed(2)}x，VVIX z ${data.volatilityTerm.vvix_z_score.toFixed(2)}。`
          : "等待波动率期限结构完成初始化。",
        icon: "waves",
      },
      {
        label: "基本面催化",
        value: data.valuation && data.earnings
          ? `${data.valuation.valuation_label} · ${data.earnings.event_label}`
          : "--",
        detail: data.earnings
          ? `${data.earnings.nearest_symbol} ${data.earnings.nearest_days} 天后财报，45 天事件权重 ${data.earnings.event_weight_45d.toFixed(1)}%。`
          : "等待财报催化数据完成初始化。",
        icon: "calendar-clock",
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
          {Array.from({ length: 6 }).map((_, index) => (
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
              以当前 NDX 风险温度、宏观压力、内部扩散、流动性确认、波动定价、估值催化和集中度综合判断，组合应以“{memo.posture}”作为主线。
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
