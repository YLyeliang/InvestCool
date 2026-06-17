"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { type MacroAsset, normalizeMacroAssets } from "@/lib/marketData";

export const MacroAssetPanel = () => {
  const [assets, setAssets] = useState<MacroAsset[]>([]);

  const fetchMacro = async () => {
    try {
      const response = await fetch("/api/macro-assets");
      if (response.status === 200) {
        setAssets(normalizeMacroAssets(await response.json()));
      }
    } catch (e) {
      console.error("Macro fetch error:", e);
    }
  };

  const formatPrice = (val: number) => {
    if (val >= 1000) return val.toLocaleString();
    return val;
  };

  useEffect(() => {
    fetchMacro();
    const refreshInterval = setInterval(fetchMacro, 5 * 60 * 1000); // 5 min
    return () => clearInterval(refreshInterval);
  }, []);

  return (
    <div className="macro-panel card p-4 mt-5">
      <div className="panel-header flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">全球宏观资产</h3>
        <span className="text-[10px] text-slate-400">实时流向</span>
      </div>

      <div className="asset-grid grid grid-cols-3 gap-2">
        {assets.length > 0 ? (
          assets.map((asset) => (
            <div
              key={asset.name}
              className="asset-item flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center"
            >
              <div className="asset-name text-[10px] font-bold text-slate-500 mb-1">
                {asset.name}
              </div>
              <div className="asset-price text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                ${formatPrice(asset.price)}
              </div>
              <div
                className={cn(
                  "asset-change text-[10px] font-semibold px-1 py-0.5 rounded",
                  asset.percent >= 0 ? "text-emerald-500" : "text-red-500"
                )}
              >
                {asset.percent >= 0 ? "+" : ""}
                {asset.percent}%
              </div>
            </div>
          ))
        ) : (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="asset-item flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center"
            >
              <Skeleton width="30px" height="0.7rem" className="mb-1.5" />
              <Skeleton width="50px" height="0.9rem" className="mb-1.5" />
              <Skeleton width="40px" height="0.7rem" radius="0.25rem" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
