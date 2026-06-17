"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

echarts.use([LineChart, CanvasRenderer, GridComponent, TooltipComponent, LegendComponent]);

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const randomNormal = (random: () => number) => {
  let u = 0, v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState("financial-freedom");
  const tabs = [
    { id: "financial-freedom", label: "财富自由", icon: "palmtree" },
    { id: "invest-backtest", label: "定投回测", icon: "trending-up" },
    { id: "position-size", label: "仓位控制", icon: "pie-chart" },
    { id: "tax-calc", label: "税务估算", icon: "calculator" },
  ];

  // --- TOOL 1: Financial Freedom ---
  const [initialCapital, setInitialCapital] = useState(100);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [annualInvestment, setAnnualInvestment] = useState(10);
  const [annualExpense, setAnnualExpense] = useState(20);

  const freedomResult = useMemo(() => {
    const data = [];
    let balance = initialCapital;
    let yearsToRunOut = -1;
    data.push({ year: 0, balance: balance });
    for (let i = 1; i <= 100; i++) {
      balance = balance * (1 + annualReturn / 100) + annualInvestment - annualExpense;
      if (balance < 0) {
        data.push({ year: i, balance: 0 });
        if (yearsToRunOut === -1) yearsToRunOut = i;
        break;
      }
      data.push({ year: i, balance: Math.round(balance * 100) / 100 });
    }
    return { data, yearsToRunOut };
  }, [initialCapital, annualReturn, annualInvestment, annualExpense]);

  const freedomOption = {
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: freedomResult.data.map((d) => `第${d.year}年`),
      axisLabel: { interval: 9 },
    },
    yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", opacity: 0.1 } } },
    series: [
      {
        name: "账户余额",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: freedomResult.data.map((d) => d.balance),
        lineStyle: { width: 3, color: "#3b82f6" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(59, 130, 246, 0.3)" },
            { offset: 1, color: "rgba(59, 130, 246, 0)" },
          ]),
        },
      },
    ],
  };

  // --- TOOL 2: Backtest Pro ---
  const [investAmount, setInvestAmount] = useState(5000);
  const [investFrequency, setInvestFrequency] = useState("monthly");
  const [backtestYears, setBacktestYears] = useState(20);
  const annualRate = 12;
  const marketVolatility = 20;
  const [modelType, setModelType] = useState("stochastic");
  const [simSeed, setSimSeed] = useState(0);

  const backtestResult = useMemo(() => {
    const random = seededRandom(simSeed + 1);
    const stepsMap: Record<string, number> = { daily: 252, monthly: 12, yearly: 1 };
    const stepsPerYear = stepsMap[investFrequency] || 12;
    const totalSteps = backtestYears * stepsPerYear;
    const dt = 1 / stepsPerYear;
    const mu = annualRate / 100;
    let sigma = marketVolatility / 100;

    if (modelType === "ideal") sigma = 0;
    if (modelType === "stress") sigma *= 2.2;

    let totalCapital = 0;
    let marketValue = 0;
    const chartData = [];
    chartData.push({ year: 0, capital: 0, value: 0 });

    for (let i = 1; i <= totalSteps; i++) {
      totalCapital += investAmount;
      const drift = (mu - 0.5 * sigma * sigma) * dt;
      const randomComponent = sigma * Math.sqrt(dt) * randomNormal(random);
      let shock = 0;
      if (modelType === "stress" && random() < 0.05 * dt)
        shock = -0.1 - random() * 0.2;
      marketValue = (marketValue + investAmount) * Math.exp(drift + randomComponent + shock);
      if (i % Math.ceil(totalSteps / 100) === 0 || i === totalSteps) {
        chartData.push({
          year: (i / stepsPerYear).toFixed(1),
          capital: Math.round(totalCapital),
          value: Math.round(marketValue),
        });
      }
    }
    return {
      chartData,
      finalCapital: totalCapital,
      finalValue: marketValue,
      profit: marketValue - totalCapital,
      roi: totalCapital > 0 ? ((marketValue - totalCapital) / totalCapital) * 100 : 0,
    };
  }, [investAmount, investFrequency, backtestYears, annualRate, marketVolatility, modelType, simSeed]);

  const backtestOption = {
    tooltip: { trigger: "axis" },
    legend: { bottom: "0" },
    grid: { left: "3%", right: "4%", bottom: "15%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: backtestResult.chartData.map((d) => d.year),
      axisLabel: { formatter: (v: string) => v + "年" },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => (v >= 10000 ? (v / 10000).toFixed(0) + "万" : v) },
      splitLine: { lineStyle: { type: "dashed", opacity: 0.1 } },
    },
    series: [
      {
        name: "累计本金",
        type: "line",
        data: backtestResult.chartData.map((d) => d.capital),
        lineStyle: { width: 1, type: "dashed" },
        itemStyle: { color: "#94a3b8" },
        showSymbol: false,
      },
      {
        name: "市值曲线",
        type: "line",
        smooth: true,
        data: backtestResult.chartData.map((d) => d.value),
        lineStyle: { width: 3, color: modelType === "stress" ? "#f43f5e" : "#10b981" },
        showSymbol: false,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: modelType === "stress" ? "rgba(244, 63, 94, 0.2)" : "rgba(16, 185, 129, 0.2)" },
            { offset: 1, color: "rgba(0,0,0,0)" },
          ]),
        },
      },
    ],
  };

  return (
    <div className="tools-page space-y-10 pb-20">
      <header className="tools-header">
        <h2 className="text-4xl font-black text-[var(--text-primary)] mb-2">策略中心.</h2>
        <p className="text-[var(--text-secondary)] font-semibold">数据驱动决策，模型预演未来。</p>
      </header>

      <nav className="tool-tabs flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap border",
              activeTab === tab.id
                ? "bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-sm"
                : "bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--hover-bg)]"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="tool-content">
        {activeTab === "financial-freedom" && (
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 animate-in fade-in duration-500">
            <section className="card p-8 space-y-6">
              <h3 className="text-lg font-black mb-4">退休平衡模型</h3>
              <div className="space-y-4">
                <div className="input-group">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">初始资金 (万)</label>
                  <input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full p-3 bg-[var(--section-bg)] border border-[var(--border-color)] rounded-lg font-black outline-none focus:ring-2 ring-blue-500/20"
                  />
                </div>
                <div className="input-group">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">年化收益 (%)</label>
                  <input
                    type="number"
                    value={annualReturn}
                    onChange={(e) => setAnnualReturn(Number(e.target.value))}
                    className="w-full p-3 bg-[var(--section-bg)] border border-[var(--border-color)] rounded-lg font-black outline-none focus:ring-2 ring-blue-500/20"
                  />
                </div>
                <div className="input-group">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">年度新增 (万)</label>
                  <input
                    type="number"
                    value={annualInvestment}
                    onChange={(e) => setAnnualInvestment(Number(e.target.value))}
                    className="w-full p-3 bg-[var(--section-bg)] border border-[var(--border-color)] rounded-lg font-black outline-none focus:ring-2 ring-blue-500/20"
                  />
                </div>
                <div className="input-group">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">年度支出 (万)</label>
                  <input
                    type="number"
                    value={annualExpense}
                    onChange={(e) => setAnnualExpense(Number(e.target.value))}
                    className="w-full p-3 bg-[var(--section-bg)] border border-[var(--border-color)] rounded-lg font-black outline-none focus:ring-2 ring-blue-500/20"
                  />
                </div>
              </div>
              <div className={cn(
                "p-4 rounded-lg text-sm font-bold flex items-center gap-2",
                freedomResult.yearsToRunOut === -1 ? "bg-emerald-500/10 text-[var(--success-color)]" : "bg-red-500/10 text-[var(--danger-color)]"
              )}>
                <Icon name={freedomResult.yearsToRunOut === -1 ? "lucide:check-circle-2" : "lucide:alert-triangle"} className="size-4" />
                {freedomResult.yearsToRunOut === -1 ? "资金在 100 年内运行稳健。" : `将在第 ${freedomResult.yearsToRunOut} 年耗尽资金。`}
              </div>
            </section>
            <section className="card p-8 !mb-0">
              <div className="h-[400px] w-full">
                <ReactECharts 
                  option={freedomOption} 
                  style={{ height: "100%", width: "100%" }}
                  theme={typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"}
                />
              </div>
            </section>
          </div>
        )}

        {activeTab === "invest-backtest" && (
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 animate-in fade-in duration-500">
            <section className="card p-8 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black">参数设定</h3>
                <button 
                  onClick={() => setSimSeed(s => s + 1)}
                  className="p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                >
                  <Icon name="refresh-cw" size={16} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="input-group">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">数学模型</label>
                  <div className="flex p-1 bg-[var(--section-bg)] border border-[var(--border-color)] rounded-lg">
                    {["ideal", "stochastic", "stress"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setModelType(m)}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all",
                          modelType === m ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-tertiary)]"
                        )}
                      >
                        {m === "ideal" ? "理想" : m === "stochastic" ? "随机" : "极限"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">投入频率</label>
                  <div className="flex p-1 bg-[var(--section-bg)] border border-[var(--border-color)] rounded-lg">
                    {["daily", "monthly", "yearly"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setInvestFrequency(f)}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all",
                          investFrequency === f ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-tertiary)]"
                        )}
                      >
                        {f === "daily" ? "日" : f === "monthly" ? "月" : "年"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">单笔金额 (元)</label>
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(Number(e.target.value))}
                    className="w-full p-3 bg-[var(--section-bg)] border border-[var(--border-color)] rounded-lg font-black outline-none"
                  />
                </div>
                <div className="input-group">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">回测年限 (年)</label>
                  <input
                    type="number"
                    value={backtestYears}
                    onChange={(e) => setBacktestYears(Number(e.target.value))}
                    className="w-full p-3 bg-[var(--section-bg)] border border-[var(--border-color)] rounded-lg font-black outline-none"
                  />
                </div>
              </div>
            </section>
            <section className="card p-8 !mb-0">
              <div className="h-[400px] w-full">
                <ReactECharts 
                  option={backtestOption} 
                  style={{ height: "100%", width: "100%" }}
                  theme={typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="p-4 bg-[var(--section-bg)] rounded-lg border border-[var(--border-color)]">
                  <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">最终本金</div>
                  <div className="text-xl font-black">¥{(backtestResult.finalCapital / 10000).toFixed(1)}万</div>
                </div>
                <div className="p-4 bg-[var(--section-bg)] rounded-lg border border-[var(--border-color)]">
                  <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">最终市值</div>
                  <div className="text-xl font-black text-[var(--success-color)]">¥{(backtestResult.finalValue / 10000).toFixed(1)}万</div>
                </div>
                <div className="p-4 bg-[var(--section-bg)] rounded-lg border border-[var(--border-color)]">
                  <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">总利润</div>
                  <div className="text-xl font-black text-[var(--accent-strong)]">¥{(backtestResult.profit / 10000).toFixed(1)}万</div>
                </div>
                <div className="p-4 bg-[var(--section-bg)] rounded-lg border border-[var(--border-color)]">
                  <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">总收益率</div>
                  <div className="text-xl font-black text-[var(--warning-color)]">{backtestResult.roi.toFixed(1)}%</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {["position-size", "tax-calc"].includes(activeTab) && (
          <div className="py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-lg animate-in fade-in duration-500">
            <Icon name="construction" size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-[var(--text-tertiary)] italic">该工具正在开发中，敬请期待...</p>
          </div>
        )}
      </div>
    </div>
  );
}
