"use client";

import React from "react";
import * as Icons from "lucide-react";
import { LucideIcon as LucideIconType, LucideProps } from "lucide-react";

interface IconProps extends LucideProps {
  name: string;
}

export const Icon = ({ name, ...props }: IconProps) => {
  if (!name) return null;

  // 处理前缀 lucide:
  const cleanName = name.includes(":") ? name.split(":")[1] : name;
  
  // 转换为 PascalCase
  const pascalName = cleanName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  // 从 lucide-react 导出对象中获取图标组件
  const iconMap = Icons as unknown as Record<string, LucideIconType>;
  const LucideIcon = iconMap[pascalName];

  if (!LucideIcon) {
    const Fallback = iconMap.HelpCircle;
    return <Fallback {...props} />;
  }

  return <LucideIcon {...props} />;
};
