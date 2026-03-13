from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import threading
import time

app = Flask(__name__)
CORS(app)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'investcool.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Cache for realtime data
watchlist_cache = {
    "data": None,
    "last_update": None
}
nasdaq_cache = {
    "data": None,
    "last_update": None
}

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
            "id": self.id,
            "title": self.title,
            "summary": self.summary,
            "content": self.content,
            "category": self.category,
            "created_at": self.created_at.isoformat()
        }

class MarketMetric(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    index_value = db.Column(db.Float, nullable=False)
    rsi = db.Column(db.Float)
    vix_score = db.Column(db.Float)
    price_score = db.Column(db.Float)
    yield_score = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "value": round(self.index_value, 1),
            "details": {
                "rsi": round(self.rsi, 1),
                "vix": round(self.vix_score, 1),
                "valuation": round(self.price_score, 1),
                "macro": round(self.yield_score, 1)
            },
            "timestamp": self.timestamp.isoformat()
        }

# Market Index Calculation Logic
def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def update_market_index():
    try:
        # 1. NDX RSI (35%)
        ndx_ticker = yf.Ticker("^NDX")
        ndx_hist = ndx_ticker.history(period="1mo")
        rsi_val = calculate_rsi(ndx_hist['Close']).iloc[-1]
        if pd.isna(rsi_val): rsi_val = 50
        
        # 2. VIX Score (35%)
        vix_ticker = yf.Ticker("^VIX")
        vix_info = vix_ticker.fast_info
        vix_curr = vix_info.last_price
        vix_high = vix_info.year_high
        vix_low = vix_info.year_low
        vix_score = ((vix_high - vix_curr) / (vix_high - vix_low)) * 100 if vix_high != vix_low else 50
        
        # 3. Price Position (15%)
        ndx_info = ndx_ticker.fast_info
        ndx_curr = ndx_info.last_price
        ndx_high = ndx_info.year_high
        ndx_low = ndx_info.year_low
        price_score = ((ndx_curr - ndx_low) / (ndx_high - ndx_low)) * 100 if ndx_high != ndx_low else 50
        
        # 4. Yield Score (15%)
        tnx_ticker = yf.Ticker("^TNX")
        tnx_info = tnx_ticker.fast_info
        tnx_curr = tnx_info.last_price
        tnx_high = tnx_info.year_high
        tnx_low = tnx_info.year_low
        yield_score = ((tnx_high - tnx_curr) / (tnx_high - tnx_low)) * 100 if tnx_high != tnx_low else 50
        
        final_index = (0.35 * rsi_val) + (0.35 * vix_score) + (0.15 * price_score) + (0.15 * yield_score)
        
        new_metric = MarketMetric(
            index_value=float(final_index),
            rsi=float(rsi_val),
            vix_score=float(vix_score),
            price_score=float(price_score),
            yield_score=float(yield_score)
        )
        db.session.add(new_metric)
        db.session.commit()
        return new_metric
    except Exception as e:
        print(f"Update error: {e}")
        return None

def refresh_watchlist_data():
    global watchlist_cache
    try:
        tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]
        data = []
        for symbol in tickers:
            t = yf.Ticker(symbol)
            info = t.fast_info
            price = info.last_price
            prev_close = info.previous_close
            change = price - prev_close
            pct_change = (change / prev_close) * 100 if prev_close else 0
            data.append({
                "symbol": symbol, "price": round(float(price), 2),
                "change": round(float(change), 2), "percent": round(float(pct_change), 2)
            })
        watchlist_cache["data"] = data
        watchlist_cache["last_update"] = datetime.utcnow()
    except Exception as e:
        print(f"Watchlist error: {e}")

def refresh_nasdaq_data():
    global nasdaq_cache
    try:
        ticker = yf.Ticker("^NDX")
        info = ticker.fast_info
        price = info.last_price
        prev_close = info.previous_close
        change = price - prev_close
        nasdaq_cache["data"] = {
            "index": round(float(price), 2),
            "change": round(float(change), 2),
            "percent": round(float((change / prev_close) * 100), 2) if prev_close else 0,
            "last_update": datetime.now().strftime("%H:%M:%S")
        }
        nasdaq_cache["last_update"] = datetime.utcnow()
    except Exception as e:
        print(f"Nasdaq error: {e}")

def background_worker():
    """Background thread loop to keep data fresh every 10 mins"""
    with app.app_context():
        while True:
            print(f"[{datetime.now()}] Background Worker: Syncing market data...")
            update_market_index()
            refresh_watchlist_data()
            refresh_nasdaq_data()
            print(f"[{datetime.now()}] Background Worker: Done. Sleeping 10m.")
            time.sleep(600)

# Routes
@app.route('/api/market-index', methods=['GET'])
def get_market_index():
    metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    if metric:
        return jsonify(metric.to_dict())
    return jsonify({"error": "Initializing"}), 202

@app.route('/api/watch-list', methods=['GET'])
def get_watch_list():
    if watchlist_cache["data"]:
        return jsonify(watchlist_cache["data"])
    return jsonify({"error": "Initializing"}), 202

@app.route('/api/nasdaq', methods=['GET'])
def get_nasdaq_data():
    if nasdaq_cache["data"]:
        return jsonify(nasdaq_cache["data"])
    return jsonify({"error": "Initializing"}), 202

@app.route('/api/analysis', methods=['GET'])
def get_all_analysis():
    analyses = Analysis.query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analyses])

@app.route('/api/analysis/<int:id>', methods=['GET'])
def get_analysis(id):
    analysis = Analysis.query.get_or_404(id)
    return jsonify(analysis.to_dict())

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "worker_active": threading.active_count() > 1})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    # Start background worker thread
    worker = threading.Thread(target=background_worker, daemon=True)
    worker.start()
    
    app.run(host='0.0.0.0', port=5000, debug=False)
