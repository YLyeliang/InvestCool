import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  radius?: string;
  style?: React.CSSProperties;
}

export const Skeleton = ({ className, width, height, radius, style }: SkeletonProps) => {
  return (
    <div
      className={cn("animate-pulse bg-slate-200 dark:bg-slate-800", className)}
      style={{
        width: width || "100%",
        height: height || "1rem",
        borderRadius: radius || "0.5rem",
        ...style,
      }}
    />
  );
};
