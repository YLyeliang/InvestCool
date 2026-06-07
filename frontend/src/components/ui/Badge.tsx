"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: "blue" | "emerald" | "amber" | "red" | "neutral";
  variant?: "solid" | "subtle" | "outline";
  className?: string;
  size?: "xs" | "sm" | "md";
}

export const Badge = ({
  children,
  color = "blue",
  variant = "subtle",
  className,
  size = "sm",
}: BadgeProps) => {
  const colors = {
    blue: {
      solid: "bg-blue-500 text-white",
      subtle: "bg-blue-50 dark:bg-blue-900/30 text-blue-500",
      outline: "border border-blue-500 text-blue-500",
    },
    emerald: {
      solid: "bg-emerald-500 text-white",
      subtle: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500",
      outline: "border border-emerald-500 text-emerald-500",
    },
    amber: {
      solid: "bg-amber-500 text-white",
      subtle: "bg-amber-50 dark:bg-amber-900/30 text-amber-500",
      outline: "border border-amber-500 text-amber-500",
    },
    red: {
      solid: "bg-red-500 text-white",
      subtle: "bg-red-50 dark:bg-red-900/30 text-red-500",
      outline: "border border-red-500 text-red-500",
    },
    neutral: {
      solid: "bg-slate-500 text-white",
      subtle: "bg-slate-50 dark:bg-slate-800 text-slate-500",
      outline: "border border-slate-200 text-slate-500",
    },
  };

  const sizes = {
    xs: "px-1.5 py-0.5 text-[9px]",
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-black uppercase tracking-wider",
        colors[color][variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};
