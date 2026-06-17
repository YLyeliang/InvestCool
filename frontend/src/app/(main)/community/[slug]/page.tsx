import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getReliableCover } from "@/lib/images";

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  try {
    const res = await fetch(`${baseUrl}/content-api/cms/community/${slug}`);
    if (res.ok) {
      const page = await res.json();
      return {
        title: page.title,
        description: page.description || "InvestCool 官方社群交流。",
      };
    }
  } catch {}
  
  return { title: "社区" };
}

export default async function CommunityDetailPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  let page: any = null;
  try {
    const res = await fetch(`${baseUrl}/content-api/cms/community/${slug}`, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) return notFound();
      throw new Error("Failed to load community page");
    }
    page = await res.json();
  } catch (error) {
    console.error("Error loading community page:", error);
    return notFound();
  }

  return (
    <div className="community-detail-page pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-[720px] mx-auto px-4 md:px-0">
        <header className="py-10">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-colors no-underline font-bold text-sm mb-10 group">
            <Icon name="lucide:arrow-left" className="size-4 transition-transform group-hover:-translate-x-1" />
            返回首页
          </Link>

          {page.cover && (
            <div className="mb-10 rounded-lg overflow-hidden shadow-sm border border-[var(--border-color)]">
              <img src={getReliableCover(page.cover)} alt={page.title} className="w-full h-[240px] object-cover" />
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-tight mb-4">
            {page.title}
          </h1>
          
          {page.description && (
            <p className="text-xl text-[var(--text-secondary)] font-semibold leading-8">
              {page.description}
            </p>
          )}
        </header>

        <article 
          className="prose-modern text-lg"
          dangerouslySetInnerHTML={{ __html: page.html }}
        />
      </div>
    </div>
  );
}
