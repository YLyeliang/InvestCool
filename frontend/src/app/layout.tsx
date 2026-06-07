import React from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata = {
  title: 'InvestCool Pro',
  description: 'AI-Powered Finance Terminal',
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
