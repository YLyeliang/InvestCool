"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { type TickerData, normalizeTickers } from "@/lib/marketData";

export const TickerWatchlist = () => {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      const response = await fetch("/api/watch-list");
      if (response.status === 200) {
        const data = normalizeTickers(await response.json());
        setTickers(data);
        setIsInitializing(data.length === 0);
      } else if (response.status === 202) {
        setIsInitializing(true);
      }
    } catch (e) {
      console.error("Failed to fetch watchlist:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
    const interval = setInterval(fetchWatchlist, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWatchlist]);

  return (
    <div className="card p-4 mt-5">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[var(--border-color)]">
        <h3 className="text-sm font-black text-[var(--text-primary)] uppercase">
          核心科技观察 (MAG7)
        </h3>
        <span className="text-xs text-[var(--text-tertiary)] font-semibold uppercase">实时更新</span>
      </div>

      <div className="flex flex-col gap-3">
        {(isLoading || isInitializing) && tickers.length === 0 ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="space-y-1">
                <Skeleton width="40px" height="0.8rem" />
                <Skeleton width="60px" height="0.6rem" />
              </div>
              <Skeleton width="55px" height="1.5rem" radius="0.4rem" />
            </div>
          ))
        ) : (
          tickers.map((ticker) => (
            <div key={ticker.symbol} className="flex justify-between items-center group cursor-pointer hover:bg-[var(--hover-bg)] -mx-2 px-2 py-2 rounded-lg transition-colors">
              <div className="flex flex-col">
                <span className="text-base font-black text-[var(--text-primary)] group-hover:text-[var(--accent-strong)] transition-colors">
                  {ticker.symbol}
                </span>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  ${ticker.price.toFixed(2)}
                </span>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-black",
                ticker.percent >= 0 
                  ? "text-[var(--success-color)] bg-emerald-500/10" 
                  : "text-[var(--danger-color)] bg-rose-500/10"
              )}>
                <Icon 
                  name={ticker.percent >= 0 ? "lucide:trending-up" : "lucide:trending-down"} 
                  className="size-3" 
                />
                <span>{ticker.percent >= 0 ? "+" : ""}{ticker.percent}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
