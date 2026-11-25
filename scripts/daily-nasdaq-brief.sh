#!/usr/bin/env bash
set -euo pipefail

# Ensure nvm / node / codex / python3 are in PATH when invoked by cron
NVM_BIN=$(ls -d /root/.nvm/versions/node/*/bin 2>/dev/null | tail -n 1 || true)
export PATH="${NVM_BIN}:/root/miniconda3/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export TZ="${TZ:-Asia/Shanghai}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAILY_DIR="$ROOT_DIR/frontend/content/daily"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/daily-brief.log"
LOCK_FILE="/tmp/investcool-daily-brief.lock"

TARGET_DATE="$(date +%Y-%m-%d)"
FORCE=false
DRY_RUN=false
MODEL_OVERRIDE="${CODEX_BRIEF_MODEL:-}"

for ((i=1; i<=$#; i++)); do
  arg="${!i}"
  case "$arg" in
    --date)
      i=$((i + 1))
      TARGET_DATE="${!i}"
      ;;
    --force)
      FORCE=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --model)
      i=$((i + 1))
      MODEL_OVERRIDE="${!i}"
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/daily-nasdaq-brief.sh [options]

Uses Codex CLI (--search) to search financial news & X.com discussions about
Nasdaq / Nasdaq 100 (纳斯达克 / 纳指100), generates a structured Markdown brief,
and publishes it to frontend/content/daily/YYYY-MM-DD.md ("每日锦报").

Options:
  --date YYYY-MM-DD  Generate brief for a specific date (default: today Asia/Shanghai)
  --force            Overwrite if target date markdown already exists
  --dry-run          Print generated markdown to stdout without publishing
  --model MODEL      Override Codex model (default: from ~/.codex/config.toml)
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$DAILY_DIR" "$LOG_DIR"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"
  echo "$msg" | tee -a "$LOG_FILE" >&2
}

if ! command -v codex >/dev/null 2>&1; then
  log "ERROR: codex CLI not found in PATH ($PATH)"
  exit 1
fi

TARGET_FILE="$DAILY_DIR/${TARGET_DATE}.md"
if [[ "$DRY_RUN" == false && "$FORCE" == false && -f "$TARGET_FILE" ]]; then
  log "SKIP: $TARGET_FILE already exists (use --force to regenerate)."
  exit 0
fi

# Prevent overlapping runs via flock (if available on Linux)
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "SKIP: Another daily-nasdaq-brief instance is already running."
    exit 0
  fi
fi

# Curated high-reliability Unsplash financial cover pool (rotates by day of year)
COVERS=(
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1000"
  "https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=1000"
  "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1000"
  "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?q=80&w=1000"
)
DAY_NUM=$(date +%j | sed 's/^0*//')
COVER_URL="${COVERS[$(( ${DAY_NUM:-1} % ${#COVERS[@]} ))]}"

TMP_RAW="$(mktemp /tmp/nasdaq-brief-raw.XXXXXX.md)"
TMP_CLEAN="$(mktemp /tmp/nasdaq-brief-clean.XXXXXX.md)"
TMP_ERR="$(mktemp /tmp/nasdaq-brief-err.XXXXXX.log)"
trap 'rm -f "$TMP_RAW" "$TMP_CLEAN" "$TMP_ERR"' EXIT

log "START: Generating Nasdaq daily brief for ${TARGET_DATE} using Codex --search..."

CODEX_ARGS=(
  --search
  exec
  -s read-only
  --ephemeral
  --skip-git-repo-check
  -C "$ROOT_DIR"
  -o "$TMP_RAW"
)
if [[ -n "$MODEL_OVERRIDE" ]]; then
  CODEX_ARGS+=(-m "$MODEL_OVERRIDE")
fi

PROMPT_TEMPLATE=$(cat <<'EOF'
你是 InvestCool 财经研究站的资深美股与纳斯达克市场主编。今天是 __TARGET_DATE__（北京时间 Asia/Shanghai）。

请使用你的实时网络搜索工具（web_search），全面检索最近 24 小时内（若为周末/美股休市日，则覆盖最近一个交易日及本周要点与下周前瞻）关于以下核心关键词的最新重要财经信息：
- 核心关键词：**纳斯达克（Nasdaq / IXIC）**、**纳指100（Nasdaq 100 / NDX / QQQ）**
- 信息来源要求：
  1. 主流英文与中文财经媒体（如 Reuters, Bloomberg, CNBC, WSJ, Yahoo Finance, MarketWatch, Seeking Alpha, 财联社, 华尔街见闻）。
  2. 社交媒体 **x.com**（请专门检索 site:x.com 上关于 Nasdaq / NDX / QQQ / 纳指100 / Mag7 / AI 科技股的热门市场观点、机构交易员或知名财经博主讨论）。

请严格遵守以下事实与格式要求：
1. **严禁编造数据**：所有指数点位、涨跌幅、个股新闻、宏观数据必须来自本次搜索结果；如果某个数字未查到，写“暂无最新公开数据”而不要猜测。明确标注交易日日期或休市状态。
2. **输出纯 Markdown 文档**（不要在最外层包裹 ```markdown 代码块，直接以 --- YAML Frontmatter 开头）。
3. **YAML Frontmatter 必须严格包含以下字段**（单引号包裹字符串，内部避免未转义单引号）：
---
title: '纳指每日锦报 - __TARGET_DATE__：<8-18字高度凝练今日核心主题>'
description: '<60-110字精炼摘要，涵盖纳指100表现、核心驱动因素与重点科技股>'
category: '每日信息'
date: '__TARGET_DATE__'
cover: '__COVER_URL__'
---
4. **正文结构**（使用清晰、克制、专业、易读的中文财经简报风格，总字数 1200–2200 字）：
   - `# InvestCool 纳指每日锦报 (__TARGET_DATE__)`
   - `> 💡 **核心摘要**：...`（3-4 句话浓缩今日纳指核心主线）
   - `## 📊 纳斯达克 & 纳指100 盘面速览`（纳斯达克综合指数、纳指100/QQQ、费城半导体指数 SOXX、成交与市场情绪，可附简洁 Markdown 表格）
   - `## 🚀 权重科技股重点动态`（精选 3-5 家影响纳指100的核心成分股，如 NVDA、AAPL、MSFT、AMZN、META、GOOGL、TSLA、AVGO 等，分点写明股价动向与催化事件）
   - `## 🏦 宏观、利率与资金面`（美联储表态、10年期美债收益率、通胀/就业等宏观数据、AI 资本开支或资金流向）
   - `## 𝕏 X.com 市场热议与观点精选`（整理 2-4 条来自 x.com 上关于纳指/QQQ/科技股的高价值讨论主题、多空分歧或博主观点）
   - `## 🧭 后续关注与风险提示`（下一个交易日/本周关键财报、经济数据日历与技术面/估值风险提示）
   - `## 📎 参考信源`（列出本次检索到的 4-8 个真实来源标题与 URL 链接）

现在请开始搜索并直接输出最终的 Markdown 文档。
EOF
)
PROMPT="${PROMPT_TEMPLATE//__TARGET_DATE__/$TARGET_DATE}"
PROMPT="${PROMPT//__COVER_URL__/$COVER_URL}"

if ! printf '%s' "$PROMPT" | codex "${CODEX_ARGS[@]}" - >"$TMP_ERR" 2>&1; then
  log "ERROR: codex exec failed. Last 30 lines of output:"
  tail -n 30 "$TMP_ERR" | tee -a "$LOG_FILE" >&2
  exit 1
fi

# Validate & normalize output with Python so Next.js gray-matter never breaks
python3 - "$TMP_RAW" "$TMP_CLEAN" "$TARGET_DATE" "$COVER_URL" <<'PY'
import re
import sys
from pathlib import Path

raw_path, clean_path, target_date, default_cover = sys.argv[1:5]
text = Path(raw_path).read_text(encoding="utf-8", errors="replace").strip()

# Strip accidental surrounding markdown fence
fence_match = re.match(r"^```(?:markdown|md)?\s*\n(.*?)\n```\s*$", text, re.DOTALL)
if fence_match:
    text = fence_match.group(1).strip()

# If preamble appeared before YAML frontmatter, trim up to first '---'
if not text.startswith("---"):
    idx = text.find("\n---\n")
    if idx != -1 and idx < 400:
        text = text[idx + 1:].strip()

if len(text) < 350:
    raise SystemExit(f"Generated markdown too short ({len(text)} chars), aborting publish.")

def yaml_single_quote(val: str) -> str:
    return "'" + val.replace("'", "''").replace("\n", " ").strip() + "'"

fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.DOTALL)
if fm_match:
    fm_block, body = fm_match.group(1), fm_match.group(2).strip()
    meta = {}
    for line in fm_block.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            v = v.strip()
            if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                v = v[1:-1]
            meta[k.strip()] = v.strip()
else:
    meta = {}
    body = text

title = meta.get("title") or f"纳指每日锦报 - {target_date}"
description = meta.get("description") or meta.get("summary") or f"{target_date} 纳斯达克与纳指100重点财经动态、权重科技股追踪与市场观点整理。"
cover = meta.get("cover") or default_cover

normalized_fm = "\n".join([
    "---",
    f"title: {yaml_single_quote(title)}",
    f"description: {yaml_single_quote(description)}",
    "category: '每日信息'",
    f"date: '{target_date}'",
    f"cover: {yaml_single_quote(cover)}",
    "---",
    "",
])

Path(clean_path).write_text(normalized_fm + "\n" + body + "\n", encoding="utf-8")
print(f"Validated brief: title={title!r}, length={len(body)} chars")
PY

if [[ "$DRY_RUN" == true ]]; then
  cat "$TMP_CLEAN"
  log "DRY_RUN: Completed without writing to $TARGET_FILE."
  exit 0
fi

# Atomic publish to Next.js daily content directory
cp "$TMP_CLEAN" "${TARGET_FILE}.tmp"
mv "${TARGET_FILE}.tmp" "$TARGET_FILE"
log "PUBLISHED: $TARGET_FILE ($(wc -c < "$TARGET_FILE" | tr -d ' ') bytes)"

# Optional health verification against local Next.js server
if command -v curl >/dev/null 2>&1; then
  if curl -fsS --max-time 15 "http://127.0.0.1:3000/daily/${TARGET_DATE}" >/dev/null 2>&1; then
    log "VERIFIED: http://127.0.0.1:3000/daily/${TARGET_DATE} returned HTTP 200"
  else
    log "WARN: Could not verify http://127.0.0.1:3000/daily/${TARGET_DATE} (Next.js cache may revalidate within 60s)"
  fi
fi
