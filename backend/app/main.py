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

app = Flask(__name__)
CORS(app)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'investcool.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Security: Set this token in your environment or keep it secret!
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "investcool-master-key-2026")

db = SQLAlchemy(app)

# Cache for realtime data
watchlist_cache = {"data": None, "last_update": None}
nasdaq_cache = {"data": None, "last_update": None}
macro_cache = {"data": None, "last_update": None}

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
    rsi = db.Column(db.Float); vix_score = db.Column(db.Float)
    price_score = db.Column(db.Float); yield_score = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())
    def to_dict(self):
        return {
            "value": round(self.index_value, 1),
            "details": {"rsi": round(self.rsi, 1), "vix": round(self.vix_score, 1), 
                        "valuation": round(self.price_score, 1), "macro": round(self.yield_score, 1)},
            "timestamp": self.timestamp.isoformat()
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

# Calculation Logic
def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def update_market_index():
    try:
        ndx_ticker = yf.Ticker("^NDX")
        ndx_hist = ndx_ticker.history(period="1mo")
        rsi_val = calculate_rsi(ndx_hist['Close']).iloc[-1]
        if pd.isna(rsi_val): rsi_val = 50
        vix_info = yf.Ticker("^VIX").fast_info
        vix_score = ((vix_info.year_high - vix_info.last_price) / (vix_info.year_high - vix_info.year_low)) * 100
        ndx_info = ndx_ticker.fast_info
        price_score = ((ndx_info.last_price - ndx_info.year_low) / (ndx_info.year_high - ndx_info.year_low)) * 100
        tnx_info = yf.Ticker("^TNX").fast_info
        yield_score = ((tnx_info.year_high - tnx_info.last_price) / (tnx_info.year_high - tnx_info.last_price + 1)) * 100 # Simple mock logic for yield
        final_index = (0.35 * rsi_val) + (0.35 * vix_score) + (0.15 * price_score) + (0.15 * yield_score)
        new_metric = MarketMetric(index_value=float(final_index), rsi=float(rsi_val), vix_score=float(vix_score), price_score=float(price_score), yield_score=float(yield_score))
        db.session.add(new_metric); db.session.commit()
    except Exception as e: print(f"Update error: {e}")

def refresh_watchlist_data():
    global watchlist_cache
    try:
        tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]; data = []
        for symbol in tickers:
            t = yf.Ticker(symbol); info = t.fast_info; price = info.last_price; prev_close = info.previous_close
            change = price - prev_close; pct_change = (change / prev_close) * 100 if prev_close else 0
            data.append({"symbol": symbol, "price": round(float(price), 2), "change": round(float(change), 2), "percent": round(float(pct_change), 2)})
        watchlist_cache["data"] = data; watchlist_cache["last_update"] = datetime.utcnow()
    except Exception as e: print(f"Watchlist error: {e}")

def refresh_nasdaq_data():
    global nasdaq_cache
    try:
        info = yf.Ticker("^NDX").fast_info; price = info.last_price; prev_close = info.previous_close; change = price - prev_close
        nasdaq_cache["data"] = {"index": round(float(price), 2), "change": round(float(change), 2), "percent": round(float((change / prev_close) * 100), 2) if prev_close else 0, "last_update": datetime.now().strftime("%H:%M:%S")}
        nasdaq_cache["last_update"] = datetime.utcnow()
    except Exception as e: print(f"Nasdaq error: {e}")

def refresh_macro_data():
    global macro_cache
    try:
        # DX-Y.NYB (Dollar Index), GC=F (Gold), BTC-USD (Bitcoin)
        assets = {"DXY": "DX-Y.NYB", "GOLD": "GC=F", "BTC": "BTC-USD"}
        data = []
        for name, symbol in assets.items():
            t = yf.Ticker(symbol); info = t.fast_info
            data.append({
                "name": name, "price": round(float(info.last_price), 2),
                "percent": round(float((info.last_price - info.previous_close) / info.previous_close * 100), 2) if info.previous_close else 0
            })
        macro_cache["data"] = data; macro_cache["last_update"] = datetime.utcnow()
    except Exception as e: print(f"Macro error: {e}")

def background_worker():
    with app.app_context():
        while True:
            update_market_index(); refresh_watchlist_data(); refresh_nasdaq_data(); refresh_macro_data()
            time.sleep(600)

# Routes
@app.route('/api/market-index', methods=['GET'])
def get_market_index():
    metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    return jsonify(metric.to_dict()) if metric else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/market-index/history', methods=['GET'])
def get_market_index_history():
    metrics = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).limit(30).all()
    return jsonify([m.to_dict() for m in reversed(metrics)])

@app.route('/api/watch-list', methods=['GET'])
def get_watch_list():
    return jsonify(watchlist_cache["data"]) if watchlist_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/nasdaq', methods=['GET'])
def get_nasdaq_data():
    return jsonify(nasdaq_cache["data"]) if nasdaq_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/macro-assets', methods=['GET'])
def get_macro_assets():
    return jsonify(macro_cache["data"]) if macro_cache["data"] else (jsonify({"error": "Initializing"}), 202)

# Admin Content Management Routes
@app.route('/api/analysis', methods=['GET'])
def get_all_analysis():
    analyses = Analysis.query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analyses])

@app.route('/api/analysis', methods=['POST'])
@require_admin
def create_analysis():
    data = request.json
    new_a = Analysis(title=data['title'], summary=data['summary'], content=data['content'], category=data.get('category', 'Market Trends'))
    db.session.add(new_a); db.session.commit()
    return jsonify(new_a.to_dict()), 201

@app.route('/api/analysis/<int:id>', methods=['PUT'])
@require_admin
def update_analysis(id):
    analysis = Analysis.query.get_or_404(id); data = request.json
    analysis.title = data.get('title', analysis.title); analysis.summary = data.get('summary', analysis.summary)
    analysis.content = data.get('content', analysis.content); analysis.category = data.get('category', analysis.category)
    db.session.commit(); return jsonify(analysis.to_dict())

@app.route('/api/analysis/<int:id>', methods=['DELETE'])
@require_admin
def delete_analysis(id):
    analysis = Analysis.query.get_or_404(id); db.session.delete(analysis); db.session.commit()
    return jsonify({"success": True})

@app.route('/api/analysis/<int:id>', methods=['GET'])
def get_analysis(id):
    analysis = Analysis.query.get_or_404(id); return jsonify(analysis.to_dict())

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "worker_active": threading.active_count() > 1})

if __name__ == '__main__':
    with app.app_context(): db.create_all()
    threading.Thread(target=background_worker, daemon=True).start()
    app.run(host='0.0.0.0', port=5000, debug=False)
