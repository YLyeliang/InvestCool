"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";

interface AdminDashboardProps {
  trafficStats: {
    today_visits: number;
    total_visits: number;
    active_users: number;
    bounce_rate: string;
  };
  contentStats: Array<{
    label: string;
    value: number;
    unit: string;
    icon: string;
  }>;
}

export const AdminDashboard = ({ trafficStats, contentStats }: AdminDashboardProps) => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="space-y-3">
        <h2 className="text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 dark:text-white">Command Center.</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg italic">InvestCool 核心管理与监控引擎</p>
      </div>

      {/* Traffic Stats */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Traffic Analytics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 border border-slate-100 dark:border-slate-800/60 rounded-2xl bg-white dark:bg-[#121214] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">今日访问</span>
              <Icon name="lucide:activity" className="size-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100">{trafficStats.today_visits}</div>
          </div>
          
          <div className="p-6 border border-slate-100 dark:border-slate-800/60 rounded-2xl bg-white dark:bg-[#121214] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">累计访问</span>
              <Icon name="lucide:globe" className="size-4 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100">
              {(trafficStats.total_visits / 10000).toFixed(1)}<span className="text-lg opacity-50 ml-0.5">w</span>
            </div>
          </div>

          <div className="p-6 border border-slate-100 dark:border-slate-800/60 rounded-2xl bg-white dark:bg-[#121214] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">当前在线</span>
              <Icon name="lucide:users" className="size-4 text-orange-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-orange-500 animate-pulse"></div>
              <div className="text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100">{trafficStats.active_users}</div>
            </div>
          </div>

          <div className="p-6 border border-slate-100 dark:border-slate-800/60 rounded-2xl bg-white dark:bg-[#121214] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">跳出率</span>
              <Icon name="lucide:arrow-down-right" className="size-4 text-rose-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-black tracking-tighter text-slate-800 dark:text-slate-100">{trafficStats.bounce_rate}</div>
          </div>
        </div>
      </div>

      {/* Content Stats */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Content Index</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {contentStats.map((s) => (
            <div key={s.label} className="p-6 border border-slate-100 dark:border-slate-800/60 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:border-black dark:hover:border-white transition-all group">
              <Icon name={s.icon} className="size-5 mb-6 text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</div>
              <div className="text-4xl font-black tracking-tighter text-slate-800 dark:text-slate-200">
                {s.value}<span className="text-sm ml-1 opacity-40 font-medium">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
