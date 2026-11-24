"use client";

import React from "react";
import Link from "next/link";
import { MarketQuoteCard } from "../MarketQuoteCard";
import { Icon } from "../ui/Icon";

export const RightPanel = () => {
  return (
    <aside className="right-panel hidden 2xl:flex flex-col gap-6 w-[320px] shrink-0 sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] p-5 overflow-y-auto border-l border-[var(--border-color)] bg-[var(--sidebar-bg)]">
      
      {/* 每日锦报 - 核心挂件 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2 pb-2 border-b border-[var(--border-color)]">
          <Icon name="sparkles" size={14} className="text-[var(--accent-color)]" />
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
            Daily Insights
          </h3>
        </div>
        <MarketQuoteCard />
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold">研究快捷入口</h3>
        {[['/daily', '每日信息', '浏览已发布的市场日志'], ['/tutorials', '学习笔记', '了解研究方法与网站架构'], ['/tools', '投资工具', '试算资金规划与定投情景']].map(([href, title, detail]) => <Link key={href} href={href} className="block rounded-lg p-3 hover:bg-[var(--hover-bg)]"><div className="text-sm font-semibold">{title} ↗</div><p className="text-xs text-[var(--text-tertiary)] mt-1">{detail}</p></Link>)}
      </div>

      {/* 简洁的小挂件 */}
      <div className="mt-auto p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
        <p className="text-xs font-medium text-[var(--accent-strong)] leading-relaxed">
          &ldquo;数据只是表象，逻辑才是投资的护城河。&rdquo;
        </p>
      </div>
    </aside>
  );
};
