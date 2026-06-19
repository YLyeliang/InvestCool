"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  target: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "结论",
    items: [
      { label: "信号总览", target: "signal-dashboard-section", icon: "layout-dashboard" },
      { label: "关键看点", target: "key-takeaways-section", icon: "list-checks" },
      { label: "变化归因", target: "change-attribution-section", icon: "git-compare-arrows" },
      { label: "动作矩阵", target: "portfolio-actions-section", icon: "table-properties" },
      { label: "数据质量", target: "data-quality-section", icon: "database-zap" },
    ],
  },
  {
    label: "交易风控",
    items: [
      { label: "仓位摘要", target: "positioning-summary-section", icon: "route" },
      { label: "Desk Brief", target: "desk-brief-section", icon: "newspaper" },
      { label: "Playbook", target: "execution-playbook-section", icon: "clipboard-list" },
      { label: "预警", target: "alerts-section", icon: "bell-ring" },
      { label: "预算", target: "budget-section", icon: "scale" },
    ],
  },
  {
    label: "宏观因子",
    items: [
      { label: "罗盘", target: "regime-compass-section", icon: "compass" },
      { label: "贡献", target: "contribution-section", icon: "chart-no-axes-combined" },
      { label: "容量", target: "capacity-section", icon: "gauge" },
      { label: "因子压力", target: "factor-section", icon: "line-chart" },
      { label: "利率敏感", target: "rate-sensitivity-section", icon: "percent" },
      { label: "跨资产", target: "cross-asset-section", icon: "git-compare-arrows" },
    ],
  },
  {
    label: "结构",
    items: [
      { label: "盘中 Tape", target: "intraday-tape-section", icon: "scan-line" },
      { label: "成交分布", target: "volume-profile-section", icon: "bar-chart-3" },
      { label: "相对强弱", target: "relative-section", icon: "bar-chart-3" },
      { label: "主题轮动", target: "theme-rotation-section", icon: "layers-3" },
      { label: "广度", target: "breadth-section", icon: "network" },
      { label: "技术位", target: "levels-section", icon: "milestone" },
    ],
  },
  {
    label: "衍生品",
    items: [
      { label: "尾部风险", target: "tail-section", icon: "waves" },
      { label: "期权定价", target: "options-section", icon: "badge-dollar-sign" },
      { label: "期权偏斜", target: "option-skew-section", icon: "shield-alert" },
      { label: "Gamma", target: "gamma-map-section", icon: "crosshair" },
      { label: "波动溢价", target: "vol-premium-section", icon: "activity" },
      { label: "对冲覆盖", target: "hedge-overlay-section", icon: "shield-check" },
    ],
  },
  {
    label: "基本面",
    items: [
      { label: "流动性", target: "liquidity-section", icon: "activity" },
      { label: "集中度", target: "concentration-section", icon: "pie-chart" },
      { label: "估值", target: "valuation-section", icon: "badge-dollar-sign" },
      { label: "质量", target: "quality-section", icon: "badge-check" },
      { label: "财报", target: "earnings-section", icon: "calendar-clock" },
      { label: "离散度", target: "dispersion-section", icon: "scatter-chart" },
    ],
  },
  {
    label: "情景",
    items: [
      { label: "历史类比", target: "regime-analog-section", icon: "history" },
      { label: "压力实验", target: "factor-shock-section", icon: "flask-conical" },
      { label: "条件矩阵", target: "condition-matrix-section", icon: "grid-3x3" },
      { label: "融资条件", target: "funding-conditions-section", icon: "landmark" },
      { label: "情景概率", target: "scenario-map-section", icon: "workflow" },
      { label: "修复路径", target: "recovery-path-section", icon: "route" },
    ],
  },
];

export const NDXRiskSectionNavigator = () => {
  const [activeTarget, setActiveTarget] = useState(groups[0].items[0].target);

  const targets = useMemo(() => groups.flatMap((group) => group.items.map((item) => item.target)), []);

  useEffect(() => {
    const elements = targets
      .map((target) => document.getElementById(target))
      .filter(Boolean) as HTMLElement[];

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const nextTarget = targets.find((target) => visible.target.classList.contains(target));
        if (nextTarget) setActiveTarget(nextTarget);
      },
      {
        rootMargin: "-15% 0px -70% 0px",
        threshold: [0.01, 0.2, 0.5],
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [targets]);

  const scrollToSection = (target: string) => {
    const element = document.getElementById(target);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTarget(target);
    window.history.replaceState(null, "", `#${target}`);
  };

  return (
    <nav className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <Icon name="map" size={16} className="text-[var(--accent-color)]" />
          NDX 风险工作台
        </div>
        <div className="hidden text-xs font-semibold text-[var(--text-tertiary)] md:block">
          {groups.reduce((count, group) => count + group.items.length, 0)} 个分析入口
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
        {groups.map((group) => (
          <div key={group.label} className="min-w-0">
            <div className="mb-2 text-[11px] font-black uppercase text-[var(--text-tertiary)]">
              {group.label}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {group.items.map((item) => {
                const active = activeTarget === item.target;
                return (
                  <button
                    key={item.target}
                    type="button"
                    onClick={() => scrollToSection(item.target)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-bold transition-colors lg:w-full",
                      active
                        ? "border-[var(--accent-color)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "border-[var(--border-color)] bg-[var(--section-bg)] text-[var(--text-secondary)] hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Icon name={item.icon} size={14} className="shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
};
