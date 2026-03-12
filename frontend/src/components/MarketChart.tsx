import React, { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import type { ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { useMarketData } from "../hooks/useMarketData";

interface MarketChartProps {
  symbol: string;
  height?: number;
}

const MarketChart: React.FC<MarketChartProps> = ({ symbol, height = 400 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useMarketData(symbol);

  useEffect(() => {
    if (!chartContainerRef.current || !data) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#DDD",
      },
      grid: {
        vertLines: { color: "#333" },
        horzLines: { color: "#333" },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    const formattedData: CandlestickData<Time>[] = data.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(formattedData);
    chart.timeScale().fitContent();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height]);

  if (isLoading) return <div style={{ height }}>Loading chart...</div>;
  if (isError) return <div style={{ height }}>Error loading data</div>;

  return <div ref={chartContainerRef} style={{ width: "100%", position: "relative" }} />;
};

export default MarketChart;
