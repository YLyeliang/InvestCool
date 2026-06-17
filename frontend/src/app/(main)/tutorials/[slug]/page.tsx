import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getDocBySlug } from "@/lib/cms";
import { getReliableCover } from "@/lib/images";

interface TutorialPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TutorialPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tutorial = await getDocBySlug("tutorials", slug);
  
  if (tutorial) {
    return {
      title: tutorial.title,
      description: tutorial.summary || "InvestCool 技术开发与投资工具教程。",
    };
  }
  
  return { title: "教程" };
}

export default async function TutorialDetailPage({ params }: TutorialPageProps) {
  const { slug } = await params;
  const tutorial = await getDocBySlug("tutorials", slug);
  
  if (!tutorial) {
    return notFound();
  }

  return (
    <div className="tutorial-detail-page pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-[760px] mx-auto px-4 md:px-0">
        <header className="py-10">
          <Link href="/tutorials" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-colors no-underline font-bold text-sm mb-10 group">
            <Icon name="lucide:arrow-left" className="size-4 transition-transform group-hover:-translate-x-1" />
            返回列表
          </Link>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)] text-xs font-black uppercase">
                {tutorial.category || "技术教程"}
              </span>
              <span className="text-sm text-[var(--text-tertiary)] font-bold flex items-center gap-1.5">
                <Icon name="lucide:calendar" className="size-3.5" />
                {formatDate(tutorial.date || tutorial.created_at || new Date().toISOString())}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-tight">
              {tutorial.title}
            </h1>
          </div>
        </header>

        {tutorial.cover && (
          <div className="mb-12 rounded-lg overflow-hidden border border-[var(--border-color)] shadow-sm">
            <img src={getReliableCover(tutorial.cover)} alt={tutorial.title} className="w-full h-auto" />
          </div>
        )}

        <article 
          className="prose-modern"
          dangerouslySetInnerHTML={{ __html: tutorial.html }}
        />

        <footer className="mt-20 pt-10 border-t border-[var(--border-color)] text-center">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed m-0">
            本文为 InvestCool 原创技术教程，转载请注明出处。
          </p>
        </footer>
      </div>
    </div>
  );
}
