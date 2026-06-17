import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getDocBySlug } from "@/lib/cms";

interface AIPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AIPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getDocBySlug("ai", slug);
  
  if (article) {
    return {
      title: article.title,
      description: article.description || "AI 赋能投资深度解析。",
    };
  }
  
  return { title: "AI Insights" };
}

export default async function AIDetailPage({ params }: AIPageProps) {
  const { slug } = await params;
  const article = await getDocBySlug("ai", slug);
  
  if (!article) {
    return notFound();
  }

  return (
    <div className="ai-detail-page pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-[760px] mx-auto px-4 md:px-0">
        <header className="py-10">
          <Link href="/ai" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-colors no-underline font-bold text-sm mb-10 group">
            <Icon name="lucide:arrow-left" className="size-4 transition-transform group-hover:-translate-x-1" />
            返回列表
          </Link>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)] text-xs font-black uppercase">
                AI Insights
              </span>
              <span className="text-sm text-[var(--text-tertiary)] font-bold flex items-center gap-1.5">
                <Icon name="lucide:calendar" className="size-3.5" />
                {formatDate(article.date || article.created_at || new Date().toISOString())}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-tight">
              {article.title}
            </h1>
            
            {article.description && (
              <p className="text-xl text-[var(--text-secondary)] font-semibold leading-8">
                {article.description}
              </p>
            )}
          </div>
        </header>

        <article 
          className="prose-modern"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />

        <footer className="mt-20 pt-10 border-t border-[var(--border-color)] text-center">
          <p className="text-xs text-[var(--text-tertiary)]">
            探索 AI 与投资的边界 @ InvestCool
          </p>
        </footer>
      </div>
    </div>
  );
}
