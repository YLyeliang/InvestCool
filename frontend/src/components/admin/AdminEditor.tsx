"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { marked } from "marked";
import { sanitizeMarkdownHtml } from "@/lib/sanitize";
import { PRESET_COVERS, getReliableCover } from "@/lib/images";
import { cn } from "@/lib/utils";
import { MediaLibrary } from "./MediaLibrary";
import {
  type ArticleStatus,
  type ContentType,
  type MediaAsset,
  PRESET_CATEGORIES,
  type StudioArticle,
  type StudioArticlePayload,
  countMarkdownMetrics,
  exportArticleMarkdown,
} from "./types";

interface AdminEditorProps {
  initialData?: StudioArticle | Partial<StudioArticlePayload> | null;
  mediaAssets: MediaAsset[];
  onRefreshMedia: () => void;
  onUploadFile: (file: File) => Promise<string | null>;
  onDeleteMedia: (asset: MediaAsset) => void;
  onSave: (data: StudioArticlePayload, targetStatus?: ArticleStatus) => Promise<boolean>;
  onCancel: () => void;
  onNotify: (type: "success" | "error" | "info", message: string) => void;
  isSaving: boolean;
}

type EditorMode = "split" | "write" | "preview";

interface HeadingItem {
  level: number;
  text: string;
  offset: number;
}

export const AdminEditor = ({
  initialData,
  mediaAssets,
  onRefreshMedia,
  onUploadFile,
  onDeleteMedia,
  onSave,
  onCancel,
  onNotify,
  isSaving,
}: AdminEditorProps) => {
  const editingId = initialData && "id" in initialData ? initialData.id : undefined;
  const draftStorageKey = `investcool-studio-draft-${editingId ?? "new"}`;

  const [form, setForm] = useState<StudioArticlePayload>({
    title: initialData?.title || "",
    summary: initialData?.summary || "",
    content: initialData?.content || "",
    cover: initialData?.cover || "",
    content_type: (initialData?.content_type as ContentType) || "analysis",
    category: initialData?.category || "深度分析",
    status: (initialData?.status as ArticleStatus) || "draft",
    tags: initialData?.tags || [],
    is_pinned: Boolean(initialData?.is_pinned),
  });

  const [tagInput, setTagInput] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("split");
  const [showMeta, setShowMeta] = useState(true);
  const [showOutline, setShowOutline] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [lastLocalSavedAt, setLastLocalSavedAt] = useState<string | null>(null);
  const [recoverableDraft, setRecoverableDraft] = useState<StudioArticlePayload | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<"content" | "cover" | null>(null);
  const [showPresetCovers, setShowPresetCovers] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const importMdInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    marked.setOptions({ gfm: true, breaks: true });
  }, []);

  // Check for locally auto-saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { data: StudioArticlePayload; savedAt: string };
        if (
          parsed?.data &&
          (parsed.data.title !== (initialData?.title || "") ||
            parsed.data.content !== (initialData?.content || ""))
        ) {
          setRecoverableDraft(parsed.data);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [draftStorageKey, initialData?.content, initialData?.title]);

  // Auto-save dirty form to localStorage
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      try {
        const nowStr = new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({ data: form, savedAt: nowStr })
        );
        setLastLocalSavedAt(nowStr);
      } catch {
        // ignore quota errors
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [form, isDirty, draftStorageKey]);

  // Warn before browser refresh if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Debounced Markdown preview
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!form.content.trim()) {
        setPreviewHtml(
          '<div class="py-16 text-center text-sm opacity-45">在左侧输入 Markdown 内容，此处将实时渲染预览...</div>'
        );
        return;
      }
      try {
        const html = await marked.parse(String(form.content));
        setPreviewHtml(sanitizeMarkdownHtml(html));
      } catch (e) {
        console.error("Markdown parse error:", e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [form.content]);

  const metrics = useMemo(() => countMarkdownMetrics(form.content), [form.content]);

  const headings = useMemo<HeadingItem[]>(() => {
    const result: HeadingItem[] = [];
    const lines = form.content.split("\n");
    let offset = 0;
    let inFence = false;
    for (const line of lines) {
      if (/^```/.test(line.trim())) {
        inFence = !inFence;
      } else if (!inFence) {
        const m = line.match(/^(#{1,3})\s+(.+)$/);
        if (m) {
          result.push({ level: m[1].length, text: m[2].trim(), offset });
        }
      }
      offset += line.length + 1;
    }
    return result;
  }, [form.content]);

  const updateForm = useCallback(
    (updater: (prev: StudioArticlePayload) => StudioArticlePayload) => {
      setForm(updater);
      setIsDirty(true);
    },
    []
  );

  const insertFormat = useCallback(
    (prefix: string, suffix: string = "", placeholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) {
        updateForm((prev) => ({ ...prev, content: prev.content + prefix + placeholder + suffix }));
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selected = value.substring(start, end) || placeholder;
      const next = value.substring(0, start) + prefix + selected + suffix + value.substring(end);
      updateForm((prev) => ({ ...prev, content: next }));

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      });
    },
    [updateForm]
  );

  const handleSaveWithStatus = useCallback(
    async (targetStatus: ArticleStatus) => {
      if (!form.title.trim()) {
        onNotify("error", "请先填写文章标题");
        return;
      }
      if (targetStatus === "published" && !form.content.trim()) {
        onNotify("error", "发布文章时正文不能为空，可先点击「存为草稿」");
        return;
      }
      const ok = await onSave({ ...form, status: targetStatus }, targetStatus);
      if (ok) {
        setIsDirty(false);
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // ignore
        }
      }
    },
    [form, onSave, onNotify, draftStorageKey]
  );

  // Global keyboard shortcuts inside editor
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveWithStatus(form.status);
      } else if (e.key.toLowerCase() === "b" && document.activeElement === textareaRef.current) {
        e.preventDefault();
        insertFormat("**", "**", "加粗文本");
      } else if (e.key.toLowerCase() === "i" && document.activeElement === textareaRef.current) {
        e.preventDefault();
        insertFormat("*", "*", "斜体文本");
      } else if (e.key.toLowerCase() === "k" && document.activeElement === textareaRef.current) {
        e.preventDefault();
        insertFormat("[", "](https://)", "链接文字");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSaveWithStatus, form.status, insertFormat]);

  const handleUploadAndInsert = async (file: File) => {
    setUploadingImage(true);
    try {
      const url = await onUploadFile(file);
      if (url) {
        insertFormat(`\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`);
        onNotify("success", "图片已上传并插入正文");
        onRefreshMedia();
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await onUploadFile(file);
      if (url) {
        updateForm((prev) => ({ ...prev, cover: url }));
        onNotify("success", "封面图已更新");
        onRefreshMedia();
      }
    } finally {
      setUploadingImage(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items || []);
    const imgItem = items.find((i) => i.type.startsWith("image/"));
    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) {
        e.preventDefault();
        await handleUploadAndInsert(file);
      }
    }
  };

  const handleTextareaDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) {
      e.preventDefault();
      for (const f of files) {
        await handleUploadAndInsert(f);
      }
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      insertFormat("  ");
    }
  };

  const addTag = (raw: string) => {
    const parts = raw
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    updateForm((prev) => {
      const next = [...prev.tags];
      for (const p of parts) {
        if (!next.includes(p) && next.length < 12) next.push(p);
      }
      return { ...prev, tags: next };
    });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    updateForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const jumpToHeading = (offset: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (editorMode === "preview") setEditorMode("split");
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(offset, offset);
      const before = textarea.value.slice(0, offset);
      const lineIndex = before.split("\n").length - 1;
      textarea.scrollTop = Math.max(0, lineIndex * 28 - 80);
    });
  };

  const handleImportMd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    let body = raw;
    let nextTitle = form.title;
    let nextSummary = form.summary;
    if (fmMatch) {
      body = fmMatch[2].trim();
      for (const line of fmMatch[1].split("\n")) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (k === "title" && v && !nextTitle) nextTitle = v;
        if ((k === "summary" || k === "description") && v && !nextSummary) nextSummary = v;
      }
    }
    updateForm((prev) => ({
      ...prev,
      title: nextTitle || file.name.replace(/\.md$/i, ""),
      summary: nextSummary,
      content: body,
    }));
    onNotify("success", `已导入 ${file.name}`);
    if (importMdInputRef.current) importMdInputRef.current.value = "";
  };

  const handleSafeBack = () => {
    if (isDirty && !window.confirm("当前文章有尚未提交到服务器的修改（已自动保存在本地草稿），确定离开编辑器吗？")) {
      return;
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-[var(--bg-color)] text-[var(--text-primary)]">
      {/* Top Toolbar */}
      <header className="h-14 shrink-0 border-b border-[var(--border-color)] bg-[var(--card-bg)] px-3 sm:px-5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSafeBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
            title="返回文章库"
          >
            <Icon name="arrow-left" size={16} />
            <span className="hidden sm:inline">返回</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-color)] mx-1" />

          {/* Formatting tools */}
          <div className="flex items-center gap-0.5">
            {[
              { icon: "heading-1", title: "一级标题", fn: () => insertFormat("\n# ", "", "标题") },
              { icon: "heading-2", title: "二级标题", fn: () => insertFormat("\n## ", "", "小节标题") },
              { icon: "heading-3", title: "三级标题", fn: () => insertFormat("\n### ", "", "子标题") },
              { icon: "bold", title: "加粗 (⌘B)", fn: () => insertFormat("**", "**", "加粗文本") },
              { icon: "italic", title: "斜体 (⌘I)", fn: () => insertFormat("*", "*", "斜体文本") },
              { icon: "strikethrough", title: "删除线", fn: () => insertFormat("~~", "~~", "删除内容") },
              { icon: "quote", title: "引用块", fn: () => insertFormat("\n> ", "", "核心观点或引用") },
              { icon: "code", title: "行内代码", fn: () => insertFormat("`", "`", "code") },
              {
                icon: "file-code",
                title: "代码块",
                fn: () => insertFormat("\n```python\n", "\n```\n", "# 代码"),
              },
              { icon: "list", title: "无序列表", fn: () => insertFormat("\n- ", "", "列表项") },
              { icon: "list-ordered", title: "有序列表", fn: () => insertFormat("\n1. ", "", "步骤一") },
              { icon: "list-todo", title: "任务清单", fn: () => insertFormat("\n- [ ] ", "", "待办项") },
              {
                icon: "table",
                title: "插入表格",
                fn: () =>
                  insertFormat(
                    "\n| 指标 | 当前值 | 备注 |\n| --- | --- | --- |\n| 示例 | 100 | 说明 |\n"
                  ),
              },
              { icon: "link", title: "链接 (⌘K)", fn: () => insertFormat("[", "](https://)", "链接文字") },
              { icon: "minus", title: "分割线", fn: () => insertFormat("\n\n---\n\n") },
            ].map((tool) => (
              <button
                key={tool.icon}
                type="button"
                onClick={tool.fn}
                title={tool.title}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
              >
                <Icon name={tool.icon} size={15} />
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--border-color)] mx-1" />

          {/* Image & MD import/export */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            title="上传图片并插入正文（也可直接粘贴或拖拽图片到编辑区）"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-color)] hover:bg-[var(--accent-soft)]"
          >
            <Icon name={uploadingImage ? "loader-2" : "image-plus"} size={15} className={cn(uploadingImage && "animate-spin")} />
            <span className="hidden md:inline">插图</span>
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadAndInsert(f);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => setMediaPickerTarget("content")}
            title="从媒体库选择图片"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
          >
            <Icon name="images" size={15} />
          </button>

          <button
            type="button"
            onClick={() => importMdInputRef.current?.click()}
            title="导入本地 Markdown 文件"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
          >
            <Icon name="file-up" size={15} />
          </button>
          <input
            ref={importMdInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            className="hidden"
            onChange={handleImportMd}
          />

          <button
            type="button"
            onClick={() => exportArticleMarkdown(form)}
            title="导出为 Markdown 文件"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
          >
            <Icon name="download" size={15} />
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowOutline((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              showOutline
                ? "bg-[var(--accent-soft)] text-[var(--accent-color)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
            )}
            title="文章大纲目录"
          >
            <Icon name="list-tree" size={15} />
            <span className="hidden xl:inline">大纲 ({headings.length})</span>
          </button>

          <div className="hidden sm:inline-flex p-0.5 rounded-lg bg-[var(--section-bg)] border border-[var(--border-color)]">
            {[
              { id: "write", label: "写作" },
              { id: "split", label: "分屏" },
              { id: "preview", label: "预览" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setEditorMode(m.id as EditorMode)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                  editorMode === m.id
                    ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <ThemeToggle className="p-1.5" />

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveWithStatus("draft")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] disabled:opacity-50"
          >
            存草稿
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveWithStatus("published")}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent-color)] text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
          >
            {isSaving && (
              <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            发布并同步
          </button>
        </div>
      </header>

      {/* Recoverable Local Draft Banner */}
      {recoverableDraft && (
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Icon name="history" size={15} className="text-amber-500" />
            <span>检测到本机有未提交的自动暂存草稿，是否恢复？</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setForm(recoverableDraft);
                setRecoverableDraft(null);
                setIsDirty(true);
                onNotify("info", "已恢复本地暂存草稿");
              }}
              className="px-3 py-1 rounded-lg bg-amber-500 text-white font-semibold"
            >
              恢复草稿
            </button>
            <button
              type="button"
              onClick={() => {
                setRecoverableDraft(null);
                try {
                  localStorage.removeItem(draftStorageKey);
                } catch {
                  // ignore
                }
              }}
              className="px-2.5 py-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
            >
              忽略
            </button>
          </div>
        </div>
      )}

      {/* Workspace Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Optional Outline Sidebar */}
        {showOutline && (
          <aside className="w-60 shrink-0 border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] p-4 overflow-y-auto hidden md:block">
            <div className="text-xs font-bold text-[var(--text-tertiary)] uppercase mb-3 flex items-center justify-between">
              <span>文章大纲</span>
              <span className="font-mono">{headings.length}</span>
            </div>
            {headings.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                使用 `#`、`##`、`###` 编写标题后，这里会自动生成目录大纲。
              </p>
            ) : (
              <nav className="space-y-1">
                {headings.map((h, idx) => (
                  <button
                    key={`${h.offset}-${idx}`}
                    type="button"
                    onClick={() => jumpToHeading(h.offset)}
                    className={cn(
                      "w-full text-left text-xs py-1.5 px-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--accent-color)] truncate transition-colors",
                      h.level === 1 && "font-bold",
                      h.level === 2 && "pl-4 font-medium",
                      h.level === 3 && "pl-7 text-[var(--text-tertiary)]"
                    )}
                    title={h.text}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            )}
          </aside>
        )}

        {/* Editor Pane */}
        {editorMode !== "preview" && (
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0 overflow-y-auto bg-[var(--card-bg)]",
              editorMode === "split"
                ? "border-r border-[var(--border-color)]"
                : "max-w-4xl mx-auto my-4 rounded-2xl border border-[var(--border-color)] shadow-sm"
            )}
          >
            <div className="p-6 lg:p-10 space-y-6 flex-1 flex flex-col">
              {/* Title */}
              <input
                value={form.title}
                onChange={(e) => updateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="输入文章标题..."
                className="w-full bg-transparent border-none outline-none text-2xl sm:text-3xl font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50"
              />

              {/* Collapsible Metadata Box */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--section-bg)]/50">
                <button
                  type="button"
                  onClick={() => setShowMeta((v) => !v)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon name="sliders-horizontal" size={14} className="text-[var(--accent-color)]" />
                    文章属性与元数据（{form.content_type === "analysis" ? "深度分析" : "技术项目"} · {form.category} · {form.tags.length} 标签）
                  </span>
                  <Icon name={showMeta ? "chevron-up" : "chevron-down"} size={14} />
                </button>

                {showMeta && (
                  <div className="px-4 pb-4 pt-2 border-t border-[var(--border-color)] space-y-4">
                    {/* Summary */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                        摘要 / 核心观点（留空发布时将自动从正文提取）
                      </label>
                      <textarea
                        value={form.summary}
                        onChange={(e) => updateForm((prev) => ({ ...prev, summary: e.target.value }))}
                        rows={2}
                        placeholder="用一两句话概括本文的核心结论..."
                        className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)] resize-none"
                      />
                    </div>

                    {/* Type + Pin + Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                          所属栏目与分类
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_CATEGORIES.map(({ label, type }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() =>
                                updateForm((prev) => ({
                                  ...prev,
                                  category: label,
                                  content_type: type,
                                }))
                              }
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border",
                                form.category === label
                                  ? "bg-[var(--accent-color)] text-white border-[var(--accent-color)]"
                                  : "bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--hover-bg)]"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customCategory.trim()) {
                                e.preventDefault();
                                updateForm((prev) => ({ ...prev, category: customCategory.trim() }));
                                setCustomCategory("");
                              }
                            }}
                            placeholder="自定义分类后按回车..."
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none"
                          />
                          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={form.is_pinned}
                              onChange={(e) =>
                                updateForm((prev) => ({ ...prev, is_pinned: e.target.checked }))
                              }
                              className="rounded accent-[var(--accent-color)]"
                            />
                            置顶推荐
                          </label>
                        </div>
                      </div>

                      {/* Cover Image */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                            封面图（留空则按分类自动匹配预设封面）
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPresetCovers((v) => !v)}
                            className="text-[11px] font-semibold text-[var(--accent-color)] hover:underline"
                          >
                            {showPresetCovers ? "收起预设封面" : "选择预设封面 (8)"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={form.cover}
                            onChange={(e) => updateForm((prev) => ({ ...prev, cover: e.target.value }))}
                            placeholder="留空自动匹配，或粘贴路径 / 上传 / 选取预设..."
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                            title="上传封面"
                          >
                            <Icon name="upload" size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaPickerTarget("cover")}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                            title="从媒体库选择"
                          >
                            <Icon name="images" size={14} />
                          </button>
                          {form.cover && (
                            <button
                              type="button"
                              onClick={() => updateForm((prev) => ({ ...prev, cover: "" }))}
                              className="p-1.5 rounded-lg text-[var(--danger-color)] hover:bg-red-500/10"
                              title="清除封面（恢复按分类自动匹配）"
                            >
                              <Icon name="x" size={14} />
                            </button>
                          )}
                          <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverUpload}
                          />
                        </div>

                        {showPresetCovers && (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)]">
                            {PRESET_COVERS.map((preset) => {
                              const selected = form.cover === preset.path;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    updateForm((prev) => ({ ...prev, cover: preset.path }));
                                    onNotify("success", `已应用预设封面：${preset.label}`);
                                  }}
                                  title={preset.description}
                                  className={cn(
                                    "group relative rounded-lg overflow-hidden border text-left transition-all",
                                    selected
                                      ? "border-[var(--accent-color)] ring-2 ring-[var(--accent-color)]/30"
                                      : "border-[var(--border-color)] hover:border-[var(--border-strong)]"
                                  )}
                                >
                                  <div className="aspect-[16/9] w-full overflow-hidden bg-[var(--section-bg)]">
                                    <img
                                      src={preset.path}
                                      alt={preset.label}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                  <div className="px-1.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] truncate bg-[var(--card-bg)]">
                                    {preset.label}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-2 h-24 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--card-bg)] relative">
                          <img
                            src={getReliableCover(form.cover, {
                              category: form.category,
                              title: form.title,
                              contentType: form.content_type,
                            })}
                            alt="封面预览"
                            className="w-full h-full object-cover"
                          />
                          {!form.cover && (
                            <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/65 text-white text-[10px] font-semibold">
                              自动匹配：{form.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                        文章标签（输入后按回车或逗号添加，最多 12 个）
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)]">
                        {form.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--accent-soft)] text-[var(--accent-color)]"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:text-[var(--danger-color)]"
                            >
                              <Icon name="x" size={12} />
                            </button>
                          </span>
                        ))}
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "," || e.key === "，") {
                              e.preventDefault();
                              addTag(tagInput);
                            } else if (e.key === "Backspace" && !tagInput && form.tags.length > 0) {
                              removeTag(form.tags[form.tags.length - 1]);
                            }
                          }}
                          onBlur={() => tagInput.trim() && addTag(tagInput)}
                          placeholder="如：纳指100, AI算力, 财报..."
                          className="flex-1 min-w-[140px] bg-transparent outline-none text-xs text-[var(--text-primary)] px-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Markdown Textarea */}
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(e) => updateForm((prev) => ({ ...prev, content: e.target.value }))}
                onPaste={handleTextareaPaste}
                onDrop={handleTextareaDrop}
                onKeyDown={handleTextareaKeyDown}
                placeholder="开始用 Markdown 撰写正文... 支持直接粘贴截图或拖拽图片上传，⌘S 快捷保存"
                className="flex-1 min-h-[480px] w-full resize-none bg-transparent outline-none font-mono text-[15px] leading-[1.9] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]/50"
              />
            </div>
          </div>
        )}

        {/* Live Preview Pane */}
        {editorMode !== "write" && (
          <div className="flex-1 overflow-y-auto bg-[var(--bg-color)] p-6 lg:p-12">
            <div className="max-w-3xl mx-auto card p-6 sm:p-10 space-y-6">
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] pb-3 border-b border-[var(--border-color)]">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Icon name="eye" size={14} className="text-[var(--accent-color)]" />
                  前台阅读实时预览
                </span>
                <span className="font-mono">
                  {form.category} · 约 {metrics.readingMinutes} 分钟阅读
                </span>
              </div>

              <div className="rounded-xl overflow-hidden border border-[var(--border-color)] max-h-72">
                <img
                  src={getReliableCover(form.cover, {
                    category: form.category,
                    title: form.title,
                    contentType: form.content_type,
                  })}
                  alt={form.title || "封面预览"}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight">
                  {form.title || "未命名文章"}
                </h1>
                {form.summary && (
                  <p className="text-sm text-[var(--text-secondary)] border-l-3 border-[var(--accent-color)] pl-4 py-1 bg-[var(--section-bg)] rounded-r-lg">
                    {form.summary}
                  </p>
                )}
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent-color)] font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <article
                className="prose-modern pt-2"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Footer */}
      <footer className="h-9 shrink-0 border-t border-[var(--border-color)] bg-[var(--card-bg)] px-4 sm:px-6 flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-mono">
        <div className="flex items-center gap-4">
          <span>{metrics.words.toLocaleString()} 字</span>
          <span className="hidden sm:inline">{metrics.paragraphs} 段</span>
          <span className="hidden sm:inline">{metrics.images} 图</span>
          <span>约 {metrics.readingMinutes} 分钟阅读</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline">⌘S 保存 · ⌘B 加粗 · 支持粘贴/拖拽图片</span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                isDirty ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
            {isDirty
              ? lastLocalSavedAt
                ? `本地已暂存 ${lastLocalSavedAt}`
                : "有未保存更改"
              : form.status === "published"
              ? "已同步发布"
              : "草稿状态"}
          </span>
        </div>
      </footer>

      {/* Media Picker Modal */}
      {mediaPickerTarget && (
        <div
          className="fixed inset-0 z-[2400] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setMediaPickerTarget(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {mediaPickerTarget === "cover" ? "选择封面图片" : "选择图片插入正文"}
              </h3>
              <button
                type="button"
                onClick={() => setMediaPickerTarget(null)}
                className="p-1 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--hover-bg)]"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <MediaLibrary
                assets={mediaAssets}
                onUpload={onUploadFile}
                onDelete={onDeleteMedia}
                onRefresh={onRefreshMedia}
                onNotify={onNotify}
                pickerMode
                onSelect={(url) => {
                  if (mediaPickerTarget === "cover") {
                    updateForm((prev) => ({ ...prev, cover: url }));
                    onNotify("success", "已设置封面图");
                  } else {
                    insertFormat(`\n![图片](${url})\n`);
                    onNotify("success", "已插入图片");
                  }
                  setMediaPickerTarget(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
