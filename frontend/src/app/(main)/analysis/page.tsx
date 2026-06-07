import React, { Suspense } from "react";
import { Metadata } from "next";
import { getCollection } from "@/lib/cms";
import { AnalysisListSkeleton } from "./loading-ui";
import AnalysisPageClient from "./AnalysisClient";

export const metadata: Metadata = {
  title: "深度投研分析",
  description: "InvestCool 专家级投研分析报告，深入解析纳斯达克 100 科技龙头与 AI 产业趋势。",
};

async function AnalysisContent() {
  const articles = await getCollection("analysis");
  return <AnalysisPageClient initialArticles={articles} />;
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<AnalysisListSkeleton />}>
      <AnalysisContent />
    </Suspense>
  );
}
