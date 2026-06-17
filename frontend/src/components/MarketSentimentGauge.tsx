"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface SentimentData {
  value: number;
  details: Record<string, string>;
}

export const MarketSentimentGauge = () => {
  const [data, setData] = useState<SentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const { theme } = useTheme();
  const echartsRef = useRef<any>(null);

  const fetchMetric = useCallback(async () => {
    try {
      const response = await fetch("/api/market-index");
      if (response.status === 200) {
        const result = await response.json();
        setData(result);
        setIsError(false);
        setIsInitializing(false);
        setIsLoading(false);
      } else if (response.status === 202) {
        setIsInitializing(true);
        setIsError(false);
        setIsLoading(false);
      } else {
        throw new Error("Server Error");
      }
    } catch (e) {
      console.error("Failed to fetch market index:", e);
      setIsError(true);
      setIsInitializing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetric();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchMetric();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchMetric]);

  const formatKey = (key: string) => {
    const map: any = { rsi: "RSI", vix: "VIX", valuation: "估值", macro: "宏观" };
    return map[key] || key;
  };

  const option = {
    series: [
      {
        type: "gauge",
        startAngle: 190,
        endAngle: -10,
        center: ["50%", "70%"],
        radius: "100%",
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 6,
            color: [
              [0.3, "#10b981"],
              [0.5, "#34d399"],
              [0.7, "#fbbf24"],
              [0.85, "#f97316"],
              [1, "#ef4444"],
            ],
          },
        },
        pointer: {
          icon: "path://M12.8,0.7l12,10.1c0.4,0.3,0.4,0.9,0.1,1.2c-0.3,0.4-0.9,0.4-1.2,0.1L12,2.3L0.3,12.1c-0.4,0.3-0.9,0.3-1.2-0.1c-0.3-0.4-0.3-0.9,0.1-1.2L11.2,0.7C11.7,0.3,12.3,0.3,12.8,0.7z",
          length: "10%",
          width: 4,
          offsetCenter: [0, "-50%"],
          itemStyle: { color: isError ? "#64748b" : "auto" },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: theme === "dark" ? "#94a3b8" : "#64748b",
          fontSize: 9,
          distance: -40,
          formatter: function (v: number) {
            if (v === 15) return "极度恐惧";
            if (v === 85) return "极度贪婪";
            return "";
          },
        },
        detail: {
          fontSize: 18,
          offsetCenter: [0, "20%"],
          valueAnimation: true,
          formatter: "{value}",
          color: isError ? "#64748b" : "auto",
          fontWeight: "800",
        },
        data: [{ value: data?.value || 0 }],
      },
    ],
  };

  return (
    <div className={cn(
      "card p-4 flex flex-col relative transition-all",
      isError && "border-rose-200 dark:border-rose-900/30"
    )}>
      <div className="flex justify-between items-center mb-1 text-[var(--text-primary)]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black">市场情绪指数</h3>
          {isError && (
            <span className="text-[0.7rem] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-[var(--danger-color)] uppercase">离线</span>
          )}
          {isInitializing && !isError && (
            <span className="text-[0.7rem] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-[var(--warning-color)] uppercase">同步中</span>
          )}
        </div>
        <span className="text-xs text-[var(--text-tertiary)] font-semibold">10min 自动刷新</span>
      </div>

      <div className="h-[110px] w-full flex items-center justify-center relative">
        {isLoading && !data ? (
          <Skeleton width="100px" height="100px" radius="50%" />
        ) : (
          <ReactECharts
            ref={echartsRef}
            option={option}
            style={{ height: "100%", width: "100%" }}
            className={cn("transition-all duration-500", isError && "grayscale opacity-50")}
          />
        )}

        {isError && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/10 dark:bg-black/10 backdrop-blur-[1px]">
            <button 
              onClick={fetchMetric}
              className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:scale-110 transition-transform"
            >
              <Icon name="lucide:refresh-cw" className="size-5 text-[var(--text-secondary)]" />
            </button>
          </div>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-4 gap-2 mt-2 pt-3 border-t border-dashed border-[var(--border-color)]">
          {Object.entries(data.details).map(([key, val]) => (
            <div key={key} className="flex flex-col items-center">
              <span className="text-xs text-[var(--text-secondary)] mb-0.5">{formatKey(key)}</span>
              <span className="text-sm font-black text-[var(--text-primary)]">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
