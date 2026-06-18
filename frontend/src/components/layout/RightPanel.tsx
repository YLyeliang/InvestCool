"use client";

import React from "react";
import { MarketQuoteCard } from "../MarketQuoteCard";
import { Icon } from "../ui/Icon";

export const RightPanel = () => {
  return (
    <aside className="right-panel hidden 2xl:flex flex-col gap-6 w-[320px] shrink-0 sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] p-6 overflow-y-auto border-l border-[var(--border-color)] bg-[var(--section-bg)]">
      
      {/* 每日锦报 - 核心挂件 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2 pb-2 border-b border-[var(--border-color)]">
          <Icon name="sparkles" size={14} className="text-[var(--accent-color)]" />
          <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase">
            Daily Insights
          </h3>
        </div>
        <MarketQuoteCard />
      </div>

      {/* 实时快讯挂件 */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <span className="text-xs font-black text-[var(--text-primary)] uppercase">Live News</span>
          <div className="size-1.5 rounded-full bg-[var(--danger-color)]"></div>
        </div>
        <div className="space-y-4">
          {[
            "NDX 指数突破关键阻力位，多头情绪升温。",
            "英伟达算力需求激增，AI 板块再度领涨。",
            "美联储会议纪要发布，市场波动率减小。"
          ].map((news, i) => (
            <div key={i} className="flex gap-3 items-start group cursor-pointer">
              <div className="mt-2 size-1.5 rounded-full bg-[var(--border-color)] group-hover:bg-[var(--accent-color)] transition-colors"></div>
              <p className="text-xs leading-6 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-semibold">
                {news}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 简洁的小挂件 */}
      <div className="mt-auto p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
        <p className="text-xs font-bold text-[var(--accent-strong)] leading-relaxed">
          &ldquo;数据只是表象，逻辑才是投资的护城河。&rdquo;
        </p>
      </div>
    </aside>
  );
};
