from flask import Flask, jsonify, request, abort
from flask_sqlalchemy import SQLAlchemy
import os
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time
from functools import wraps
import logging
import hashlib
import hmac
import io
import json
import inspect
import re
from glob import glob
from logging.handlers import RotatingFileHandler
from PIL import Image, UnidentifiedImageError

app = Flask(__name__)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    "DATABASE_URL",
    'sqlite:///' + os.path.join(basedir, 'investcool.db'),
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        RotatingFileHandler(
            os.path.join(basedir, "../backend.log"),
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
        ),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Security
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")

db = SQLAlchemy(app)

# Enable WAL Mode for high concurrency
with app.app_context():
    try:
        db.session.execute(db.text("PRAGMA journal_mode=WAL;"))
        db.session.commit()
        logger.info("SQLite WAL mode enabled")
    except Exception as e:
        logger.error(f"Failed to enable WAL mode: {e}")

# Cache for realtime data
watchlist_cache = {"data": [], "last_update": None}
nasdaq_cache = {"data": None, "last_update": None}
macro_cache = {"data": [], "last_update": None}


def should_refresh_empty_cache(cache, cooldown_seconds=60):
    last_attempt = cache.get("last_attempt")
    now = datetime.utcnow()
    if last_attempt and now - last_attempt < timedelta(seconds=cooldown_seconds):
        return False
    cache["last_attempt"] = now
    return True


# Models
class PageView(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip_hash = db.Column(db.String(64), nullable=False)
    path = db.Column(db.String(200), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

def count_words(text):
    if not text:
        return 0
    # Strip markdown image/link URLs and code fences for a cleaner reading count
    cleaned = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', str(text))
    cleaned = re.sub(r'https?://\S+', ' ', cleaned)
    cjk_chars = len(re.findall(r'[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]', cleaned))
    latin_words = len(re.findall(r'[A-Za-z0-9_]+', cleaned))
    return cjk_chars + latin_words


def parse_tags(raw_tags):
    if not raw_tags:
        return []
    if isinstance(raw_tags, list):
        items = raw_tags
    else:
        raw_str = str(raw_tags).strip()
        if raw_str.startswith('['):
            try:
                parsed = json.loads(raw_str)
                items = parsed if isinstance(parsed, list) else []
            except Exception:
                items = raw_str.split(',')
        else:
            items = re.split(r'[,，\n]+', raw_str)
    seen = set()
    result = []
    for item in items:
        tag = str(item).strip()
        if tag and tag not in seen:
            seen.add(tag)
            result.append(tag[:32])
    return result[:12]


def serialize_tags(raw_tags):
    return ",".join(parse_tags(raw_tags))


def analysis_slug(analysis_obj):
    title = (analysis_obj.title or "untitled").replace(" ", "_")
    for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
        title = title.replace(char, '')
    return f"{analysis_obj.id}_{title}"


def analysis_public_path(analysis_obj):
    folder = "analysis" if analysis_obj.content_type == "analysis" else "tutorials"
    return f"/{folder}/{analysis_slug(analysis_obj)}"


class Analysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text, nullable=False, default='')
    content = db.Column(db.Text, nullable=False, default='')
    category = db.Column(db.String(50), nullable=False, default='深度分析')
    cover = db.Column(db.String(500))
    content_type = db.Column(db.String(20), default='analysis')
    status = db.Column(db.String(20), default='published')  # 'published' | 'draft'
    tags = db.Column(db.Text, default='')
    is_pinned = db.Column(db.Boolean, default=False)
    word_count = db.Column(db.Integer, default=0)
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, views=0):
        wc = self.word_count if self.word_count and self.word_count > 0 else count_words(self.content)
        created_iso = self.created_at.isoformat() if self.created_at else datetime.utcnow().isoformat()
        updated_iso = self.updated_at.isoformat() if self.updated_at else created_iso
        return {
            "id": self.id,
            "title": self.title,
            "summary": self.summary or "",
            "content": self.content or "",
            "category": self.category or "深度分析",
            "cover": self.cover or "",
            "content_type": self.content_type or "analysis",
            "status": self.status or "published",
            "tags": parse_tags(self.tags),
            "is_pinned": bool(self.is_pinned),
            "word_count": wc,
            "reading_time": max(1, (wc + 399) // 400),
            "views": views,
            "slug": analysis_slug(self),
            "public_path": analysis_public_path(self),
            "is_deleted": bool(self.is_deleted),
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
            "created_at": created_iso,
            "updated_at": updated_iso,
        }

class MarketMetric(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    index_value = db.Column(db.Float, nullable=False)
    rsi = db.Column(db.Float)
    vix_score = db.Column(db.Float)
    price_score = db.Column(db.Float)
    yield_score = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "value": round(self.index_value, 1),
            "details": {"rsi": round(self.rsi, 1), "vix": round(self.vix_score, 1),
                        "valuation": round(self.price_score, 1), "macro": round(self.yield_score, 1)},
            "timestamp": self.timestamp.isoformat()
        }

class MarketSnapshot(db.Model):
    key = db.Column(db.String(32), primary_key=True)
    payload = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


def save_market_snapshot(key, cache):
    if not cache.get("data"):
        return
    with app.app_context():
        row = db.session.get(MarketSnapshot, key)
        if row is None:
            row = MarketSnapshot(key=key)
            db.session.add(row)
        row.payload = json.dumps(cache["data"])
        row.updated_at = cache["last_update"]
        db.session.commit()


def load_market_snapshot(key, cache):
    row = db.session.get(MarketSnapshot, key)
    if row and (not cache.get("last_update") or row.updated_at > cache["last_update"]):
        cache["data"] = json.loads(row.payload)
        cache["last_update"] = row.updated_at


class PollVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vote_type = db.Column(db.String(10), nullable=False) # 'bull' or 'bear'
    ip_hash = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# Auth Decorator
def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not ADMIN_TOKEN:
            logger.error("ADMIN_TOKEN is not configured")
            return jsonify({"error": "Admin access is not configured"}), 503
        token = request.headers.get('Authorization')
        expected = f"Bearer {ADMIN_TOKEN}"
        if not token or not hmac.compare_digest(token, expected):
            return jsonify({"error": "Unauthorized"}), 403
        return f(*args, **kwargs)
    return decorated_function

import traceback

# Calculation Logic
def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

# Helper for safe numerical conversion
def safe_float(val, default=0.0):
    try:
        if val is None or pd.isna(val): return default
        return float(val)
    except: return default


def update_market_index():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    try:
        ndx_ticker = yf.Ticker("^NDX")
        ndx_hist = ndx_ticker.history(period="1mo")
        if ndx_hist is None or ndx_hist.empty or 'Close' not in ndx_hist.columns:
            logger.warning("Nasdaq history unavailable for index calculation")
            return

        rsi_val = calculate_rsi(ndx_hist['Close']).iloc[-1]
        if pd.isna(rsi_val): rsi_val = 50

        # VIX Score
        try:
            vix_info = yf.Ticker("^VIX").fast_info
            vh, vl, lp = safe_float(vix_info.year_high), safe_float(vix_info.year_low), safe_float(vix_info.last_price)
            vix_score = ((vh - lp) / (vh - vl + 0.1)) * 100 if vh > vl else 50
        except Exception as e:
            logger.error(f"VIX calculation error: {e}")
            vix_score = 50

        # Price Score
        try:
            ndx_info = ndx_ticker.fast_info
            nh, nl, nlp = safe_float(ndx_info.year_high), safe_float(ndx_info.year_low), safe_float(ndx_info.last_price)
            price_score = ((nlp - nl) / (nh - nl + 0.1)) * 100 if nh > nl else 50
        except Exception as e:
            logger.error(f"Price score calculation error: {e}")
            price_score = 50

        # Yield Score
        try:
            tnx_info = yf.Ticker("^TNX").fast_info
            th, tlp = safe_float(tnx_info.year_high), safe_float(tnx_info.last_price)
            yield_score = ((th - tlp) / (th - tlp + 1)) * 100 if th >= tlp else 50
        except Exception as e:
            logger.error(f"Yield score calculation error: {e}")
            yield_score = 50

        final_index = (0.35 * rsi_val) + (0.35 * vix_score) + (0.15 * price_score) + (0.15 * yield_score)

        with app.app_context():
            new_metric = MarketMetric(
                index_value=float(final_index),
                rsi=float(rsi_val),
                vix_score=float(vix_score),
                price_score=float(price_score),
                yield_score=float(yield_score)
            )
            db.session.add(new_metric)
            db.session.commit()
        logger.info(f"Market Index updated: {final_index:.2f}")
    except Exception as e:
        logger.error(f"Index update failed: {e}")
        logger.error(traceback.format_exc())

def refresh_watchlist_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global watchlist_cache
    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]
    new_data = []

    for symbol in tickers:
        try:
            t = yf.Ticker(symbol)
            hist = t.history(period="2d")
            if hist.empty or len(hist) < 1:
                raise ValueError(f"No history for {symbol}")

            # Use last available row for current price
            price = float(hist['Close'].iloc[-1])

            # Calculate change based on previous close if available, else use yesterday's close from history
            if len(hist) >= 2:
                prev_close = float(hist['Close'].iloc[-2])
            else:
                prev_close = price # fallback

            change = price - prev_close
            pct = (change / prev_close) * 100 if prev_close != 0 else 0

            new_data.append({
                "symbol": symbol,
                "price": round(price, 2),
                "change": round(change, 2),
                "percent": round(pct, 2)
            })
        except Exception as e:
            logger.error(f"Watchlist item {symbol} error: {e}")
            existing = next((x for x in watchlist_cache.get("data", []) if x.get('symbol') == symbol), None)
            if existing: new_data.append(existing)

    if new_data:
        watchlist_cache["data"] = new_data
        watchlist_cache["last_update"] = datetime.utcnow()
        save_market_snapshot("watchlist", watchlist_cache)
        logger.info("watchlist updated")

def refresh_nasdaq_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global nasdaq_cache
    try:
        info = yf.Ticker("^NDX").fast_info
        if info is None: raise ValueError("fast_info is None")

        lp = safe_float(info.last_price)
        pc = safe_float(info.previous_close)

        if lp == 0: raise ValueError("Price is 0")

        nasdaq_cache["data"] = {
            "index": round(lp, 2),
            "change": round(lp - pc, 2),
            "percent": round((lp - pc) / pc * 100, 2) if pc else 0,
            "last_update": datetime.now().strftime("%H:%M:%S")
        }
        nasdaq_cache["last_update"] = datetime.utcnow()
        save_market_snapshot("nasdaq", nasdaq_cache)
        logger.info("nasdaq updated")
    except Exception as e:
        logger.error(f"Nasdaq refresh failed: {e}")

def refresh_macro_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global macro_cache
    assets_map = {"DXY": "DX-Y.NYB", "GOLD": "GC=F", "OIL": "BZ=F"}
    new_data = []

    for name, symbol in assets_map.items():
        try:
            t = yf.Ticker(symbol)
            info = t.fast_info
            if info is None: raise ValueError("fast_info is None")

            lp = safe_float(info.last_price)
            pc = safe_float(info.previous_close)

            if lp == 0: raise ValueError("Price is 0")

            pct = ((lp - pc) / pc) * 100 if pc else 0
            new_data.append({"name": name, "price": round(lp, 2), "percent": round(pct, 2)})
        except Exception as e:
            logger.error(f"Macro item {name} error: {e}")
            existing = next((x for x in macro_cache.get("data", []) if x.get('name') == name), None)
            if existing: new_data.append(existing)

    if new_data:
        macro_cache["data"] = new_data
        macro_cache["last_update"] = datetime.utcnow()
        save_market_snapshot("macro", macro_cache)
        logger.info("macro updated")


def background_worker():
    while True:
        for refresh in (update_market_index, refresh_nasdaq_data, refresh_macro_data, refresh_watchlist_data):
            try:
                refresh()
            except Exception:
                logger.exception("Market data refresh failed")
        time.sleep(120)


# Routes


@app.route('/api/market-index', methods=['GET'])
def get_market_index():
    m = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    return jsonify(m.to_dict()) if m else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/market-index/history', methods=['GET'])
def get_market_history():
    metrics = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).limit(30).all()
    return jsonify([m.to_dict() for m in reversed(metrics)])

@app.route('/api/nasdaq', methods=['GET'])
def get_nasdaq():
    load_market_snapshot("nasdaq", nasdaq_cache)
    if not nasdaq_cache["data"] and should_refresh_empty_cache(nasdaq_cache):
        refresh_nasdaq_data()
    return jsonify(nasdaq_cache["data"]) if nasdaq_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/macro-assets', methods=['GET'])
def get_macro():
    load_market_snapshot("macro", macro_cache)
    if not macro_cache["data"] and should_refresh_empty_cache(macro_cache):
        refresh_macro_data()
    return jsonify(macro_cache["data"]) if macro_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/watch-list', methods=['GET'])
def get_watch():
    load_market_snapshot("watchlist", watchlist_cache)
    if not watchlist_cache["data"] and should_refresh_empty_cache(watchlist_cache):
        refresh_watchlist_data()
    return jsonify(watchlist_cache["data"]) if watchlist_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/sitemap-urls', methods=['GET'])
def get_sitemap_urls():
    # Return dynamic analysis routes
    analyses = Analysis.query.all()
    urls = []
    for a in analyses:
        urls.append({"loc": f"/analysis/{a.id}", "lastmod": a.created_at.isoformat()})

    # Daily logs are discovered directly from the Markdown content directory.
    return jsonify(urls)

@app.route('/api/poll/status', methods=['GET'])
def get_poll_status():
    last_24h = datetime.utcnow() - timedelta(hours=24)
    bull = PollVote.query.filter(PollVote.vote_type == 'bull', PollVote.created_at > last_24h).count()
    bear = PollVote.query.filter(PollVote.vote_type == 'bear', PollVote.created_at > last_24h).count()
    total = bull + bear
    bull_pct = round((bull / total) * 100) if total > 0 else 50
    ip = request.remote_addr or 'unknown'
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()
    has_voted = PollVote.query.filter(PollVote.ip_hash == ip_hash, PollVote.created_at > last_24h).first() is not None
    return jsonify({"bull_pct": bull_pct, "bear_pct": 100 - bull_pct, "total": total, "has_voted": has_voted})

@app.route('/api/poll/vote', methods=['POST'])
def submit_vote():
    data = request.get_json(silent=True) or {}
    vote_type = data.get("type")
    if vote_type not in {"bull", "bear"}:
        return jsonify({"error": "Invalid vote type"}), 400

    ip = request.remote_addr or "unknown"
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()
    last_24h = datetime.utcnow() - timedelta(hours=24)
    existing = PollVote.query.filter(
        PollVote.ip_hash == ip_hash,
        PollVote.created_at > last_24h,
    ).first()
    if existing:
        return jsonify({"error": "Already voted"}), 403

    db.session.add(PollVote(vote_type=vote_type, ip_hash=ip_hash))
    db.session.commit()
    return jsonify({"success": True})

@app.route('/api/market-quote', methods=['GET'])
def get_market_quote():
    load_market_snapshot("nasdaq", nasdaq_cache)
    ndx = nasdaq_cache.get("data")
    updated = nasdaq_cache.get("last_update")
    quote = (f"纳斯达克 100 最近报价 {ndx['index']:,.2f}，较前收盘 {ndx['percent']:+.2f}%。行情可能延迟，请核对更新时间。"
             if ndx else "行情暂未更新。可以先浏览研究手记与学习内容。")
    return jsonify({"quote": quote, "date": updated.strftime("%Y.%m.%d") if updated else None})

def get_article_view_counts():
    """Map article id -> total PageView count by matching /analysis/{id}_* or /tutorials/{id}_*."""
    rows = db.session.query(PageView.path, db.func.count(PageView.id)).group_by(PageView.path).all()
    id_views = {}
    for path_str, cnt in rows:
        if not path_str:
            continue
        m = re.match(r'^/(?:analysis|tutorials)/(\d+)_', path_str)
        if m:
            aid = int(m.group(1))
            id_views[aid] = id_views.get(aid, 0) + cnt
    return id_views


@app.route('/api/analysis', methods=['GET'])
def get_all_analysis():
    # Public view: Only show published, non-deleted items
    c_type = request.args.get('type', 'analysis')
    query = Analysis.query.filter(
        Analysis.is_deleted == False,
        db.or_(Analysis.status == 'published', Analysis.status.is_(None))
    )
    if c_type != 'all':
        query = query.filter_by(content_type=c_type)
    analyses = query.order_by(Analysis.is_pinned.desc(), Analysis.created_at.desc()).all()
    view_counts = get_article_view_counts()
    return jsonify([a.to_dict(views=view_counts.get(a.id, 0)) for a in analyses])

@app.route('/api/track', methods=['POST'])
def track_page_view():
    data = request.json or {}
    path = data.get('path', '/')
    ip = request.remote_addr or 'unknown'
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()

    with app.app_context():
        # Prevent spamming the same path from the same IP within 1 minute
        recent = PageView.query.filter(
            PageView.ip_hash == ip_hash,
            PageView.path == path,
            PageView.timestamp > datetime.utcnow() - timedelta(minutes=1)
        ).first()
        if not recent:
            pv = PageView(ip_hash=ip_hash, path=path)
            db.session.add(pv)
            db.session.commit()

    return jsonify({"success": True})

@app.route('/api/admin/all-content', methods=['GET'])
@require_admin
def get_admin_content():
    # Admin sees everything including drafts and trash, with view counts
    items = Analysis.query.order_by(
        Analysis.is_pinned.desc(),
        Analysis.updated_at.desc(),
        Analysis.created_at.desc()
    ).all()
    view_counts = get_article_view_counts()
    return jsonify([a.to_dict(views=view_counts.get(a.id, 0)) for a in items])

@app.route('/api/admin/stats', methods=['GET'])
@require_admin
def get_admin_stats():
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start = today_start - timedelta(days=6)
    month_start = today_start - timedelta(days=29)

    today_visits = PageView.query.filter(PageView.timestamp >= today_start).count()
    yesterday_visits = PageView.query.filter(
        PageView.timestamp >= yesterday_start,
        PageView.timestamp < today_start
    ).count()
    week_visits = PageView.query.filter(PageView.timestamp >= week_start).count()
    month_visits = PageView.query.filter(PageView.timestamp >= month_start).count()
    total_visits = PageView.query.count()

    unique_visitors = db.session.query(db.func.count(db.func.distinct(PageView.ip_hash))).scalar() or 0
    active_users = db.session.query(db.func.count(db.func.distinct(PageView.ip_hash)))\
        .filter(PageView.timestamp >= now - timedelta(minutes=15)).scalar() or 0

    # Bounce rate calculation
    denom = unique_visitors if unique_visitors > 0 else 1
    subq = db.session.query(PageView.ip_hash).group_by(PageView.ip_hash).having(db.func.count(PageView.id) == 1).subquery()
    single_page_ips = db.session.query(db.func.count(subq.c.ip_hash)).scalar() or 0
    bounce_rate_pct = round((single_page_ips / denom) * 100) if unique_visitors > 0 else 0

    # 14-day PV/UV trend
    trend_start = today_start - timedelta(days=13)
    recent_pvs = PageView.query.filter(PageView.timestamp >= trend_start).all()
    daily_pv_map = {}
    daily_uv_map = {}
    for pv in recent_pvs:
        if not pv.timestamp:
            continue
        day_key = pv.timestamp.strftime('%Y-%m-%d')
        daily_pv_map[day_key] = daily_pv_map.get(day_key, 0) + 1
        daily_uv_map.setdefault(day_key, set()).add(pv.ip_hash)

    daily_trend = []
    for i in range(13, -1, -1):
        day = today_start - timedelta(days=i)
        day_key = day.strftime('%Y-%m-%d')
        daily_trend.append({
            "date": day_key,
            "label": day.strftime('%m-%d'),
            "pv": daily_pv_map.get(day_key, 0),
            "uv": len(daily_uv_map.get(day_key, set())),
        })

    # Top paths with friendly labels
    all_articles = Analysis.query.all()
    article_by_id = {a.id: a for a in all_articles}
    path_label_map = {
        "/": "首页",
        "/analysis": "深度分析列表",
        "/tutorials": "技术项目列表",
        "/daily": "每日简报",
        "/tools": "投资工具箱",
        "/hk-account": "港卡指南",
        "/admin": "Studio 后台",
        "/community/wechat": "社群页面",
    }
    raw_top_paths = db.session.query(PageView.path, db.func.count(PageView.id).label('cnt'))\
        .group_by(PageView.path)\
        .order_by(db.desc('cnt'))\
        .limit(10).all()

    top_paths = []
    for p_str, cnt in raw_top_paths:
        label = path_label_map.get(p_str, p_str)
        m = re.match(r'^/(?:analysis|tutorials)/(\d+)_', p_str or '')
        if m and int(m.group(1)) in article_by_id:
            label = article_by_id[int(m.group(1))].title
        share = round((cnt / total_visits) * 100, 1) if total_visits > 0 else 0
        top_paths.append({
            "path": p_str,
            "label": label,
            "views": cnt,
            "share": share,
        })

    # Content analytics
    active_articles = [a for a in all_articles if not a.is_deleted]
    published_articles = [a for a in active_articles if (a.status or 'published') == 'published']
    draft_articles = [a for a in active_articles if a.status == 'draft']
    pinned_articles = [a for a in active_articles if a.is_pinned]
    trash_articles = [a for a in all_articles if a.is_deleted]

    total_words = sum((a.word_count or count_words(a.content)) for a in active_articles)
    avg_words = round(total_words / len(active_articles)) if active_articles else 0
    total_reading_minutes = sum(max(1, ((a.word_count or count_words(a.content)) + 399) // 400) for a in active_articles)

    cat_map = {}
    tag_map = {}
    month_map = {}
    for a in active_articles:
        cat = a.category or "未分类"
        wc = a.word_count or count_words(a.content)
        if cat not in cat_map:
            cat_map[cat] = {"category": cat, "count": 0, "words": 0}
        cat_map[cat]["count"] += 1
        cat_map[cat]["words"] += wc

        for t in parse_tags(a.tags):
            tag_map[t] = tag_map.get(t, 0) + 1

        if a.created_at:
            mk = a.created_at.strftime('%Y-%m')
            month_map[mk] = month_map.get(mk, 0) + 1

    category_breakdown = sorted(cat_map.values(), key=lambda x: (-x["count"], -x["words"]))
    tag_breakdown = [{"tag": k, "count": v} for k, v in sorted(tag_map.items(), key=lambda x: (-x[1], x[0]))[:16]]

    # Last 6 months publishing cadence
    monthly_cadence = []
    y, m_idx = now.year, now.month
    months_list = []
    for _ in range(6):
        months_list.append(f"{y:04d}-{m_idx:02d}")
        m_idx -= 1
        if m_idx == 0:
            m_idx = 12
            y -= 1
    for mk in reversed(months_list):
        monthly_cadence.append({"month": mk, "count": month_map.get(mk, 0)})

    # System storage stats
    db_path = os.path.join(basedir, 'investcool.db')
    db_size_bytes = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    uploads_count = 0
    uploads_size_bytes = 0
    if os.path.exists(UPLOAD_FOLDER):
        for fname in os.listdir(UPLOAD_FOLDER):
            fpath = os.path.join(UPLOAD_FOLDER, fname)
            if os.path.isfile(fpath) and allowed_file(fname):
                uploads_count += 1
                uploads_size_bytes += os.path.getsize(fpath)

    return jsonify({
        "today_visits": today_visits,
        "yesterday_visits": yesterday_visits,
        "week_visits": week_visits,
        "month_visits": month_visits,
        "total_visits": total_visits,
        "unique_visitors": unique_visitors,
        "active_users": active_users,
        "bounce_rate": f"{bounce_rate_pct}%",
        "daily_trend": daily_trend,
        "top_paths": top_paths,
        "content": {
            "total_active": len(active_articles),
            "published_count": len(published_articles),
            "draft_count": len(draft_articles),
            "pinned_count": len(pinned_articles),
            "trash_count": len(trash_articles),
            "analysis_count": len([a for a in active_articles if a.content_type == 'analysis']),
            "tutorial_count": len([a for a in active_articles if a.content_type == 'tutorial']),
            "total_words": total_words,
            "avg_words": avg_words,
            "total_reading_minutes": total_reading_minutes,
            "category_breakdown": category_breakdown,
            "tag_breakdown": tag_breakdown,
            "monthly_cadence": monthly_cadence,
        },
        "system": {
            "db_size_bytes": db_size_bytes,
            "uploads_count": uploads_count,
            "uploads_size_bytes": uploads_size_bytes,
            "server_time": now.isoformat() + "Z",
        },
    })

@app.route('/api/analysis/<int:id>', methods=['GET'])
def get_analysis_by_id(id):
    a = Analysis.query.get_or_404(id)
    if a.is_deleted or a.status == 'draft':
        abort(404)
    view_counts = get_article_view_counts()
    return jsonify(a.to_dict(views=view_counts.get(a.id, 0)))

def content_file_paths(analysis_id):
    content_base = os.path.abspath(os.path.join(basedir, "../../frontend/content"))
    paths = []
    for folder in ("analysis", "tutorials"):
        paths.extend(glob(os.path.join(content_base, folder, f"{analysis_id}_*.md")))
    return paths


def remove_analysis_files(analysis_id):
    for file_path in content_file_paths(analysis_id):
        try:
            os.remove(file_path)
        except FileNotFoundError:
            pass


# Keep the public Markdown collection synchronized with the admin database.
def sync_analysis_to_file(analysis_obj):
    try:
        content_base = os.path.abspath(os.path.join(basedir, "../../frontend/content"))
        folder = "analysis" if analysis_obj.content_type == 'analysis' else "tutorials"
        target_dir = os.path.join(content_base, folder)
        os.makedirs(target_dir, exist_ok=True)

        remove_analysis_files(analysis_obj.id)
        if analysis_obj.is_deleted or (analysis_obj.status or 'published') != 'published':
            return

        filename = f"{analysis_slug(analysis_obj)}.md"
        file_path = os.path.join(target_dir, filename)
        tags_list = parse_tags(analysis_obj.tags)
        created_date = (analysis_obj.created_at or datetime.utcnow()).strftime('%Y-%m-%d')
        updated_date = (analysis_obj.updated_at or analysis_obj.created_at or datetime.utcnow()).strftime('%Y-%m-%d')

        fm = "---\n"
        fm += f"title: {json.dumps(analysis_obj.title, ensure_ascii=False)}\n"
        fm += f"category: {json.dumps(analysis_obj.category, ensure_ascii=False)}\n"
        fm += f"summary: {json.dumps(analysis_obj.summary or '', ensure_ascii=False)}\n"
        fm += f"cover: {json.dumps(analysis_obj.cover or '', ensure_ascii=False)}\n"
        fm += f"date: {json.dumps(created_date)}\n"
        fm += f"updated_at: {json.dumps(updated_date)}\n"
        fm += f"pinned: {'true' if analysis_obj.is_pinned else 'false'}\n"
        if tags_list:
            fm += f"tags: {json.dumps(tags_list, ensure_ascii=False)}\n"
        fm += "---\n\n"

        temp_path = f"{file_path}.tmp"
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(fm + (analysis_obj.content or ''))
        os.replace(temp_path, file_path)

        logger.info(f"Synced article #{analysis_obj.id} to file: {file_path}")
    except Exception as e:
        logger.error(f"Sync to file failed: {e}")

@app.route('/api/analysis', methods=['POST'])
@require_admin
def create_analysis():
    data = request.get_json(silent=True) or {}
    status = data.get('status', 'published')
    if status not in ('published', 'draft'):
        status = 'published'

    title = str(data.get('title', '')).strip()
    summary = str(data.get('summary', '')).strip()
    content = str(data.get('content', ''))
    category = str(data.get('category', '深度分析')).strip() or '深度分析'

    if not title:
        return jsonify({"error": "请填写文章标题"}), 400
    if status == 'published':
        if not content.strip():
            return jsonify({"error": "发布文章时正文不能为空（可先存为草稿）"}), 400
        if not summary:
            # Auto-generate summary fallback from content if empty
            plain = re.sub(r'[#*`>\-\[\]()!]+', ' ', content).strip()
            summary = re.sub(r'\s+', ' ', plain)[:120]

    try:
        now = datetime.utcnow()
        new_analysis = Analysis(
            title=title,
            summary=summary,
            content=content,
            category=category,
            cover=str(data.get('cover', '') or '').strip(),
            content_type=data.get('content_type', 'analysis') if data.get('content_type') in ('analysis', 'tutorial') else 'analysis',
            status=status,
            tags=serialize_tags(data.get('tags')),
            is_pinned=bool(data.get('is_pinned', False)),
            word_count=count_words(content),
            updated_at=now,
        )
        db.session.add(new_analysis)
        db.session.commit()
        sync_analysis_to_file(new_analysis)
        return jsonify(new_analysis.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/analysis/<int:id>', methods=['PUT'])
@require_admin
def update_analysis(id):
    a = Analysis.query.get_or_404(id)
    data = request.get_json(silent=True) or {}
    try:
        if 'title' in data:
            new_title = str(data.get('title', '')).strip()
            if not new_title:
                return jsonify({"error": "文章标题不能为空"}), 400
            a.title = new_title
        if 'summary' in data:
            a.summary = str(data.get('summary', '') or '').strip()
        if 'content' in data:
            a.content = str(data.get('content', '') or '')
            a.word_count = count_words(a.content)
        if 'category' in data:
            a.category = str(data.get('category', '') or '').strip() or a.category
        if 'cover' in data:
            a.cover = str(data.get('cover', '') or '').strip()
        if 'content_type' in data and data.get('content_type') in ('analysis', 'tutorial'):
            a.content_type = data.get('content_type')
        if 'status' in data and data.get('status') in ('published', 'draft'):
            a.status = data.get('status')
        if 'tags' in data:
            a.tags = serialize_tags(data.get('tags'))
        if 'is_pinned' in data:
            a.is_pinned = bool(data.get('is_pinned'))

        if (a.status or 'published') == 'published' and not (a.content or '').strip():
            return jsonify({"error": "发布文章时正文不能为空（可先存为草稿）"}), 400

        a.updated_at = datetime.utcnow()
        db.session.commit()
        sync_analysis_to_file(a)
        view_counts = get_article_view_counts()
        return jsonify(a.to_dict(views=view_counts.get(a.id, 0)))
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/analysis/<int:id>', methods=['DELETE'])
@require_admin
def delete_analysis(id):
    a = Analysis.query.get_or_404(id)
    try:
        # Move to trash instead of real delete
        a.is_deleted = True
        a.deleted_at = datetime.utcnow()
        a.updated_at = datetime.utcnow()
        db.session.commit()
        sync_analysis_to_file(a)
        return jsonify({"success": True, "message": "Moved to trash"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/admin/restore/<int:id>', methods=['POST'])
@require_admin
def restore_analysis(id):
    a = Analysis.query.get_or_404(id)
    try:
        a.is_deleted = False
        a.deleted_at = None
        a.updated_at = datetime.utcnow()
        db.session.commit()
        sync_analysis_to_file(a)
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/admin/hard-delete/<int:id>', methods=['DELETE'])
@require_admin
def hard_delete_analysis(id):
    a = Analysis.query.get_or_404(id)
    try:
        remove_analysis_files(a.id)
        db.session.delete(a)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin/articles/<int:id>/duplicate', methods=['POST'])
@require_admin
def duplicate_analysis(id):
    src = Analysis.query.get_or_404(id)
    try:
        now = datetime.utcnow()
        copy_item = Analysis(
            title=f"{src.title} (副本)",
            summary=src.summary or "",
            content=src.content or "",
            category=src.category or "深度分析",
            cover=src.cover or "",
            content_type=src.content_type or "analysis",
            status="draft",
            tags=src.tags or "",
            is_pinned=False,
            word_count=count_words(src.content or ""),
            updated_at=now,
        )
        db.session.add(copy_item)
        db.session.commit()
        return jsonify(copy_item.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin/articles/batch', methods=['POST'])
@require_admin
def batch_articles_action():
    data = request.get_json(silent=True) or {}
    action = data.get('action')
    ids = data.get('ids') or []
    if not isinstance(ids, list) or not ids:
        return jsonify({"error": "请选择至少一篇文章"}), 400

    valid_actions = {'publish', 'draft', 'trash', 'restore', 'hard_delete', 'pin', 'unpin'}
    if action not in valid_actions:
        return jsonify({"error": f"不支持的批量操作: {action}"}), 400

    items = Analysis.query.filter(Analysis.id.in_(ids)).all()
    now = datetime.utcnow()
    affected = 0
    try:
        for a in items:
            if action == 'publish':
                if (a.content or '').strip():
                    a.status = 'published'
                    a.is_deleted = False
                    a.deleted_at = None
                    a.updated_at = now
                    affected += 1
            elif action == 'draft':
                a.status = 'draft'
                a.updated_at = now
                affected += 1
            elif action == 'trash':
                a.is_deleted = True
                a.deleted_at = now
                a.updated_at = now
                affected += 1
            elif action == 'restore':
                a.is_deleted = False
                a.deleted_at = None
                a.updated_at = now
                affected += 1
            elif action == 'pin':
                a.is_pinned = True
                a.updated_at = now
                affected += 1
            elif action == 'unpin':
                a.is_pinned = False
                a.updated_at = now
                affected += 1
            elif action == 'hard_delete':
                remove_analysis_files(a.id)
                db.session.delete(a)
                affected += 1

        db.session.commit()
        if action != 'hard_delete':
            for a in items:
                sync_analysis_to_file(a)
        return jsonify({"success": True, "affected": affected})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin/trash/empty', methods=['DELETE'])
@require_admin
def empty_trash():
    trashed = Analysis.query.filter_by(is_deleted=True).all()
    count = len(trashed)
    try:
        for a in trashed:
            remove_analysis_files(a.id)
            db.session.delete(a)
        db.session.commit()
        return jsonify({"success": True, "deleted": count})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin/sync-markdown', methods=['POST'])
@require_admin
def sync_markdown_to_db():
    """Import untracked markdown files from frontend/content/{analysis,tutorials} into Studio DB."""
    content_base = os.path.abspath(os.path.join(basedir, "../../frontend/content"))
    existing_titles = {a.title.strip() for a in Analysis.query.all() if a.title}
    imported = 0
    skipped = 0

    for folder, c_type in (("analysis", "analysis"), ("tutorials", "tutorial")):
        dir_path = os.path.join(content_base, folder)
        if not os.path.isdir(dir_path):
            continue
        for fname in sorted(os.listdir(dir_path)):
            if not fname.endswith('.md') or '[DELETED]' in fname:
                continue
            # Skip files already managed by ID prefix if that ID exists in DB
            id_match = re.match(r'^(\d+)_', fname)
            if id_match and db.session.get(Analysis, int(id_match.group(1))) is not None:
                skipped += 1
                continue
            fpath = os.path.join(dir_path, fname)
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    raw = f.read()
            except Exception:
                continue

            meta = {}
            body = raw
            fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n?(.*)$', raw, re.DOTALL)
            if fm_match:
                fm_text, body = fm_match.group(1), fm_match.group(2)
                for line in fm_text.splitlines():
                    if ':' in line:
                        k, v = line.split(':', 1)
                        v = v.strip().strip('"').strip("'")
                        meta[k.strip()] = v

            title = meta.get('title') or fname[:-3]
            if title.strip() in existing_titles:
                skipped += 1
                continue

            summary = meta.get('summary') or meta.get('description') or ''
            category = meta.get('category') or ('深度分析' if c_type == 'analysis' else '技术教程')
            cover = meta.get('cover') or ''
            tags = serialize_tags(meta.get('tags', ''))
            now = datetime.utcnow()

            item = Analysis(
                title=title.strip(),
                summary=summary.strip(),
                content=body.strip(),
                category=category.strip(),
                cover=cover.strip(),
                content_type=c_type,
                status='published',
                tags=tags,
                is_pinned=False,
                word_count=count_words(body),
                updated_at=now,
            )
            db.session.add(item)
            existing_titles.add(title.strip())
            imported += 1

    try:
        db.session.commit()
        return jsonify({"success": True, "imported": imported, "skipped": skipped})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route('/api/admin/uploads', methods=['GET'])
@require_admin
def list_uploads():
    if not os.path.exists(UPLOAD_FOLDER):
        return jsonify([])

    all_articles = Analysis.query.filter_by(is_deleted=False).all()
    files = []
    for fname in os.listdir(UPLOAD_FOLDER):
        if not allowed_file(fname):
            continue
        fpath = os.path.join(UPLOAD_FOLDER, fname)
        if not os.path.isfile(fpath):
            continue
        stat = os.stat(fpath)
        width, height = None, None
        try:
            with Image.open(fpath) as img:
                width, height = img.size
        except Exception:
            pass

        url = f"/api/uploads/{fname}"
        used_in = []
        for a in all_articles:
            if fname in (a.cover or '') or fname in (a.content or ''):
                used_in.append({"id": a.id, "title": a.title})

        files.append({
            "filename": fname,
            "url": url,
            "size_bytes": stat.st_size,
            "width": width,
            "height": height,
            "created_at": datetime.utcfromtimestamp(stat.st_mtime).isoformat() + "Z",
            "used_in": used_in,
        })

    files.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify(files)


@app.route('/api/admin/uploads/<path:filename>', methods=['DELETE'])
@require_admin
def delete_upload(filename):
    safe_name = os.path.basename(filename)
    if not safe_name or safe_name != filename or not allowed_file(safe_name):
        return jsonify({"error": "Invalid filename"}), 400
    fpath = os.path.join(UPLOAD_FOLDER, safe_name)
    if not os.path.isfile(fpath):
        return jsonify({"error": "File not found"}), 404
    try:
        os.remove(fpath)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Configuration for uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../../frontend/public/uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB Limit

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/uploads/<path:filename>')
def serve_upload(filename):
    from flask import send_from_directory
    return send_from_directory(UPLOAD_FOLDER, filename)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST'])
@require_admin
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        file_content = file.read()
        try:
            image = Image.open(io.BytesIO(file_content))
            image.verify()
        except (UnidentifiedImageError, OSError):
            return jsonify({"error": "Invalid image file"}), 400

        file_hash = hashlib.md5(file_content).hexdigest()
        filename = f"{file_hash}.{ext}"

        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            with open(filepath, 'wb') as f:
                f.write(file_content)

        # Return the public URL path via API proxy
        return jsonify({
            "url": f"/api/uploads/{filename}",
            "filename": filename
        })

    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/auth/verify', methods=['GET'])
@require_admin
def verify_token():
    return jsonify({"status": "valid"})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

def ensure_analysis_columns():
    """Safely add new Studio columns to existing SQLite databases without losing data."""
    try:
        rows = db.session.execute(db.text("PRAGMA table_info(analysis)")).fetchall()
        existing = {row[1] for row in rows}
        migrations = [
            ("status", "VARCHAR(20) DEFAULT 'published'"),
            ("tags", "TEXT DEFAULT ''"),
            ("is_pinned", "BOOLEAN DEFAULT 0"),
            ("word_count", "INTEGER DEFAULT 0"),
            ("updated_at", "DATETIME"),
        ]
        added = []
        for col, col_def in migrations:
            if col not in existing:
                db.session.execute(db.text(f"ALTER TABLE analysis ADD COLUMN {col} {col_def}"))
                added.append(col)
        if added:
            db.session.commit()
            logger.info(f"Migrated analysis table with columns: {', '.join(added)}")

        # Backfill word_count / status / updated_at for existing rows
        dirty = False
        for a in Analysis.query.all():
            if not a.status:
                a.status = 'published'
                dirty = True
            if not a.updated_at:
                a.updated_at = a.created_at or datetime.utcnow()
                dirty = True
            if not a.word_count and a.content:
                a.word_count = count_words(a.content)
                dirty = True
        if dirty:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Analysis schema migration failed: {e}")


with app.app_context():
    db.create_all()
    ensure_analysis_columns()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
