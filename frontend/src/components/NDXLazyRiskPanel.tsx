"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export const NDXLazyRiskPanel = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      {
        rootMargin: "900px 0px",
        threshold: 0.01,
      }
    );

    const element = ref.current;
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div ref={ref}>
      {shouldRender ? (
        children
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--section-bg)] px-5 py-7 text-sm font-semibold text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Icon name="loader-circle" size={16} className="text-[var(--accent-color)]" />
            <span>{label} 将在进入阅读区域前加载</span>
          </div>
        </div>
      )}
    </div>
  );
};
