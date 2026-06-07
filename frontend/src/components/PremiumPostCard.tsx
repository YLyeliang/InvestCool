"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";

interface PostCardProps {
  article: {
    title: string;
    description?: string;
    summary?: string;
    category?: string;
    date?: string;
    created_at?: string;
    cover?: string;
    path: string;
  };
}

export const PremiumPostCard = ({ article }: PostCardProps) => {
  const dateStr = article.date || article.created_at || new Date().toISOString();
  const coverUrl = article.cover || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1000";
  
  return (
    <Link href={article.path} className="group no-underline block h-full">
      <div className="card p-0 overflow-hidden flex flex-col h-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:border-[var(--accent-color)] transition-all shadow-sm hover:shadow-xl">
        {/* Image Wrapper using Next.js Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
          <Image 
            src={coverUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1 rounded-lg bg-white/90 dark:bg-black/60 backdrop-blur-md text-[0.65rem] font-black text-[var(--accent-color)] uppercase tracking-widest shadow-sm">
              {article.category || "未分类"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-[0.7rem] text-slate-400 font-bold mb-3 uppercase tracking-tighter">
            <Icon name="lucide:calendar" className="size-3" />
            {formatDate(dateStr)}
          </div>
          
          <h3 className="text-xl font-black text-[var(--text-primary)] leading-tight mb-3 group-hover:text-[var(--accent-color)] transition-colors line-clamp-2">
            {article.title}
          </h3>
          
          <p className="text-[0.9rem] text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-3">
            {article.summary || article.description || "暂无简述..."}
          </p>

          <div className="mt-auto flex items-center gap-2 text-[var(--accent-color)] font-extrabold text-[0.8rem] uppercase tracking-wider">
            阅读全文
            <Icon name="lucide:arrow-right" className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};
