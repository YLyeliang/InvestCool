"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { type MacroAsset, type NasdaqData, normalizeMacroAssets, normalizeNasdaqData } from "@/lib/marketData";

export const GlobalMarketBar = () => {
  const [nasdaq, setNasdaq] = useState<NasdaqData | null>(null);
  const [macroAssets, setMacroAssets] = useState<MacroAsset[]>([]);

  const getAssetNameCN = (name: string) => {
    const map: Record<string, string> = {
      DXY: "美元指数",
      GOLD: "纽约金",
      OIL: "布伦特油",
    };
    return map[name] || name;
  };

  const fetchData = async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

    try {
      const [nasdaqRes, macroRes] = await Promise.all([
        fetch("/api/nasdaq"),
        fetch("/api/macro-assets"),
      ]);

      if (nasdaqRes.status === 200) {
        const nextNasdaq = normalizeNasdaqData(await nasdaqRes.json());
        if (nextNasdaq) setNasdaq(nextNasdaq);
      }

      if (macroRes.status === 200) {
        setMacroAssets(normalizeMacroAssets(await macroRes.json()));
      }
    } catch (e) {
      console.error("Market bar fetch error:", e);
    }
  };

  const formatNumber = (val: number) =>
    val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const formatPrice = (val: number) => (val >= 1000 ? val.toLocaleString() : val);

  useEffect(() => {
    fetchData();
    const refreshInterval = setInterval(fetchData, 30 * 1000);
    document.addEventListener("visibilitychange", fetchData);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", fetchData);
    };
  }, []);

  return (
    <div className="market-bar card py-4 px-5 mb-6">
      <div className="market-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 items-center">
        {/* NASDAQ 100 */}
        <div className="market-item highlight flex flex-col md:pr-5 md:border-r border-[var(--border-color)]">
          <div className="item-label flex items-center gap-2 mb-1">
            <span className="name text-xs font-extrabold text-[var(--text-secondary)] uppercase">
              纳斯达克 100
            </span>
            <span className="symbol text-[10px] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded text-[var(--accent-strong)] font-bold">
              NDX
            </span>
          </div>
          {nasdaq ? (
            <div className="item-value flex items-baseline gap-2">
              <span className="price text-xl md:text-2xl font-black text-[var(--text-primary)]">
                {formatNumber(nasdaq.index)}
              </span>
              <span
                className={cn(
                  "change text-xs font-bold",
                  nasdaq.change >= 0 ? "text-[var(--success-color)]" : "text-[var(--danger-color)]"
                )}
              >
                {nasdaq.percent.toFixed(2)}%
              </span>
            </div>
          ) : (
            <Skeleton width="80px" height="1.2rem" />
          )}
        </div>

        {/* Macro Assets */}
        {macroAssets.length > 0 ? (
          macroAssets.map((asset, index) => (
            <div
              key={asset.name}
              className={cn(
                "market-item flex flex-col md:pr-5 border-[var(--border-color)]",
                index !== macroAssets.length - 1 ? "md:border-r" : ""
              )}
            >
              <div className="item-label flex items-center gap-2 mb-1">
                <span className="name text-xs font-extrabold text-[var(--text-secondary)] uppercase">
                  {getAssetNameCN(asset.name)}
                </span>
                <span className="symbol text-[10px] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded text-[var(--accent-strong)] font-bold">
                  {asset.name}
                </span>
              </div>
              <div className="item-value flex items-baseline gap-2">
                <span className="price text-xl md:text-2xl font-black text-[var(--text-primary)]">
                  {(asset.name === "GOLD" || asset.name === "OIL") && "$"}
                  {formatPrice(asset.price)}
                </span>
                <span
                  className={cn(
                    "change text-xs font-bold",
                    asset.percent >= 0 ? "text-[var(--success-color)]" : "text-[var(--danger-color)]"
                  )}
                >
                  {asset.percent >= 0 ? "+" : ""}
                  {asset.percent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))
        ) : (
          [1, 2, 3].map((i) => (
            <div key={i} className="market-item flex flex-col md:pr-5 md:border-r border-[var(--border-color)] last:border-r-0">
              <Skeleton width="40px" height="0.7rem" className="mb-1" />
              <Skeleton width="60px" height="1.2rem" />
            </div>
          ))
        )}
      </div>
      <style jsx>{`
        .highlight {
          background: var(--section-bg);
          margin: -1rem 0;
          padding: 1rem 1.25rem 1rem 0.25rem;
          border-radius: var(--radius-lg);
        }
        @media (max-width: 768px) {
          .highlight {
            margin: 0;
            padding: 0 0 0.4rem 0;
            background: transparent;
          }
        }
      `}</style>
    </div>
  );
};
