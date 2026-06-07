"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminEditor } from "@/components/admin/AdminEditor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

type View = "dashboard" | "archive" | "trash" | "editor";

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [articles, setArticles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [trafficStats, setTrafficStats] = useState({
    today_visits: 0,
    total_visits: 0,
    active_users: 0,
    bounce_rate: "0%"
  });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('investcool-admin-token')}`
  }), []);

  const fetchData = useCallback(async () => {
    try {
      const [resContent, resStats] = await Promise.all([
        fetch("/api/admin/all-content", { headers: getHeaders() }),
        fetch("/api/admin/stats", { headers: getHeaders() })
      ]);
      if (resContent.ok) {
        const data = await resContent.json();
        setArticles(Array.isArray(data) ? data : []);
      }
      if (resStats.ok) setTrafficStats(await resStats.json());
    } catch (e) {
      console.error("Fetch data error:", e);
    }
  }, [getHeaders]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/verify", { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        localStorage.setItem('investcool-admin-token', token);
        setIsAuthorized(true);
        fetchData();
      } else {
        setAuthError("令牌错误");
      }
    } catch {
      setAuthError("连接失败");
    }
  };

  const logout = () => {
    localStorage.removeItem('investcool-admin-token');
    setIsAuthorized(false);
    setArticles([]);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('investcool-admin-token');
    if (savedToken) {
      setToken(savedToken);
      fetch("/api/auth/verify", { 
        headers: { 'Authorization': `Bearer ${savedToken}` } 
      }).then(res => {
        if (res.ok) {
          setIsAuthorized(true);
          fetchData();
        } else {
          localStorage.removeItem('investcool-admin-token');
        }
      });
    }
  }, [fetchData]);

  const handleSave = async (formData: any) => {
    setIsSaving(true);
    try {
      const url = editingItem ? `/api/analysis/${editingItem.id}` : "/api/analysis";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchData();
        setActiveView("archive");
        setEditingItem(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const moveToTrash = async (id: number) => {
    if (!confirm('确定移至回收站吗？内容将从前台下线。')) return;
    await fetch(`/api/analysis/${id}`, { method: 'DELETE', headers: getHeaders() });
    fetchData();
  };

  const restoreItem = async (id: number) => {
    await fetch(`/api/admin/restore/${id}`, { method: 'POST', headers: getHeaders() });
    fetchData();
  };

  const hardDelete = async (id: number) => {
    if (!confirm('【警告】此操作将从数据库彻底抹除该记录！确定吗？')) return;
    await fetch(`/api/admin/hard-delete/${id}`, { method: 'DELETE', headers: getHeaders() });
    fetchData();
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-[#0c0c0e] flex items-center justify-center z-[2000]">
        <form onSubmit={handleLogin} className="w-full max-w-sm p-10 space-y-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="flex flex-col items-center space-y-4">
            <div className="size-12 rounded-2xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
              <Icon name="shield-check" size={24} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter italic">Invest Studio</h1>
          </div>
          <div className="space-y-6 text-center">
            <Input 
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="请输入管理验证码"
              size="xl"
              className="text-center font-mono"
            />
            {authError && <p className="text-xs text-red-500 font-bold uppercase tracking-widest">{authError}</p>}
            <Button block size="xl" color="black" className="font-black rounded-2xl shadow-2xl">
              INITIALIZE ACCESS
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const contentStats = [
    { label: '库内总内容', value: articles.filter(a => !a.is_deleted).length, unit: '篇', icon: 'database' },
    { label: '投资分析', value: articles.filter(a => a.content_type === 'analysis' && !a.is_deleted).length, unit: '篇', icon: 'trending-up' },
    { label: '技术项目', value: articles.filter(a => a.content_type === 'tutorial' && !a.is_deleted).length, unit: '个', icon: 'flask-conical' },
    { label: '回收站', value: articles.filter(a => a.is_deleted).length, unit: '篇', icon: 'trash-2' }
  ];

  const displayArticles = articles.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || 
      (a.title && String(a.title).toLowerCase().includes(q)) || 
      (a.category && String(a.category).toLowerCase().includes(q));
    
    const isDeleted = a.is_deleted === true || a.is_deleted === 1;
    const matchView = activeView === 'trash' ? isDeleted : !isDeleted;
    
    return matchSearch && matchView;
  });

  return (
    <div className="admin-layout flex flex-col h-screen w-screen bg-white dark:bg-[#09090b] overflow-hidden fixed inset-0">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-100 dark:border-slate-900 flex flex-col bg-white dark:bg-[#09090b] shrink-0">
          <div className="h-16 flex items-center px-8 border-b border-slate-100 dark:border-slate-900 justify-between">
            <span className="font-black text-xl tracking-tighter italic">Studio.</span>
            <Link href="/" className="text-slate-400 hover:text-blue-500 transition-colors">
              <Icon name="home" size={16} />
            </Link>
          </div>

          <div className="flex-1 py-10 px-4 space-y-1 overflow-y-auto no-scrollbar">
            {[
              { id: 'dashboard', label: '仪表盘概览', icon: 'layout-grid' },
              { id: 'archive', label: '文章库管理', icon: 'box' },
              { id: 'trash', label: '回收站管理', icon: 'trash-2' }
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => { setActiveView(v.id as View); setEditingItem(null); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all",
                  activeView === v.id 
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" 
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                )}
              >
                <Icon name={v.icon} size={16} />
                {v.label}
              </button>
            ))}

            <div className="mt-10 mb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50">Content Creation</div>
            <button 
              onClick={() => { setEditingItem(null); setActiveView("editor"); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
            >
              <Icon name="plus-circle" size={16} />
              撰写新文章
            </button>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-900 space-y-4">
            <button onClick={logout} className="w-full flex items-center gap-2 px-4 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">
              <Icon name="log-out" size={14} /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#09090b]">
          {activeView !== "editor" && (
            <header className="h-16 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between px-8 bg-white dark:bg-[#09090b]">
              <h2 className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase italic">{activeView}</h2>
              <Button color="black" size="sm" className="px-6 rounded-xl h-9" onClick={() => { setEditingItem(null); setActiveView("editor"); }}>
                New Content
              </Button>
            </header>
          )}

          <div className={cn(
            "flex-1 overflow-y-auto custom-scrollbar",
            activeView !== "editor" ? "p-8 lg:p-16" : ""
          )}>
            {activeView === "dashboard" && (
              <div className="max-w-6xl mx-auto">
                <AdminDashboard trafficStats={trafficStats} contentStats={contentStats} />
              </div>
            )}

            {activeView === "editor" && (
              <AdminEditor 
                initialData={editingItem} 
                onSave={handleSave} 
                onCancel={() => setActiveView("archive")} 
                isSaving={isSaving}
              />
            )}

            {(activeView === "archive" || activeView === "trash") && (
              <div className="max-w-6xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                  <div className="space-y-2">
                    <h3 className="text-5xl font-black tracking-tighter">{activeView === 'trash' ? '回收站' : '内容库'}</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest opacity-50">{displayArticles.length} items retrieved</p>
                  </div>
                  <div className="w-full md:w-80">
                    <Input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="检索内容关键字..."
                      variant="subtle"
                      size="lg"
                      icon={<Icon name="search" size={18} />}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {displayArticles.map((item) => (
                    <div key={item.id} className="group p-8 border border-slate-100 dark:border-slate-900 bg-white dark:bg-[#0c0c0e] rounded-[2rem] hover:border-black dark:hover:border-white transition-all flex items-center justify-between shadow-sm">
                      <div className="min-w-0 flex-1 pr-10">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge color={item.content_type === 'analysis' ? 'blue' : 'emerald'} variant="subtle">
                            {item.content_type === 'analysis' ? '深研' : '实验室'}
                          </Badge>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.category}</span>
                        </div>
                        <h4 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:underline" onClick={() => activeView !== 'trash' && (setEditingItem(item), setActiveView('editor'))}>
                          {item.title}
                        </h4>
                        <div className="text-xs font-bold text-slate-400 mt-3 font-mono opacity-50 uppercase tracking-tighter">
                          INDEXED: {item.created_at?.split('T')[0]} {"//"} RECORD_ID: #{item.id}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {item.is_deleted ? (
                          <>
                            <Button variant="soft" color="primary" size="sm" onClick={() => restoreItem(item.id)}>恢复</Button>
                            <Button variant="soft" color="red" size="sm" onClick={() => hardDelete(item.id)}>粉碎</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="soft" color="neutral" size="sm" onClick={() => { setEditingItem(item); setActiveView("editor"); }}>编辑</Button>
                            <Button variant="soft" color="red" size="sm" onClick={() => moveToTrash(item.id)} icon={<Icon name="trash-2" size={14} />} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {displayArticles.length === 0 && (
                    <div className="py-40 text-center flex flex-col items-center opacity-20">
                      <Icon name="inbox" size={64} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">No records found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
