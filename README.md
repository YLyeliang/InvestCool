# InvestCool

InvestCool is a professional market intelligence hub and blog for finance and technical analysis.

## Quick Start
1. **Backend:** `pip install -r requirements.txt && uvicorn app.main:app --reload`
2. **Frontend:** `cd frontend && npm install && npm run dev`
3. **Seed Data:** `python3 seed_db.py`

## Documentation
- [Requirements & Architecture](REQUIREMENTS.md)
- [Implementation & Usage Guide](DEVELOPMENT_LOG.md)

## Features
- Chronological "Intelligence Feed" with tab filtering.
- High-performance technical analysis charts using `lightweight-charts` v5.
- Near real-time data integration via `yfinance` with intelligent server-side caching.
- Clean, modern dark-themed dashboard UI.
