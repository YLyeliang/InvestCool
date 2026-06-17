"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const pathname = usePathname();

  const sections = [
    {
      label: "控制台",
      items: [
        { label: "市场概览", path: "/", icon: "layout-dashboard" },
        { label: "深度投研", path: "/analysis", icon: "trending-up" },
        { label: "量化工具", path: "/tools", icon: "wrench" },
      ],
    },
    {
      label: "研究中心",
      items: [
        { label: "NDX 风险雷达", path: "/risk", icon: "radar" },
        { label: "架构与教程", path: "/tutorials", icon: "book-open" },
      ],
    },
    {
      label: "市场脉动",
      items: [
        { label: "每日锦报", path: "/daily", icon: "calendar-days" },
        { label: "香港开户", path: "/hk-account", icon: "landmark" },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "fixed md:sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] w-[var(--sidebar-width)]",
        "bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 z-[1050] overflow-hidden",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto no-scrollbar">
        {sections.map((section) => (
          <div key={section.label}>
            <h3 className="px-3 text-[11px] font-black uppercase text-[var(--text-tertiary)] mb-3">
              {section.label}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all no-underline group relative",
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] font-black border border-[var(--accent-color)]/20"
                        : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-strong)]"
                    )}
                  >
                    <Icon
                      name={item.icon}
                      size={16}
                      className={cn(
                        "transition-transform group-hover:scale-110",
                        isActive ? "text-[var(--accent-strong)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--accent-strong)]"
                      )}
                    />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 优化后的二维码部分 - 极简紧凑 */}
      <div className="p-4 border-t border-[var(--border-color)] bg-[var(--section-bg)]">
        <h4 className="px-2 text-[11px] font-black text-[var(--text-tertiary)] uppercase mb-3">关注我</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="group/qr flex flex-col items-center gap-1.5">
            <div className="bg-[var(--card-bg)] p-1.5 rounded-lg border border-[var(--border-color)] shadow-sm transition-transform group-hover/qr:scale-105">
              <img src="/images/qrcodes/qr1.jpg" className="size-16 object-cover rounded-md" alt="公众号" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-secondary)]">公众号</span>
          </div>
          <div className="group/qr flex flex-col items-center gap-1.5">
            <div className="bg-[var(--card-bg)] p-1.5 rounded-lg border border-[var(--border-color)] shadow-sm transition-transform group-hover/qr:scale-105">
              <img src="/images/qrcodes/qr2.jpg" className="size-16 object-cover rounded-md" alt="小红书" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-secondary)]">小红书</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
