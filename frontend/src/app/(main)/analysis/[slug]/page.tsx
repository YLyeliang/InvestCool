import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import { getDocBySlug } from "@/lib/cms";
import { ReadingProgress } from "@/components/ui/ReadingProgress";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getDocBySlug("analysis", slug);
  
  if (!article) {
    return notFound();
  }

  const dateStr = article.date || article.created_at || new Date().toISOString();

  return (
    <div className="article-container relative pb-24">
      <ReadingProgress />
      
      {/* Decorative Background Blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-blue-500/5 blur-[120px] -z-10 pointer-events-none"></div>

      <div className="max-w-[820px] mx-auto px-6">
        <header className="pt-16 pb-12 text-center">
          <Link href="/analysis" className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors no-underline font-bold text-xs uppercase tracking-widest mb-12 group">
            <Icon name="arrow-left" className="size-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Research
          </Link>

          <div className="flex flex-col items-center gap-6 mb-8">
            <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">
              {article.category || "深度投研"}
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[var(--text-primary)] leading-[1.05] max-w-3xl">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-400 font-bold uppercase tracking-tight">
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" size={14} />
                {formatDate(dateStr)}
              </span>
              <span className="size-1 rounded-full bg-slate-200"></span>
              <span>By InvestCool Team</span>
            </div>
          </div>

          {article.summary && (
            <div className="mt-12 p-8 bg-white dark:bg-slate-900 border border-[var(--border-color)] rounded-[2rem] text-left shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Icon name="quote" size={80} />
              </div>
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Executive Summary</h4>
              <p className="text-xl font-medium text-[var(--text-secondary)] leading-relaxed italic m-0">
                {article.summary}
              </p>
            </div>
          )}
        </header>

        {article.cover && (
          <div className="mb-16 rounded-[2.5rem] overflow-hidden border border-[var(--border-color)] shadow-2xl relative aspect-[21/9]">
            <Image 
              src={article.cover} 
              alt={article.title} 
              fill 
              priority
              className="object-cover" 
            />
          </div>
        )}

        <article 
          className="prose-modern selection:bg-blue-500/10"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />

        <footer className="mt-24 pt-12 border-t border-[var(--border-color)]">
          <div className="p-10 bg-slate-900 text-white rounded-[2.5rem] flex flex-col md:flex-row gap-10 items-center justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 size-64 bg-blue-500/20 blur-3xl -z-0 group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="relative z-10 max-w-md">
              <h4 className="text-2xl font-black mb-2 italic">想获取更多独家因子？</h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                加入我们的 Pro 会员，解锁纳斯达克 100 深度回测报告与实时大额异动提醒。
              </p>
            </div>
            <button className="relative z-10 px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
              UPGRADE TO PRO
            </button>
          </div>
          
          <div className="mt-12 flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
            <Icon name="info" className="size-5 text-slate-400 mt-1 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed m-0 font-medium">
              免责声明：本文仅供投研交流参考，不构成任何投资建议。市场有风险，入市需谨慎。InvestCool 平台不保证信息的绝对准确性与实时性。
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
