"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";

interface QuoteData {
  quote: string;
  date?: string;
}

export const MarketQuoteCard = () => {
  const [data, setData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeQuote = (payload: unknown): QuoteData | null => {
    if (!payload || typeof payload !== "object") return null;

    const data = payload as Record<string, unknown>;
    if (typeof data.quote !== "string" || !data.quote.trim()) return null;

    return {
      quote: data.quote,
      date: typeof data.date === "string" ? data.date : undefined,
    };
  };

  const getDateParts = (dateStr?: string) => {
    const fallback = new Date();
    const fallbackParts = {
      day: String(fallback.getDate()).padStart(2, "0"),
      monthIndex: fallback.getMonth(),
    };

    if (!dateStr) return fallbackParts;

    const parts = dateStr.split(".");
    const monthIndex = Number(parts[1]) - 1;

    return {
      day: parts[2] || fallbackParts.day,
      monthIndex: Number.isInteger(monthIndex) && monthIndex >= 0 && monthIndex <= 11
        ? monthIndex
        : fallbackParts.monthIndex,
    };
  };

  const getMonthLabel = (monthIndex: number) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[monthIndex] || months[new Date().getMonth()];
  };

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch("/api/market-quote");
        if (res.status === 200) {
          const result = normalizeQuote(await res.json());
          setData(result);
        }
      } catch (e) {
        console.error("Quote fetch error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuote();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="py-2">
        <Skeleton width="100%" height="120px" radius="1rem" />
      </div>
    );
  }

  if (!data) return null;

  const dateParts = getDateParts(data.date);

  return (
    <div className="group relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-5 hover:border-[var(--accent-color)] transition-all shadow-sm">
      <div className="flex justify-between items-start mb-5">
        <div className="flex flex-col items-center bg-[var(--section-bg)] px-3 py-2 rounded-lg min-w-[3rem] border border-[var(--border-color)]">
          <span className="text-xl font-black text-[var(--accent-color)] leading-none">
            {dateParts.day}
          </span>
          <span className="text-[0.65rem] font-bold uppercase text-[var(--text-secondary)] mt-1">
            {getMonthLabel(dateParts.monthIndex)}
          </span>
        </div>
        <div className="px-2 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)] text-[0.7rem] font-black">
          市场观察员
        </div>
      </div>

      <div className="relative mb-4">
        <Icon name="lucide:quote" className="absolute -top-2 -left-2 size-8 opacity-5 text-[var(--text-primary)]" />
        <p className="text-base leading-7 text-[var(--text-primary)] font-semibold relative z-10">
          {data.quote}
        </p>
      </div>

      <div className="flex justify-end">
        <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase">
          Risk Note
        </span>
      </div>
    </div>
  );
};
