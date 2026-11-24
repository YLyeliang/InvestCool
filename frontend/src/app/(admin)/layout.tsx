import React from "react";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root-wrapper bg-[var(--bg-color)] text-[var(--text-primary)] min-h-screen">
      {children}
    </div>
  );
}
