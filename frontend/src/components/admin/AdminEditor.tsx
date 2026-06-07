"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { marked } from "marked";
import { sanitizeMarkdownHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";

interface AdminEditorProps {
  initialData?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const AdminEditor = ({ initialData, onSave, onCancel, isSaving }: AdminEditorProps) => {
  const [form, setForm] = useState({
    title: initialData?.title || "",
    summary: initialData?.summary || "",
    content: initialData?.content || "",
    cover: initialData?.cover || "",
    content_type: initialData?.content_type || "analysis",
    category: initialData?.category || "深度分析"
  });

  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 配置 marked 选项以增强稳定性
  useEffect(() => {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
  }, []);

  // 带防抖的异步 Markdown 解析
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!form.content) {
        setPreviewHtml('<div class="py-20 text-center text-slate-300 italic font-medium opacity-50">等待创作内容...</div>');
        return;
      }
      try {
        const html = await marked.parse(String(form.content));
        setPreviewHtml(sanitizeMarkdownHtml(html));
      } catch (e) {
        console.error("Markdown parse error:", e);
        // 如果解析失败，保留上一次的 HTML，不打断用户体验
      }
    }, 300); // 300ms 防抖

    return () => clearTimeout(timer);
  }, [form.content]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, content: val }));
  }, []);

  const insertFormat = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = form.content;
    const newContent = value.substring(0, start) + prefix + value.substring(start, end) + suffix + value.substring(end);
    
    setForm(prev => ({ ...prev, content: newContent }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch("/api/upload", {
      method: 'POST', 
      headers: { 'Authorization': `Bearer ${localStorage.getItem('investcool-admin-token')}` },
      body: formData
    });
    if (res.ok) { 
      const result = await res.json(); 
      return result.url;
    }
    return null;
  };

  const handleCoverUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      setForm(prev => ({ ...prev, cover: url }));
    }
  };

  const insertImage = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      insertFormat(`\n![描述](${url})\n`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-[#09090b] animate-in fade-in duration-500 fixed inset-0 z-[1200]">
      
      {/* Toolbar */}
      <div className="h-14 shrink-0 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between px-6 bg-white dark:bg-[#09090b] z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" color="neutral" size="sm" onClick={onCancel} className="rounded-full size-9 p-0">
            <Icon name="arrow-left" size={16} />
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          {['bold','italic','quote','code'].map(i => (
            <Button 
              key={i} 
              size="sm" 
              variant="ghost" 
              color="neutral" 
              icon={<Icon name={i} size={16} />} 
              className="opacity-60 hover:opacity-100 size-9 p-0"
              onClick={() => insertFormat(i==='bold'?'**':i==='italic'?'_':i==='code'?'`':'> ')}
            />
          ))}
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <Button size="sm" variant="ghost" color="primary" onClick={() => imageInputRef.current?.click()} className="text-[10px] font-black uppercase tracking-wider h-9 px-3 group">
            <Icon name="image-plus" size={14} className="mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
            Image
          </Button>
          <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={insertImage} />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 mr-4 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Editor Ready</span>
          </div>
          <Button 
            variant="soft" 
            color={showPreview ? 'black' : 'neutral'} 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-[0.2em] rounded-lg h-9 px-4" 
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Canvas Only' : 'Dual Terminal'}
          </Button>
          <Button 
            color="black" 
            size="sm" 
            className="px-8 rounded-xl h-9 font-black shadow-xl shadow-blue-500/10" 
            onClick={() => onSave(form)} 
            loading={isSaving}
          >
            COMMIT_SYNC
          </Button>
        </div>
      </div>

      {/* Editor Main */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn(
          "flex-1 flex flex-col min-w-0 bg-white dark:bg-[#09090b] overflow-y-auto custom-scrollbar transition-all duration-500",
          showPreview ? "border-r border-slate-100 dark:border-slate-900" : "max-w-4xl mx-auto shadow-2xl my-8 rounded-3xl border border-slate-100 dark:border-slate-900"
        )}>
          <div className="p-8 lg:p-20 space-y-10 flex-1 flex flex-col">
            <div className="space-y-8">
              <input 
                value={form.title}
                onChange={e => setForm(prev => ({...prev, title: e.target.value}))}
                className="w-full bg-transparent border-none outline-none text-5xl font-black placeholder:text-slate-100 dark:placeholder:text-slate-800 tracking-tighter leading-tight" 
                placeholder=" Composition Title..." 
              />
              
              <div className="flex flex-wrap items-center gap-5 pt-4 border-t border-slate-50 dark:border-slate-900/50">
                <div className="flex p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  {[
                    { label: "投资入门", type: "analysis" },
                    { label: "深度分析", type: "analysis" },
                    { label: "公司基本面", type: "analysis" },
                    { label: "AI", type: "analysis" },
                    { label: "技术教程", type: "tutorial" },
                  ].map(({ label, type }) => (
                    <button 
                      key={label}
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev, 
                        category: label,
                        content_type: type,
                      }))}
                      className={cn(
                        "px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                        form.category === label ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'text-slate-400 hover:text-slate-600'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 ml-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cover</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <input 
                      value={form.cover}
                      onChange={e => setForm(prev => ({...prev, cover: e.target.value}))}
                      className="bg-transparent border-none outline-none text-[10px] font-bold text-blue-500 w-32 truncate"
                      placeholder="Image URL..."
                    />
                    <button type="button" onClick={() => coverInputRef.current?.click()} className="p-1 hover:text-blue-500 transition-colors">
                      <Icon name="upload" size={12} />
                    </button>
                    <input ref={coverInputRef} type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                  </div>
                </div>
              </div>

              <div className="relative">
                <Icon name="quote" className="absolute -left-8 top-0 text-slate-100 dark:text-slate-900 size-16 -z-10" />
                <textarea 
                  value={form.summary}
                  onChange={e => setForm(prev => ({...prev, summary: e.target.value}))}
                  placeholder="一句话摘要 (Key Insight)..."
                  className="w-full text-2xl text-slate-400 font-medium italic p-0 leading-relaxed border-l-4 border-blue-500/20 pl-8 bg-transparent outline-none resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex-1 relative mt-10">
              <textarea 
                ref={textareaRef}
                value={form.content}
                onChange={handleContentChange}
                className="w-full h-full min-h-[600px] resize-none bg-transparent outline-none focus:ring-0 text-slate-700 dark:text-slate-300 leading-[2] font-mono text-[17px]" 
                placeholder="Proceed with your investigation..." 
              />
            </div>
          </div>
        </div>

        {/* Preview Pane - Enhanced Style */}
        {showPreview && (
          <div className="flex-1 hidden xl:flex flex-col bg-[#fcfcfd] dark:bg-[#020617] overflow-y-auto p-20 custom-scrollbar animate-in slide-in-from-right-4 duration-500 border-l border-slate-100 dark:border-slate-900/50">
            <div className="max-w-2xl mx-auto">
              <div className="mb-10 opacity-30 flex items-center gap-2">
                <Icon name="eye" size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Preview Terminal</span>
              </div>
              <article 
                className="prose-modern dark:prose-invert selection:bg-blue-500/10" 
                dangerouslySetInnerHTML={{ __html: previewHtml }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <footer className="h-10 border-t border-slate-100 dark:border-slate-900 px-8 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-white dark:bg-[#09090b]">
        <div className="flex items-center gap-10">
          <span className="font-mono flex items-center gap-2"><Icon name="binary" size={12} /> {form.content.length} BYTES</span>
          <span className="font-mono flex items-center gap-2"><Icon name="clock" size={12} /> {Math.ceil(form.content.length / 500)} MIN READ</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-500 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-current animate-pulse"></span>
            SYNC_ENCRYPTED
          </span>
        </div>
      </footer>
    </div>
  );
};
