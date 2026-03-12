import yfinance as yf
import json
import pandas as pd
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select
from app.models.market import MarketCache
from app.core.config import settings

class FinanceService:
    @staticmethod
    def fetch_ticker_data(symbol: str, session: Session, period: str = "1mo", interval: str = "1d"):
        # Check cache first
        statement = select(MarketCache).where(MarketCache.symbol == symbol)
        cached = session.exec(statement).first()
        
        if cached:
            now = datetime.now(timezone.utc)
            # Ensure cached.updated_at is aware of UTC if it isn't already
            updated_at = cached.updated_at
            if updated_at.tzinfo is None:
                updated_at = updated_at.replace(tzinfo=timezone.utc)
                
            if now - updated_at < timedelta(seconds=settings.MARKET_DATA_CACHE_SECONDS):
                return json.loads(cached.data)
        
        # Fetch from yfinance
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        
        if df.empty:
            return None
            
        # Transform for lightweight-charts: [{time: timestamp, open: val, high: val, low: val, close: val}]
        # Lightweight-charts expects time as unix timestamp or ISO date string
        chart_data = []
        for index, row in df.iterrows():
            chart_data.append({
                "time": int(index.timestamp()),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"])
            })
            
        # Update cache
        if cached:
            cached.data = json.dumps(chart_data)
            cached.updated_at = datetime.now(timezone.utc)
            session.add(cached)
        else:
            new_cache = MarketCache(symbol=symbol, data=json.dumps(chart_data))
            session.add(new_cache)
            
        session.commit()
        return chart_data

finance_service = FinanceService()
