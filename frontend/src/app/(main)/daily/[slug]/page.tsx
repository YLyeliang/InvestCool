import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getDocBySlug } from "@/lib/cms";

interface DailyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DailyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getDocBySlug("daily", slug);
  
  if (page) {
    return {
      title: page.title,
      description: page.description || "InvestCool 每日科技观察。",
    };
  }
  
  return { title: "每日日志" };
}

export default async function DailyDetailPage({ params }: DailyPageProps) {
  const { slug } = await params;
  const page = await getDocBySlug("daily", slug);
  
  if (!page) {
    return notFound();
  }

  return (
    <div className="daily-detail-page pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-[760px] mx-auto px-4 md:px-0">
        <header className="py-10">
          <Link href="/daily" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-colors no-underline font-bold text-sm mb-10 group">
            <Icon name="lucide:arrow-left" className="size-4 transition-transform group-hover:-translate-x-1" />
            返回列表
          </Link>

          <div className="space-y-6">
            <div className="flex items-center gap-2.5 text-[var(--accent-strong)] text-sm font-black uppercase">
              <Icon name="lucide:calendar" size={16} />
              {page.date}
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-tight">
              {page.title}
            </h1>
            
            {page.description && (
              <p className="text-xl text-[var(--text-secondary)] font-semibold leading-8">
                {page.description}
              </p>
            )}
          </div>
        </header>

        <article 
          className="prose-modern"
          dangerouslySetInnerHTML={{ __html: page.html }}
        />

        <footer className="mt-20 pt-10 border-t border-[var(--border-color)] text-center">
          <p className="text-xs text-[var(--text-tertiary)] font-bold uppercase">
            Daily Market Log @ InvestCool
          </p>
        </footer>
      </div>
    </div>
  );
}
