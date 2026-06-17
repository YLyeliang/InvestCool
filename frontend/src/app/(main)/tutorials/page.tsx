import React from "react";
import { PremiumPostCard } from "@/components/PremiumPostCard";
import { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { getCollection } from "@/lib/cms";

export const metadata: Metadata = {
  title: "架构与技术教程",
  description: "探索 InvestCool 的系统架构、优化之路及投资技术教程。",
};

export default async function TutorialsPage() {
  const data = await getCollection("tutorials");
  const tutorials = data.filter((item) => item.is_deleted !== "true" && item.is_deleted !== "True");

  return (
    <div className="tutorials-page space-y-12">
      <header className="page-header">
        <div className="inline-block px-3 py-1 bg-[var(--accent-soft)] text-[var(--accent-strong)] rounded-lg text-xs font-black uppercase mb-4">
          System Architecture
        </div>
        <h2 className="text-4xl font-black text-[var(--text-primary)] mb-2">
          架构与技术教程.
        </h2>
        <p className="text-[var(--text-secondary)] font-semibold max-w-2xl leading-7">
          深度解析 InvestCool 如何从单机博客进化为高可用金融研究系统。
        </p>
      </header>

      {tutorials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
          {tutorials.map((item) => (
            <PremiumPostCard key={item.slug} article={item} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-lg">
          <Icon name="book-dashed" size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-[var(--text-tertiary)] italic">教程正在编写中，敬请期待...</p>
        </div>
      )}
    </div>
  );
}
