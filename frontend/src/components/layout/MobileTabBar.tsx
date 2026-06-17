"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export const MobileTabBar = () => {
  const pathname = usePathname();

  const items = [
    { label: "首页", path: "/", icon: "lucide:home" },
    { label: "分析", path: "/analysis", icon: "lucide:trending-up" },
    { label: "工具", path: "/tools", icon: "lucide:wrench" },
    { label: "管理", path: "/admin", icon: "lucide:user" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--card-bg)]/95 backdrop-blur-lg border-t border-[var(--border-color)] z-[1100] flex items-center justify-around px-2">
      {items.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[64px] transition-colors",
            pathname === item.path ? "text-[var(--accent-strong)]" : "text-[var(--text-tertiary)]"
          )}
        >
          <Icon name={item.icon} className="size-5" />
          <span className="text-[0.7rem] font-bold uppercase">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};
