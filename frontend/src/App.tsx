import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { TrendingUp, LineChart, Newspaper, LayoutGrid } from "lucide-react";
import apiClient from "./api/client";
import { PostCategory } from "./types";
import type { Post } from "./types";
import PostCard from "./components/PostCard";
import "./App.css";

const queryClient = new QueryClient();

function Feed() {
  const [activeTab, setActiveTab] = useState<PostCategory | "all">("all");

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["posts", activeTab],
    queryFn: async () => {
      const { data } = await apiClient.get<Post[]>("/posts/", {
        params: activeTab !== "all" ? { category: activeTab } : {},
      });
      return data;
    },
  });

  const tabs = [
    { id: "all", label: "All Feed", icon: LayoutGrid },
    { id: PostCategory.FINANCE, label: "Finance", icon: Newspaper },
    { id: PostCategory.TECHNICAL_ANALYSIS, label: "Tech Analysis", icon: LineChart },
    { id: PostCategory.MARKET_BRIEF, label: "Market Briefs", icon: TrendingUp },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '40px', color: '#58a6ff' }}>InvestCool</h1>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                cursor: 'pointer',
                color: activeTab === tab.id ? '#fff' : '#8b949e',
                fontWeight: activeTab === tab.id ? '600' : '400'
              }}
            >
              <tab.icon size={20} />
              {tab.label}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <div className="feed-tabs">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="feed">
          {isLoading && <div>Loading intelligence feed...</div>}
          {error && <div>Error loading feed. Is the backend running?</div>}
          {posts?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
              No posts found in this section.
            </div>
          )}
          {posts?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Feed />
    </QueryClientProvider>
  );
}

export default App;
