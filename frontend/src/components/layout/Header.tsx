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
        "bg-[var(--card-bg)]/96 backdrop-blur-xl border-b border-[var(--border-color)]",
        scrolled && "shadow-sm"
      )}
    >
      <div className="h-full px-4 md:px-6 flex items-center justify-between max-w-[1680px] mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuToggle}
            className="p-2 hover:bg-[var(--hover-bg)] rounded-lg md:hidden transition-colors"
          >
            <Icon name="menu" size={20} />
          </button>
          
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div className="size-9 bg-[var(--accent-color)] rounded-lg flex items-center justify-center shadow-sm">
              <Icon name="trending-up" className="text-[var(--bg-color)] size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                InvestCool<span className="text-[var(--accent-color)]">.</span>
              </span>
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase leading-tight">
                NDX Research
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 mr-3 rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] px-3 py-1.5">
            <div className="size-2 rounded-full bg-[var(--success-color)]"></div>
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Market Live</span>
          </div>
          
          <ThemeToggle />
          
          <div className="h-6 w-px bg-[var(--border-color)] mx-2 hidden md:block"></div>
          
          <Link 
            href="/admin" 
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--card-bg)] rounded-lg text-xs font-bold transition-all hover:opacity-90 active:scale-95 shadow-sm"
          >
            <Icon name="user" size={14} />
            <span className="hidden sm:inline">STUDIO</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
