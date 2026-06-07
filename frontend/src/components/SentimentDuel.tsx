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
        <h3 className="text-sm font-bold text-[var(--text-primary)]">多空阵营拔河</h3>
        <span className="text-[10px] text-slate-400">过去 24 小时民意</span>
      </div>

      {!hasVoted && !pending ? (
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => vote("bull")}
            className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--hover-bg)] hover:bg-emerald-500/10 hover:border-emerald-500 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🐂</span>
            <span className="text-[0.85rem] font-bold">我看涨</span>
          </button>
          <button 
            onClick={() => vote("bear")}
            className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--hover-bg)] hover:bg-rose-500/10 hover:border-rose-500 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🐻</span>
            <span className="text-[0.85rem] font-bold">我看跌</span>
          </button>
        </div>
      ) : (
        <div className={cn("space-y-4", pending && "opacity-60")}>
          <div className="relative h-10 mt-6 mb-4">
            <div className="flex h-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
              <motion.div 
                initial={{ width: "50%" }}
                animate={{ width: `${bullPct}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center pl-4"
              >
                <span className="text-white font-black text-[0.9rem] drop-shadow-sm">{bullPct}%</span>
              </motion.div>
              <div className="h-full flex-1 bg-gradient-to-r from-rose-400 to-rose-500 flex items-center justify-end pr-4">
                <span className="text-white font-black text-[0.9rem] drop-shadow-sm">{bearPct}%</span>
              </div>
            </div>
            
            <motion.div 
              initial={{ left: "50%" }}
              animate={{ left: `${bullPct}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-8 bg-[var(--card-bg)] border-[3px] border-[var(--border-color)] rounded-full flex items-center justify-center z-10 shadow-md"
            >
              <Icon name="lucide:swords" className="size-4 text-slate-500" />
            </motion.div>
          </div>
          
          <div className="flex justify-between items-center text-[0.7rem] font-bold">
            <span className="text-emerald-500 uppercase tracking-tighter">多头阵营</span>
            <span className="text-slate-400 font-medium">{totalVotes} 人参与</span>
            <span className="text-rose-500 uppercase tracking-tighter">空头阵营</span>
          </div>
        </div>
      )}
    </div>
  );
};
