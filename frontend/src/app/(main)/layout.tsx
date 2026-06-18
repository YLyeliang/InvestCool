"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { usePathname } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <div className="app-layout flex flex-col min-h-screen">
      <Header onMenuToggle={toggleMenu} />
      
      <div className="page-body flex max-w-[1680px] mx-auto w-full pt-[var(--header-height)] pb-16 md:pb-0">
        <Sidebar isOpen={isMenuOpen} />
        
        {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-[1040] md:hidden backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        <main className="main-feed flex-1 min-w-0 px-4 py-6 md:px-7 md:py-8 xl:px-10 xl:py-10">
          {children}
        </main>

        <RightPanel />
      </div>

      <MobileTabBar />
    </div>
  );
}
