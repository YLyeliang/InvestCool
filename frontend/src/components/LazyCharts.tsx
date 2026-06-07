"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

// 懒加载 MarketSentimentGauge
export const LazyMarketSentimentGauge = dynamic(
  () => import("./MarketSentimentGauge").then(mod => mod.MarketSentimentGauge),
  { 
    ssr: false, 
    loading: () => <Skeleton width="100%" height="180px" radius="1rem" /> 
  }
);

// 懒加载 SentimentTrendChart
export const LazySentimentTrendChart = dynamic(
  () => import("./SentimentTrendChart").then(mod => mod.SentimentTrendChart),
  { 
    ssr: false, 
    loading: () => <Skeleton width="100%" height="150px" radius="1rem" /> 
  }
);
