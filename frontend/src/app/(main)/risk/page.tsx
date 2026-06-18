"use client";

import React, { useState, useEffect } from "react";
import { NDXSignalDashboardPanel } from "@/components/NDXSignalDashboardPanel";
import { NDXRegimeCompassPanel } from "@/components/NDXRegimeCompassPanel";
import { NDXRiskAlertsPanel } from "@/components/NDXRiskAlertsPanel";
import { NDXRiskBriefCard } from "@/components/NDXRiskBriefCard";
import { NDXCommitteeMemoPanel } from "@/components/NDXCommitteeMemoPanel";
import { NDXRiskDiagnosticsPanel } from "@/components/NDXRiskDiagnosticsPanel";
import { NDXContributionPanel } from "@/components/NDXContributionPanel";
import { NDXFactorPressurePanel } from "@/components/NDXFactorPressurePanel";
import { NDXConditionMatrixPanel } from "@/components/NDXConditionMatrixPanel";
import { NDXFundingConditionsPanel } from "@/components/NDXFundingConditionsPanel";
import { NDXFactorAttributionPanel } from "@/components/NDXFactorAttributionPanel";
import { NDXRelativeStrengthPanel } from "@/components/NDXRelativeStrengthPanel";
import { NDXThemeRotationPanel } from "@/components/NDXThemeRotationPanel";
import { NDXBreadthParticipationPanel } from "@/components/NDXBreadthParticipationPanel";
import { NDXTechnicalLevelsPanel } from "@/components/NDXTechnicalLevelsPanel";
import { NDXTailRiskPanel } from "@/components/NDXTailRiskPanel";
import { NDXOptionsPricingPanel } from "@/components/NDXOptionsPricingPanel";
import { NDXVolatilityTermPanel } from "@/components/NDXVolatilityTermPanel";
import { NDXHedgeOverlayPanel } from "@/components/NDXHedgeOverlayPanel";
import { NDXLiquidityFlowPanel } from "@/components/NDXLiquidityFlowPanel";
import { NDXConcentrationPanel } from "@/components/NDXConcentrationPanel";
import { NDXValuationPressurePanel } from "@/components/NDXValuationPressurePanel";
import { MAG7QualityPanel } from "@/components/MAG7QualityPanel";
import { NDXEarningsCatalystPanel } from "@/components/NDXEarningsCatalystPanel";
import { MAG7DispersionPanel } from "@/components/MAG7DispersionPanel";
import { NDXScenarioMapPanel } from "@/components/NDXScenarioMapPanel";
import { NDXRecoveryPathPanel } from "@/components/NDXRecoveryPathPanel";
import { NDXScenarioStressPanel } from "@/components/NDXScenarioStressPanel";
import { NDXRiskBudgetPanel } from "@/components/NDXRiskBudgetPanel";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

interface ResearchArticle {
  slug: string;
  title: string;
  description: string;
  path: string;
  is_deleted?: boolean | string;
}

interface StrategyHistoryItem {
  id: number;
  status: string;
  summary: string;
  created_at: string;
  index_position: number;
}

interface StrategyHistory {
  items: StrategyHistoryItem[];
  total: number;
  page: number;
  pages: number;
}

export default function RiskPage() {
  const [researchArticles, setResearchArticles] = useState<ResearchArticle[]>([]);
  const [history, setHistory] = useState<StrategyHistory | null>(null);
  const [page, setPage] = useState(1);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/content-api/cms/analysis");
      if (res.ok) {
        const items = await res.json() as ResearchArticle[];
        setResearchArticles(
          items
            .filter((item) => String(item.is_deleted).toLowerCase() !== "true")
            .slice(0, 4)
        );
      }
    } catch (e) {
      console.error("Failed to fetch NDX research articles:", e);
    }
  };

  const fetchHistory = async (p: number) => {
    try {
      const res = await fetch(`/api/risk/history?page=${p}&per_page=5`);
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch strategy history:", e);
    }
  };

  useEffect(() => {
    void Promise.all([fetchArticles(), fetchHistory(page)]);
  }, [page]);

  const getStatusColor = (status: string) => {
    if (status.includes("风险偏高") || status.includes("看空")) return "#dc2626";
    if (status.includes("谨慎") || status.includes("防守") || status.includes("观察")) return "#d97706";
    if (status.includes("机会") || status.includes("看多")) return "#059669";
    if (status.includes("中性")) return "#2563eb";
    return "#64748b";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="risk-page space-y-11 md:space-y-12">
      <header className="page-header">
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
          NDX 风险研究.
        </h2>
        <p className="text-[var(--text-secondary)] font-medium max-w-2xl leading-7">
          聚焦纳斯达克 100 的价格位置、波动率、利率压力和权重股结构。
        </p>
      </header>

      <section className="signal-dashboard-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:layout-dashboard" className="text-[var(--accent-color)]" /> 机构信号总览
        </h3>
        <NDXSignalDashboardPanel />
      </section>

      <section className="regime-compass-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:compass" className="text-[var(--accent-color)]" /> NDX 市场状态罗盘
        </h3>
        <NDXRegimeCompassPanel />
      </section>

      <section className="alerts-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:bell-ring" className="text-[var(--accent-color)]" /> NDX 风险预警
        </h3>
        <NDXRiskAlertsPanel />
      </section>

      {/* Real-time NDX risk brief */}
      <section className="strategy-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:radar" className="text-[var(--accent-color)]" /> 实时 NDX 风险简报
        </h3>
        <NDXRiskBriefCard />
      </section>

      <section className="committee-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:clipboard-list" className="text-[var(--accent-color)]" /> 投委会摘要
        </h3>
        <NDXCommitteeMemoPanel />
      </section>

      <section className="diagnostics-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:activity" className="text-[var(--accent-color)]" /> 机构式风险诊断
        </h3>
        <NDXRiskDiagnosticsPanel />
      </section>

      <section className="contribution-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:chart-no-axes-combined" className="text-[var(--accent-color)]" /> NDX 风险贡献拆解
        </h3>
        <NDXContributionPanel />
      </section>

      <section className="factor-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:line-chart" className="text-[var(--accent-color)]" /> 宏观因子压力
        </h3>
        <NDXFactorPressurePanel />
      </section>

      <section className="condition-matrix-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:grid-3x3" className="text-[var(--accent-color)]" /> NDX 条件风险矩阵
        </h3>
        <NDXConditionMatrixPanel />
      </section>

      <section className="funding-conditions-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:landmark" className="text-[var(--accent-color)]" /> NDX 信用与融资条件
        </h3>
        <NDXFundingConditionsPanel />
      </section>

      <section className="attribution-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:split" className="text-[var(--accent-color)]" /> NDX 因子归因
        </h3>
        <NDXFactorAttributionPanel />
      </section>

      <section className="relative-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:bar-chart-3" className="text-[var(--accent-color)]" /> 相对强弱与 Beta
        </h3>
        <NDXRelativeStrengthPanel />
      </section>

      <section className="theme-rotation-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:layers-3" className="text-[var(--accent-color)]" /> NDX 主题轮动
        </h3>
        <NDXThemeRotationPanel />
      </section>

      <section className="breadth-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:network" className="text-[var(--accent-color)]" /> 市场广度与等权参与
        </h3>
        <NDXBreadthParticipationPanel />
      </section>

      <section className="levels-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:milestone" className="text-[var(--accent-color)]" /> 技术位监控
        </h3>
        <NDXTechnicalLevelsPanel />
      </section>

      <section className="tail-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:waves" className="text-[var(--accent-color)]" /> 回撤与尾部风险
        </h3>
        <NDXTailRiskPanel />
      </section>

      <section className="options-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:badge-dollar-sign" className="text-[var(--accent-color)]" /> 期权隐含定价
        </h3>
        <NDXOptionsPricingPanel />
      </section>

      <section className="volatility-term-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:waves" className="text-[var(--accent-color)]" /> 波动率期限结构
        </h3>
        <NDXVolatilityTermPanel />
      </section>

      <section className="hedge-overlay-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:shield-check" className="text-[var(--accent-color)]" /> NDX 对冲覆盖建议
        </h3>
        <NDXHedgeOverlayPanel />
      </section>

      <section className="liquidity-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:activity" className="text-[var(--accent-color)]" /> 流动性与成交确认
        </h3>
        <NDXLiquidityFlowPanel />
      </section>

      <section className="concentration-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:pie-chart" className="text-[var(--accent-color)]" /> 权重股集中度
        </h3>
        <NDXConcentrationPanel />
      </section>

      <section className="valuation-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:badge-dollar-sign" className="text-[var(--accent-color)]" /> MAG7 估值压力
        </h3>
        <NDXValuationPressurePanel />
      </section>

      <section className="quality-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:badge-check" className="text-[var(--accent-color)]" /> MAG7 盈利质量
        </h3>
        <MAG7QualityPanel />
      </section>

      <section className="earnings-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:calendar-clock" className="text-[var(--accent-color)]" /> MAG7 财报催化风险
        </h3>
        <NDXEarningsCatalystPanel />
      </section>

      <section className="dispersion-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:scatter-chart" className="text-[var(--accent-color)]" /> MAG7 相关性与离散度
        </h3>
        <MAG7DispersionPanel />
      </section>

      <section className="scenario-map-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:workflow" className="text-[var(--accent-color)]" /> NDX 情景概率图
        </h3>
        <NDXScenarioMapPanel />
      </section>

      <section className="recovery-path-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:route" className="text-[var(--accent-color)]" /> NDX 回撤修复路径
        </h3>
        <NDXRecoveryPathPanel />
      </section>

      <section className="scenario-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:git-branch" className="text-[var(--accent-color)]" /> NDX 情景压力测试
        </h3>
        <NDXScenarioStressPanel />
      </section>

      <section className="budget-section">
        <h3 className="section-title flex items-center gap-2 text-xl font-bold mb-6">
          <Icon name="lucide:scale" className="text-[var(--accent-color)]" /> NDX 风险预算矩阵
        </h3>
        <NDXRiskBudgetPanel />
      </section>

      <div className="main-content-layout grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        {/* Left: Articles */}
        <div className="articles-column space-y-8">
          <h3 className="section-title text-xl font-bold">深度阅读</h3>
          {researchArticles.length > 0 ? (
            <div className="articles-grid grid grid-cols-1 md:grid-cols-2 gap-6">
              {researchArticles.map((article) => (
                <div key={article.slug} className="card p-6 flex flex-col justify-between min-h-[200px] border-t-2 border-[var(--accent-color)] transition-colors">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-strong)] text-xs font-black uppercase mb-3">
                      NDX Research
                    </span>
                    <h3 className="text-lg font-bold mb-2">{article.title}</h3>
                    <p className="text-base text-[var(--text-secondary)] leading-7 line-clamp-3 mb-6">
                      {article.description || "暂无描述"}
                    </p>
                  </div>
                  <Link href={`/analysis/${article.slug}`} className="text-[var(--accent-strong)] font-bold text-sm flex items-center gap-1 no-underline">
                    深度阅读 <Icon name="lucide:arrow-right" size={14} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center border-2 border-dashed border-[var(--border-color)] rounded-lg">
              <Icon name="radar" size={40} className="mx-auto mb-2 opacity-20" />
              <p className="text-[var(--text-tertiary)] text-sm">研究内容正在整理中...</p>
            </div>
          )}
        </div>

        {/* Right: Risk History */}
        <aside className="history-column space-y-8">
          <h3 className="section-title text-xl font-bold">风险足迹</h3>
          <div className="timeline relative pl-6 border-l-2 border-[var(--border-color)] space-y-6">
            {history?.items.map((item) => (
              <div key={item.id} className="timeline-item relative">
                <div 
                  className="timeline-dot absolute -left-[1.95rem] top-2 size-3 rounded-full border-2 border-[var(--bg-color)] shadow-sm"
                  style={{ backgroundColor: getStatusColor(item.status) }}
                ></div>
                <div className="card p-4 !mb-0 text-sm">
                  <div className="item-header flex justify-between items-center mb-2">
                    <span className="item-status font-black" style={{ color: getStatusColor(item.status) }}>
                      {item.status}
                    </span>
                    <span className="item-time text-xs text-[var(--text-tertiary)]">{formatDate(item.created_at)}</span>
                  </div>
                  <p className="item-summary text-[var(--text-secondary)] leading-7 mb-2">
                    {item.summary}
                  </p>
                  <div className="item-footer text-xs text-[var(--text-tertiary)] text-right font-bold">
                    点位: {item.index_position}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {history && history.pages > 1 && (
            <div className="pagination flex items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page <= 1}
                className="px-3 py-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <span className="page-info text-xs font-bold text-[var(--text-secondary)]">{page} / {history.pages}</span>
              <button 
                onClick={() => setPage(p => Math.min(history.pages, p + 1))} 
                disabled={page >= history.pages}
                className="px-3 py-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
