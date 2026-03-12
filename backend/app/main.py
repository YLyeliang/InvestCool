from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'investcool.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

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
        print("Calculating Market Sentiment Index...")
        # 1. NDX RSI (35%)
        ndx_ticker = yf.Ticker("^NDX")
        ndx_hist = ndx_ticker.history(period="1mo")
        rsi_val = calculate_rsi(ndx_hist['Close']).iloc[-1]
        if pd.isna(rsi_val): rsi_val = 50
        
        # 2. VIX Score (35%) - Inverse: High VIX = Low Score
        vix_ticker = yf.Ticker("^VIX")
        vix_info = vix_ticker.fast_info
        vix_curr = vix_info.last_price
        vix_high = vix_info.year_high
        vix_low = vix_info.year_low
        vix_score = ((vix_high - vix_curr) / (vix_high - vix_low)) * 100 if vix_high != vix_low else 50
        
        # 3. Price Position (Valuation Proxy) (15%)
        ndx_info = ndx_ticker.fast_info
        ndx_curr = ndx_info.last_price
        ndx_high = ndx_info.year_high
        ndx_low = ndx_info.year_low
        price_score = ((ndx_curr - ndx_low) / (ndx_high - ndx_low)) * 100 if ndx_high != ndx_low else 50
        
        # 4. Yield Score (Macro) (15%) - Inverse: High Yield = Low Score for Tech
        tnx_ticker = yf.Ticker("^TNX")
        tnx_info = tnx_ticker.fast_info
        tnx_curr = tnx_info.last_price
        tnx_high = tnx_info.year_high
        tnx_low = tnx_info.year_low
        yield_score = ((tnx_high - tnx_curr) / (tnx_high - tnx_low)) * 100 if tnx_high != tnx_low else 50
        
        # Weighted Calculation
        final_index = (0.35 * rsi_val) + (0.35 * vix_score) + (0.15 * price_score) + (0.15 * yield_score)
        
        # Store in DB
        new_metric = MarketMetric(
            index_value=float(final_index),
            rsi=float(rsi_val),
            vix_score=float(vix_score),
            price_score=float(price_score),
            yield_score=float(yield_score)
        )
        db.session.add(new_metric)
        db.session.commit()
        print(f"Index calculated: {final_index}")
        return new_metric
    except Exception as e:
        print(f"Error calculating index: {e}")
        return None

# Routes
@app.route('/api/market-index', methods=['GET'])
def get_market_index():
    # Get latest metric
    metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    
    # If no metric or older than 10 mins, recalculate
    now = datetime.utcnow()
    if not metric or (now - metric.timestamp) > timedelta(minutes=10):
        metric = update_market_index()
    
    if metric:
        return jsonify(metric.to_dict())
    return jsonify({"error": "Could not fetch market index"}), 500

watchlist_cache = {
    "data": None,
    "last_update": None
}

@app.route('/api/watch-list', methods=['GET'])
def get_watch_list():
    global watchlist_cache
    now = datetime.utcnow()
    
    if watchlist_cache["data"] and watchlist_cache["last_update"] and (now - watchlist_cache["last_update"]) < timedelta(minutes=10):
        return jsonify(watchlist_cache["data"])

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
                "symbol": symbol,
                "price": round(float(price), 2),
                "change": round(float(change), 2),
                "percent": round(float(pct_change), 2)
            })
        
        watchlist_cache["data"] = data
        watchlist_cache["last_update"] = now
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis', methods=['GET'])
def get_all_analysis():
    analyses = Analysis.query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analyses])

@app.route('/api/analysis/<int:id>', methods=['GET'])
def get_analysis(id):
    analysis = Analysis.query.get_or_404(id)
    return jsonify(analysis.to_dict())

@app.route('/api/nasdaq', methods=['GET'])
def get_nasdaq_data():
    try:
        ticker = yf.Ticker("^NDX")
        info = ticker.fast_info
        price = info.last_price
        prev_close = info.previous_close
        change = price - prev_close
        percent_change = (change / prev_close) * 100 if prev_close else 0
        return jsonify({
            "index": round(float(price), 2),
            "change": round(float(change), 2),
            "percent": round(float(percent_change), 2),
            "last_update": datetime.now().strftime("%H:%M:%S")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "InvestCool Backend is healthy"})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Initial calculation if empty
        if not MarketMetric.query.first():
            update_market_index()
            
        if not Analysis.query.first():
            db.session.add(Analysis(
                title="2026 算力基建展望：从芯片到液冷",
                summary="随着 AI 模型规模的持续指数级增长，算力中心正面临前所未有的能效挑战。本文深入分析液冷技术与定制化 ASIC 芯片的结合前景。",
                content="全方位解析 2026 年算力基建的核心驱动力...",
                category="AI Infrastructure"
            ))
            db.session.add(Analysis(
                title="降息周期下的科技股定价逻辑",
                summary="当利率回归常态化，分红能力与现金流质量将取代纯粹的增长预期，成为纳斯达克 100 核心标的的新审美标准。",
                content="详细探讨宏观利率对估值模型的影响...",
                category="Macro Strategy"
            ))
            db.session.add(Analysis(
                title="半导体周期的下半场：库存与替代",
                summary="在经历了 2025 年的补库高峰后，2026 年的半导体市场将进入结构性分化。汽车电子与边缘计算将成为新的增长点。",
                content="深度复盘半导体产业链的最新动态...",
                category="Semiconductors"
            ))
            db.session.commit()
    app.run(host='0.0.0.0', port=5000, debug=True)
