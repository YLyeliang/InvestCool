"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import {
  type StudioArticle,
  type StudioStats,
  formatBytes,
  formatCount,
  formatRelativeTime,
} from "./types";

interface AdminDashboardProps {
  stats: StudioStats;
  articles: StudioArticle[];
  onNewArticle: () => void;
  onEditArticle: (article: StudioArticle) => void;
  onNavigate: (view: "archive" | "media" | "trash") => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function TrendChart({ data }: { data: StudioStats["daily_trend"] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-[var(--text-tertiary)]">
        暂无近 14 天访问趋势数据
      </div>
    );
  }

  const maxPv = Math.max(...data.map((d) => d.pv), 4);
  const width = 640;
  const height = 190;
  const padL = 32;
  const padR = 14;
  const padT = 18;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const stepX = plotW / Math.max(data.length, 1);
  const barW = Math.max(10, Math.min(24, stepX * 0.52));

  const uvPoints = data
    .map((d, i) => {
      const cx = padL + i * stepX + stepX / 2;
      const cy = padT + plotH - (d.uv / maxPv) * plotH;
      return `${cx},${cy}`;
    })
    .join(" ");

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3 text-xs text-[var(--text-tertiary)]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[var(--accent-color)]/75" />
            页面浏览 (PV)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            独立访客 (UV)
          </span>
        </div>
        {activePoint ? (
          <span className="font-mono text-[var(--text-primary)] font-semibold">
            {activePoint.date} · PV {activePoint.pv} / UV {activePoint.uv}
          </span>
        ) : (
          <span>悬停柱体查看每日明细</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-52 select-none overflow-visible"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = padT + plotH * (1 - ratio);
          const val = Math.round(maxPv * ratio);
          return (
            <g key={ratio}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="var(--border-color)"
                strokeDasharray={ratio === 0 ? undefined : "3 3"}
                strokeWidth="1"
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-tertiary)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = padL + i * stepX + stepX / 2;
          const barH = Math.max(d.pv > 0 ? 3 : 0, (d.pv / maxPv) * plotH);
          const bx = cx - barW / 2;
          const by = padT + plotH - barH;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={d.date}
              onMouseEnter={() => setHoveredIdx(i)}
              className="cursor-pointer"
            >
              <rect
                x={padL + i * stepX}
                y={padT}
                width={stepX}
                height={plotH + padB}
                fill="transparent"
              />
              <rect
                x={bx}
                y={by}
                width={barW}
                height={barH}
                rx={4}
                fill="var(--accent-color)"
                opacity={isHovered ? 1 : 0.72}
              />
              {(i % 2 === 0 || i === data.length - 1 || isHovered) && (
                <text
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isHovered ? "var(--text-primary)" : "var(--text-tertiary)"}
                  fontWeight={isHovered ? 700 : 400}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={uvPoints}
        />

        {data.map((d, i) => {
          const cx = padL + i * stepX + stepX / 2;
          const cy = padT + plotH - (d.uv / maxPv) * plotH;
          const isHovered = hoveredIdx === i;
          return (
            <circle
              key={`uv-${d.date}`}
              cx={cx}
              cy={cy}
              r={isHovered ? 4.5 : 2.5}
              fill="#f59e0b"
              stroke="var(--card-bg)"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
}

export const AdminDashboard = ({
  stats,
  articles,
  onNewArticle,
  onEditArticle,
  onNavigate,
  onRefresh,
  isRefreshing,
}: AdminDashboardProps) => {
  const activeArticles = articles.filter((a) => !a.is_deleted);
  const recentDrafts = activeArticles.filter((a) => a.status === "draft").slice(0, 4);
  const recentUpdated = activeArticles.slice(0, 5);

  const todayDelta = stats.today_visits - stats.yesterday_visits;
  const maxCadence = Math.max(...stats.content.monthly_cadence.map((m) => m.count), 1);
  const maxCategoryCount = Math.max(
    ...stats.content.category_breakdown.map((c) => c.count),
    1
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-color)]">
            <Icon name="sparkles" size={14} />
            InvestCool Studio 工作台
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            内容运营与数据概览
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            实时掌握站点访问趋势、文章资产结构与创作进度
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50"
          >
            <Icon
              name="refresh-cw"
              size={14}
              className={cn(isRefreshing && "animate-spin")}
            />
            刷新数据
          </button>
          <button
            type="button"
            onClick={onNewArticle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-color)] text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            <Icon name="pen-square" size={14} />
            撰写新文章
          </button>
        </div>
      </div>

      {/* Traffic KPI Row */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-2">
          <Icon name="bar-chart-3" size={14} className="text-[var(--accent-color)]" />
          流量监控
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-tertiary)]">
              <span>今日访问 (PV)</span>
              <Icon name="activity" size={16} className="text-[var(--success-color)]" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-3xl font-bold font-mono text-[var(--text-primary)]">
                {formatCount(stats.today_visits)}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  todayDelta >= 0
                    ? "bg-emerald-500/10 text-[var(--success-color)]"
                    : "bg-red-500/10 text-[var(--danger-color)]"
                )}
              >
                {todayDelta >= 0 ? `+${todayDelta}` : todayDelta} 较昨日
              </span>
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              近 7 日 {formatCount(stats.week_visits)} · 近 30 日 {formatCount(stats.month_visits)}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-tertiary)]">
              <span>累计访问</span>
              <Icon name="globe" size={16} className="text-[var(--accent-color)]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)]">
              {formatCount(stats.total_visits)}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              独立访客 (UV)：<strong className="text-[var(--text-secondary)]">{formatCount(stats.unique_visitors)}</strong>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-tertiary)]">
              <span>当前在线 (15m)</span>
              <Icon name="users" size={16} className="text-amber-500" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-3xl font-bold font-mono text-[var(--text-primary)]">
                {stats.active_users}
              </span>
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">最近 15 分钟活跃独立 IP</div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-tertiary)]">
              <span>单页跳出率</span>
              <Icon name="arrow-down-right" size={16} className="text-[var(--danger-color)]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)]">
              {stats.bounce_rate}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">仅浏览 1 个页面的访客占比</div>
          </div>
        </div>
      </section>

      {/* Content Portfolio KPI Row */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-2">
          <Icon name="layers" size={14} className="text-[var(--accent-color)]" />
          内容资产
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate("archive")}
            className="card p-5 text-left space-y-2 hover:border-[var(--accent-color)]"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-tertiary)]">
              <span>已发布文章</span>
              <Icon name="check-circle-2" size={16} className="text-[var(--success-color)]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)]">
              {stats.content.published_count}
              <span className="text-xs font-normal text-[var(--text-tertiary)] ml-1.5">篇</span>
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              深研 {stats.content.analysis_count} · 技术项目 {stats.content.tutorial_count}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("archive")}
            className="card p-5 text-left space-y-2 hover:border-[var(--accent-color)]"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-tertiary)]">
              <span>草稿箱 & 置顶</span>
              <Icon name="file-edit" size={16} className="text-amber-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)]">
              {stats.content.draft_count}
              <span className="text-xs font-normal text-[var(--text-tertiary)] ml-1.5">草稿</span>
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              置顶精选 {stats.content.pinned_count} 篇 · 回收站 {stats.content.trash_count} 篇
            </div>
          </button>

          <div className="card p-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-tertiary)]">
              <span>累计创作字数</span>
              <Icon name="type" size={16} className="text-[var(--accent-color)]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)]">
              {formatCount(stats.content.total_words)}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              篇均 {formatCount(stats.content.avg_words)} 字 · 约 {stats.content.total_reading_minutes} 分钟阅读量
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("media")}
            className="card p-5 text-left space-y-2 hover:border-[var(--accent-color)]"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-tertiary)]">
              <span>媒体库与存储</span>
              <Icon name="hard-drive" size={16} className="text-[var(--text-tertiary)]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)]">
              {stats.system.uploads_count}
              <span className="text-xs font-normal text-[var(--text-tertiary)] ml-1.5">张图片</span>
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              图片 {formatBytes(stats.system.uploads_size_bytes)} · DB {formatBytes(stats.system.db_size_bytes)}
            </div>
          </button>
        </div>
      </section>

      {/* Charts Grid: 14-day Trend + Top Paths */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="card p-6 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">近 14 日访问趋势</h3>
              <p className="text-xs text-[var(--text-tertiary)]">按 UTC 日期统计页面浏览量与独立访客</p>
            </div>
          </div>
          <TrendChart data={stats.daily_trend} />
        </div>

        <div className="card p-6 xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">热门页面排行</h3>
              <p className="text-xs text-[var(--text-tertiary)]">累计访问量 Top 10 路径</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.top_paths.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--text-tertiary)]">暂无访问记录</div>
            ) : (
              stats.top_paths.slice(0, 8).map((item, idx) => (
                <div key={item.path} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold w-4 text-[var(--text-tertiary)]">
                        {idx + 1}
                      </span>
                      <span className="truncate font-medium text-[var(--text-primary)]" title={item.path}>
                        {item.label}
                      </span>
                    </div>
                    <span className="font-mono text-[var(--text-secondary)] shrink-0">
                      {item.views} <span className="text-[var(--text-tertiary)]">({item.share}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-color)]"
                      style={{ width: `${Math.max(4, Math.min(100, item.share))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Category Distribution + Publishing Cadence + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category & Tags */}
        <div className="card p-6 lg:col-span-5 space-y-5">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">栏目与分类分布</h3>
            <p className="text-xs text-[var(--text-tertiary)]">各分类文章数与字数沉淀</p>
          </div>
          <div className="space-y-3">
            {stats.content.category_breakdown.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">暂无分类数据</div>
            ) : (
              stats.content.category_breakdown.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">{c.category}</span>
                    <span className="font-mono text-[var(--text-tertiary)]">
                      {c.count} 篇 · {formatCount(c.words)} 字
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-color)]/80"
                      style={{ width: `${Math.max(8, (c.count / maxCategoryCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {stats.content.tag_breakdown.length > 0 && (
            <div className="pt-4 border-t border-[var(--border-color)] space-y-2.5">
              <div className="text-xs font-semibold text-[var(--text-tertiary)]">高频标签</div>
              <div className="flex flex-wrap gap-1.5">
                {stats.content.tag_breakdown.map((t) => (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--section-bg)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                  >
                    #{t.tag}
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Monthly Cadence + Recent Resume */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">近 6 个月产出节奏</h3>
                <p className="text-xs text-[var(--text-tertiary)]">每月新增入库文章数量</p>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3 items-end h-32 pt-4">
              {stats.content.monthly_cadence.map((m) => (
                <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                    {m.count}
                  </span>
                  <div className="w-full max-w-[36px] rounded-t-lg bg-[var(--accent-soft)] border border-[var(--accent-color)]/30 flex items-end overflow-hidden h-20">
                    <div
                      className="w-full bg-[var(--accent-color)] rounded-t-md transition-all"
                      style={{ height: `${m.count > 0 ? Math.max(14, (m.count / maxCadence) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                    {m.month.slice(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {recentDrafts.length > 0 ? "待完成草稿与最近更新" : "最近更新的文章"}
              </h3>
              <button
                type="button"
                onClick={() => onNavigate("archive")}
                className="text-xs font-semibold text-[var(--accent-color)] hover:underline"
              >
                查看全部 →
              </button>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {(recentDrafts.length > 0 ? recentDrafts : recentUpdated).map((item) => (
                <div
                  key={item.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold",
                          item.status === "draft"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-[var(--success-color)]"
                        )}
                      >
                        {item.status === "draft" ? "草稿" : "已发布"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditArticle(item)}
                        className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-color)] truncate text-left"
                      >
                        {item.title}
                      </button>
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
                      {item.category} · {formatCount(item.word_count)} 字 · 更新于 {formatRelativeTime(item.updated_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditArticle(item)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  >
                    继续编辑
                  </button>
                </div>
              ))}
              {activeArticles.length === 0 && (
                <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                  还没有文章，点击右上角「撰写新文章」开始创作
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
