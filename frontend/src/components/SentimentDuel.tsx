"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const SentimentDuel = () => {
  const [pending, setPending] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [bullPct, setBullPct] = useState(50);
  const [bearPct, setBearPct] = useState(50);
  const [totalVotes, setTotalVotes] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/poll/status");
      if (res.status === 200) {
        const data = await res.json();
        setBullPct(data.bull_pct);
        setBearPct(data.bear_pct);
        setTotalVotes(data.total);
        
        const localVoted = localStorage.getItem("investcool_voted_24h");
        const isExpired = localVoted ? (Date.now() - parseInt(localVoted)) > 86400000 : true;
        
        setHasVoted(data.has_voted || !isExpired);
      }
    } catch (e) {
      console.error("Poll fetch error:", e);
    } finally {
      setPending(false);
    }
  }, []);

  const vote = async (type: "bull" | "bear") => {
    try {
      const res = await fetch("/api/poll/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      
      if (res.status === 200) {
        localStorage.setItem("investcool_voted_24h", Date.now().toString());
        await fetchStatus();
        setHasVoted(true);
      } else if (res.status === 403) {
        setHasVoted(true);
      }
    } catch (e) {
      console.error("Vote error:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="card p-5">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-sm font-black text-[var(--text-primary)]">多空阵营拔河</h3>
        <span className="text-xs text-[var(--text-tertiary)] font-semibold">过去 24 小时民意</span>
      </div>

      {!hasVoted && !pending ? (
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => vote("bull")}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] hover:bg-emerald-500/10 hover:border-emerald-500 transition-all group"
          >
            <Icon name="lucide:trending-up" className="size-6 text-[var(--success-color)] group-hover:scale-110 transition-transform" />
            <span className="text-[0.85rem] font-bold">我看涨</span>
          </button>
          <button 
            onClick={() => vote("bear")}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] hover:bg-rose-500/10 hover:border-rose-500 transition-all group"
          >
            <Icon name="lucide:trending-down" className="size-6 text-[var(--danger-color)] group-hover:scale-110 transition-transform" />
            <span className="text-[0.85rem] font-bold">我看跌</span>
          </button>
        </div>
      ) : (
        <div className={cn("space-y-4", pending && "opacity-60")}>
          <div className="relative h-10 mt-6 mb-4">
            <div className="flex h-full rounded-lg overflow-hidden bg-[var(--hover-bg)] border border-[var(--border-color)]">
              <motion.div 
                initial={{ width: "50%" }}
                animate={{ width: `${bullPct}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
                className="h-full bg-[var(--success-color)] flex items-center pl-4"
              >
                <span className="text-white font-black text-[0.9rem] drop-shadow-sm">{bullPct}%</span>
              </motion.div>
              <div className="h-full flex-1 bg-[var(--danger-color)] flex items-center justify-end pr-4">
                <span className="text-white font-black text-[0.9rem] drop-shadow-sm">{bearPct}%</span>
              </div>
            </div>
            
            <motion.div 
              initial={{ left: "50%" }}
              animate={{ left: `${bullPct}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-8 bg-[var(--card-bg)] border-[3px] border-[var(--border-color)] rounded-full flex items-center justify-center z-10 shadow-sm"
            >
              <Icon name="lucide:swords" className="size-4 text-[var(--text-secondary)]" />
            </motion.div>
          </div>
          
          <div className="flex justify-between items-center text-[0.7rem] font-bold">
            <span className="text-[var(--success-color)] uppercase">多头阵营</span>
            <span className="text-[var(--text-tertiary)] font-medium">{totalVotes} 人参与</span>
            <span className="text-[var(--danger-color)] uppercase">空头阵营</span>
          </div>
        </div>
      )}
    </div>
  );
};
