"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header = ({ onMenuToggle }: HeaderProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-[1100] h-[var(--header-height)] transition-all duration-300",
        scrolled ? "bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-[var(--border-color)] shadow-sm" : "bg-transparent"
      )}
    >
      <div className="h-full px-6 flex items-center justify-between max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuToggle}
            className="p-2 hover:bg-[var(--hover-bg)] rounded-xl md:hidden transition-colors"
          >
            <Icon name="menu" size={20} />
          </button>
          
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div className="size-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Icon name="trending-up" className="text-white size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-[var(--text-primary)] leading-tight">
                InvestCool<span className="text-blue-500">.</span>
              </span>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] leading-tight">
                Intelligence
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 mr-4">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Live</span>
          </div>
          
          <ThemeToggle />
          
          <div className="h-6 w-px bg-[var(--border-color)] mx-2 hidden md:block"></div>
          
          <Link 
            href="/admin" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-md shadow-slate-200 dark:shadow-none"
          >
            <Icon name="user" size={14} />
            <span className="hidden sm:inline">STUDIO</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
