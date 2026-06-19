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

interface RegimeCompassPayload {
  regime_score: number;
  regime: string;
  support_score: number;
  pressure_score: number;
}

interface AlertsPayload {
  alert_score: number;
  alert_level: string;
  critical_count: number;
  watch_count: number;
  active_count: number;
}

interface ContributionPayload {
  risk_contribution_score: number;
  contribution_regime: string;
  net_pressure: number;
  pressure_total: number;
  support_total: number;
}

interface CapacityPayload {
  capacity_score: number;
  capacity_regime: string;
  target_exposure: {
    lower: number;
    upper: number;
    label: string;
  };
  cash_buffer_min: number;
  hedge_coverage: {
    lower: number;
    upper: number;
    label: string;
  };
}

interface PlaybookPayload {
  playbook_score: number;
  posture: string;
  target_exposure: {
    lower: number;
    upper: number;
    label: string;
  };
  cash_buffer_min: number;
  hedge_coverage: {
    lower: number;
    upper: number;
    label: string;
  };
}

interface DeskBriefPayload {
  desk_score: number;
  stance: string;
  support_score: number;
  pressure_score: number;
  alert_score: number;
  target_exposure: {
    label: string;
  };
  cash_buffer: string;
  hedge_coverage: {
    label: string;
  };
}

interface FactorPayload {
  pressure_score: number;
  pressure_label: string;
  main_headwind: string;
}

interface RateSensitivityPayload {
  rate_sensitivity_score: number;
  rate_sensitivity_regime: string;
  rate_change_20d_bps: number;
  weighted_forward_pe: number | null;
  pe_compression_50bps: number;
  ndx_multiple_risk: number;
}

interface ConditionMatrixPayload {
  condition_score: number;
  regime: string;
  rates_change_20d_bps: number;
  semis_active_20d: number;
}

interface FundingPayload {
  funding_score: number;
  regime: string;
  credit_ratio_20d: number;
  duration_ratio_20d: number;
}

interface CrossAssetPayload {
  confirmation_score: number;
  regime: string;
  confirmation_count: number;
  divergence_count: number;
  qqq_return_20d: number;
}

interface AttributionPayload {
  regime: string;
  actual_return: number;
  semis_contribution: number;
  macro_contribution: number;
  r_squared: number;
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

interface ValuationPayload {
  valuation_score: number;
  valuation_label: string;
  weighted_forward_pe: number | null;
  top_pressure_symbol: string;
}

interface QualityPayload {
  quality_score: number;
  quality_label: string;
  weighted_fcf_margin: number | null;
  top_quality_symbol: string;
}

interface EarningsPayload {
  event_score: number;
  event_label: string;
  nearest_symbol: string;
  nearest_days: number;
  event_weight_45d: number;
}

interface OptionsPayload {
  regime: string;
  implied_move: number;
  put_call_oi_ratio: number;
  expiration: string;
}

interface GammaMapPayload {
  gamma_score: number;
  regime: string;
  net_gamma: number;
  net_gamma_ratio: number;
  gamma_wall: {
    strike: number;
    distance_pct: number;
  };
  put_wall: {
    strike: number;
    distance_pct: number;
  };
}

interface OptionSkewPayload {
  skew_score: number;
  regime: string;
  risk_reversal: number;
  tail_oi_ratio: number;
  put_spread_cost_pct: number;
}

interface VolPremiumPayload {
  premium_score: number;
  premium_regime: string;
  implied_move: number;
  realized_move: number;
  premium_points: number;
  premium_ratio: number;
}

interface IntradayTapePayload {
  tape_pressure_score: number;
  regime: string;
  daily_return: number;
  vwap_distance: number;
  volume_pace: number;
  range_position: number;
}

interface VolumeProfilePayload {
  profile_score: number;
  regime: string;
  poc: number;
  value_area_low: number;
  value_area_high: number;
  distance_to_poc: number;
}

interface VolatilityTermPayload {
  regime: string;
  term_score: number;
  front_ratio: number;
  vvix_z_score: number;
}

interface HedgeOverlayPayload {
  hedge_score: number;
  hedge_label: string;
  protection_lower: number;
  protection_upper: number;
}

interface RecoveryPathPayload {
  recovery_score: number;
  recovery_regime: string;
  stress_downside: number;
  expected_move: number;
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
  regimeCompass: RegimeCompassPayload | null;
  alerts: AlertsPayload | null;
  contribution: ContributionPayload | null;
  capacity: CapacityPayload | null;
  playbook: PlaybookPayload | null;
  deskBrief: DeskBriefPayload | null;
  factors: FactorPayload | null;
  rateSensitivity: RateSensitivityPayload | null;
  conditionMatrix: ConditionMatrixPayload | null;
  funding: FundingPayload | null;
  crossAsset: CrossAssetPayload | null;
  attribution: AttributionPayload | null;
  breadth: BreadthPayload | null;
  themeRotation: ThemeRotationPayload | null;
  liquidity: LiquidityPayload | null;
  valuation: ValuationPayload | null;
  quality: QualityPayload | null;
  earnings: EarningsPayload | null;
  options: OptionsPayload | null;
  gammaMap: GammaMapPayload | null;
  optionSkew: OptionSkewPayload | null;
  volPremium: VolPremiumPayload | null;
  intradayTape: IntradayTapePayload | null;
  volumeProfile: VolumeProfilePayload | null;
  volatilityTerm: VolatilityTermPayload | null;
  hedgeOverlay: HedgeOverlayPayload | null;
  recoveryPath: RecoveryPathPayload | null;
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

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const fetchJson = async <T,>(path: string, timeoutMs = 12000): Promise<T | null> => {
  const requestOnce = async () => {
    const response = await fetch(path);
    const payload = await response.json();
    return response.ok && !payload.error ? payload as T : null;
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const timeout = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), timeoutMs);
    });

    try {
      const result = await Promise.race([requestOnce(), timeout]);
      if (result) return result;
    } catch {
      // Retry once below; cold PM2 reloads can return 202 while caches initialize.
    }

    if (attempt === 0) {
      await sleep(2500);
    }
  }

  return null;
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

const formatSignedPoint = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
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
          regimeCompass,
          alerts,
          contribution,
          capacity,
          playbook,
          deskBrief,
          factors,
          rateSensitivity,
          conditionMatrix,
          funding,
          crossAsset,
          attribution,
          breadth,
          themeRotation,
          liquidity,
          valuation,
          quality,
          earnings,
          options,
          gammaMap,
          optionSkew,
          volPremium,
          intradayTape,
          volumeProfile,
          volatilityTerm,
          hedgeOverlay,
          recoveryPath,
          tail,
          concentration,
        ] = await Promise.all([
          fetchJson<LatestPayload>("/api/risk/latest"),
          fetchJson<DiagnosticsPayload>("/api/risk/diagnostics"),
          fetchJson<RegimeCompassPayload>("/api/risk/regime-compass"),
          fetchJson<AlertsPayload>("/api/risk/alerts"),
          fetchJson<ContributionPayload>("/api/risk/contribution"),
          fetchJson<CapacityPayload>("/api/risk/capacity"),
          fetchJson<PlaybookPayload>("/api/risk/playbook", 15000),
          fetchJson<DeskBriefPayload>("/api/risk/desk-brief", 15000),
          fetchJson<FactorPayload>("/api/risk/factors"),
          fetchJson<RateSensitivityPayload>("/api/risk/rate-sensitivity"),
          fetchJson<ConditionMatrixPayload>("/api/risk/condition-matrix"),
          fetchJson<FundingPayload>("/api/risk/funding-conditions"),
          fetchJson<CrossAssetPayload>("/api/risk/cross-asset"),
          fetchJson<AttributionPayload>("/api/risk/attribution"),
          fetchJson<BreadthPayload>("/api/risk/breadth"),
          fetchJson<ThemeRotationPayload>("/api/risk/theme-rotation"),
          fetchJson<LiquidityPayload>("/api/risk/liquidity"),
          fetchJson<ValuationPayload>("/api/risk/valuation"),
          fetchJson<QualityPayload>("/api/risk/quality"),
          fetchJson<EarningsPayload>("/api/risk/earnings"),
          fetchJson<OptionsPayload>("/api/risk/options"),
          fetchJson<GammaMapPayload>("/api/risk/gamma-map", 15000),
          fetchJson<OptionSkewPayload>("/api/risk/option-skew", 15000),
          fetchJson<VolPremiumPayload>("/api/risk/vol-premium"),
          fetchJson<IntradayTapePayload>("/api/risk/intraday-tape", 15000),
          fetchJson<VolumeProfilePayload>("/api/risk/volume-profile", 15000),
          fetchJson<VolatilityTermPayload>("/api/risk/volatility-term"),
          fetchJson<HedgeOverlayPayload>("/api/risk/hedge-overlay"),
          fetchJson<RecoveryPathPayload>("/api/risk/recovery-path"),
          fetchJson<TailPayload>("/api/risk/tail"),
          fetchJson<ConcentrationPayload>("/api/risk/concentration"),
        ]);

        setData({ latest, diagnostics, regimeCompass, alerts, contribution, capacity, playbook, deskBrief, factors, rateSensitivity, conditionMatrix, funding, crossAsset, attribution, breadth, themeRotation, liquidity, valuation, quality, earnings, options, gammaMap, optionSkew, volPremium, intradayTape, volumeProfile, volatilityTerm, hedgeOverlay, recoveryPath, tail, concentration });
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
    const conditionScore = data.conditionMatrix?.condition_score ?? 50;
    const fundingScore = data.funding?.funding_score ?? 50;
    const tailScore = data.tail?.tail_score ?? 50;
    const valuationScore = data.valuation?.valuation_score ?? 50;
    const earningsScore = data.earnings?.event_score ?? 50;
    const hedgeScore = data.hedgeOverlay?.hedge_score ?? 50;
    const alertScore = data.alerts?.alert_score ?? 50;
    const contributionScore = data.contribution?.risk_contribution_score ?? 50;
    const rateSensitivityScore = data.rateSensitivity?.rate_sensitivity_score ?? 50;
    const gammaScore = data.gammaMap?.gamma_score ?? 50;
    const skewScore = data.optionSkew?.skew_score ?? 50;
    const volPremiumScore = data.volPremium?.premium_score ?? 50;
    const intradayTapeScore = data.intradayTape?.tape_pressure_score ?? 50;
    const volumeProfileScore = data.volumeProfile?.profile_score ?? 50;
    const supportiveScores = [
      data.breadth?.breadth_score ?? 50,
      data.themeRotation?.leadership_score ?? 50,
      data.liquidity?.flow_score ?? 50,
      data.crossAsset?.confirmation_score ?? 50,
      data.quality?.quality_score ?? 50,
      data.regimeCompass?.regime_score ?? 50,
      data.recoveryPath?.recovery_score ?? 50,
      data.capacity?.capacity_score ?? 50,
      data.playbook?.playbook_score ?? 50,
      data.deskBrief?.desk_score ?? 50,
    ];
    const volatilityTermScore = data.volatilityTerm?.term_score ?? 50;
    const pressureScores = [riskScore, contributionScore, rateSensitivityScore, gammaScore, skewScore, volPremiumScore, intradayTapeScore, volumeProfileScore, macroScore, conditionScore, fundingScore, tailScore, valuationScore, earningsScore, volatilityTermScore, hedgeScore, alertScore];
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
        label: "市场状态",
        value: data.regimeCompass ? data.regimeCompass.regime : "--",
        detail: data.regimeCompass ? `支撑 ${data.regimeCompass.support_score.toFixed(1)} · 压力 ${data.regimeCompass.pressure_score.toFixed(1)}` : "等待罗盘聚合",
        color: data.regimeCompass ? scoreColor(data.regimeCompass.regime_score) : "blue",
        icon: "compass",
      },
      {
        label: "风险预警",
        value: data.alerts ? data.alerts.alert_level : "--",
        detail: data.alerts ? `红色 ${data.alerts.critical_count} · 观察 ${data.alerts.watch_count} · 总计 ${data.alerts.active_count}` : "等待预警聚合",
        color: data.alerts ? scoreColor(data.alerts.alert_score, true) : "blue",
        icon: "bell-ring",
      },
      {
        label: "风险贡献",
        value: data.contribution ? data.contribution.contribution_regime : "--",
        detail: data.contribution ? `压力 ${data.contribution.pressure_total.toFixed(1)} · 缓冲 ${data.contribution.support_total.toFixed(1)} · 净 ${formatSignedPoint(data.contribution.net_pressure)}` : "等待贡献拆解",
        color: data.contribution ? scoreColor(data.contribution.risk_contribution_score, true) : "blue",
        icon: "chart-no-axes-combined",
      },
      {
        label: "承受力闸门",
        value: data.capacity ? data.capacity.capacity_regime : "--",
        detail: data.capacity ? `暴露 ${data.capacity.target_exposure.label} · 现金 ${data.capacity.cash_buffer_min.toFixed(0)}%+ · 保护 ${data.capacity.hedge_coverage.label}` : "等待承受力闸门",
        color: data.capacity ? scoreColor(data.capacity.capacity_score) : "blue",
        icon: "gauge",
      },
      {
        label: "执行 Playbook",
        value: data.playbook ? data.playbook.posture : "--",
        detail: data.playbook ? `暴露 ${data.playbook.target_exposure.label} · 现金 ${data.playbook.cash_buffer_min.toFixed(0)}%+ · 保护 ${data.playbook.hedge_coverage.label}` : "等待执行手册",
        color: data.playbook ? scoreColor(data.playbook.playbook_score) : "blue",
        icon: "clipboard-list",
      },
      {
        label: "Desk Brief",
        value: data.deskBrief ? data.deskBrief.stance : "--",
        detail: data.deskBrief ? `支撑 ${data.deskBrief.support_score.toFixed(1)} · 压力 ${data.deskBrief.pressure_score.toFixed(1)} · 暴露 ${data.deskBrief.target_exposure.label}` : "等待机构晨会",
        color: data.deskBrief ? scoreColor(data.deskBrief.desk_score) : "blue",
        icon: "newspaper",
      },
      {
        label: "宏观压力",
        value: data.factors ? data.factors.pressure_label : "--",
        detail: data.factors ? `主因子 ${data.factors.main_headwind}` : "等待宏观因子",
        color: data.factors ? scoreColor(data.factors.pressure_score, true) : "blue",
        icon: "line-chart",
      },
      {
        label: "估值利率",
        value: data.rateSensitivity ? data.rateSensitivity.rate_sensitivity_regime : "--",
        detail: data.rateSensitivity ? `10Y ${formatSignedPoint(data.rateSensitivity.rate_change_20d_bps)}bps · FPE ${data.rateSensitivity.weighted_forward_pe?.toFixed(1) ?? "--"}x · 50bps ${data.rateSensitivity.ndx_multiple_risk.toFixed(1)}%` : "等待利率敏感度",
        color: data.rateSensitivity ? scoreColor(data.rateSensitivity.rate_sensitivity_score, true) : "blue",
        icon: "percent",
      },
      {
        label: "条件矩阵",
        value: data.conditionMatrix ? data.conditionMatrix.regime : "--",
        detail: data.conditionMatrix ? `10Y ${data.conditionMatrix.rates_change_20d_bps.toFixed(0)}bps · 半导体 ${data.conditionMatrix.semis_active_20d.toFixed(2)}pt` : "等待条件矩阵",
        color: data.conditionMatrix ? scoreColor(data.conditionMatrix.condition_score, true) : "blue",
        icon: "grid-3x3",
      },
      {
        label: "融资条件",
        value: data.funding ? data.funding.regime : "--",
        detail: data.funding ? `HYG/LQD ${formatSignedPct(data.funding.credit_ratio_20d)} · TLT/SHY ${formatSignedPct(data.funding.duration_ratio_20d)}` : "等待融资条件",
        color: data.funding ? scoreColor(data.funding.funding_score, true) : "blue",
        icon: "landmark",
      },
      {
        label: "跨资产确认",
        value: data.crossAsset ? data.crossAsset.regime : "--",
        detail: data.crossAsset ? `确认 ${data.crossAsset.confirmation_count} · 分歧 ${data.crossAsset.divergence_count} · QQQ ${formatSignedPct(data.crossAsset.qqq_return_20d)}` : "等待跨资产读数",
        color: data.crossAsset ? scoreColor(data.crossAsset.confirmation_score) : "blue",
        icon: "git-compare-arrows",
      },
      {
        label: "因子归因",
        value: data.attribution ? data.attribution.regime : "--",
        detail: data.attribution ? `20D ${formatSignedPct(data.attribution.actual_return)} · 半导体 ${data.attribution.semis_contribution.toFixed(2)}pt` : "等待归因模型",
        color: data.attribution ? labelColor(data.attribution.regime) : "blue",
        icon: "split",
      },
      {
        label: "广度参与",
        value: data.breadth ? data.breadth.breadth_label : "--",
        detail: data.breadth ? `${data.breadth.equal_symbol} 差 ${formatSignedPct(data.breadth.participation_gap_20d)}` : "等待等权代理",
        color: data.breadth ? scoreColor(data.breadth.breadth_score) : "blue",
        icon: "network",
      },
      {
        label: "主题轮动",
        value: data.themeRotation ? data.themeRotation.regime : "--",
        detail: data.themeRotation ? `${data.themeRotation.top_theme} ${formatSignedPct(data.themeRotation.top_theme_excess_20d)} · ${data.themeRotation.participation_count}/${data.themeRotation.theme_count}` : "等待主题 ETF",
        color: data.themeRotation ? scoreColor(data.themeRotation.leadership_score) : "blue",
        icon: "layers-3",
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
        label: "Gamma 定位",
        value: data.gammaMap ? data.gammaMap.regime : "--",
        detail: data.gammaMap ? `净 ${formatSignedPoint(data.gammaMap.net_gamma)}M · 墙 ${data.gammaMap.gamma_wall.strike.toFixed(0)} · Put ${data.gammaMap.put_wall.strike.toFixed(0)}` : "等待 gamma map",
        color: data.gammaMap ? scoreColor(data.gammaMap.gamma_score, true) : "blue",
        icon: "crosshair",
      },
      {
        label: "期权偏斜",
        value: data.optionSkew ? data.optionSkew.regime : "--",
        detail: data.optionSkew ? `RR ${formatSignedPoint(data.optionSkew.risk_reversal)} vol · OTM P/C ${data.optionSkew.tail_oi_ratio.toFixed(2)}x · Spread ${data.optionSkew.put_spread_cost_pct.toFixed(2)}%` : "等待 skew 链",
        color: data.optionSkew ? scoreColor(data.optionSkew.skew_score, true) : "blue",
        icon: "shield-alert",
      },
      {
        label: "波动溢价",
        value: data.volPremium ? data.volPremium.premium_regime : "--",
        detail: data.volPremium ? `隐含 ${data.volPremium.implied_move.toFixed(2)}% · 实现 ${data.volPremium.realized_move.toFixed(2)}% · 溢价 ${formatSignedPoint(data.volPremium.premium_points)}` : "等待波动溢价",
        color: data.volPremium ? scoreColor(data.volPremium.premium_score, true) : "blue",
        icon: "activity",
      },
      {
        label: "盘中脉冲",
        value: data.intradayTape ? data.intradayTape.regime : "--",
        detail: data.intradayTape ? `日内 ${formatSignedPct(data.intradayTape.daily_return)} · VWAP ${formatSignedPct(data.intradayTape.vwap_distance)} · 量 ${data.intradayTape.volume_pace.toFixed(2)}x` : "等待盘中 tape",
        color: data.intradayTape ? scoreColor(data.intradayTape.tape_pressure_score, true) : "blue",
        icon: "scan-line",
      },
      {
        label: "成交分布",
        value: data.volumeProfile ? data.volumeProfile.regime : "--",
        detail: data.volumeProfile ? `POC ${data.volumeProfile.poc.toFixed(2)} · VA ${data.volumeProfile.value_area_low.toFixed(2)}-${data.volumeProfile.value_area_high.toFixed(2)} · 距POC ${formatSignedPct(data.volumeProfile.distance_to_poc)}` : "等待 volume profile",
        color: data.volumeProfile ? scoreColor(data.volumeProfile.profile_score, true) : "blue",
        icon: "bar-chart-3",
      },
      {
        label: "波动曲线",
        value: data.volatilityTerm ? data.volatilityTerm.regime : "--",
        detail: data.volatilityTerm ? `VIX/3M ${data.volatilityTerm.front_ratio.toFixed(2)}x · VVIX z ${data.volatilityTerm.vvix_z_score.toFixed(2)}` : "等待期限结构",
        color: data.volatilityTerm ? scoreColor(data.volatilityTerm.term_score, true) : "blue",
        icon: "waves",
      },
      {
        label: "对冲覆盖",
        value: data.hedgeOverlay ? data.hedgeOverlay.hedge_label : "--",
        detail: data.hedgeOverlay ? `${data.hedgeOverlay.protection_lower}-${data.hedgeOverlay.protection_upper}% 保护 · 分 ${data.hedgeOverlay.hedge_score.toFixed(1)}` : "等待保护建议",
        color: data.hedgeOverlay ? scoreColor(data.hedgeOverlay.hedge_score, true) : "blue",
        icon: "shield-check",
      },
      {
        label: "修复路径",
        value: data.recoveryPath ? data.recoveryPath.recovery_regime : "--",
        detail: data.recoveryPath ? `压力 -${data.recoveryPath.stress_downside.toFixed(1)}% · E[Move] ${formatSignedPct(data.recoveryPath.expected_move)}` : "等待回撤路径",
        color: data.recoveryPath ? scoreColor(data.recoveryPath.recovery_score) : "blue",
        icon: "route",
      },
      {
        label: "估值压力",
        value: data.valuation ? data.valuation.valuation_label : "--",
        detail: data.valuation ? `FPE ${data.valuation.weighted_forward_pe?.toFixed(1) ?? "--"}x · ${data.valuation.top_pressure_symbol}` : "等待基本面",
        color: data.valuation ? labelColor(data.valuation.valuation_label) : "blue",
        icon: "scale",
      },
      {
        label: "盈利质量",
        value: data.quality ? data.quality.quality_label : "--",
        detail: data.quality ? `FCF ${data.quality.weighted_fcf_margin?.toFixed(1) ?? "--"}% · ${data.quality.top_quality_symbol}` : "等待质量代理",
        color: data.quality ? scoreColor(data.quality.quality_score) : "blue",
        icon: "badge-check",
      },
      {
        label: "财报催化",
        value: data.earnings ? data.earnings.event_label : "--",
        detail: data.earnings ? `${data.earnings.nearest_symbol} ${data.earnings.nearest_days}天 · 45天 ${data.earnings.event_weight_45d.toFixed(1)}%` : "等待财报日历",
        color: data.earnings ? scoreColor(data.earnings.event_score, true) : "blue",
        icon: "calendar-clock",
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
          {Array.from({ length: 30 }).map((_, index) => (
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
