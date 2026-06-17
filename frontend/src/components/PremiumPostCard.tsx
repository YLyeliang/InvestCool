"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";
import { getReliableCover } from "@/lib/images";

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
  const coverUrl = getReliableCover(article.cover);
  
  return (
    <Link href={article.path} className="group no-underline block h-full">
      <div className="card p-0 overflow-hidden flex flex-col h-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:border-[var(--accent-color)] transition-all">
        {/* Image Wrapper using Next.js Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-[var(--section-bg)]">
          <Image 
            src={coverUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1 rounded-lg bg-[var(--card-bg)]/95 backdrop-blur-md text-xs font-black text-[var(--accent-strong)] uppercase shadow-sm border border-[var(--border-color)]">
              {article.category || "未分类"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] font-bold mb-3 uppercase">
            <Icon name="lucide:calendar" className="size-3" />
            {formatDate(dateStr)}
          </div>
          
          <h3 className="text-xl font-black text-[var(--text-primary)] leading-snug mb-3 group-hover:text-[var(--accent-strong)] transition-colors line-clamp-2">
            {article.title}
          </h3>
          
          <p className="text-base text-[var(--text-secondary)] leading-7 mb-6 line-clamp-3">
            {article.summary || article.description || "暂无简述..."}
          </p>

          <div className="mt-auto flex items-center gap-2 text-[var(--accent-strong)] font-extrabold text-sm uppercase">
            阅读全文
            <Icon name="lucide:arrow-right" className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};
