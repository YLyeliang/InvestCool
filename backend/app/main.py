from flask import Flask, jsonify, request, abort
from flask_sqlalchemy import SQLAlchemy
import os
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import time
from functools import wraps
import logging
import hashlib
import hmac
import io
import json
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
ai_latest_cache = {"data": None, "last_update": None}
risk_diagnostics_cache = {"data": None, "last_update": None}
risk_scenarios_cache = {"data": None, "last_update": None}

RISK_BRIEF_STATUSES = ("风险偏高", "谨慎观察", "中性震荡", "防守观察", "机会窗口")


def should_refresh_empty_cache(cache, cooldown_seconds=60):
    last_attempt = cache.get("last_attempt")
    now = datetime.utcnow()
    if last_attempt and now - last_attempt < timedelta(seconds=cooldown_seconds):
        return False
    cache["last_attempt"] = now
    return True

def cache_is_fresh(cache, ttl_seconds):
    last_update = cache.get("last_update")
    return bool(last_update and datetime.utcnow() - last_update < timedelta(seconds=ttl_seconds))

# Models
class PageView(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip_hash = db.Column(db.String(64), nullable=False)
    path = db.Column(db.String(200), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Analysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    cover = db.Column(db.String(500)) 
    content_type = db.Column(db.String(20), default='analysis')
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "summary": self.summary,
            "content": self.content, "category": self.category,
            "cover": self.cover, "is_deleted": self.is_deleted,
            "content_type": self.content_type,
            "created_at": self.created_at.isoformat()
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

class PollVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vote_type = db.Column(db.String(10), nullable=False) # 'bull' or 'bear'
    ip_hash = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class RiskBrief(db.Model):
    __tablename__ = "ai_recommendation"

    # Legacy table name kept to preserve existing production history.
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    index_position = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "summary": self.summary,
            "index_position": round(self.index_position, 2) if self.index_position else None,
            "created_at": self.created_at.isoformat()
        }

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

def clamp(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, value))

def pct_change(current, base):
    return ((current - base) / base * 100) if base else 0

def risk_label(score):
    if score >= 75:
        return "高风险"
    if score >= 55:
        return "偏高"
    if score >= 35:
        return "中性"
    return "低风险"

def risk_color(score):
    if score >= 75:
        return "red"
    if score >= 55:
        return "amber"
    if score >= 35:
        return "blue"
    return "green"

def round_optional(value, digits=2):
    if value is None:
        return None
    return round(float(value), digits)

def get_diagnostic_pillar(diagnostics, key):
    for pillar in diagnostics.get("pillars", []):
        if pillar.get("key") == key:
            return pillar
    return {"score": 50, "level": "中性", "metrics": []}

def format_range(index_value, low_pct, high_pct):
    low_point = index_value * (1 + low_pct / 100)
    high_point = index_value * (1 + high_pct / 100)
    return {
        "low": round(low_point, 2),
        "high": round(high_point, 2),
        "label": f"{low_point:,.0f} - {high_point:,.0f}",
    }

def build_scenario(key, name, category, low_pct, high_pct, color, probability, triggers, response, rationale, index_value):
    midpoint = (low_pct + high_pct) / 2
    return {
        "key": key,
        "name": name,
        "category": category,
        "color": color,
        "probability": probability,
        "estimated_move": f"{low_pct:+.1f}% 到 {high_pct:+.1f}%",
        "midpoint_move": round(midpoint, 1),
        "ndx_range": format_range(index_value, low_pct, high_pct),
        "triggers": triggers,
        "response": response,
        "rationale": rationale,
    }

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
        logger.info("Watchlist updated")

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
        logger.info("Nasdaq updated")
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
        logger.info("Macro updated")


def build_pillar(key, label, score, comment, metrics):
    normalized_score = round(clamp(score), 1)
    return {
        "key": key,
        "label": label,
        "score": normalized_score,
        "level": risk_label(normalized_score),
        "color": risk_color(normalized_score),
        "comment": comment,
        "metrics": metrics,
    }

def refresh_risk_diagnostics():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_diagnostics_cache

    try:
        ndx_hist = yf.Ticker("^NDX").history(period="1y")
        if ndx_hist is None or ndx_hist.empty or "Close" not in ndx_hist.columns:
            raise ValueError("NDX history unavailable for diagnostics")

        closes = ndx_hist["Close"].dropna()
        if closes.empty:
            raise ValueError("NDX close history unavailable for diagnostics")

        latest = float(closes.iloc[-1])
        ma50 = float(closes.rolling(50).mean().iloc[-1]) if len(closes) >= 50 else float(closes.mean())
        ma200 = float(closes.rolling(200).mean().iloc[-1]) if len(closes) >= 200 else float(closes.mean())
        distance_50 = pct_change(latest, ma50)
        distance_200 = pct_change(latest, ma200)
        one_month_return = pct_change(latest, float(closes.iloc[-22])) if len(closes) > 22 else 0
        three_month_return = pct_change(latest, float(closes.iloc[-64])) if len(closes) > 64 else 0

        if latest >= ma50 and ma50 >= ma200:
            trend_score = 25
            trend_comment = "价格位于 50/200 日均线上方，趋势结构仍偏多。"
        elif latest >= ma50:
            trend_score = 45
            trend_comment = "价格站上 50 日线，但中长期结构仍需确认。"
        elif latest >= ma200:
            trend_score = 60
            trend_comment = "价格跌破 50 日线，短线趋势进入修复观察区。"
        else:
            trend_score = 82
            trend_comment = "价格跌破 200 日线，趋势结构转弱，需要优先控制回撤。"

        if distance_50 > 8:
            trend_score += 8
            trend_comment = "价格显著高于 50 日线，趋势虽强但追高风险上升。"
        if one_month_return < -5:
            trend_score += 8
        if three_month_return < -10:
            trend_score += 8

        returns = closes.pct_change().dropna()
        vol20 = float(returns.tail(20).std() * (252 ** 0.5) * 100) if len(returns) >= 20 else 0
        vol60 = float(returns.tail(60).std() * (252 ** 0.5) * 100) if len(returns) >= 60 else vol20
        try:
            vix_price = safe_float(yf.Ticker("^VIX").fast_info.last_price, None)
        except Exception as e:
            logger.error(f"VIX diagnostics fetch error: {e}")
            vix_price = None

        if vol20 < 18:
            volatility_score = 25
            volatility_comment = "20 日实现波动率处于低位，短线风险定价较温和。"
        elif vol20 < 25:
            volatility_score = 45
            volatility_comment = "波动率回到常态区间，适合用仓位纪律管理日内扰动。"
        elif vol20 < 35:
            volatility_score = 68
            volatility_comment = "实现波动率偏高，指数对利率和权重股消息更敏感。"
        else:
            volatility_score = 86
            volatility_comment = "波动率处于压力区，组合需要优先考虑尾部风险和止损纪律。"

        if vix_price is not None and vix_price >= 25:
            volatility_score += 8
        elif vix_price is not None and vix_price <= 14:
            volatility_score -= 5

        high_52w = float(closes.max())
        low_52w = float(closes.min())
        drawdown = pct_change(latest, high_52w)
        drawdown_depth = abs(min(drawdown, 0))

        if drawdown_depth < 5:
            drawdown_score = 28
            drawdown_comment = "指数距离 52 周高点较近，尚未出现系统性回撤压力。"
        elif drawdown_depth < 10:
            drawdown_score = 45
            drawdown_comment = "回撤进入温和区间，适合观察支撑位和资金回流强度。"
        elif drawdown_depth < 18:
            drawdown_score = 67
            drawdown_comment = "回撤压力偏高，需要关注是否演化为中期趋势破位。"
        else:
            drawdown_score = 88
            drawdown_comment = "指数已进入深度回撤，风险预算和再平衡节奏比择时更重要。"

        if not watchlist_cache.get("data"):
            refresh_watchlist_data()
        watchlist = watchlist_cache.get("data", [])
        total = len(watchlist)
        advancers = len([item for item in watchlist if safe_float(item.get("percent"), -999) >= 0])
        avg_change = sum(safe_float(item.get("percent"), 0) for item in watchlist) / total if total else 0
        breadth_ratio = advancers / total if total else 0.5

        if breadth_ratio >= 0.65:
            breadth_score = 25
            breadth_comment = "MAG7 上涨家数占优，权重股广度对指数构成支撑。"
        elif breadth_ratio >= 0.45:
            breadth_score = 45
            breadth_comment = "权重股涨跌分化，指数需要观察龙头之间的轮动质量。"
        elif breadth_ratio >= 0.25:
            breadth_score = 68
            breadth_comment = "多数权重股走弱，指数上涨若只靠少数股票会降低持续性。"
        else:
            breadth_score = 86
            breadth_comment = "MAG7 广度明显转弱，组合层面需要降低单一主题暴露。"

        if avg_change < -1.5:
            breadth_score += 8
        elif avg_change > 1:
            breadth_score -= 5

        sorted_watchlist = sorted(watchlist, key=lambda item: safe_float(item.get("percent"), 0), reverse=True)
        leaders = [
            {"symbol": item.get("symbol"), "percent": round_optional(item.get("percent"), 2)}
            for item in sorted_watchlist[:2]
        ]
        laggards = [
            {"symbol": item.get("symbol"), "percent": round_optional(item.get("percent"), 2)}
            for item in sorted_watchlist[-2:]
        ]

        pillars = [
            build_pillar(
                "trend",
                "趋势结构",
                trend_score,
                trend_comment,
                [
                    {"label": "距50日线", "value": f"{distance_50:+.1f}%"},
                    {"label": "距200日线", "value": f"{distance_200:+.1f}%"},
                    {"label": "1个月", "value": f"{one_month_return:+.1f}%"},
                    {"label": "3个月", "value": f"{three_month_return:+.1f}%"},
                ],
            ),
            build_pillar(
                "volatility",
                "波动压力",
                volatility_score,
                volatility_comment,
                [
                    {"label": "20日波动", "value": f"{vol20:.1f}%"},
                    {"label": "60日波动", "value": f"{vol60:.1f}%"},
                    {"label": "VIX", "value": f"{vix_price:.1f}" if vix_price is not None else "--"},
                ],
            ),
            build_pillar(
                "drawdown",
                "回撤压力",
                drawdown_score,
                drawdown_comment,
                [
                    {"label": "距52周高点", "value": f"{drawdown:.1f}%"},
                    {"label": "52周高点", "value": f"{high_52w:,.0f}"},
                    {"label": "52周低点", "value": f"{low_52w:,.0f}"},
                ],
            ),
            build_pillar(
                "breadth",
                "权重股广度",
                breadth_score,
                breadth_comment,
                [
                    {"label": "上涨家数", "value": f"{advancers}/{total}" if total else "--"},
                    {"label": "平均涨跌", "value": f"{avg_change:+.2f}%"},
                    {"label": "领涨", "value": ", ".join(item["symbol"] for item in leaders if item.get("symbol")) or "--"},
                    {"label": "拖累", "value": ", ".join(item["symbol"] for item in laggards if item.get("symbol")) or "--"},
                ],
            ),
        ]

        composite_score = round(sum(pillar["score"] for pillar in pillars) / len(pillars), 1)
        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": ndx_hist.index[-1].date().isoformat(),
            "index": round(latest, 2),
            "risk_score": composite_score,
            "risk_level": risk_label(composite_score),
            "risk_color": risk_color(composite_score),
            "summary": (
                f"综合风险 {composite_score:.1f}/100，{risk_label(composite_score)}。"
                f"趋势分 {pillars[0]['score']:.1f}，波动分 {pillars[1]['score']:.1f}，"
                f"回撤分 {pillars[2]['score']:.1f}，广度分 {pillars[3]['score']:.1f}。"
            ),
            "leaders": leaders,
            "laggards": laggards,
            "pillars": pillars,
        }
        risk_diagnostics_cache["data"] = data
        risk_diagnostics_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX risk diagnostics updated: {composite_score:.1f}")
    except Exception as e:
        logger.error(f"NDX risk diagnostics refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_risk_scenarios():
    global risk_scenarios_cache

    try:
        if not cache_is_fresh(risk_diagnostics_cache, 15 * 60):
            refresh_risk_diagnostics()

        diagnostics = risk_diagnostics_cache.get("data")
        if not diagnostics:
            raise ValueError("Risk diagnostics unavailable for scenario analysis")

        with app.app_context():
            metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()

        index_value = safe_float(diagnostics.get("index"), 0)
        if index_value <= 0:
            raise ValueError("Invalid NDX index value for scenario analysis")

        trend = get_diagnostic_pillar(diagnostics, "trend")
        volatility = get_diagnostic_pillar(diagnostics, "volatility")
        drawdown = get_diagnostic_pillar(diagnostics, "drawdown")
        breadth = get_diagnostic_pillar(diagnostics, "breadth")

        risk_score = safe_float(diagnostics.get("risk_score"), 50)
        trend_score = safe_float(trend.get("score"), 50)
        volatility_score = safe_float(volatility.get("score"), 50)
        drawdown_score = safe_float(drawdown.get("score"), 50)
        breadth_score = safe_float(breadth.get("score"), 50)
        yield_buffer = safe_float(metric.yield_score, 50) if metric else 50
        rate_pressure = clamp(100 - yield_buffer)

        base_down = -(1.2 + risk_score / 45)
        base_up = 1.5 + max(0, 70 - risk_score) / 28
        rate_down = -(2.5 + rate_pressure / 18 + volatility_score / 65)
        rate_up = -0.4
        vol_down = -(3.0 + volatility_score / 10 + drawdown_score / 55)
        vol_up = -(0.8 + volatility_score / 80)
        breadth_down = -(0.8 + breadth_score / 45)
        breadth_up = 1.8 + max(0, breadth_score - 35) / 16
        trend_down = -(2.8 + trend_score / 14 + volatility_score / 45)
        trend_up = -0.6

        scenarios = [
            build_scenario(
                "base_case",
                "基准延续",
                "Base Case",
                base_down,
                base_up,
                risk_color(risk_score),
                "中",
                ["风险分维持在当前区间", "VIX 未明显上行", "MAG7 未出现同步破位"],
                "维持核心仓位，新增风险预算分批投入，避免用单日涨跌调整整体方向。",
                "当前综合风险用于估计正常波动区间，上下沿随风险分自动收窄或放大。",
                index_value,
            ),
            build_scenario(
                "rate_shock",
                "利率重新上行",
                "Macro Shock",
                rate_down,
                rate_up,
                "amber" if rate_pressure < 70 else "red",
                "中低",
                ["10Y 利率重新逼近阶段高点", "美元指数走强", "高估值成长股估值压缩"],
                "压低追高仓位，优先保留现金流和盈利可见度更高的权重资产。",
                f"当前利率缓冲分 {yield_buffer:.1f}，缓冲越低时估值久期资产对利率越敏感。",
                index_value,
            ),
            build_scenario(
                "volatility_spike",
                "波动率冲击",
                "Volatility Shock",
                vol_down,
                vol_up,
                "amber" if volatility_score < 75 else "red",
                "中",
                ["VIX 快速上行", "20 日实现波动率继续抬升", "盘中振幅扩大且收盘走弱"],
                "缩短再平衡周期，降低杠杆和集中敞口，先保护最大回撤再讨论进攻。",
                f"波动压力分 {volatility_score:.1f}，反映指数对消息面和流动性的敏感度。",
                index_value,
            ),
            build_scenario(
                "breadth_repair",
                "权重股广度修复",
                "Breadth Repair",
                breadth_down,
                breadth_up,
                "green" if breadth_score >= 55 else "blue",
                "中",
                ["MAG7 上涨家数扩散", "NVDA/MSFT/AAPL 之外的权重股跟涨", "指数上涨伴随成交改善"],
                "把观察重点放在轮动质量，若广度改善可逐步恢复进攻性仓位。",
                f"广度分 {breadth_score:.1f}，当前广度越弱，修复时对指数的边际贡献越大。",
                index_value,
            ),
            build_scenario(
                "trend_break",
                "趋势破位",
                "Trend Break",
                trend_down,
                trend_up,
                "red" if trend_score >= 60 else "amber",
                "低",
                ["指数跌破 50 日线且无法快速收复", "回撤分继续上升", "权重股跌幅同步扩大"],
                "降低单边 beta，设定明确的再入场条件，避免在破位初期摊平风险。",
                f"趋势分 {trend_score:.1f}、回撤分 {drawdown_score:.1f} 共同决定破位压力。",
                index_value,
            ),
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round(index_value, 2),
            "risk_score": round(risk_score, 1),
            "risk_level": diagnostics.get("risk_level", risk_label(risk_score)),
            "summary": "基于当前 NDX 风险诊断生成 5 个压力情景，用于检查仓位在宏观、波动、广度和趋势变化下的承压范围。",
            "scenarios": scenarios,
        }
        risk_scenarios_cache["data"] = data
        risk_scenarios_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX scenario analysis updated: {len(scenarios)} scenarios")
    except Exception as e:
        logger.error(f"NDX scenario analysis refresh failed: {e}")
        logger.error(traceback.format_exc())


def cleanup_old_data():
    try:
        with app.app_context():
            threshold = datetime.now() - timedelta(days=30)
            PollVote.query.filter(PollVote.created_at < threshold).delete()
            MarketMetric.query.filter(MarketMetric.timestamp < threshold).delete()
            db.session.commit()
            logger.info("Cleanup done")
    except Exception as e: logger.error(f"Cleanup error: {e}")

def describe_ndx_risk(metric, ndx_data):
    score = safe_float(metric.index_value, 50)
    rsi = safe_float(metric.rsi, 50)
    vix_buffer = safe_float(metric.vix_score, 50)
    price_position = safe_float(metric.price_score, 50)
    macro_buffer = safe_float(metric.yield_score, 50)
    change_pct = safe_float(ndx_data.get("percent"), 0)

    if score >= 80:
        status = "风险偏高"
        action = "不宜继续追高，优先检查仓位集中度、止盈纪律和权重股拥挤交易。"
    elif score >= 65:
        status = "谨慎观察"
        action = "趋势仍有韧性，但新开仓应等待回踩确认，重点观察 MAG7 轮动是否扩散。"
    elif score >= 40:
        status = "中性震荡"
        action = "指数处在均衡区间，更适合用分批和再平衡处理波动，避免单日涨跌驱动决策。"
    elif score >= 25:
        status = "防守观察"
        action = "风险偏好降温，短线先控制回撤，等待波动率和成交结构稳定后再提高敞口。"
    else:
        status = "机会窗口"
        action = "情绪已明显降温，可把关注点放在现金流稳健、盈利可见度高的纳指核心资产。"

    if change_pct > 0.2:
        intraday = f"NDX 最新上涨 {change_pct:.2f}%"
    elif change_pct < -0.2:
        intraday = f"NDX 最新下跌 {abs(change_pct):.2f}%"
    else:
        intraday = "NDX 最新基本持平"

    summary = (
        f"{intraday}，综合风险温度 {score:.1f}/100，RSI {rsi:.1f}，"
        f"价格分位 {price_position:.1f}，VIX 缓冲 {vix_buffer:.1f}，"
        f"利率缓冲 {macro_buffer:.1f}。{action}"
    )
    return status, summary

def run_ndx_risk_analysis():
    # Ensure data is available
    global nasdaq_cache
    if not nasdaq_cache.get("data"):
        refresh_nasdaq_data()
        
    ndx_data = nasdaq_cache.get("data")
    if not ndx_data:
        logger.warning("No Nasdaq data available for NDX risk analysis after refresh attempt")
        return

    index_pos = ndx_data['index']

    try:
        with app.app_context():
            metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()

        if not metric:
            update_market_index()
            with app.app_context():
                metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()

        if not metric:
            logger.warning("NDX risk analysis skipped: no market metric available")
            return

        status, summary = describe_ndx_risk(metric, ndx_data)

        with app.app_context():
            new_rec = RiskBrief(status=status[:20], summary=summary, index_position=float(index_pos))
            db.session.add(new_rec)
            db.session.commit()
            global ai_latest_cache
            ai_latest_cache["data"] = new_rec.to_dict()
            ai_latest_cache["last_update"] = datetime.utcnow()
            logger.info(f"NDX risk brief updated and cached: {status}")
            
    except Exception as e:
        logger.error(f"NDX risk analysis job failed: {e}")
        run_rule_based_ndx_analysis(index_pos)

def run_rule_based_ndx_analysis(index_pos):
    with app.app_context():
        metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
        if not metric:
            logger.warning("Rule-based NDX analysis skipped: no market metric available")
            return

        ndx_data = nasdaq_cache.get("data") or {"index": index_pos, "percent": 0}
        status, summary = describe_ndx_risk(metric, ndx_data)

        new_rec = RiskBrief(status=status, summary=summary, index_position=float(index_pos))
        db.session.add(new_rec)
        db.session.commit()
        global ai_latest_cache
        ai_latest_cache["data"] = new_rec.to_dict()
        ai_latest_cache["last_update"] = datetime.utcnow()
        logger.info(f"Rule-based NDX risk brief generated: {status}")

def background_worker():
    last_cleanup = 0
    last_risk_analysis = 0
    last_risk_diagnostics = 0
    last_risk_scenarios = 0
    while True:
        try:
            update_market_index()
            refresh_watchlist_data()
            refresh_nasdaq_data()
            refresh_macro_data()
            
            # NDX risk analysis every 2 hours (7200 seconds)
            if time.time() - last_risk_analysis > 7200:
                run_ndx_risk_analysis()
                last_risk_analysis = time.time()

            # NDX risk diagnostics every 30 minutes
            if time.time() - last_risk_diagnostics > 1800:
                refresh_risk_diagnostics()
                last_risk_diagnostics = time.time()

            # NDX scenario analysis every 30 minutes
            if time.time() - last_risk_scenarios > 1800:
                refresh_risk_scenarios()
                last_risk_scenarios = time.time()

            # Daily cleanup
            if time.time() - last_cleanup > 86400:
                cleanup_old_data()
                last_cleanup = time.time()
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            
        time.sleep(60) 

# Routes
@app.route('/api/risk/latest', methods=['GET'])
def get_risk_latest():
    global ai_latest_cache
    # Serve from memory cache for maximum concurrency
    if ai_latest_cache["data"] and ai_latest_cache["data"].get("status") in RISK_BRIEF_STATUSES:
        return jsonify(ai_latest_cache["data"])
    
    # Lazy init cache from DB if memory is empty
    rec = RiskBrief.query.filter(RiskBrief.status.in_(RISK_BRIEF_STATUSES)).order_by(RiskBrief.created_at.desc()).first()
    if rec:
        ai_latest_cache["data"] = rec.to_dict()
        ai_latest_cache["last_update"] = datetime.utcnow()
        return jsonify(ai_latest_cache["data"])
        
    return jsonify({"error": "No recommendations yet"}), 202

@app.route('/api/risk/history', methods=['GET'])
def get_risk_history():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    recs = RiskBrief.query.filter(RiskBrief.status.in_(RISK_BRIEF_STATUSES)).order_by(RiskBrief.created_at.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        "items": [r.to_dict() for r in recs.items],
        "total": recs.total,
        "pages": recs.pages,
        "current_page": recs.page
    })

@app.route('/api/risk/diagnostics', methods=['GET'])
def get_risk_diagnostics():
    if not cache_is_fresh(risk_diagnostics_cache, 15 * 60) and should_refresh_empty_cache(risk_diagnostics_cache, 60):
        refresh_risk_diagnostics()

    data = risk_diagnostics_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/scenarios', methods=['GET'])
def get_risk_scenarios():
    if not cache_is_fresh(risk_scenarios_cache, 15 * 60) and should_refresh_empty_cache(risk_scenarios_cache, 60):
        refresh_risk_scenarios()

    data = risk_scenarios_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

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
    if not nasdaq_cache["data"] and should_refresh_empty_cache(nasdaq_cache):
        refresh_nasdaq_data()
    return jsonify(nasdaq_cache["data"]) if nasdaq_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/macro-assets', methods=['GET'])
def get_macro():
    if not macro_cache["data"] and should_refresh_empty_cache(macro_cache):
        refresh_macro_data()
    return jsonify(macro_cache["data"]) if macro_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/watch-list', methods=['GET'])
def get_watch():
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
    # Fetch latest data for context
    ndx = nasdaq_cache.get("data")
    sentiment = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    
    if not ndx or not sentiment:
        return jsonify({
            "quote": "市场正在酝酿情绪，请稍后再来...",
            "author": "InvestCool Risk Desk",
            "date": datetime.now().strftime("%Y.%m.%d")
        })

    change = ndx['percent']
    value = sentiment.index_value
    
    # Rule engine for market quotes
    if change > 1.5 and value > 70:
        quotes = [
            "多头们今天可能在喝香槟，但别忘了系好安全带，高处不胜寒。",
            "纳指飞得太快，灵魂都有点跟不上了。建议：适度止盈，买个鸡腿犒劳自己。",
            "满屏的绿色（涨）让我想起春天，但别在春天还没过完就急着脱外套。"
        ]
    elif change < -1.5 and value < 30:
        quotes = [
            "今天的 K 线像极了蹦极，只是没带绳子。撑住，底部往往在绝望中诞生。",
            "别看账户了，去公园看看树吧。账户会缩水，但春天不会。",
            "这就是市场，它想拿走你的筹码，顺便考验你的血压。"
        ]
    elif change < -0.5 and change > -1.5:
        quotes = [
            "市场今天有点小感冒，正在咳出一些浮躁的筹码。",
            "阴跌不可怕，可怕的是你还没学会与波动做朋友。",
            "这只是长期增长曲线上的一点点微波，别把它当成海啸。"
        ]
    elif value > 80:
        quotes = [
            "现在的贪婪程度已经溢出屏幕了。记往：当邻居都在谈论股票时，就是该离场的时候。",
            "疯狂的派对终会结束，希望你不是那个最后留下来洗碗的人。"
        ]
    elif value < 20:
        quotes = [
            "遍地都是被打折的黄金，如果你还有子弹，现在是猎人的时间。",
            "别人恐惧我贪婪？说起来容易，做起来需要一颗大心脏。"
        ]
    else:
        quotes = [
            "市场今天在玩‘一二三木头人’，不涨不跌，最适合复盘学习。",
            "横盘是耐心者的磨刀石。既然无事发生，不如去读本好书。",
            "波动率在打瞌睡，你也可以稍微眯一会儿。"
        ]

    import random
    return jsonify({
        "quote": random.choice(quotes),
        "author": "InvestCool 市场观察员",
        "date": datetime.now().strftime("%Y.%m.%d")
    })

@app.route('/api/analysis', methods=['GET'])
def get_all_analysis():
    # Public view: Only show non-deleted items
    c_type = request.args.get('type', 'analysis')
    query = Analysis.query.filter_by(is_deleted=False)
    if c_type != 'all':
        query = query.filter_by(content_type=c_type)
    analyses = query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analyses])

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
    # Admin sees everything including trash
    items = Analysis.query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in items])

@app.route('/api/admin/stats', methods=['GET'])
@require_admin
def get_admin_stats():
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_visits = PageView.query.filter(PageView.timestamp >= today_start).count()
    total_visits = PageView.query.count()
    
    # Active users (unique IPs in the last 15 minutes)
    active_users = db.session.query(db.func.count(db.func.distinct(PageView.ip_hash)))\
        .filter(PageView.timestamp >= datetime.utcnow() - timedelta(minutes=15)).scalar() or 0
        
    # Bounce rate calculation
    total_unique_ips = db.session.query(db.func.count(db.func.distinct(PageView.ip_hash))).scalar() or 1
    
    # Subquery to count single-page IPs
    subq = db.session.query(PageView.ip_hash).group_by(PageView.ip_hash).having(db.func.count(PageView.id) == 1).subquery()
    single_page_ips = db.session.query(db.func.count(subq.c.ip_hash)).scalar() or 0
        
    bounce_rate_pct = round((single_page_ips / total_unique_ips) * 100) if total_unique_ips > 0 else 0
    
    return jsonify({
        "today_visits": today_visits,
        "total_visits": total_visits,
        "active_users": active_users,
        "bounce_rate": f"{bounce_rate_pct}%"
    })

@app.route('/api/analysis/<int:id>', methods=['GET'])
def get_analysis_by_id(id):
    a = Analysis.query.get_or_404(id)
    if a.is_deleted: abort(404)
    return jsonify(a.to_dict())

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
        if analysis_obj.is_deleted:
            return

        filename = f"{analysis_obj.id}_{analysis_obj.title.replace(' ', '_')}.md"
        for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
            filename = filename.replace(char, '')
        file_path = os.path.join(target_dir, filename)

        fm = "---\n"
        fm += f"title: {json.dumps(analysis_obj.title, ensure_ascii=False)}\n"
        fm += f"category: {json.dumps(analysis_obj.category, ensure_ascii=False)}\n"
        fm += f"summary: {json.dumps(analysis_obj.summary, ensure_ascii=False)}\n"
        fm += f"cover: {json.dumps(analysis_obj.cover or '', ensure_ascii=False)}\n"
        fm += f"date: {json.dumps(analysis_obj.created_at.strftime('%Y-%m-%d'))}\n"
        fm += "---\n\n"

        temp_path = f"{file_path}.tmp"
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(fm + analysis_obj.content)
        os.replace(temp_path, file_path)

        logger.info(f"Synced article #{analysis_obj.id} to file: {file_path}")
    except Exception as e:
        logger.error(f"Sync to file failed: {e}")

@app.route('/api/analysis', methods=['POST'])
@require_admin
def create_analysis():
    data = request.get_json(silent=True) or {}
    required = ("title", "summary", "content", "category")
    missing = [field for field in required if not str(data.get(field, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
    try:
        new_analysis = Analysis(
            title=data.get('title'),
            summary=data.get('summary'),
            content=data.get('content'),
            category=data.get('category'),
            cover=data.get('cover'),
            content_type=data.get('content_type', 'analysis')
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
    data = request.json
    try:
        a.title = data.get('title', a.title)
        a.summary = data.get('summary', a.summary)
        a.content = data.get('content', a.content)
        a.category = data.get('category', a.category)
        a.cover = data.get('cover', a.cover)
        a.content_type = data.get('content_type', a.content_type)
        db.session.commit()
        sync_analysis_to_file(a)
        return jsonify(a.to_dict())
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

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
