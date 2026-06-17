"use client";

import React from "react";
import { LazyMarketSentimentGauge } from "@/components/LazyCharts";
import { SentimentDuel } from "@/components/SentimentDuel";
import { TickerWatchlist } from "@/components/TickerWatchlist";
import { GlobalMarketBar } from "@/components/GlobalMarketBar";
import { AIRecommendationCard } from "@/components/AIRecommendationCard";

export default function Home() {
  return (
    <div className="finance-terminal max-w-[1240px] mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      
      {/* 1. Global Marquee - Slim Style */}
      <div>
        <GlobalMarketBar />
      </div>

      <main className="grid grid-cols-1 gap-6">
        
        {/* Top Row: AI Strategy & Critical Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <section className="ai-console">
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
              <h2 className="text-sm font-black uppercase text-[var(--text-secondary)]">AI 策略指挥部</h2>
            </div>
            <AIRecommendationCard />
          </section>

          <div className="space-y-6">
            <section className="gauge-console">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                <h2 className="text-sm font-black uppercase text-[var(--text-secondary)]">市场情绪</h2>
              </div>
              <div className="card p-5 min-h-[200px] flex items-center justify-center">
                <LazyMarketSentimentGauge />
              </div>
            </section>
          </div>
        </div>

        {/* Middle Row: MAG7 Focus (Main focus now) */}
        <section className="market-core">
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="size-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
            <h2 className="text-sm font-black uppercase text-[var(--text-secondary)]">核心资产观察 (MAG7)</h2>
          </div>
          <div className="card p-6">
            <TickerWatchlist />
          </div>
        </section>

        {/* Bottom Row: Community Vibe */}
        <section className="community-vibe">
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
            <h2 className="text-sm font-black uppercase text-[var(--text-secondary)]">散户多空博弈</h2>
          </div>
          <div className="card p-6">
            <SentimentDuel />
          </div>
        </section>

      </main>
    </div>
  );
}
