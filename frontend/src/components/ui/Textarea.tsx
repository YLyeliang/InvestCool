"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "solid" | "subtle" | "none";
}

export const Textarea = ({
  className,
  variant = "solid",
  ...props
}: TextareaProps) => {
  const variants = {
    solid: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500",
    subtle: "bg-slate-50 dark:bg-slate-900/50 border-none focus:ring-2 ring-blue-500/20",
    none: "bg-transparent border-none focus:ring-0",
  };

  return (
    <textarea
      className={cn(
        "w-full rounded-xl outline-none transition-all font-medium p-4",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
