"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { type NasdaqData, normalizeNasdaqData } from "@/lib/marketData";

export const NasdaqTracker = () => {
  const [data, setData] = useState<NasdaqData | null>(null);
  const [isError, setIsError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const fetchNasdaq = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch("/api/nasdaq", { 
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" }
      });
      clearTimeout(timeoutId);

      if (response.status === 200) {
        const result = normalizeNasdaqData(await response.json());
        if (result) {
          setData(result);
          setIsError(false);
        } else {
          setIsError(true);
        }
        setIsInitializing(false);
      } else if (response.status === 202) {
        setIsInitializing(true);
        setIsError(false);
      } else {
        throw new Error("API Error");
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Nasdaq fetch error:", e);
        setIsError(true);
        setIsInitializing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchNasdaq();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNasdaq();
      }
    }, 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNasdaq();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNasdaq]);

  const isLive = useMemo(() => {
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    return day >= 1 && day <= 5 && hour >= 14 && hour < 21;
  }, []);

  const formatNumber = (val: number) => {
    return val.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <div className={cn(
      "card relative overflow-hidden group",
      isError && "border-rose-200 dark:border-rose-900/30 bg-rose-50/10"
    )}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-[var(--text-secondary)] uppercase">
              NASDAQ 100
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)] text-xs font-black">
              NDX
            </span>
            {isError && (
              <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/30 text-rose-500 text-[0.65rem] font-bold animate-pulse">
                连接延迟
              </span>
            )}
            {isInitializing && !isError && (
              <span className="text-[0.65rem] font-bold text-amber-500 animate-pulse">
                同步中...
              </span>
            )}
          </div>

          <div className="price-area min-h-[3rem]">
            {data ? (
              <div className="space-y-1">
                <h2 className="text-5xl font-black text-[var(--text-primary)] leading-none">
                  {formatNumber(data.index)}
                </h2>
                <div className={cn(
                  "flex items-center gap-2 text-[0.95rem] font-bold",
                  data.change >= 0 ? "text-[var(--success-color)]" : "text-[var(--danger-color)]"
                )}>
                  <Icon 
                    name={data.change >= 0 ? "lucide:trending-up" : "lucide:trending-down"} 
                    className="size-4" 
                  />
                  <span>{data.change >= 0 ? "+" : ""}{data.change.toFixed(2)}</span>
                  <span className="opacity-70">({data.change >= 0 ? "+" : ""}{data.percent.toFixed(2)}%)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Skeleton width="180px" height="3rem" radius="0.75rem" />
                <Skeleton width="120px" height="1.25rem" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[0.7rem] font-bold transition-colors",
            isLive && !isError && !isInitializing
              ? "bg-emerald-500/10 text-[var(--success-color)]"
              : "bg-[var(--section-bg)] text-[var(--text-secondary)]"
          )}>
            <div className={cn(
              "size-1.5 rounded-full bg-current",
              isLive && !isError && !isInitializing && "animate-pulse shadow-[0_0_8px_currentColor]"
            )} />
            {isError ? "服务离线" : (isInitializing ? "初始化" : (isLive ? "实时行情" : "已收盘"))}
          </div>
          
          {data && (
            <div className="text-xs text-[var(--text-tertiary)] font-semibold">
              {isError ? "上个快照:" : "最后更新:"} {data.last_update}
            </div>
          )}
        </div>
      </div>

      {/* Error Overlay */}
      {isError && (
        <div className="absolute -top-4 -right-4 opacity-10 pointer-events-none">
          <Icon name="lucide:cloud-off" className="size-24 text-rose-500" />
        </div>
      )}
    </div>
  );
};
