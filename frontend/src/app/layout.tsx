import React from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata = {
  title: 'InvestCool Pro',
  description: '纳斯达克市场观察、深度研究与投资工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased overflow-x-hidden">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
