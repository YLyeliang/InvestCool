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
ai_latest_cache = {"data": None, "last_update": None}

# Models
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

class AIRecommendation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), nullable=False) # '看多', '看空', '中性', '观察'
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
        token = request.headers.get('Authorization')
        if not token or token != f"Bearer {ADMIN_TOKEN}":
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
            info = t.fast_info
            if info is None: raise ValueError("fast_info is None")
            
            price = safe_float(info.last_price)
            prev_close = safe_float(info.previous_close)
            
            if price == 0: raise ValueError("Price is 0")
            
            change = price - prev_close
            pct = (change / prev_close) * 100 if prev_close else 0
            new_data.append({
                "symbol": symbol, 
                "price": round(price, 2), 
                "change": round(change, 2), 
                "percent": round(pct, 2)
            })
        except Exception as e:
            logger.error(f"Watchlist item {symbol} error: {e}")
            # Fallback to existing data if available
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


def cleanup_old_data():
    try:
        with app.app_context():
            threshold = datetime.now() - timedelta(days=30)
            PollVote.query.filter(PollVote.created_at < threshold).delete()
            MarketMetric.query.filter(MarketMetric.timestamp < threshold).delete()
            db.session.commit()
            logger.info("Cleanup done")
    except Exception as e: logger.error(f"Cleanup error: {e}")

import subprocess

def run_ai_analysis():
    # Ensure data is available
    global nasdaq_cache
    if not nasdaq_cache.get("data"):
        refresh_nasdaq_data()
        
    ndx_data = nasdaq_cache.get("data")
    if not ndx_data:
        logger.warning("No Nasdaq data available for AI analysis after refresh attempt")
        return

    index_pos = ndx_data['index']
    
    # Construct Prompt
    prompt = f"你是一个资深科技股分析师。结合最近48小时纳斯达克100指数动态及权重股NVDA,AAPL,MSFT新闻，当前点位{index_pos}。给出投资策略。1.状态[看多/看空/中性/观察]之一。2.不超过3句话。3.仅按此格式：STATUS: [状态]\nSUMMARY: [内容]"
    
    try:
        # Call gemini command with longer timeout
        result = subprocess.run(['gemini', prompt], capture_output=True, text=True, timeout=150)
        
        if result.returncode != 0:
            logger.error(f"gemini-cli error: {result.stderr}")
            # Fallback heuristic logic
            run_fallback_analysis(index_pos)
            return

        output = result.stdout.strip()
        status = "观察"
        summary = ""
        for line in output.split('\n'):
            if "STATUS:" in line: status = line.split("STATUS:")[1].strip()
            elif "SUMMARY:" in line: summary = line.split("SUMMARY:")[1].strip()
        
        if not summary: summary = output

        with app.app_context():
            new_rec = AIRecommendation(status=status[:20], summary=summary, index_position=float(index_pos))
            db.session.add(new_rec)
            db.session.commit()
            global ai_latest_cache
            ai_latest_cache["data"] = new_rec.to_dict()
            ai_latest_cache["last_update"] = datetime.utcnow()
            logger.info(f"AI Recommendation updated and cached: {status}")
            
    except Exception as e:
        logger.error(f"AI analysis job failed: {e}")
        run_fallback_analysis(index_pos)

def run_fallback_analysis(index_pos):
    # Heuristic strategy based on market sentiment
    metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    if not metric: return
    
    val = metric.index_value
    if val > 75: 
        status, summary = "观察", "市场进入极度贪婪区，RSI 指数偏高。建议在当前点位保持警惕，等待回踩机会。"
    elif val < 25:
        status, summary = "看多", "情绪跌入超卖区间，恐慌指数高企。当前点位具备中长期配置价值，建议分批买入。"
    else:
        status, summary = "中性", "市场处于均衡博弈阶段，波动率趋稳。建议持仓观望，关注权重股财报指引。"

    with app.app_context():
        new_rec = AIRecommendation(status=status, summary=f"[系统保底] {summary}", index_position=float(index_pos))
        db.session.add(new_rec)
        db.session.commit()
        global ai_latest_cache
        ai_latest_cache["data"] = new_rec.to_dict()
        logger.info(f"Fallback recommendation generated: {status}")

def background_worker():
    last_cleanup = 0
    last_ai_analysis = 0
    while True:
        try:
            update_market_index()
            refresh_watchlist_data()
            refresh_nasdaq_data()
            refresh_macro_data()
            
            # AI Analysis every 2 hours (7200 seconds)
            if time.time() - last_ai_analysis > 7200:
                run_ai_analysis()
                last_ai_analysis = time.time()

            # Daily cleanup
            if time.time() - last_cleanup > 86400:
                cleanup_old_data()
                last_cleanup = time.time()
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            
        time.sleep(60) 

# Routes
@app.route('/api/ai/latest', methods=['GET'])
def get_ai_latest():
    global ai_latest_cache
    # Serve from memory cache for maximum concurrency
    if ai_latest_cache["data"]:
        return jsonify(ai_latest_cache["data"])
    
    # Lazy init cache from DB if memory is empty
    rec = AIRecommendation.query.order_by(AIRecommendation.created_at.desc()).first()
    if rec:
        ai_latest_cache["data"] = rec.to_dict()
        ai_latest_cache["last_update"] = datetime.utcnow()
        return jsonify(ai_latest_cache["data"])
        
    return jsonify({"error": "No recommendations yet"}), 202

@app.route('/api/ai/history', methods=['GET'])
def get_ai_history():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    recs = AIRecommendation.query.order_by(AIRecommendation.created_at.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        "items": [r.to_dict() for r in recs.items],
        "total": recs.total,
        "pages": recs.pages,
        "current_page": recs.page
    })

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
    # Return dynamic analysis routes
    analyses = Analysis.query.all()
    urls = []
    for a in analyses:
        urls.append({"loc": f"/analysis/{a.id}", "lastmod": a.created_at.isoformat()})
    
    # Daily logs are handled by Nuxt Content sitemap integration automatically 
    # since they are files in the content/ directory.
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
    # Public view: Only show non-deleted items
    c_type = request.args.get('type', 'analysis')
    query = Analysis.query.filter_by(is_deleted=False)
    if c_type != 'all':
        query = query.filter_by(content_type=c_type)
    analyses = query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analyses])

@app.route('/api/admin/all-content', methods=['GET'])
@require_admin
def get_admin_content():
    # Admin sees everything including trash
    items = Analysis.query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in items])

@app.route('/api/analysis/<int:id>', methods=['GET'])
def get_analysis_by_id(id):
    a = Analysis.query.get_or_404(id)
    if a.is_deleted: abort(404)
    return jsonify(a.to_dict())

@app.route('/api/analysis', methods=['POST'])
@require_admin
def create_analysis():
    data = request.json
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
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/admin/hard-delete/<int:id>', methods=['DELETE'])
@require_admin
def hard_delete_analysis(id):
    a = Analysis.query.get_or_404(id)
    try:
        db.session.delete(a)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

import hashlib
import werkzeug
from werkzeug.utils import secure_filename

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
        # Generate a unique filename using hash to avoid duplicates and collisions
        ext = file.filename.rsplit('.', 1)[1].lower()
        file_content = file.read()
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
    return jsonify({"status": "healthy", "worker_active": threading.active_count() > 1})

def start_worker():
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or os.environ.get('GUNICORN_WORKER_ID') == '1' or not os.environ.get('GUNICORN_WORKER_ID'):
        if "DataWorker" not in [t.name for t in threading.enumerate()]:
            threading.Thread(target=background_worker, daemon=True, name="DataWorker").start()
            logger.info("Worker started")
            
            # Phase 15 Add-on: Initial AI Analysis check
            with app.app_context():
                if AIRecommendation.query.count() == 0:
                    logger.info("First run detected, triggering initial AI analysis...")
                    threading.Thread(target=run_ai_analysis, daemon=True).start()

with app.app_context():
    db.create_all()
    start_worker()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
