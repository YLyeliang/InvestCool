from flask import Flask, jsonify, request, abort
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import threading
import time
from functools import wraps
import logging
import hashlib

app = Flask(__name__)
CORS(app)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'investcool.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(basedir, "../backend.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Security
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "investcool-master-key-2026")

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

# Models
class Analysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "summary": self.summary,
            "content": self.content, "category": self.category,
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

# Auth Decorator
def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or token != f"Bearer {ADMIN_TOKEN}":
            return jsonify({"error": "Unauthorized"}), 403
        return f(*args, **kwargs)
    return decorated_function

# Calculation Logic
def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def update_market_index():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    try:
        ndx_ticker = yf.Ticker("^NDX")
        ndx_hist = ndx_ticker.history(period="1mo")
        if ndx_hist is None or ndx_hist.empty: return
        
        rsi_val = calculate_rsi(ndx_hist['Close']).iloc[-1]
        if pd.isna(rsi_val): rsi_val = 50
        
        vix_info = yf.Ticker("^VIX").fast_info
        vix_score = ((vix_info.year_high - vix_info.last_price) / (vix_info.year_high - vix_info.year_low + 0.1)) * 100
        
        ndx_info = ndx_ticker.fast_info
        price_score = ((ndx_info.last_price - ndx_info.year_low) / (ndx_info.year_high - ndx_info.year_low + 0.1)) * 100
        
        tnx_info = yf.Ticker("^TNX").fast_info
        yield_score = ((tnx_info.year_high - tnx_info.last_price) / (tnx_info.year_high - tnx_info.last_price + 1)) * 100 
        
        final_index = (0.35 * rsi_val) + (0.35 * vix_score) + (0.15 * price_score) + (0.15 * yield_score)
        
        with app.app_context():
            new_metric = MarketMetric(index_value=float(final_index), rsi=float(rsi_val), vix_score=float(vix_score), price_score=float(price_score), yield_score=float(yield_score))
            db.session.add(new_metric); db.session.commit()
        logger.info(f"Market Index updated: {final_index:.2f}")
    except Exception as e: logger.error(f"Index error: {e}")

def refresh_watchlist_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global watchlist_cache
    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]
    new_data = []
    
    for symbol in tickers:
        try:
            t = yf.Ticker(symbol)
            info = t.fast_info
            price = float(info.last_price)
            change = price - float(info.previous_close)
            pct = (change / float(info.previous_close)) * 100 if info.previous_close else 0
            new_data.append({"symbol": symbol, "price": round(price, 2), "change": round(change, 2), "percent": round(pct, 2)})
        except Exception as e:
            logger.error(f"Watchlist item {symbol} error: {e}")
            # Fallback to existing data if available
            existing = next((x for x in watchlist_cache["data"] if x['symbol'] == symbol), None)
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
        nasdaq_cache["data"] = {
            "index": round(float(info.last_price), 2), 
            "change": round(float(info.last_price - info.previous_close), 2), 
            "percent": round(float((info.last_price - info.previous_close) / info.previous_close * 100), 2) if info.previous_close else 0,
            "last_update": datetime.now().strftime("%H:%M:%S")
        }
        nasdaq_cache["last_update"] = datetime.utcnow()
        logger.info("Nasdaq updated")
    except Exception as e: logger.error(f"Nasdaq error: {e}")

def refresh_macro_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global macro_cache
    assets_map = {"DXY": "DX-Y.NYB", "GOLD": "GC=F", "BTC": "BTC-USD"}
    new_data = []
    
    for name, symbol in assets_map.items():
        try:
            t = yf.Ticker(symbol)
            info = t.fast_info
            price = float(info.last_price)
            pct = ((price - float(info.previous_close)) / float(info.previous_close)) * 100 if info.previous_close else 0
            new_data.append({"name": name, "price": round(price, 2), "percent": round(pct, 2)})
        except Exception as e:
            logger.error(f"Macro item {name} error: {e}")
            existing = next((x for x in macro_cache["data"] if x['name'] == name), None)
            if existing: new_data.append(existing)

    if new_data:
        macro_cache["data"] = new_data
        macro_cache["last_update"] = datetime.utcnow()
        logger.info("Macro updated")

def cleanup_old_data():
    try:
        with app.app_context():
            threshold = datetime.now() - timedelta(days=30)
            PollVote.query.filter(PollVote.created_at < threshold).delete()
            MarketMetric.query.filter(MarketMetric.timestamp < threshold).delete()
            db.session.commit()
            logger.info("Cleanup done")
    except Exception as e: logger.error(f"Cleanup error: {e}")

def background_worker():
    last_cleanup = 0
    while True:
        update_market_index()
        refresh_watchlist_data()
        refresh_nasdaq_data()
        refresh_macro_data()
        if time.time() - last_cleanup > 86400:
            cleanup_old_data(); last_cleanup = time.time()
        time.sleep(600)

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
    return jsonify(nasdaq_cache["data"]) if nasdaq_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/macro-assets', methods=['GET'])
def get_macro():
    return jsonify(macro_cache["data"]) if macro_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/watch-list', methods=['GET'])
def get_watch():
    return jsonify(watchlist_cache["data"]) if watchlist_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/sitemap-urls', methods=['GET'])
def get_sitemap_urls():
    # Return dynamic analysis routes for SEO sitemap
    analyses = Analysis.query.all()
    urls = []
    for a in analyses:
        urls.append({
            "loc": f"/analysis/{a.id}",
            "lastmod": a.created_at.isoformat()
        })
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
    # ... (existing code)
    return jsonify({"success": True})

@app.route('/api/market-quote', methods=['GET'])
def get_market_quote():
    # Fetch latest data for context
    ndx = nasdaq_cache.get("data")
    sentiment = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    
    if not ndx or not sentiment:
        return jsonify({"quote": "市场正在酝酿情绪，请稍后再来...", "author": "InvestCool AI"})

    change = ndx['percent']
    value = sentiment.index_value
    
    # Logic Engine for "AI-like" Quotes
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
    analyses = Analysis.query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analyses])

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "worker_active": threading.active_count() > 1})

def start_worker():
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or os.environ.get('GUNICORN_WORKER_ID') == '1' or not os.environ.get('GUNICORN_WORKER_ID'):
        if "DataWorker" not in [t.name for t in threading.enumerate()]:
            threading.Thread(target=background_worker, daemon=True, name="DataWorker").start()
            logger.info("Worker started")

with app.app_context():
    db.create_all()
    start_worker()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
