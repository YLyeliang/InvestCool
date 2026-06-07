"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { GridComponent, TooltipComponent } from "echarts/components";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

// Register necessary components
echarts.use([LineChart, CanvasRenderer, GridComponent, TooltipComponent]);

interface SentimentHistory {
  timestamp: string;
  value: number;
}

export const SentimentTrendChart = () => {
  const [data, setData] = useState<SentimentHistory[] | null>(null);
  const [pending, setPending] = useState(true);
  const [isError, setIsError] = useState(false);
  const chartRef = useRef<any>(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/market-index/history");
      if (response.ok) {
        const result = await response.json();
        if (result.length > 0) {
          setData(result);
          setIsError(false);
        }
      } else {
        throw new Error("History Fetch Error");
      }
    } catch (e) {
      console.error("Failed to fetch sentiment history:", e);
      setIsError(true);
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const refreshInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchHistory();
      }
    }, 10 * 60 * 1000); // 10 min

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchHistory();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const getOption = () => {
    if (!data) return {};

    const isDark =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    const labelColor = isDark ? "#64748b" : "#94a3b8";
    const lineColor = "#3b82f6";

    const dates = data.map((item) => {
      const d = new Date(item.timestamp);
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
    });
    const values = data.map((item) => item.value);

    return {
      grid: {
        top: 15,
        bottom: 5,
        left: 30,
        right: 5,
        containLabel: false,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        textStyle: { color: isDark ? "#f8fafc" : "#1e293b", fontSize: 11 },
        formatter: (params: any) => {
          const item = params[0];
          return `<div style="font-weight:700">${item.value}</div><div style="font-size:10px;opacity:0.7">${item.name}</div>`;
        },
      },
      xAxis: {
        type: "category",
        data: dates,
        show: false,
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        min: (value: any) => Math.max(0, Math.floor(value.min - 10)),
        max: (value: any) => Math.min(100, Math.ceil(value.max + 10)),
        splitNumber: 3,
        axisLabel: { color: labelColor, fontSize: 9 },
        splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
      },
      series: [
        {
          data: values,
          type: "line",
          smooth: 0.4,
          showSymbol: false,
          lineStyle: { width: 3, color: lineColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(3b, 130, 246, 0.25)" },
              { offset: 1, color: "rgba(3b, 130, 246, 0)" },
            ]),
          },
        },
      ],
    };
  };

  return (
    <div className={cn("trend-chart-container card p-4 mt-5 relative", pending && "is-loading")}>
      <div className="chart-header flex justify-between items-center mb-3">
        <div className="title-group flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">情绪趋势</h3>
          {isError && <span className="status-dot w-1.5 height-1.5 rounded-full bg-red-500"></span>}
        </div>
        <span className="text-[10px] text-slate-400">近30次采样</span>
      </div>

      {pending && !data ? (
        <div className="loading-wrapper h-[100px] flex items-center justify-center">
          <Skeleton width="100%" height="100px" />
        </div>
      ) : (
        <div className="trend-chart h-[100px] w-full">
          <ReactECharts
            ref={chartRef}
            option={getOption()}
            style={{ height: "100%", width: "100%" }}
            theme={typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"}
          />
        </div>
      )}

      {isError && (
        <div className="error-overlay absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-[2px] rounded-xl">
          <button
            className="retry-btn bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500 p-2 rounded-full shadow-sm transition-all"
            onClick={fetchHistory}
          >
            <Icon name="refresh-ccw" size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
