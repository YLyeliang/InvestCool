"use client";

import React, { useState, useMemo } from "react";
import { PremiumPostCard } from "@/components/PremiumPostCard";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { ContentMetadata } from "@/lib/cms";

interface AnalysisPageClientProps {
  initialArticles: ContentMetadata[];
}

export default function AnalysisPageClient({ initialArticles }: AnalysisPageClientProps) {
  const [activeCategory, setActiveCategory] = useState("全部");

  // 预设分类与动态分类合并
  const categories = useMemo(() => {
    const dynamic = Array.from(new Set(initialArticles.map(a => a.category)))
      .filter((category): category is string => Boolean(category));
    const standard = ["全部", "投资入门", "深度分析", "公司基本面", "AI 产业"];
    // 合并并去重，保持 standard 的顺序
    return Array.from(new Set([...standard, ...dynamic]));
  }, [initialArticles]);

  const filteredArticles = useMemo(() => {
    if (activeCategory === "全部") return initialArticles;
    return initialArticles.filter(a => a.category === activeCategory);
  }, [activeCategory, initialArticles]);

  return (
    <div className="analysis-page space-y-10 pb-20">
      <header className="page-header space-y-4">
        <h2 className="text-4xl font-black text-[var(--text-primary)]">
          深度投研<span className="text-[var(--accent-color)]">.</span>
        </h2>
        <p className="text-[var(--text-secondary)] font-semibold max-w-2xl leading-7">
          结合宏观经济指标、实时盘面数据与纳指权重股基本面，为您呈现专业的投资见解。
        </p>
      </header>

      {/* 分类导航 - 现代化胶囊设计 */}
      <nav className="category-nav flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar sticky top-[var(--header-height)] z-20 bg-[var(--bg-color)]/95 backdrop-blur-md -mx-4 px-4 py-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-black transition-all whitespace-nowrap border uppercase",
              activeCategory === cat
                ? "bg-[var(--text-primary)] text-[var(--card-bg)] border-transparent shadow-sm"
                : "bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-color)] hover:text-[var(--accent-strong)]"
            )}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* 内容网格 - 带动画 */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {filteredArticles.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8"
            >
              {filteredArticles.map((article) => (
                <motion.div
                  key={article.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <PremiumPostCard article={article} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-32 text-center border-2 border-dashed border-[var(--border-color)] rounded-lg"
            >
              <Icon name="inbox" size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-[var(--text-tertiary)] italic font-medium">该分类下暂无内容，去看看其他频道吧。</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
