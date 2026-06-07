"use client";

import React from "react";
import { Icon } from "./Icon";
import { useTheme } from "../ThemeProvider";
import { cn } from "@/lib/utils";

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center justify-center p-2 rounded-lg transition-all",
        "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
        className
      )}
      title={isDark ? "切换到浅色模式" : "切换到深色模式"}
    >
      <Icon
        name={isDark ? "lucide:sun" : "lucide:moon"}
        className="size-5 text-slate-600 dark:text-slate-300"
      />
    </button>
  );
};
