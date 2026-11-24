"use client";

import React, { useState, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { type MediaAsset, formatBytes, formatRelativeTime } from "./types";

interface MediaLibraryProps {
  assets: MediaAsset[];
  onUpload: (file: File) => Promise<string | null>;
  onDelete: (asset: MediaAsset) => void;
  onRefresh: () => void;
  onNotify: (type: "success" | "error" | "info", message: string) => void;
  pickerMode?: boolean;
  onSelect?: (url: string) => void;
}

export const MediaLibrary = ({
  assets,
  onUpload,
  onDelete,
  onRefresh,
  onNotify,
  pickerMode = false,
  onSelect,
}: MediaLibraryProps) => {
  const [search, setSearch] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | "used" | "unused">("all");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let okCount = 0;
    try {
      for (const file of Array.from(fileList)) {
        const url = await onUpload(file);
        if (url) okCount += 1;
      }
      if (okCount > 0) {
        onNotify("success", `成功上传 ${okCount} 张图片`);
        onRefresh();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify("success", `已复制${label}`);
    } catch {
      onNotify("error", "复制失败，请手动复制");
    }
  };

  const filtered = assets.filter((a) => {
    const matchSearch =
      !search ||
      a.filename.toLowerCase().includes(search.toLowerCase()) ||
      a.used_in.some((u) => u.title.toLowerCase().includes(search.toLowerCase()));
    const matchUsage =
      usageFilter === "all"
        ? true
        : usageFilter === "used"
        ? a.used_in.length > 0
        : a.used_in.length === 0;
    return matchSearch && matchUsage;
  });

  const totalSize = assets.reduce((acc, a) => acc + a.size_bytes, 0);

  return (
    <div className="space-y-6">
      {!pickerMode && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">媒体资源库</h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              共 {assets.length} 个图片资源 · 合计占用 {formatBytes(totalSize)}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
            >
              <Icon name="refresh-cw" size={14} />
              刷新
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-color)] text-white hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="upload" size={14} />
              {uploading ? "上传中..." : "上传图片"}
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all",
          isDragging
            ? "border-[var(--accent-color)] bg-[var(--accent-soft)]"
            : "border-[var(--border-color)] bg-[var(--section-bg)]/60 hover:border-[var(--border-strong)]"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="size-10 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)]">
            <Icon name={uploading ? "loader-2" : "image-plus"} size={20} className={cn(uploading && "animate-spin")} />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {uploading ? "正在上传并校验图片..." : "拖拽图片到此处，或点击选择文件上传"}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            支持 PNG / JPG / WEBP / GIF，单张最大 16MB，自动按内容哈希去重
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-[var(--section-bg)] border border-[var(--border-color)] self-start">
          {[
            { id: "all", label: `全部 (${assets.length})` },
            { id: "used", label: `已引用 (${assets.filter((a) => a.used_in.length > 0).length})` },
            { id: "unused", label: `未使用 (${assets.filter((a) => a.used_in.length === 0).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setUsageFilter(tab.id as "all" | "used" | "unused")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                usageFilter === tab.id
                  ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Icon
            name="search"
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文件名或引用文章..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center space-y-2 text-[var(--text-tertiary)]">
          <Icon name="image-off" size={36} className="mx-auto opacity-40" />
          <p className="text-sm font-medium">没有符合条件的图片资源</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((asset) => (
            <div
              key={asset.filename}
              className="card overflow-hidden flex flex-col group"
            >
              <div
                className="relative aspect-[16/10] bg-[var(--section-bg)] overflow-hidden cursor-pointer"
                onClick={() => (pickerMode && onSelect ? onSelect(asset.url) : setPreviewAsset(asset))}
              >
                <img
                  src={asset.url}
                  alt={asset.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-md",
                      asset.used_in.length > 0
                        ? "bg-emerald-600/85 text-white"
                        : "bg-black/60 text-white/90"
                    )}
                  >
                    {asset.used_in.length > 0 ? `被 ${asset.used_in.length} 篇引用` : "未引用"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div
                    className="text-xs font-mono font-semibold text-[var(--text-primary)] truncate"
                    title={asset.filename}
                  >
                    {asset.filename}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] font-mono flex items-center justify-between">
                    <span>
                      {asset.width && asset.height ? `${asset.width}×${asset.height}` : "图片"} · {formatBytes(asset.size_bytes)}
                    </span>
                    <span>{formatRelativeTime(asset.created_at)}</span>
                  </div>
                  {asset.used_in.length > 0 && (
                    <div className="text-[11px] text-[var(--text-secondary)] truncate" title={asset.used_in.map((u) => u.title).join(" / ")}>
                      引用：{asset.used_in.map((u) => u.title).join("、")}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-color)]">
                  {pickerMode && onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(asset.url)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-color)] text-white hover:opacity-90"
                    >
                      选择插入
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => copyText(`![图片](${asset.url})`, " Markdown 语法")}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--section-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                        title="复制 Markdown 图片语法"
                      >
                        复制 MD
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(asset.url, "图片链接")}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--section-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                        title="复制 URL"
                      >
                        复制 URL
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(asset)}
                        className="p-1.5 rounded-lg text-[var(--danger-color)] hover:bg-red-500/10 transition-colors"
                        title="删除图片"
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

      {/* Lightbox */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-[2600] bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="max-w-4xl max-h-[85vh] flex flex-col gap-3 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewAsset.url}
              alt={previewAsset.filename}
              className="max-h-[75vh] max-w-full rounded-xl border border-white/15 object-contain bg-black"
            />
            <div className="flex items-center gap-3 text-xs text-white/80 font-mono">
              <span>{previewAsset.filename}</span>
              <span>·</span>
              <span>{formatBytes(previewAsset.size_bytes)}</span>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="ml-3 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-sans font-semibold"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
