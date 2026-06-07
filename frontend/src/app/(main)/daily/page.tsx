import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { getCollection } from "@/lib/cms";

export const metadata: Metadata = {
  title: "每日信息",
  description: "InvestCool 每日科技观察与市场日志，实时记录技术动态与投资心法。",
};

export default async function DailyPage() {
  const logs = await getCollection("daily");

  return (
    <div className="daily-page space-y-12 pb-20">
      <header className="page-header">
        <h2 className="text-4xl font-black tracking-tighter text-[var(--text-primary)] mb-2">
          每日信息.
        </h2>
        <p className="text-[var(--text-secondary)] font-medium max-w-2xl leading-relaxed">
          记录每一天的技术成长与市场波动。
        </p>
      </header>

      {logs.length > 0 ? (
        <div className="logs-grid grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
          {logs.map((log: any) => (
            <div key={log.slug} className="group card !p-0 flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="log-cover relative h-40 overflow-hidden">
                <img 
                  src={log.cover || "https://images.unsplash.com/photo-1611974714658-058f1510dace?q=80&w=1000"} 
                  alt={log.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white rounded-lg text-[10px] font-black tracking-wider">
                  {log.date}
                </div>
              </div>

              <div className="card-content p-6 flex flex-col flex-1">
                <h3 className="text-xl font-black text-[var(--text-primary)] mb-3 line-clamp-1">{log.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-3 flex-1">
                  {log.description || "暂无描述"}
                </p>
                
                <Link href={`/daily/${log.slug}`} className="text-blue-500 font-bold text-sm flex items-center gap-2 no-underline group/link">
                  阅读日志 <Icon name="lucide:book-open" size={14} className="transition-transform group-hover/link:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-3xl text-slate-400 flex flex-col items-center gap-4">
          <Icon name="lucide:inbox" size={48} className="opacity-20" />
          <p className="italic">暂无简报数据。</p>
        </div>
      )}
    </div>
  );
}
