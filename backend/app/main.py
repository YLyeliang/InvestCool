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
risk_budget_cache = {"data": None, "last_update": None}
risk_concentration_cache = {"data": None, "last_update": None}
risk_factors_cache = {"data": None, "last_update": None}
risk_levels_cache = {"data": None, "last_update": None}
risk_tail_cache = {"data": None, "last_update": None}
risk_relative_cache = {"data": None, "last_update": None}
risk_dispersion_cache = {"data": None, "last_update": None}

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

def exposure_profile(name, key, lower, upper, cash_buffer, max_loss_budget, rebalance_trigger, hedge_note, suitable_for, color):
    return {
        "key": key,
        "name": name,
        "color": color,
        "exposure": {
            "lower": round(lower),
            "upper": round(upper),
            "label": f"{round(lower)}% - {round(upper)}%",
        },
        "cash_buffer": f"{round(cash_buffer)}%+",
        "max_loss_budget": f"{max_loss_budget:.1f}%",
        "rebalance_trigger": rebalance_trigger,
        "hedge_note": hedge_note,
        "suitable_for": suitable_for,
    }

def concentration_level(top3_weight, hhi):
    if top3_weight >= 72 or hhi >= 1900:
        return "高度集中"
    if top3_weight >= 60 or hhi >= 1500:
        return "偏集中"
    return "分散"

def concentration_color(level):
    if level == "高度集中":
        return "red"
    if level == "偏集中":
        return "amber"
    return "green"

def factor_pressure_label(score):
    if score >= 75:
        return "强逆风"
    if score >= 55:
        return "偏逆风"
    if score >= 35:
        return "中性扰动"
    return "顺风"

def factor_pressure_color(score):
    if score >= 75:
        return "red"
    if score >= 55:
        return "amber"
    if score >= 35:
        return "blue"
    return "green"

def correlation_label(value):
    absolute = abs(value)
    if absolute >= 0.65:
        return "强相关"
    if absolute >= 0.35:
        return "中等相关"
    if absolute >= 0.15:
        return "弱相关"
    return "低相关"

def technical_zone_label(score):
    if score >= 75:
        return "突破延伸"
    if score >= 55:
        return "高位震荡"
    if score >= 35:
        return "均衡区间"
    if score >= 20:
        return "支撑测试"
    return "破位风险"

def technical_zone_color(score):
    if score >= 75:
        return "green"
    if score >= 55:
        return "blue"
    if score >= 35:
        return "amber"
    return "red"

def tail_risk_label(score):
    if score >= 75:
        return "尾部压力高"
    if score >= 55:
        return "尾部压力偏高"
    if score >= 35:
        return "常态波动"
    return "尾部温和"

def tail_risk_color(score):
    if score >= 75:
        return "red"
    if score >= 55:
        return "amber"
    if score >= 35:
        return "blue"
    return "green"

def relative_strength_label(score):
    if score >= 75:
        return "显著领先"
    if score >= 55:
        return "相对占优"
    if score >= 35:
        return "中性轮动"
    return "相对落后"

def relative_strength_color(score):
    if score >= 75:
        return "green"
    if score >= 55:
        return "blue"
    if score >= 35:
        return "amber"
    return "red"

def dispersion_regime(avg_corr, dispersion):
    if avg_corr >= 0.68 and dispersion >= 2.8:
        return "同步高波动", "red"
    if avg_corr >= 0.68:
        return "Beta 主导", "amber"
    if dispersion >= 3.2:
        return "个股分化", "blue"
    return "结构平衡", "green"

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


def refresh_concentration_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_concentration_cache

    try:
        if not watchlist_cache.get("data"):
            refresh_watchlist_data()

        watchlist = watchlist_cache.get("data", [])
        if not watchlist:
            raise ValueError("Watchlist unavailable for concentration analysis")

        rows = []
        for item in watchlist:
            symbol = item.get("symbol")
            if not symbol:
                continue

            market_cap = None
            try:
                market_cap = safe_float(yf.Ticker(symbol).fast_info.market_cap, None)
            except Exception as e:
                logger.error(f"Market cap fetch error for {symbol}: {e}")

            if not market_cap or market_cap <= 0:
                continue

            rows.append({
                "symbol": symbol,
                "price": safe_float(item.get("price"), 0),
                "percent": safe_float(item.get("percent"), 0),
                "market_cap": market_cap,
            })

        if len(rows) < 3:
            raise ValueError("Insufficient market cap data for concentration analysis")

        total_cap = sum(row["market_cap"] for row in rows)
        for row in rows:
            weight = row["market_cap"] / total_cap * 100 if total_cap else 0
            row["weight"] = weight
            row["contribution"] = weight * row["percent"] / 100

        rows = sorted(rows, key=lambda row: row["weight"], reverse=True)
        top3_weight = sum(row["weight"] for row in rows[:3])
        top1 = rows[0]
        hhi = sum(row["weight"] ** 2 for row in rows)
        market_weighted_return = sum(row["contribution"] for row in rows)
        equal_weight_return = sum(row["percent"] for row in rows) / len(rows)
        leadership_gap = market_weighted_return - equal_weight_return
        level = concentration_level(top3_weight, hhi)

        contributors = sorted(rows, key=lambda row: row["contribution"], reverse=True)
        detractors = sorted(rows, key=lambda row: row["contribution"])

        names = {
            "AAPL": "Apple",
            "MSFT": "Microsoft",
            "GOOGL": "Alphabet",
            "AMZN": "Amazon",
            "NVDA": "NVIDIA",
            "TSLA": "Tesla",
            "META": "Meta",
        }

        securities = [{
            "symbol": row["symbol"],
            "name": names.get(row["symbol"], row["symbol"]),
            "weight": round(row["weight"], 1),
            "percent": round(row["percent"], 2),
            "contribution": round(row["contribution"], 2),
            "market_cap": round(row["market_cap"]),
        } for row in rows]

        flags = []
        if top3_weight >= 65:
            flags.append("前三大权重股决定了大部分 MAG7 代理波动，单一龙头回撤会放大指数压力。")
        if leadership_gap < -0.5:
            flags.append("市值加权表现弱于等权表现，说明大权重股票正在拖累指数质量。")
        elif leadership_gap > 0.5:
            flags.append("市值加权表现强于等权表现，指数上涨更依赖大权重龙头。")
        if top1["weight"] >= 28:
            flags.append(f"{top1['symbol']} 权重接近单一主导区，需要观察其财报和估值波动。")
        if not flags:
            flags.append("当前 MAG7 代理未显示极端集中度，但仍需跟踪龙头间轮动。")

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "coverage": f"{len(rows)}/7 MAG7",
            "methodology": "使用 MAG7 可得市值归一化作为 NDX 权重股集中度代理，不等同于完整 NDX 官方权重。",
            "concentration_level": level,
            "concentration_color": concentration_color(level),
            "top3_weight": round(top3_weight, 1),
            "top1_symbol": top1["symbol"],
            "top1_weight": round(top1["weight"], 1),
            "hhi": round(hhi),
            "market_weighted_return": round(market_weighted_return, 2),
            "equal_weight_return": round(equal_weight_return, 2),
            "leadership_gap": round(leadership_gap, 2),
            "top_contributors": [
                {"symbol": row["symbol"], "contribution": round(row["contribution"], 2)}
                for row in contributors[:3]
            ],
            "top_detractors": [
                {"symbol": row["symbol"], "contribution": round(row["contribution"], 2)}
                for row in detractors[:3]
            ],
            "securities": securities,
            "flags": flags,
        }
        risk_concentration_cache["data"] = data
        risk_concentration_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX concentration proxy updated: {level}, top3 {top3_weight:.1f}%")
    except Exception as e:
        logger.error(f"NDX concentration refresh failed: {e}")
        logger.error(traceback.format_exc())


def fetch_close_history(symbols, period="6mo"):
    if isinstance(symbols, str):
        symbols = [symbols]

    last_error = None
    for symbol in symbols:
        try:
            history = yf.Ticker(symbol).history(period=period)
            if history is not None and not history.empty and "Close" in history.columns:
                closes = history["Close"].dropna()
                closes.index = pd.to_datetime(closes.index).tz_localize(None).normalize()
                if len(closes) >= 45:
                    return symbol, closes
        except Exception as e:
            last_error = e
            logger.error(f"Factor history fetch error for {symbol}: {e}")

    raise ValueError(f"No usable history for {symbols}: {last_error}")


def fetch_ohlc_history(symbol, period="1y", min_rows=80, attempts=3):
    last_error = None
    for attempt in range(attempts):
        try:
            history = yf.Ticker(symbol).history(period=period)
            if history is not None and not history.empty and "Close" in history.columns:
                history = history.dropna(subset=["Close"]).copy()
                history.index = pd.to_datetime(history.index).tz_localize(None).normalize()
                if len(history) >= min_rows:
                    return history
        except Exception as e:
            last_error = e
            logger.error(f"OHLC history fetch error for {symbol} attempt {attempt + 1}: {e}")
        if attempt < attempts - 1:
            time.sleep(1)

    raise ValueError(f"No usable OHLC history for {symbol}: {last_error}")


def factor_metric(key, label, symbols, change_mode, higher_is_risk, ndx_returns):
    symbol, closes = fetch_close_history(symbols)

    if change_mode == "bps":
        factor_changes = closes.diff() * 100
        latest_level = f"{closes.iloc[-1]:.2f}%"
        change_5 = (closes.iloc[-1] - closes.iloc[-6]) * 100 if len(closes) >= 6 else 0
        change_20 = (closes.iloc[-1] - closes.iloc[-21]) * 100 if len(closes) >= 21 else change_5
        change_5_label = f"{change_5:+.0f} bps"
        change_20_label = f"{change_20:+.0f} bps"
        threshold = 5
    elif change_mode == "percent":
        factor_changes = closes.pct_change() * 100
        latest_level = f"{closes.iloc[-1]:.2f}"
        change_5 = pct_change(closes.iloc[-1], closes.iloc[-6]) if len(closes) >= 6 else 0
        change_20 = pct_change(closes.iloc[-1], closes.iloc[-21]) if len(closes) >= 21 else change_5
        change_5_label = f"{change_5:+.2f}%"
        change_20_label = f"{change_20:+.2f}%"
        threshold = 0.5
    else:
        factor_changes = closes.diff()
        latest_level = f"{closes.iloc[-1]:.2f}"
        change_5 = closes.iloc[-1] - closes.iloc[-6] if len(closes) >= 6 else 0
        change_20 = closes.iloc[-1] - closes.iloc[-21] if len(closes) >= 21 else change_5
        change_5_label = f"{change_5:+.2f} 点"
        change_20_label = f"{change_20:+.2f} 点"
        threshold = 1

    aligned = pd.concat(
        {"ndx": ndx_returns, "factor": factor_changes},
        axis=1,
        join="inner",
    ).dropna().tail(60)

    if len(aligned) < 30:
        raise ValueError(f"Insufficient aligned factor history for {key}")

    correlation = safe_float(aligned["ndx"].corr(aligned["factor"]), 0)
    ndx_std = safe_float(aligned["ndx"].std(), 0)
    sensitivity = correlation * ndx_std

    if higher_is_risk:
        directional_pressure = change_5 if correlation < 0 else -change_5
    else:
        directional_pressure = -change_5 if correlation < 0 else change_5

    pressure_score = clamp(abs(correlation) * 45 + max(0, directional_pressure / threshold) * 25)
    direction = "中性"
    if pressure_score >= 55 and directional_pressure > 0:
        direction = "逆风"
    elif directional_pressure < -threshold * 0.6:
        direction = "顺风"

    if direction == "逆风":
        comment = f"{label} 的近期变化与 NDX 的历史相关结构形成压力，需要控制追高和久期暴露。"
    elif direction == "顺风":
        comment = f"{label} 近期变化对 NDX 风险偏好形成缓冲，但仍需观察相关性是否稳定。"
    else:
        comment = f"{label} 对 NDX 的近期压力不突出，当前更适合作为背景变量监控。"

    return {
        "key": key,
        "label": label,
        "symbol": symbol,
        "level": latest_level,
        "change_5d": change_5_label,
        "change_20d": change_20_label,
        "correlation": round(correlation, 2),
        "correlation_label": correlation_label(correlation),
        "sensitivity": round(sensitivity, 2),
        "sensitivity_label": f"{sensitivity:+.2f}%",
        "pressure_score": round(pressure_score, 1),
        "pressure_label": factor_pressure_label(pressure_score),
        "color": factor_pressure_color(pressure_score),
        "direction": direction,
        "comment": comment,
        "sample_days": len(aligned),
    }


def refresh_factor_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_factors_cache

    try:
        ndx_symbol, ndx_closes = fetch_close_history("^NDX", "6mo")
        ndx_returns = ndx_closes.pct_change() * 100

        factors = [
            factor_metric("volatility", "VIX 波动率", "^VIX", "points", True, ndx_returns),
            factor_metric("rates", "美国 10Y 利率", "^TNX", "bps", True, ndx_returns),
            factor_metric("dollar", "美元指数", ["DX-Y.NYB", "UUP"], "percent", True, ndx_returns),
        ]

        aggregate_score = round(sum(item["pressure_score"] for item in factors) / len(factors), 1)
        main_headwind = max(factors, key=lambda item: item["pressure_score"])
        main_sensitivity = max(factors, key=lambda item: abs(item["correlation"]))
        ndx_20d_return = pct_change(ndx_closes.iloc[-1], ndx_closes.iloc[-21]) if len(ndx_closes) >= 21 else 0

        if aggregate_score >= 65:
            summary = f"宏观因子压力偏高，主要逆风来自 {main_headwind['label']}。"
        elif aggregate_score >= 40:
            summary = f"宏观因子处在中性扰动区，NDX 对 {main_sensitivity['label']} 的相关性最值得跟踪。"
        else:
            summary = "宏观因子压力温和，当前风险更多来自指数内部结构和估值预期。"

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index_symbol": ndx_symbol,
            "index_level": round(ndx_closes.iloc[-1], 2),
            "index_20d_return": round(ndx_20d_return, 2),
            "lookback_days": 60,
            "pressure_score": aggregate_score,
            "pressure_label": factor_pressure_label(aggregate_score),
            "pressure_color": factor_pressure_color(aggregate_score),
            "main_headwind": main_headwind["label"],
            "main_sensitivity": main_sensitivity["label"],
            "summary": summary,
            "methodology": "使用最近 60 个交易日的 NDX 日收益与宏观因子日变化计算相关性；敏感度表示因子上行一标准差时 NDX 的历史对应变动，不代表预测。",
            "factors": factors,
        }
        risk_factors_cache["data"] = data
        risk_factors_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX factor pressure updated: {aggregate_score:.1f}")
    except Exception as e:
        logger.error(f"NDX factor pressure refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_level(label, value, level_type, latest):
    distance = pct_change(value, latest)
    return {
        "label": label,
        "value": round(value, 2),
        "type": level_type,
        "distance": round(distance, 2),
        "distance_label": f"{distance:+.2f}%",
    }


def refresh_technical_levels():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_levels_cache

    try:
        history = fetch_ohlc_history("^NDX", "1y", min_rows=80, attempts=3)
        closes = history["Close"]
        highs = history["High"] if "High" in history.columns else closes
        lows = history["Low"] if "Low" in history.columns else closes

        if len(closes) < 80:
            raise ValueError("Insufficient NDX history for technical levels")

        latest = float(closes.iloc[-1])
        previous_close = float(closes.iloc[-2]) if len(closes) >= 2 else latest
        high_20 = float(highs.tail(20).max())
        low_20 = float(lows.tail(20).min())
        high_60 = float(highs.tail(60).max())
        low_60 = float(lows.tail(60).min())
        high_52w = float(highs.max())
        low_52w = float(lows.min())

        ma_windows = [20, 50, 100, 200]
        moving_averages = []
        for window in ma_windows:
            if len(closes) >= window:
                value = float(closes.rolling(window).mean().iloc[-1])
                moving_averages.append({
                    "label": f"{window}日均线",
                    "window": window,
                    "value": round(value, 2),
                    "distance": round(pct_change(latest, value), 2),
                    "distance_label": f"{pct_change(latest, value):+.2f}%",
                    "state": "上方" if latest >= value else "下方",
                })

        true_ranges = pd.concat([
            highs - lows,
            (highs - closes.shift()).abs(),
            (lows - closes.shift()).abs(),
        ], axis=1).max(axis=1)
        atr14 = float(true_ranges.tail(14).mean())
        atr_pct = pct_change(latest + atr14, latest)

        candidates = [
            build_level("20日低点", low_20, "support", latest),
            build_level("60日低点", low_60, "support", latest),
            build_level("52周低点", low_52w, "support", latest),
            build_level("20日高点", high_20, "resistance", latest),
            build_level("60日高点", high_60, "resistance", latest),
            build_level("52周高点", high_52w, "resistance", latest),
        ]
        for average in moving_averages:
            candidates.append(build_level(average["label"], average["value"], "support" if average["value"] <= latest else "resistance", latest))

        support_levels = sorted(
            [level for level in candidates if level["value"] <= latest],
            key=lambda level: abs(level["distance"]),
        )[:4]
        resistance_levels = sorted(
            [level for level in candidates if level["value"] >= latest],
            key=lambda level: abs(level["distance"]),
        )[:4]

        ma20 = next((item for item in moving_averages if item["window"] == 20), None)
        ma50 = next((item for item in moving_averages if item["window"] == 50), None)
        ma200 = next((item for item in moving_averages if item["window"] == 200), None)
        ma20_value = safe_float(ma20.get("value") if ma20 else None, latest)
        ma50_value = safe_float(ma50.get("value") if ma50 else None, latest)
        ma200_value = safe_float(ma200.get("value") if ma200 else None, latest)

        channel_position = pct_change(latest, low_60) / max(pct_change(high_60, low_60), 0.01) * 100
        channel_position = clamp(channel_position)
        extension = pct_change(latest, ma20_value)

        if latest > high_20 and extension > atr_pct:
            zone_score = 82
            summary = "NDX 处在短线突破延伸区，新增风险预算需要等待回踩或波动降温确认。"
        elif latest >= ma20_value and latest >= ma50_value:
            zone_score = 64
            summary = "NDX 位于主要短中期均线上方，趋势仍有支撑，但需要观察是否过度远离 20 日均线。"
        elif latest >= ma50_value:
            zone_score = 48
            summary = "NDX 处在均衡震荡区，50 日均线是短线风险预算的核心观察位。"
        elif latest >= ma200_value:
            zone_score = 28
            summary = "NDX 已跌破短中期均线但仍在 200 日线上方，适合降低追涨并观察支撑修复。"
        else:
            zone_score = 12
            summary = "NDX 跌破 200 日均线，技术结构进入破位风险区，需要优先控制回撤。"

        triggers = [
            f"向上突破 {high_20:,.0f} 且收盘站稳，可视为短线动能延续确认。",
            f"跌破 {ma50_value:,.0f} 的 50 日均线，风险预算应向下沿收缩。",
            f"单日波动超过 1 ATR（约 {atr14:,.0f} 点 / {atr_pct:.2f}%）时，避免用盘中情绪追单。",
        ]
        if ma200:
            triggers.append(f"若跌破 {ma200_value:,.0f} 的 200 日均线，应把趋势破位情景置为主场景。")

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": history.index[-1].date().isoformat(),
            "index": round(latest, 2),
            "daily_change": round(pct_change(latest, previous_close), 2),
            "zone_score": round(zone_score, 1),
            "zone_label": technical_zone_label(zone_score),
            "zone_color": technical_zone_color(zone_score),
            "summary": summary,
            "atr14": round(atr14, 2),
            "atr_pct": round(atr_pct, 2),
            "channel_position": round(channel_position, 1),
            "channel_label": f"{channel_position:.0f}%",
            "support_levels": support_levels,
            "resistance_levels": resistance_levels,
            "moving_averages": moving_averages,
            "triggers": triggers,
            "methodology": "基于 NDX 最近 1 年日线计算均线、20/60 日通道、52 周高低点和 14 日 ATR；技术位用于风险触发监控，不构成交易指令。",
        }
        risk_levels_cache["data"] = data
        risk_levels_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX technical levels updated: {technical_zone_label(zone_score)}")
    except Exception as e:
        logger.error(f"NDX technical levels refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_tail_risk_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_tail_cache

    try:
        history = fetch_ohlc_history("^NDX", "2y", min_rows=250, attempts=3)
        closes = history["Close"]
        returns = closes.pct_change().dropna() * 100
        if len(returns) < 180:
            raise ValueError("Insufficient NDX return history for tail risk")

        latest = float(closes.iloc[-1])
        previous_close = float(closes.iloc[-2]) if len(closes) >= 2 else latest
        rolling_peak = closes.cummax()
        drawdowns = (closes / rolling_peak - 1) * 100
        current_drawdown = float(drawdowns.iloc[-1])
        max_drawdown_1y = float(drawdowns.tail(252).min())
        max_drawdown_2y = float(drawdowns.min())

        var95 = float(returns.quantile(0.05))
        var99 = float(returns.quantile(0.01))
        expected_shortfall_95 = float(returns[returns <= var95].mean())
        vol20 = float(returns.tail(20).std() * (252 ** 0.5))
        vol60 = float(returns.tail(60).std() * (252 ** 0.5))
        downside_vol60 = float(returns.tail(60)[returns.tail(60) < 0].std() * (252 ** 0.5))
        positive_ratio = float((returns.tail(60) > 0).mean() * 100)

        current_streak = 0
        streak_direction = "flat"
        for value in reversed(returns.tail(20).tolist()):
            if value < 0:
                if streak_direction in ("flat", "down"):
                    streak_direction = "down"
                    current_streak += 1
                else:
                    break
            elif value > 0:
                if streak_direction in ("flat", "up"):
                    streak_direction = "up"
                    current_streak += 1
                else:
                    break
            else:
                break

        worst_days = []
        for date, value in returns.sort_values().head(5).items():
            worst_days.append({
                "date": date.date().isoformat(),
                "return": round(float(value), 2),
            })

        monthly_returns = (closes.resample("ME").last().pct_change().dropna() * 100).tail(6)
        recent_months = [
            {
                "month": date.strftime("%Y-%m"),
                "return": round(float(value), 2),
            }
            for date, value in monthly_returns.items()
        ]

        tail_score = clamp(
            abs(expected_shortfall_95) * 7
            + abs(current_drawdown) * 2.2
            + max(0, vol60 - 18) * 1.3
            + max(0, 45 - positive_ratio) * 0.8
        )

        if tail_score >= 65:
            summary = "NDX 尾部风险偏高，仓位管理应优先考虑单日极端波动和连续回撤承受力。"
        elif tail_score >= 35:
            summary = "NDX 处在常态波动区，仍需用 VaR 和预期尾部损失约束短线加仓节奏。"
        else:
            summary = "NDX 尾部风险温和，历史损失分布暂未显示明显压力扩散。"

        if streak_direction == "down":
            streak_label = f"连续下跌 {current_streak} 日"
        elif streak_direction == "up":
            streak_label = f"连续上涨 {current_streak} 日"
        else:
            streak_label = "无连续方向"

        controls = [
            f"用 95% 历史 VaR 估计，单日常规尾部损失约 {var95:.2f}%。",
            f"跌破 95% VaR 后的平均损失约 {expected_shortfall_95:.2f}%，这是止损和保证金缓冲的核心参考。",
            f"过去 60 日上涨占比 {positive_ratio:.0f}%，若继续下降，说明回撤质量正在恶化。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": history.index[-1].date().isoformat(),
            "index": round(latest, 2),
            "daily_change": round(pct_change(latest, previous_close), 2),
            "tail_score": round(tail_score, 1),
            "tail_label": tail_risk_label(tail_score),
            "tail_color": tail_risk_color(tail_score),
            "summary": summary,
            "current_drawdown": round(current_drawdown, 2),
            "max_drawdown_1y": round(max_drawdown_1y, 2),
            "max_drawdown_2y": round(max_drawdown_2y, 2),
            "var95": round(var95, 2),
            "var99": round(var99, 2),
            "expected_shortfall_95": round(expected_shortfall_95, 2),
            "vol20": round(vol20, 1),
            "vol60": round(vol60, 1),
            "downside_vol60": round(downside_vol60, 1) if downside_vol60 == downside_vol60 else 0,
            "positive_ratio": round(positive_ratio, 1),
            "streak_label": streak_label,
            "worst_days": worst_days,
            "recent_months": recent_months,
            "controls": controls,
            "methodology": "使用 NDX 最近 2 年日收益计算历史 VaR、预期尾部损失、最大回撤和年化波动率；该模块衡量历史损失分布，不代表未来保证损失上限。",
        }
        risk_tail_cache["data"] = data
        risk_tail_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX tail risk updated: {tail_risk_label(tail_score)}")
    except Exception as e:
        logger.error(f"NDX tail risk refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_relative_benchmark(key, label, symbol, ndx_closes, ndx_returns):
    benchmark = fetch_ohlc_history(symbol, "6mo", min_rows=80, attempts=3)["Close"]
    aligned_prices = pd.concat(
        {"ndx": ndx_closes, "benchmark": benchmark},
        axis=1,
        join="inner",
    ).dropna()
    if len(aligned_prices) < 80:
        raise ValueError(f"Insufficient aligned relative history for {symbol}")

    aligned_returns = pd.concat(
        {"ndx": ndx_returns, "benchmark": benchmark.pct_change() * 100},
        axis=1,
        join="inner",
    ).dropna().tail(60)
    if len(aligned_returns) < 45:
        raise ValueError(f"Insufficient aligned relative returns for {symbol}")

    ndx_return_20 = pct_change(aligned_prices["ndx"].iloc[-1], aligned_prices["ndx"].iloc[-21])
    benchmark_return_20 = pct_change(aligned_prices["benchmark"].iloc[-1], aligned_prices["benchmark"].iloc[-21])
    ndx_return_60 = pct_change(aligned_prices["ndx"].iloc[-1], aligned_prices["ndx"].iloc[-61])
    benchmark_return_60 = pct_change(aligned_prices["benchmark"].iloc[-1], aligned_prices["benchmark"].iloc[-61])
    excess_20 = ndx_return_20 - benchmark_return_20
    excess_60 = ndx_return_60 - benchmark_return_60

    ratio = aligned_prices["ndx"] / aligned_prices["benchmark"]
    ratio_change_20 = pct_change(ratio.iloc[-1], ratio.iloc[-21])
    ratio_change_60 = pct_change(ratio.iloc[-1], ratio.iloc[-61])
    correlation = safe_float(aligned_returns["ndx"].corr(aligned_returns["benchmark"]), 0)
    benchmark_var = safe_float(aligned_returns["benchmark"].var(), 0)
    beta = safe_float(aligned_returns["ndx"].cov(aligned_returns["benchmark"]) / benchmark_var, 0) if benchmark_var else 0
    hit_ratio = safe_float((aligned_returns["ndx"] > aligned_returns["benchmark"]).mean() * 100, 0)

    if excess_20 > 1 and excess_60 > 2:
        direction = "领先"
        color = "green"
    elif excess_20 > 0:
        direction = "短线占优"
        color = "blue"
    elif excess_20 < -1 and excess_60 < -2:
        direction = "落后"
        color = "red"
    else:
        direction = "轮动"
        color = "amber"

    return {
        "key": key,
        "label": label,
        "symbol": symbol,
        "direction": direction,
        "color": color,
        "ndx_return_20d": round(ndx_return_20, 2),
        "benchmark_return_20d": round(benchmark_return_20, 2),
        "excess_20d": round(excess_20, 2),
        "excess_60d": round(excess_60, 2),
        "ratio_change_20d": round(ratio_change_20, 2),
        "ratio_change_60d": round(ratio_change_60, 2),
        "correlation": round(correlation, 2),
        "beta": round(beta, 2),
        "hit_ratio": round(hit_ratio, 1),
        "sample_days": len(aligned_returns),
    }


def refresh_relative_strength_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_relative_cache

    try:
        ndx_history = fetch_ohlc_history("^NDX", "6mo", min_rows=80, attempts=3)
        ndx_closes = ndx_history["Close"]
        ndx_returns = ndx_closes.pct_change() * 100

        benchmarks = [
            build_relative_benchmark("spx", "S&P 500", "^GSPC", ndx_closes, ndx_returns),
            build_relative_benchmark("sox", "半导体指数", "^SOX", ndx_closes, ndx_returns),
            build_relative_benchmark("rut", "罗素 2000", "^RUT", ndx_closes, ndx_returns),
        ]

        spx = next(item for item in benchmarks if item["key"] == "spx")
        sox = next(item for item in benchmarks if item["key"] == "sox")
        rut = next(item for item in benchmarks if item["key"] == "rut")
        leadership_score = clamp(
            50
            + spx["excess_20d"] * 4
            + spx["excess_60d"] * 1.5
            + sox["excess_20d"] * 1.2
            - max(0, spx["beta"] - 1.3) * 12
            + (spx["hit_ratio"] - 50) * 0.4
        )

        if leadership_score >= 65:
            summary = "NDX 相对大盘保持领先，成长股风险偏好仍在提供支撑。"
        elif leadership_score >= 40:
            summary = "NDX 相对强弱处于轮动区，需要观察相对 SPX 的超额收益能否延续。"
        else:
            summary = "NDX 相对大盘走弱，组合风险更可能来自成长风格退潮而非单纯指数波动。"

        beta_note = (
            f"NDX 对 SPX 的 60 日 beta 为 {spx['beta']:.2f}，"
            f"与半导体指数的 20 日相对收益为 {sox['excess_20d']:+.2f}%，"
            f"相对小盘股为 {rut['excess_20d']:+.2f}%。"
        )

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": ndx_history.index[-1].date().isoformat(),
            "index": round(ndx_closes.iloc[-1], 2),
            "leadership_score": round(leadership_score, 1),
            "leadership_label": relative_strength_label(leadership_score),
            "leadership_color": relative_strength_color(leadership_score),
            "summary": summary,
            "beta_note": beta_note,
            "primary_beta": spx["beta"],
            "primary_correlation": spx["correlation"],
            "primary_excess_20d": spx["excess_20d"],
            "primary_excess_60d": spx["excess_60d"],
            "benchmarks": benchmarks,
            "methodology": "使用最近 6 个月日线计算 NDX 相对 SPX、SOX、RUT 的超额收益、价格比率变化、60 日相关性和 beta，用于识别成长股领导力与系统性风险暴露。",
        }
        risk_relative_cache["data"] = data
        risk_relative_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX relative strength updated: {relative_strength_label(leadership_score)}")
    except Exception as e:
        logger.error(f"NDX relative strength refresh failed: {e}")
        logger.error(traceback.format_exc())


def average_pairwise_correlation(frame):
    corr = frame.corr()
    values = []
    columns = list(corr.columns)
    for i, left in enumerate(columns):
        for right in columns[i + 1:]:
            value = corr.loc[left, right]
            if value == value:
                values.append(float(value))
    return sum(values) / len(values) if values else 0


def refresh_dispersion_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_dispersion_cache

    try:
        names = {
            "AAPL": "Apple",
            "MSFT": "Microsoft",
            "GOOGL": "Alphabet",
            "AMZN": "Amazon",
            "NVDA": "NVIDIA",
            "TSLA": "Tesla",
            "META": "Meta",
        }
        symbols = list(names.keys())
        close_map = {}
        for symbol in symbols:
            close_map[symbol] = fetch_ohlc_history(symbol, "6mo", min_rows=80, attempts=3)["Close"]

        ndx_closes = fetch_ohlc_history("^NDX", "6mo", min_rows=80, attempts=3)["Close"]
        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 80:
            raise ValueError("Insufficient aligned MAG7 history for dispersion")

        returns = prices.pct_change().dropna() * 100
        ndx_returns = ndx_closes.pct_change().dropna() * 100
        aligned = returns.join(ndx_returns.rename("NDX"), how="inner").dropna()
        if len(aligned) < 60:
            raise ValueError("Insufficient aligned MAG7 and NDX return history")

        mag7_returns = aligned[symbols]
        ndx_aligned = aligned["NDX"]
        corr20 = average_pairwise_correlation(mag7_returns.tail(20))
        corr60 = average_pairwise_correlation(mag7_returns.tail(60))
        dispersion20 = float(mag7_returns.tail(20).std(axis=1).mean())
        dispersion60 = float(mag7_returns.tail(60).std(axis=1).mean())
        regime, color = dispersion_regime(corr20, dispersion20)

        ndx_20 = pct_change(ndx_closes.iloc[-1], ndx_closes.iloc[-21])
        securities = []
        for symbol in symbols:
            stock_returns = aligned[symbol].tail(60)
            ndx_tail = ndx_aligned.tail(60)
            ndx_var = safe_float(ndx_tail.var(), 0)
            beta = safe_float(stock_returns.cov(ndx_tail) / ndx_var, 0) if ndx_var else 0
            correlation = safe_float(stock_returns.corr(ndx_tail), 0)
            return20 = pct_change(prices[symbol].iloc[-1], prices[symbol].iloc[-21])
            return60 = pct_change(prices[symbol].iloc[-1], prices[symbol].iloc[-61])
            active20 = return20 - ndx_20
            securities.append({
                "symbol": symbol,
                "name": names[symbol],
                "return_20d": round(float(return20), 2),
                "return_60d": round(float(return60), 2),
                "active_20d": round(float(active20), 2),
                "beta_to_ndx": round(float(beta), 2),
                "correlation_to_ndx": round(float(correlation), 2),
            })

        leaders = sorted(securities, key=lambda item: item["active_20d"], reverse=True)[:3]
        laggards = sorted(securities, key=lambda item: item["active_20d"])[:3]

        if regime == "同步高波动":
            summary = "MAG7 内部相关性和离散度同时偏高，说明权重股同步波动且个股振幅扩大。"
        elif regime == "Beta 主导":
            summary = "MAG7 同涨同跌特征较强，NDX 更容易被系统性 beta 和资金风险偏好驱动。"
        elif regime == "个股分化":
            summary = "MAG7 内部分化明显，指数方向更依赖个股财报、估值和主题轮动。"
        else:
            summary = "MAG7 相关性和离散度处于相对均衡区，权重股结构暂未显示极端拥挤。"

        controls = [
            f"20 日平均成对相关 {corr20:.2f}，若继续升高，单股分散化保护会下降。",
            f"20 日横截面离散度 {dispersion20:.2f} 个百分点，越高越需要关注个股事件风险。",
            f"当前 20 日主动贡献领先者为 {', '.join(item['symbol'] for item in leaders)}；拖累者为 {', '.join(item['symbol'] for item in laggards)}。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": prices.index[-1].date().isoformat(),
            "regime": regime,
            "regime_color": color,
            "summary": summary,
            "avg_corr_20d": round(corr20, 2),
            "avg_corr_60d": round(corr60, 2),
            "dispersion_20d": round(dispersion20, 2),
            "dispersion_60d": round(dispersion60, 2),
            "ndx_return_20d": round(ndx_20, 2),
            "leaders": leaders,
            "laggards": laggards,
            "securities": sorted(securities, key=lambda item: item["active_20d"], reverse=True),
            "controls": controls,
            "methodology": "使用 MAG7 最近 6 个月日收益计算 20/60 日平均成对相关、横截面离散度、相对 NDX beta 与主动收益，用于识别权重股同步风险和个股分化。",
        }
        risk_dispersion_cache["data"] = data
        risk_dispersion_cache["last_update"] = datetime.utcnow()
        logger.info(f"MAG7 dispersion updated: {regime}")
    except Exception as e:
        logger.error(f"MAG7 dispersion refresh failed: {e}")
        logger.error(traceback.format_exc())


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


def refresh_risk_budget():
    global risk_budget_cache

    try:
        if not cache_is_fresh(risk_scenarios_cache, 15 * 60):
            refresh_risk_scenarios()

        scenarios = risk_scenarios_cache.get("data")
        diagnostics = risk_diagnostics_cache.get("data")
        if not scenarios or not diagnostics:
            raise ValueError("Scenario or diagnostic data unavailable for risk budget")

        index_value = safe_float(scenarios.get("index"), 0)
        risk_score = safe_float(scenarios.get("risk_score"), 50)
        risk_level = scenarios.get("risk_level", risk_label(risk_score))
        scenario_items = scenarios.get("scenarios", [])

        worst_low = min(
            [safe_float(item.get("ndx_range", {}).get("low"), index_value) for item in scenario_items],
            default=index_value,
        )
        best_high = max(
            [safe_float(item.get("ndx_range", {}).get("high"), index_value) for item in scenario_items],
            default=index_value,
        )
        downside_pct = abs(min(pct_change(worst_low, index_value), 0))
        upside_pct = max(pct_change(best_high, index_value), 0)

        breadth = get_diagnostic_pillar(diagnostics, "breadth")
        volatility = get_diagnostic_pillar(diagnostics, "volatility")
        trend = get_diagnostic_pillar(diagnostics, "trend")
        breadth_score = safe_float(breadth.get("score"), 50)
        volatility_score = safe_float(volatility.get("score"), 50)
        trend_score = safe_float(trend.get("score"), 50)

        stress_penalty = downside_pct * 0.8 + max(0, volatility_score - 50) * 0.12 + max(0, breadth_score - 60) * 0.08
        trend_bonus = max(0, 45 - trend_score) * 0.12

        conservative_upper = clamp(52 - risk_score * 0.28 - stress_penalty + trend_bonus, 10, 45)
        balanced_upper = clamp(78 - risk_score * 0.34 - stress_penalty + trend_bonus, 20, 68)
        growth_upper = clamp(102 - risk_score * 0.38 - stress_penalty + trend_bonus, 35, 88)

        conservative_lower = clamp(conservative_upper - 14, 0, conservative_upper)
        balanced_lower = clamp(balanced_upper - 20, 10, balanced_upper)
        growth_lower = clamp(growth_upper - 25, 20, growth_upper)

        cash_base = clamp(20 + risk_score * 0.2 + downside_pct * 0.8, 15, 55)
        profiles = [
            exposure_profile(
                "防守型",
                "defensive",
                conservative_lower,
                conservative_upper,
                cash_base + 10,
                downside_pct * conservative_upper / 100,
                "风险分高于 60 或跌破 50 日线时，把仓位压向区间下沿。",
                "可用现金、短久期债券或货币基金承接等待区间。",
                "更重视回撤控制、未来 3-6 个月有资金使用需求的投资者。",
                "green",
            ),
            exposure_profile(
                "均衡型",
                "balanced",
                balanced_lower,
                balanced_upper,
                cash_base,
                downside_pct * balanced_upper / 100,
                "仓位超过上沿 5 个百分点或波动分高于 75 时再平衡。",
                "用分批买入替代一次性加仓，优先控制 MAG7 集中度。",
                "希望保留 NDX 长期成长暴露，同时能接受中等波动的投资者。",
                "blue",
            ),
            exposure_profile(
                "进取型",
                "growth",
                growth_lower,
                growth_upper,
                max(8, cash_base - 12),
                downside_pct * growth_upper / 100,
                "只有在广度修复且风险分低于 45 时，才考虑靠近区间上沿。",
                "若使用杠杆或期权，需要把波动率冲击情景作为硬约束。",
                "投资期限较长、能承受较大净值波动并有再平衡纪律的投资者。",
                "amber",
            ),
        ]

        controls = [
            f"当前压力测试最差区间约为 -{downside_pct:.1f}%，风险预算应先按该回撤承受力倒推仓位。",
            f"上行情景高点约 +{upside_pct:.1f}%，若广度未修复，不宜单纯因上涨扩大仓位。",
            "仓位区间是风险预算，不是买卖指令；实际组合还需考虑现金流、税务和持仓成本。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round(index_value, 2),
            "risk_score": round(risk_score, 1),
            "risk_level": risk_level,
            "stress_downside": round(downside_pct, 1),
            "stress_upside": round(upside_pct, 1),
            "summary": (
                f"以当前 {risk_level} 风险状态和 {downside_pct:.1f}% 压力回撤为约束，"
                "将 NDX 暴露拆成防守、均衡、进取三档预算。"
            ),
            "profiles": profiles,
            "controls": controls,
        }
        risk_budget_cache["data"] = data
        risk_budget_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX risk budget updated: downside {downside_pct:.1f}%")
    except Exception as e:
        logger.error(f"NDX risk budget refresh failed: {e}")
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
    last_risk_budget = 0
    last_concentration = 0
    last_factors = 0
    last_levels = 0
    last_tail = 0
    last_relative = 0
    last_dispersion = 0
    while True:
        try:
            update_market_index()
            refresh_watchlist_data()
            refresh_nasdaq_data()
            refresh_macro_data()

            # MAG7 concentration proxy every 30 minutes
            if time.time() - last_concentration > 1800:
                refresh_concentration_data()
                last_concentration = time.time()

            # Macro factor pressure every 30 minutes
            if time.time() - last_factors > 1800:
                refresh_factor_data()
                last_factors = time.time()

            # Technical levels every 30 minutes
            if time.time() - last_levels > 1800:
                refresh_technical_levels()
                last_levels = time.time()

            # Tail risk distribution every 30 minutes
            if time.time() - last_tail > 1800:
                refresh_tail_risk_data()
                last_tail = time.time()

            # Relative strength and beta every 30 minutes
            if time.time() - last_relative > 1800:
                refresh_relative_strength_data()
                last_relative = time.time()

            # MAG7 correlation and dispersion every 30 minutes
            if time.time() - last_dispersion > 1800:
                refresh_dispersion_data()
                last_dispersion = time.time()
            
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

            # NDX risk budget every 30 minutes
            if time.time() - last_risk_budget > 1800:
                refresh_risk_budget()
                last_risk_budget = time.time()

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

@app.route('/api/risk/budget', methods=['GET'])
def get_risk_budget():
    if not cache_is_fresh(risk_budget_cache, 15 * 60) and should_refresh_empty_cache(risk_budget_cache, 60):
        refresh_risk_budget()

    data = risk_budget_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/concentration', methods=['GET'])
def get_risk_concentration():
    if not cache_is_fresh(risk_concentration_cache, 15 * 60) and should_refresh_empty_cache(risk_concentration_cache, 60):
        refresh_concentration_data()

    data = risk_concentration_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/factors', methods=['GET'])
def get_risk_factors():
    if not cache_is_fresh(risk_factors_cache, 15 * 60) and should_refresh_empty_cache(risk_factors_cache, 60):
        refresh_factor_data()

    data = risk_factors_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/levels', methods=['GET'])
def get_risk_levels():
    if not cache_is_fresh(risk_levels_cache, 15 * 60) and should_refresh_empty_cache(risk_levels_cache, 60):
        refresh_technical_levels()

    data = risk_levels_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/tail', methods=['GET'])
def get_risk_tail():
    if not cache_is_fresh(risk_tail_cache, 15 * 60) and should_refresh_empty_cache(risk_tail_cache, 60):
        refresh_tail_risk_data()

    data = risk_tail_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/relative', methods=['GET'])
def get_risk_relative():
    if not cache_is_fresh(risk_relative_cache, 15 * 60) and should_refresh_empty_cache(risk_relative_cache, 60):
        refresh_relative_strength_data()

    data = risk_relative_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/dispersion', methods=['GET'])
def get_risk_dispersion():
    if not cache_is_fresh(risk_dispersion_cache, 15 * 60) and should_refresh_empty_cache(risk_dispersion_cache, 60):
        refresh_dispersion_data()

    data = risk_dispersion_cache.get("data")
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
