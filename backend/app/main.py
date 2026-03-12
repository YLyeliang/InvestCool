from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

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
