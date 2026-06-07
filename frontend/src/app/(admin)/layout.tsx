import React from "react";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root-wrapper bg-white dark:bg-[#09090b] min-h-screen">
      {children}
    </div>
  );
}
