"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { motion } from "framer-motion";

export default function HKAccountPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="hk-account-page pb-20"
    >
      <header className="mb-12">
        <div className="inline-block px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 text-[0.75rem] font-black uppercase tracking-widest mb-5">
          Global Investing
        </div>
        <h2 className="text-4xl font-black tracking-tighter text-[var(--text-primary)] mb-3">
          香港开户指南.
        </h2>
        <p className="text-[var(--text-secondary)] text-lg font-medium max-w-2xl leading-relaxed">
          打通全球投资第一步。从零开始，一站式解决您的香港银行卡与券商开户难题。
        </p>
      </header>

      {/* Essential Guides Section */}
      <section className="guide-section mb-16">
        <div className="section-heading flex items-center gap-3 mb-8">
          <Icon name="lucide:map" className="size-6 text-blue-500" />
          <h3 className="text-xl font-black text-[var(--text-primary)]">核心攻略</h3>
        </div>
        
        <div className="cards-grid grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nanny-level Guide */}
          <Link href="/hk-account/nanny-guide" className="feature-card group flex items-center gap-6 p-8 bg-white dark:bg-slate-800 border border-[var(--border-color)] rounded-[var(--radius-lg)] no-underline transition-all hover:-translate-y-1 hover:shadow-lg hover:border-blue-500 relative overflow-hidden">
            <div className="card-icon-wrapper size-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/30 text-blue-500">
              <Icon name="lucide:book-open-check" size={28} />
            </div>
            <div className="card-content">
              <h4 className="text-lg font-black text-[var(--text-primary)] mb-1">保姆级开户指南</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0">从准备材料、过港预约到现场话术，手把手教你顺利下卡。</p>
            </div>
            <Icon name="lucide:arrow-right" className="absolute right-6 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
          </Link>

          {/* Quick Guide */}
          <Link href="/hk-account/quick-guide" className="feature-card group flex items-center gap-6 p-8 bg-white dark:bg-slate-800 border border-[var(--border-color)] rounded-[var(--radius-lg)] no-underline transition-all hover:-translate-y-1 hover:shadow-lg hover:border-emerald-500 relative overflow-hidden">
            <div className="card-icon-wrapper size-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500">
              <Icon name="lucide:zap" size={28} />
            </div>
            <div className="card-content">
              <h4 className="text-lg font-black text-[var(--text-primary)] mb-1">快速版开户指南</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0">去粗取精，提炼核心步骤与关键避坑点。适合时间紧凑的投资者。</p>
            </div>
            <Icon name="lucide:arrow-right" className="absolute right-6 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" size={20} />
          </Link>
        </div>
      </section>

      {/* Selection Section */}
      <section className="selection-section mb-16">
        <div className="section-heading flex items-center gap-3 mb-8">
          <Icon name="lucide:landmark" className="size-6 text-blue-500" />
          <h3 className="text-xl font-black text-[var(--text-primary)]">机构选择指南</h3>
        </div>
        
        <div className="cards-grid grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bank Selection */}
          <div className="info-card group flex flex-col p-10 bg-white dark:bg-slate-800 border border-[var(--border-color)] rounded-[var(--radius-lg)] transition-all hover:shadow-xl">
            <div className="card-header flex items-center gap-4 mb-6">
              <div className="icon-box size-14 rounded-2xl flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-amber-500">
                <Icon name="lucide:building-2" size={24} />
              </div>
              <h4 className="text-xl font-black text-[var(--text-primary)]">银行选择</h4>
            </div>
            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">对比中银香港、汇丰、渣打、招商永隆等主流银行的门槛、管理费与体验。</p>
            <ul className="feature-list space-y-4 mb-10 flex-grow">
              {[
                "零门槛虚拟银行推荐",
                "实体银行预约技巧",
                "汇款回国耗时与手续费对比"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-[var(--text-primary)]">
                  <Icon name="lucide:check-circle-2" className="text-emerald-500 shrink-0" size={18} />
                  {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl font-bold text-sm transition-all group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 group-hover:-translate-y-1">
              查看银行对比
            </button>
          </div>

          {/* Broker Selection */}
          <div className="info-card group flex flex-col p-10 bg-white dark:bg-slate-800 border border-[var(--border-color)] rounded-[var(--radius-lg)] transition-all hover:shadow-xl">
            <div className="card-header flex items-center gap-4 mb-6">
              <div className="icon-box size-14 rounded-2xl flex items-center justify-center bg-violet-50 dark:bg-violet-900/20 text-violet-500">
                <Icon name="lucide:line-chart" size={24} />
              </div>
              <h4 className="text-xl font-black text-[var(--text-primary)]">券商选择</h4>
            </div>
            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">富途、长桥、老虎、盈透等头部券商优劣势全方位解析，助你找到最适合的交易平台。</p>
            <ul className="feature-list space-y-4 mb-10 flex-grow">
              {[
                "交易佣金与平台费明细",
                "新手开户羊毛福利汇总",
                "APP使用体验与期权支持"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-[var(--text-primary)]">
                  <Icon name="lucide:check-circle-2" className="text-emerald-500 shrink-0" size={18} />
                  {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl font-bold text-sm transition-all group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 group-hover:-translate-y-1">
              查看券商对比
            </button>
          </div>
        </div>
      </section>

      {/* Future Expansion Section */}
      <section className="future-section">
        <div className="glass-banner flex flex-col lg:flex-row justify-between items-center gap-8 p-10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-[var(--border-color)] rounded-[var(--radius-lg)]">
          <div className="banner-content flex items-center gap-6">
            <Icon name="lucide:rocket" size={40} className="text-slate-400 opacity-60" />
            <div className="banner-text">
              <h4 className="text-xl font-black text-[var(--text-primary)] mb-1">更多高阶玩法筹备中</h4>
              <p className="text-sm text-[var(--text-secondary)] m-0 leading-relaxed">美股期权策略、资金合规回国、离岸架构搭建等硬核内容即将上线...</p>
            </div>
          </div>
          <div className="banner-action flex items-center gap-2.5 px-5 py-2.5 bg-white dark:bg-slate-900 rounded-full border border-[var(--border-color)] text-sm font-bold text-slate-500 whitespace-nowrap">
            <span className="size-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]"></span> 敬请期待
          </div>
        </div>
      </section>
    </motion.div>
  );
}
