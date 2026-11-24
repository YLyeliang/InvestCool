"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ArticleLibrary } from "@/components/admin/ArticleLibrary";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { AdminEditor } from "@/components/admin/AdminEditor";
import { ConfirmModal, ToastStack } from "@/components/admin/StudioUI";
import {
  type ArticleStatus,
  type ConfirmDialogState,
  EMPTY_STATS,
  type MediaAsset,
  type StudioArticle,
  type StudioArticlePayload,
  type StudioStats,
  type StudioView,
  type ToastItem,
} from "@/components/admin/types";
import { cn } from "@/lib/utils";

const TOKEN_KEY = "investcool-admin-token";

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeView, setActiveView] = useState<StudioView>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [articles, setArticles] = useState<StudioArticle[]>([]);
  const [stats, setStats] = useState<StudioStats>(EMPTY_STATS);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  const [editingItem, setEditingItem] = useState<
    StudioArticle | Partial<StudioArticlePayload> | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingMd, setIsSyncingMd] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);

  const notify = useCallback((type: ToastItem["type"], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getAuthHeader = useCallback((): Record<string, string> => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) || "" : "";
    return { Authorization: `Bearer ${saved}` };
  }, []);

  const getJsonHeaders = useCallback(
    (): Record<string, string> => ({
      "Content-Type": "application/json",
      ...getAuthHeader(),
    }),
    [getAuthHeader]
  );

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/uploads", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setMediaAssets(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Fetch media error:", e);
    }
  }, [getAuthHeader]);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [resContent, resStats, resMedia] = await Promise.all([
        fetch("/api/admin/all-content", { headers: getAuthHeader() }),
        fetch("/api/admin/stats", { headers: getAuthHeader() }),
        fetch("/api/admin/uploads", { headers: getAuthHeader() }),
      ]);
      if (resContent.ok) {
        const data = await resContent.json();
        setArticles(Array.isArray(data) ? data : []);
      }
      if (resStats.ok) {
        const st = await resStats.json();
        setStats({
          ...EMPTY_STATS,
          ...st,
          content: { ...EMPTY_STATS.content, ...(st.content || {}) },
          system: { ...EMPTY_STATS.system, ...(st.system || {}) },
        });
      }
      if (resMedia.ok) {
        const uploads = await resMedia.json();
        setMediaAssets(Array.isArray(uploads) ? uploads : []);
      }
    } catch (e) {
      console.error("Fetch Studio data error:", e);
      notify("error", "拉取后台数据失败，请检查后端服务状态");
    } finally {
      setIsRefreshing(false);
    }
  }, [getAuthHeader, notify]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!token.trim()) {
      setAuthError("请输入管理验证码");
      return;
    }
    try {
      const res = await fetch("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      if (res.ok) {
        localStorage.setItem(TOKEN_KEY, token.trim());
        setIsAuthorized(true);
        fetchData();
      } else if (res.status === 503) {
        setAuthError("服务器尚未配置 ADMIN_TOKEN");
      } else {
        setAuthError("验证码错误，请重试");
      }
    } catch {
      setAuthError("无法连接后端服务");
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthorized(false);
    setArticles([]);
    setToken("");
  };

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setCheckingAuth(false);
      return;
    }
    setToken(savedToken);
    fetch("/api/auth/verify", {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then((res) => {
        if (res.ok) {
          setIsAuthorized(true);
          fetchData();
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, [fetchData]);

  const handleUploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: getAuthHeader(),
          body: formData,
        });
        if (res.ok) {
          const result = await res.json();
          return result.url as string;
        }
        const err = await res.json().catch(() => ({}));
        notify("error", err.error || "图片上传失败");
        return null;
      } catch {
        notify("error", "图片上传网络异常");
        return null;
      }
    },
    [getAuthHeader, notify]
  );

  const handleSaveArticle = async (
    formData: StudioArticlePayload,
    targetStatus?: ArticleStatus
  ): Promise<boolean> => {
    setIsSaving(true);
    try {
      const existingId = editingItem && "id" in editingItem ? editingItem.id : undefined;
      const url = existingId ? `/api/analysis/${existingId}` : "/api/analysis";
      const method = existingId ? "PUT" : "POST";
      const payload = {
        ...formData,
        status: targetStatus || formData.status,
      };
      const res = await fetch(url, {
        method,
        headers: getJsonHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = (await res.json()) as StudioArticle;
        await fetchData();
        setEditingItem(saved);
        notify(
          "success",
          payload.status === "published"
            ? "文章已发布并同步到站点"
            : "草稿已保存（不会在前台展示）"
        );
        setActiveView("archive");
        setEditingItem(null);
        return true;
      }
      const err = await res.json().catch(() => ({}));
      notify("error", err.error || "保存失败");
      return false;
    } catch {
      notify("error", "保存请求失败，请检查网络连接");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (article: StudioArticle) => {
    const nextStatus: ArticleStatus = article.status === "published" ? "draft" : "published";
    const res = await fetch(`/api/analysis/${article.id}`, {
      method: "PUT",
      headers: getJsonHeaders(),
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      notify(
        "success",
        nextStatus === "published" ? `《${article.title}》已发布上线` : `《${article.title}》已转为草稿`
      );
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      notify("error", err.error || "状态切换失败");
    }
  };

  const handleTogglePin = async (article: StudioArticle) => {
    const nextPinned = !article.is_pinned;
    const res = await fetch(`/api/analysis/${article.id}`, {
      method: "PUT",
      headers: getJsonHeaders(),
      body: JSON.stringify({ is_pinned: nextPinned }),
    });
    if (res.ok) {
      notify("success", nextPinned ? "已置顶文章" : "已取消置顶");
      fetchData();
    } else {
      notify("error", "置顶操作失败");
    }
  };

  const handleDuplicate = async (article: StudioArticle) => {
    const res = await fetch(`/api/admin/articles/${article.id}/duplicate`, {
      method: "POST",
      headers: getAuthHeader(),
    });
    if (res.ok) {
      notify("success", `已复制《${article.title}》为新草稿`);
      fetchData();
    } else {
      notify("error", "复制文章失败");
    }
  };

  const handleMoveToTrash = (article: StudioArticle) => {
    setConfirmState({
      open: true,
      title: "移至回收站",
      description: `确定将《${article.title}》移至回收站吗？移入后将立即从前台下线，但可随时恢复。`,
      confirmLabel: "移至回收站",
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`/api/analysis/${article.id}`, {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        if (res.ok) {
          notify("info", "文章已移至回收站");
          fetchData();
        } else {
          notify("error", "移入回收站失败");
        }
      },
    });
  };

  const handleRestore = async (article: StudioArticle) => {
    const res = await fetch(`/api/admin/restore/${article.id}`, {
      method: "POST",
      headers: getAuthHeader(),
    });
    if (res.ok) {
      notify("success", `已恢复《${article.title}》`);
      fetchData();
    } else {
      notify("error", "恢复失败");
    }
  };

  const handleHardDelete = (article: StudioArticle) => {
    setConfirmState({
      open: true,
      title: "彻底删除文章",
      description: `此操作将从数据库和磁盘永久删除《${article.title}》，无法撤销！`,
      confirmLabel: "确认彻底删除",
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`/api/admin/hard-delete/${article.id}`, {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        if (res.ok) {
          notify("info", "已彻底删除文章");
          fetchData();
        } else {
          notify("error", "删除失败");
        }
      },
    });
  };

  const handleBatchAction = async (action: string, ids: number[]) => {
    const exec = async () => {
      const res = await fetch("/api/admin/articles/batch", {
        method: "POST",
        headers: getJsonHeaders(),
        body: JSON.stringify({ action, ids }),
      });
      if (res.ok) {
        const data = await res.json();
        notify("success", `批量操作已完成，共处理 ${data.affected ?? ids.length} 篇文章`);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        notify("error", err.error || "批量操作失败");
      }
    };

    if (action === "hard_delete" || action === "trash") {
      setConfirmState({
        open: true,
        title: action === "hard_delete" ? "批量彻底删除" : "批量移至回收站",
        description:
          action === "hard_delete"
            ? `确定永久删除选中的 ${ids.length} 篇文章吗？此操作不可恢复。`
            : `确定将选中的 ${ids.length} 篇文章移至回收站并从前台下线吗？`,
        confirmLabel: action === "hard_delete" ? "确认删除" : "移至回收站",
        danger: true,
        onConfirm: exec,
      });
    } else {
      await exec();
    }
  };

  const handleEmptyTrash = () => {
    setConfirmState({
      open: true,
      title: "清空回收站",
      description: "将永久删除回收站中的所有文章及关联 Markdown 文件，此操作不可恢复。",
      confirmLabel: "确认清空",
      danger: true,
      onConfirm: async () => {
        const res = await fetch("/api/admin/trash/empty", {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          notify("info", `已清空回收站（共删除 ${data.deleted ?? 0} 篇）`);
          fetchData();
        } else {
          notify("error", "清空回收站失败");
        }
      },
    });
  };

  const handleSyncMarkdown = async () => {
    setIsSyncingMd(true);
    try {
      const res = await fetch("/api/admin/sync-markdown", {
        method: "POST",
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        notify(
          "success",
          data.imported > 0
            ? `已同步 ${data.imported} 篇站点 Markdown 到文章库`
            : "站点 Markdown 已全部在库中，无需重复同步"
        );
        if (data.imported > 0) fetchData();
      } else {
        notify("error", "同步站点 Markdown 失败");
      }
    } finally {
      setIsSyncingMd(false);
    }
  };

  const handleDeleteMedia = (asset: MediaAsset) => {
    const usedWarning =
      asset.used_in.length > 0
        ? `警告：该图片当前正被 ${asset.used_in.length} 篇文章引用（${asset.used_in
            .map((u) => u.title)
            .join("、")}），删除后这些文章中的图片将无法显示！`
        : "该图片当前未被任何文章引用，删除后将从服务器永久移除。";

    setConfirmState({
      open: true,
      title: "删除图片资源",
      description: usedWarning,
      confirmLabel: "确认删除",
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`/api/admin/uploads/${encodeURIComponent(asset.filename)}`, {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        if (res.ok) {
          notify("info", `已删除 ${asset.filename}`);
          fetchMedia();
        } else {
          notify("error", "删除图片失败");
        }
      },
    });
  };

  if (checkingAuth) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-color)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
          <span className="size-4 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
          正在验证 Studio 访问权限...
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-color)] flex items-center justify-center p-4 z-[2000]">
        <div className="w-full max-w-sm card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--accent-color)]"
            >
              <Icon name="arrow-left" size={14} />
              返回主站
            </Link>
            <ThemeToggle className="p-1.5" />
          </div>

          <div className="text-center space-y-2.5">
            <div className="size-12 mx-auto rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-color)] border border-[var(--accent-color)]/25 flex items-center justify-center">
              <Icon name="shield-check" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">InvestCool Studio</h1>
            <p className="text-xs text-[var(--text-tertiary)]">内容创作、媒体资产与数据运营后台</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="请输入管理验证码"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-center font-mono text-sm bg-[var(--section-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
            />
            {authError && (
              <p className="text-xs text-center font-semibold text-[var(--danger-color)]">
                {authError}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--accent-color)] text-white hover:opacity-90 transition-opacity shadow-sm"
            >
              进入 Studio 工作台
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeCount = articles.filter((a) => !a.is_deleted).length;
  const draftCount = articles.filter((a) => !a.is_deleted && a.status === "draft").length;
  const trashCount = articles.filter((a) => a.is_deleted).length;

  const navItems: Array<{
    id: Exclude<StudioView, "editor">;
    label: string;
    icon: string;
    badge?: number;
  }> = [
    { id: "dashboard", label: "数据概览", icon: "layout-dashboard" },
    { id: "archive", label: "文章库管理", icon: "file-text", badge: activeCount },
    { id: "media", label: "媒体资源库", icon: "images", badge: mediaAssets.length },
    { id: "trash", label: "回收站", icon: "trash-2", badge: trashCount > 0 ? trashCount : undefined },
  ];

  const openNewEditor = () => {
    setEditingItem(null);
    setActiveView("editor");
    setMobileNavOpen(false);
  };

  const openEditArticle = (item: StudioArticle) => {
    setEditingItem(item);
    setActiveView("editor");
    setMobileNavOpen(false);
  };

  const openImportedDraft = (draft: Partial<StudioArticlePayload>) => {
    setEditingItem(draft);
    setActiveView("editor");
    notify("info", `已载入草稿《${draft.title || "未命名"}》，确认后可保存或发布`);
  };

  return (
    <div className="fixed inset-0 flex bg-[var(--bg-color)] text-[var(--text-primary)] overflow-hidden">
      {/* Mobile Nav Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] flex flex-col transition-transform duration-200",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 px-5 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-[var(--accent-color)] text-white flex items-center justify-center font-bold text-sm">
              IC
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-[var(--text-primary)]">
                InvestCool
              </div>
              <div className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                Studio CMS
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-color)] hover:bg-[var(--hover-bg)]"
            title="返回主站"
          >
            <Icon name="external-link" size={15} />
          </Link>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={openNewEditor}
            className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-[var(--accent-color)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
          >
            <Icon name="pen-square" size={15} />
            撰写新文章
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setEditingItem(null);
                  setMobileNavOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  active
                    ? "bg-[var(--card-bg)] text-[var(--accent-color)] border border-[var(--border-color)] shadow-xs"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-mono",
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--accent-color)]"
                        : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {draftCount > 0 && (
            <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--text-secondary)]">
              当前有 <strong className="text-amber-600 dark:text-amber-400">{draftCount}</strong> 篇草稿待发布
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
          <ThemeToggle className="p-2" />
          <button
            type="button"
            onClick={logout}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--danger-color)] hover:bg-red-500/10 transition-colors"
          >
            <Icon name="log-out" size={14} />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="h-14 lg:hidden shrink-0 border-b border-[var(--border-color)] bg-[var(--card-bg)] px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
          >
            <Icon name="menu" size={18} />
          </button>
          <span className="text-sm font-bold">InvestCool Studio</span>
          <ThemeToggle className="p-1.5" />
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {activeView === "dashboard" && (
              <AdminDashboard
                stats={stats}
                articles={articles}
                onNewArticle={openNewEditor}
                onEditArticle={openEditArticle}
                onNavigate={(v) => setActiveView(v)}
                onRefresh={fetchData}
                isRefreshing={isRefreshing}
              />
            )}

            {(activeView === "archive" || activeView === "trash") && (
              <ArticleLibrary
                mode={activeView}
                articles={articles}
                onNewArticle={openNewEditor}
                onImportDraft={openImportedDraft}
                onEdit={openEditArticle}
                onTogglePublish={handleTogglePublish}
                onTogglePin={handleTogglePin}
                onDuplicate={handleDuplicate}
                onMoveToTrash={handleMoveToTrash}
                onRestore={handleRestore}
                onHardDelete={handleHardDelete}
                onBatchAction={handleBatchAction}
                onEmptyTrash={handleEmptyTrash}
                onSyncMarkdown={handleSyncMarkdown}
                isSyncingMd={isSyncingMd}
              />
            )}

            {activeView === "media" && (
              <MediaLibrary
                assets={mediaAssets}
                onUpload={handleUploadFile}
                onDelete={handleDeleteMedia}
                onRefresh={fetchMedia}
                onNotify={notify}
              />
            )}
          </div>
        </div>
      </main>

      {/* Full-screen Editor Overlay */}
      {activeView === "editor" && (
        <AdminEditor
          initialData={editingItem}
          mediaAssets={mediaAssets}
          onRefreshMedia={fetchMedia}
          onUploadFile={handleUploadFile}
          onDeleteMedia={handleDeleteMedia}
          onSave={handleSaveArticle}
          onCancel={() => {
            setActiveView("archive");
            setEditingItem(null);
          }}
          onNotify={notify}
          isSaving={isSaving}
        />
      )}

      {/* Global Toast & Confirm Modal */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
