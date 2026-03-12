from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.db import get_session
from app.services.finance import finance_service

router = APIRouter()

@router.get("/ticker/{symbol}")
def get_ticker_data(symbol: str, period: str = "1mo", interval: str = "1d", session: Session = Depends(get_session)):
    data = finance_service.fetch_ticker_data(symbol, session, period, interval)
    if not data:
        raise HTTPException(status_code=404, detail="Ticker data not found")
    return data
