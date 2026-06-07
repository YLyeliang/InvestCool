"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "ghost" | "soft" | "outline";
  color?: "primary" | "black" | "neutral" | "red";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
}

export const Button = ({
  className,
  variant = "solid",
  color = "primary",
  size = "md",
  loading,
  icon,
  block,
  children,
  ...props
}: ButtonProps) => {
  const variants = {
    solid: {
      primary: "bg-blue-500 text-white hover:bg-blue-600",
      black: "bg-black dark:bg-white text-white dark:text-black hover:opacity-90",
      neutral: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
      red: "bg-red-500 text-white hover:bg-red-600",
    },
    ghost: {
      primary: "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20",
      black: "text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800",
      neutral: "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
      red: "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
    },
    soft: {
      primary: "bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30",
      black: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100",
      neutral: "bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
      red: "bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30",
    },
    outline: {
      primary: "border border-blue-500 text-blue-500 hover:bg-blue-50",
      black: "border border-black dark:border-white text-black dark:text-white hover:bg-slate-50",
      neutral: "border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50",
      red: "border border-red-500 text-red-500 hover:bg-red-50",
    },
  };

  const sizes = {
    xs: "px-2 py-1 text-[10px]",
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    xl: "px-8 py-4 text-lg",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant][color],
        sizes[size],
        block && "w-full",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {!loading && icon}
      {children}
    </button>
  );
};
