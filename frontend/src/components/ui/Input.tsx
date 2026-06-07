"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: "solid" | "subtle";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
}

export const Input = ({
  className,
  variant = "solid",
  size = "md",
  icon,
  ...props
}: InputProps) => {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
    xl: "px-6 py-3.5 text-lg",
  };

  const variants = {
    solid: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500",
    subtle: "bg-slate-50 dark:bg-slate-900/50 border-none focus:ring-2 ring-blue-500/20",
  };

  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
      )}
      <input
        className={cn(
          "w-full rounded-xl outline-none transition-all font-medium",
          sizes[size],
          variants[variant],
          icon && "pl-10",
          className
        )}
        {...props}
      />
    </div>
  );
};
