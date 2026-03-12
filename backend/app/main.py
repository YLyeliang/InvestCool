from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import yfinance as yf

app = Flask(__name__)
CORS(app)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'investcool.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Investment Analysis Model
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

# Initial Routes
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
        print("Fetching NASDAQ 100 data...")
        ticker = yf.Ticker("^NDX")
        # Use 1d period and 1m interval for actual intraday price
        data = ticker.history(period="1d", interval="1m")
        
        if not data.empty:
            current_price = data['Close'].iloc[-1]
            # To get daily change, we might still need previous close
            # Let's get fast_info which is more reliable for current session
            info = ticker.fast_info
            
            price = current_price if current_price else info.last_price
            prev_close = info.previous_close
            change = price - prev_close
            percent_change = (change / prev_close) * 100 if prev_close else 0
            
            result = {
                "index": round(float(price), 2),
                "change": round(float(change), 2),
                "percent": round(float(percent_change), 2),
                "last_update": data.index[-1].strftime("%H:%M:%S")
            }
            print(f"Data fetched: {result}")
            return jsonify(result)
        else:
            print("No intraday data, falling back to fast_info")
            info = ticker.fast_info
            price = info.last_price
            prev_close = info.previous_close
            change = price - prev_close
            percent_change = (change / prev_close) * 100 if prev_close else 0
            return jsonify({
                "index": round(float(price), 2),
                "change": round(float(change), 2),
                "percent": round(float(percent_change), 2),
                "last_update": "Real-time"
            })
    except Exception as e:
        print(f"Error fetching NASDAQ data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "InvestCool Backend is healthy"})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Seed some initial data if empty
        if not Analysis.query.first():
            sample = Analysis(
                title="2026 Tech Market Outlook",
                summary="An analysis of AI infrastructure and semi-conductor trends for the coming year.",
                content="Full analysis content goes here...",
                category="Market Trends"
            )
            db.session.add(sample)
            db.session.commit()
    app.run(host='0.0.0.0', port=5000, debug=True)
