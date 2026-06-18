import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import { getDocBySlug } from "@/lib/cms";
import { ReadingProgress } from "@/components/ui/ReadingProgress";
import { getReliableCover } from "@/lib/images";

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
      
      <div className="max-w-[900px] mx-auto px-4 md:px-6">
        <header className="pt-10 md:pt-12 pb-10 text-left">
          <Link href="/analysis" className="inline-flex items-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--accent-strong)] transition-colors no-underline font-bold text-sm uppercase mb-10 group">
            <Icon name="arrow-left" className="size-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Research
          </Link>

          <div className="flex flex-col items-start gap-5 mb-8">
            <span className="px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)] text-xs font-black uppercase">
              {article.category || "深度投研"}
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-[var(--text-primary)] leading-tight max-w-4xl">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)] font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" size={14} />
                {formatDate(dateStr)}
              </span>
              <span className="size-1 rounded-full bg-[var(--border-color)]"></span>
              <span>By InvestCool Team</span>
            </div>
          </div>

          {article.summary && (
            <div className="mt-10 p-6 md:p-7 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg text-left relative overflow-hidden shadow-sm">
              <h4 className="text-xs font-black text-[var(--accent-strong)] uppercase mb-4">Executive Summary</h4>
              <p className="text-lg md:text-xl font-semibold text-[var(--text-primary)] leading-8 m-0">
                {article.summary}
              </p>
            </div>
          )}
        </header>

        {article.cover && (
          <div className="mb-14 rounded-lg overflow-hidden border border-[var(--border-color)] shadow-sm relative aspect-[21/9]">
            <Image 
              src={getReliableCover(article.cover)} 
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
          <div className="p-8 bg-[var(--text-primary)] text-[var(--card-bg)] rounded-lg flex flex-col md:flex-row gap-8 items-center justify-between overflow-hidden relative group">
            <div className="relative z-10 max-w-md">
              <h4 className="text-2xl font-black mb-2">想获取更多独家因子？</h4>
              <p className="text-[var(--card-bg)]/75 text-sm font-medium leading-relaxed">
                加入我们的 Pro 会员，解锁纳斯达克 100 深度回测报告与实时大额异动提醒。
              </p>
            </div>
            <button className="relative z-10 px-8 py-3 bg-[var(--card-bg)] text-[var(--text-primary)] rounded-lg font-black text-sm shadow-sm hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
              UPGRADE TO PRO
            </button>
          </div>
          
          <div className="mt-12 flex items-start gap-4 p-6 bg-[var(--section-bg)] rounded-lg border border-[var(--border-color)]">
            <Icon name="info" className="size-5 text-[var(--text-tertiary)] mt-1 shrink-0" />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed m-0 font-medium">
              免责声明：本文仅供投研交流参考，不构成任何投资建议。市场有风险，入市需谨慎。InvestCool 平台不保证信息的绝对准确性与实时性。
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
