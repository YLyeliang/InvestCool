"use client";

import React, { useState, useMemo, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import {
  type StudioArticle,
  type StudioArticlePayload,
  exportArticleMarkdown,
  formatCount,
  formatDateShort,
  formatRelativeTime,
} from "./types";

interface ArticleLibraryProps {
  mode: "archive" | "trash";
  articles: StudioArticle[];
  onNewArticle: () => void;
  onImportDraft: (draft: Partial<StudioArticlePayload>) => void;
  onEdit: (article: StudioArticle) => void;
  onTogglePublish: (article: StudioArticle) => void;
  onTogglePin: (article: StudioArticle) => void;
  onDuplicate: (article: StudioArticle) => void;
  onMoveToTrash: (article: StudioArticle) => void;
  onRestore: (article: StudioArticle) => void;
  onHardDelete: (article: StudioArticle) => void;
  onBatchAction: (action: string, ids: number[]) => Promise<void>;
  onEmptyTrash: () => void;
  onSyncMarkdown: () => Promise<void>;
  isSyncingMd: boolean;
}

type SortKey = "updated" | "created" | "views" | "words";

export const ArticleLibrary = ({
  mode,
  articles,
  onNewArticle,
  onImportDraft,
  onEdit,
  onTogglePublish,
  onTogglePin,
  onDuplicate,
  onMoveToTrash,
  onRestore,
  onHardDelete,
  onBatchAction,
  onEmptyTrash,
  onSyncMarkdown,
  isSyncingMd,
}: ArticleLibraryProps) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "analysis" | "tutorial">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "pinned">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [layout, setLayout] = useState<"table" | "cards">("table");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const scopedArticles = useMemo(
    () => articles.filter((a) => (mode === "trash" ? a.is_deleted : !a.is_deleted)),
    [articles, mode]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    scopedArticles.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [scopedArticles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedArticles
      .filter((a) => {
        if (typeFilter !== "all" && a.content_type !== typeFilter) return false;
        if (mode === "archive") {
          if (statusFilter === "published" && a.status !== "published") return false;
          if (statusFilter === "draft" && a.status !== "draft") return false;
          if (statusFilter === "pinned" && !a.is_pinned) return false;
        }
        if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
        if (q) {
          const inTitle = a.title.toLowerCase().includes(q);
          const inSummary = (a.summary || "").toLowerCase().includes(q);
          const inCategory = (a.category || "").toLowerCase().includes(q);
          const inTags = (a.tags || []).some((t) => t.toLowerCase().includes(q));
          const inId = `#${a.id}` === q || String(a.id) === q;
          if (!inTitle && !inSummary && !inCategory && !inTags && !inId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (mode === "archive" && sortBy === "updated") {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        }
        if (sortBy === "views") return (b.views || 0) - (a.views || 0);
        if (sortBy === "words") return (b.word_count || 0) - (a.word_count || 0);
        if (sortBy === "created") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      });
  }, [scopedArticles, typeFilter, statusFilter, categoryFilter, search, sortBy, mode]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selectedIds.includes(a.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((a) => a.id));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const runBatch = async (action: string) => {
    if (selectedIds.length === 0) return;
    setBatchBusy(true);
    try {
      await onBatchAction(action, selectedIds);
      setSelectedIds([]);
    } finally {
      setBatchBusy(false);
    }
  };

  const handleImportMdFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    let title = file.name.replace(/\.md$/i, "");
    let summary = "";
    let category = "深度分析";
    let cover = "";
    let tags: string[] = [];
    let body = raw;

    const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (fmMatch) {
      const fmLines = fmMatch[1].split("\n");
      body = fmMatch[2].trim();
      for (const line of fmLines) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (k === "title" && v) title = v;
        if ((k === "summary" || k === "description") && v) summary = v;
        if (k === "category" && v) category = v;
        if (k === "cover" && v) cover = v;
        if (k === "tags" && v) {
          try {
            const parsed = JSON.parse(line.slice(idx + 1).trim());
            if (Array.isArray(parsed)) tags = parsed.map(String);
          } catch {
            tags = v.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          }
        }
      }
    }

    onImportDraft({
      title,
      summary,
      category,
      cover,
      tags,
      content: body,
      content_type: category === "技术教程" || category === "量化工具" ? "tutorial" : "analysis",
      status: "draft",
      is_pinned: false,
    });
    if (importInputRef.current) importInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {mode === "trash" ? "回收站" : "文章库管理"}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {mode === "trash"
              ? `共 ${scopedArticles.length} 篇已下线文章，可随时恢复或彻底粉碎`
              : `共 ${scopedArticles.length} 篇文章（已发布 ${scopedArticles.filter((a) => a.status === "published").length} · 草稿 ${scopedArticles.filter((a) => a.status === "draft").length}）`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === "archive" ? (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".md,.markdown,text/markdown"
                className="hidden"
                onChange={handleImportMdFile}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
              >
                <Icon name="file-up" size={14} />
                导入 .md
              </button>
              <button
                type="button"
                onClick={onSyncMarkdown}
                disabled={isSyncingMd}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:opacity-50"
                title="将 frontend/content 目录中尚未入库的 Markdown 文件同步进 Studio"
              >
                <Icon name="folder-sync" size={14} className={cn(isSyncingMd && "animate-spin")} />
                {isSyncingMd ? "同步中..." : "同步站点 MD"}
              </button>
              <button
                type="button"
                onClick={onNewArticle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-color)] text-white hover:opacity-90 shadow-sm"
              >
                <Icon name="plus" size={14} />
                撰写新文章
              </button>
            </>
          ) : (
            scopedArticles.length > 0 && (
              <button
                type="button"
                onClick={onEmptyTrash}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
              >
                <Icon name="trash-2" size={14} />
                清空回收站
              </button>
            )
          )}
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Icon
              name="search"
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题、摘要、分类、标签或 #ID..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-[var(--section-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>

          {/* Type pills */}
          <div className="inline-flex p-1 rounded-xl bg-[var(--section-bg)] border border-[var(--border-color)] self-start">
            {[
              { id: "all", label: "全部栏目" },
              { id: "analysis", label: "深度分析" },
              { id: "tutorial", label: "技术项目" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id as "all" | "analysis" | "tutorial")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                  typeFilter === t.id
                    ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Category & Sort & Layout */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-[var(--section-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none"
            >
              <option value="all">全部分类</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-[var(--section-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none"
            >
              <option value="updated">按最近更新</option>
              <option value="created">按创建时间</option>
              <option value="views">按阅读量</option>
              <option value="words">按字数</option>
            </select>

            <div className="inline-flex p-1 rounded-xl bg-[var(--section-bg)] border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setLayout("table")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  layout === "table"
                    ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)]"
                )}
                title="列表视图"
              >
                <Icon name="list" size={14} />
              </button>
              <button
                type="button"
                onClick={() => setLayout("cards")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  layout === "cards"
                    ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)]"
                )}
                title="卡片视图"
              >
                <Icon name="layout-grid" size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Status pills (Archive only) */}
        {mode === "archive" && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: `全部 (${scopedArticles.length})` },
                {
                  id: "published",
                  label: `已发布 (${scopedArticles.filter((a) => a.status === "published").length})`,
                },
                {
                  id: "draft",
                  label: `草稿箱 (${scopedArticles.filter((a) => a.status === "draft").length})`,
                },
                {
                  id: "pinned",
                  label: `置顶 (${scopedArticles.filter((a) => a.is_pinned).length})`,
                },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as "all" | "published" | "draft" | "pinned")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                    statusFilter === st.id
                      ? "bg-[var(--accent-soft)] text-[var(--accent-color)]"
                      : "text-[var(--text-tertiary)] hover:bg-[var(--hover-bg)]"
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-[var(--text-tertiary)] font-mono">
              显示 {filtered.length} / {scopedArticles.length} 篇
            </span>
          </div>
        )}
      </div>

      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--accent-color)]/40 bg-[var(--accent-soft)]">
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--text-primary)]">
            <span>已选中 {selectedIds.length} 篇文章</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[var(--text-tertiary)] hover:underline"
            >
              取消选择
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "archive" ? (
              <>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => runBatch("publish")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--success-color)] hover:bg-[var(--hover-bg)]"
                >
                  批量发布
                </button>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => runBatch("draft")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                >
                  批量转草稿
                </button>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => runBatch("pin")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                >
                  批量置顶
                </button>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => runBatch("trash")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                >
                  批量移至回收站
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => runBatch("restore")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-color)] text-white hover:opacity-90"
                >
                  批量恢复
                </button>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => runBatch("hard_delete")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                >
                  批量彻底删除
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="card py-20 text-center space-y-3 text-[var(--text-tertiary)]">
          <Icon name={mode === "trash" ? "trash-2" : "inbox"} size={42} className="mx-auto opacity-35" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            {mode === "trash" ? "回收站为空" : "没有找到符合条件的文章"}
          </p>
          {mode === "archive" && scopedArticles.length === 0 && (
            <button
              type="button"
              onClick={onNewArticle}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-color)] text-white"
            >
              <Icon name="plus" size={14} />
              撰写第一篇文章
            </button>
          )}
        </div>
      ) : layout === "table" ? (
        /* Table View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--section-bg)] text-[11px] font-bold text-[var(--text-tertiary)] uppercase">
                  <th className="py-3 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded accent-[var(--accent-color)] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">文章</th>
                  <th className="py-3 px-3 w-28">状态 / 栏目</th>
                  <th className="py-3 px-3 w-28">数据</th>
                  <th className="py-3 px-3 w-32">时间</th>
                  <th className="py-3 pl-3 pr-4 text-right w-48">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "hover:bg-[var(--hover-bg)]/60 transition-colors",
                      selectedIds.includes(item.id) && "bg-[var(--accent-soft)]/50"
                    )}
                  >
                    <td className="py-3.5 pl-4 pr-2 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                        className="mt-1 rounded accent-[var(--accent-color)] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-start gap-3">
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt=""
                            className="size-12 rounded-lg object-cover border border-[var(--border-color)] shrink-0 bg-[var(--section-bg)]"
                          />
                        ) : (
                          <div className="size-12 rounded-lg border border-[var(--border-color)] bg-[var(--section-bg)] flex items-center justify-center text-[var(--text-tertiary)] shrink-0">
                            <Icon name="file-text" size={18} />
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            {item.is_pinned && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0"
                                title="置顶文章"
                              >
                                置顶
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => mode !== "trash" && onEdit(item)}
                              className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-color)] text-left line-clamp-1"
                            >
                              {item.title}
                            </button>
                          </div>
                          {item.summary && (
                            <p className="text-xs text-[var(--text-tertiary)] line-clamp-1">
                              {item.summary}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                              #{item.id}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--section-bg)] text-[var(--text-secondary)]">
                              {item.category}
                            </span>
                            {(item.tags || []).slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-color)]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 align-top">
                      <div className="space-y-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                            mode === "trash"
                              ? "bg-red-500/10 text-[var(--danger-color)]"
                              : item.status === "draft"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/10 text-[var(--success-color)]"
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {mode === "trash" ? "已下线" : item.status === "draft" ? "草稿" : "已发布"}
                        </span>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          {item.content_type === "analysis" ? "深度分析" : "技术项目"}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 align-top font-mono text-xs text-[var(--text-secondary)]">
                      <div>{formatCount(item.word_count)} 字</div>
                      <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        {formatCount(item.views)} 浏览 · {item.reading_time}m
                      </div>
                    </td>
                    <td className="py-3.5 px-3 align-top text-xs text-[var(--text-secondary)]">
                      <div>{formatRelativeTime(mode === "trash" ? item.deleted_at : item.updated_at)}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)] font-mono mt-0.5">
                        建于 {formatDateShort(item.created_at)}
                      </div>
                    </td>
                    <td className="py-3.5 pl-3 pr-4 align-top">
                      <div className="flex items-center justify-end gap-1">
                        {mode === "trash" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onRestore(item)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-soft)] text-[var(--accent-color)] hover:opacity-85"
                            >
                              恢复
                            </button>
                            <button
                              type="button"
                              onClick={() => onHardDelete(item)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-[var(--danger-color)] hover:bg-red-500/20"
                            >
                              彻底删除
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--section-bg)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => onTogglePublish(item)}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                              title={item.status === "published" ? "转为草稿（从前台下线）" : "立即发布"}
                            >
                              <Icon name={item.status === "published" ? "eye-off" : "send"} size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onTogglePin(item)}
                              className={cn(
                                "p-1.5 rounded-lg hover:bg-[var(--hover-bg)]",
                                item.is_pinned ? "text-amber-500" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                              )}
                              title={item.is_pinned ? "取消置顶" : "置顶"}
                            >
                              <Icon name="pin" size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDuplicate(item)}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                              title="复制为草稿"
                            >
                              <Icon name="copy" size={14} />
                            </button>
                            {item.status === "published" && (
                              <a
                                href={item.public_path}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-color)] hover:bg-[var(--hover-bg)]"
                                title="在新标签页查看前台文章"
                              >
                                <Icon name="external-link" size={14} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => exportArticleMarkdown(item)}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                              title="导出 Markdown"
                            >
                              <Icon name="download" size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveToTrash(item)}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--danger-color)] hover:bg-red-500/10"
                              title="移至回收站"
                            >
                              <Icon name="trash-2" size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                "card overflow-hidden flex flex-col justify-between",
                selectedIds.includes(item.id) && "border-[var(--accent-color)]"
              )}
            >
              <div>
                <div className="relative h-36 bg-[var(--section-bg)] border-b border-[var(--border-color)] overflow-hidden">
                  {item.cover ? (
                    <img src={item.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-tertiary)]/40">
                      <Icon name="file-text" size={32} />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                      className="size-4 rounded accent-[var(--accent-color)] cursor-pointer"
                    />
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md",
                        mode === "trash"
                          ? "bg-red-600/85 text-white"
                          : item.status === "draft"
                          ? "bg-amber-600/85 text-white"
                          : "bg-emerald-600/85 text-white"
                      )}
                    >
                      {mode === "trash" ? "已下线" : item.status === "draft" ? "草稿" : "已发布"}
                    </span>
                    {item.is_pinned && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/70 text-amber-300">
                        置顶
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                    <span className="font-semibold text-[var(--accent-color)]">
                      {item.content_type === "analysis" ? "深度分析" : "技术项目"} · {item.category}
                    </span>
                    <span className="font-mono">#{item.id}</span>
                  </div>
                  <h3
                    onClick={() => mode !== "trash" && onEdit(item)}
                    className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--accent-color)] cursor-pointer line-clamp-2 leading-snug"
                  >
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                  {(item.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--section-bg)] text-[var(--text-secondary)]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--section-bg)]/40 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                  {formatCount(item.word_count)}字 · {formatCount(item.views)}览 · {formatRelativeTime(item.updated_at)}
                </span>
                <div className="flex items-center gap-1">
                  {mode === "trash" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onRestore(item)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--accent-soft)] text-[var(--accent-color)]"
                      >
                        恢复
                      </button>
                      <button
                        type="button"
                        onClick={() => onHardDelete(item)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-[var(--danger-color)]"
                      >
                        删除
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePublish(item)}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        title={item.status === "published" ? "转草稿" : "发布"}
                      >
                        <Icon name={item.status === "published" ? "eye-off" : "send"} size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveToTrash(item)}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                        title="移至回收站"
                      >
                        <Icon name="trash-2" size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
