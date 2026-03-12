from sqlmodel import Session
from app.core.db import engine, init_db
from app.models.post import Post, PostCategory
from datetime import datetime, timezone, timedelta

def seed():
    init_db()
    with Session(engine) as session:
        # Check if already seeded
        if session.query(Post).first():
            print("Database already contains data.")
            return

        posts = [
            Post(
                title="Apple Inc. (AAPL) Technical Breakout",
                content="Apple is showing a strong bullish consolidation pattern above the 200-day moving average. The RSI is currently at 55, indicating room for more upside before reaching overbought territory.",
                category=PostCategory.TECHNICAL_ANALYSIS,
                symbol="AAPL",
                created_at=datetime.now(timezone.utc) - timedelta(hours=2)
            ),
            Post(
                title="Bitcoin Macro Outlook: Q1 2026",
                content="Bitcoin continues to serve as a digital gold hedge amidst global inflationary pressures. Institutional adoption has reached new highs this quarter with the launch of several new spot ETFs in Europe.",
                category=PostCategory.FINANCE,
                symbol="BTC-USD",
                created_at=datetime.now(timezone.utc) - timedelta(hours=5)
            ),
            Post(
                title="Market Brief: S&P 500 Daily Update",
                content="The S&P 500 closed slightly higher today as earnings season kicks off. Strong performance from the energy sector offset weaknesses in retail.",
                category=PostCategory.MARKET_BRIEF,
                symbol="^GSPC",
                created_at=datetime.now(timezone.utc) - timedelta(days=1)
            ),
            Post(
                title="Nvidia Technical Analysis: Key Levels to Watch",
                content="Nvidia is approaching a major psychological resistance level. Watch for a high-volume breakout or a potential double-top formation here.",
                category=PostCategory.TECHNICAL_ANALYSIS,
                symbol="NVDA",
                created_at=datetime.now(timezone.utc) - timedelta(days=2)
            )
        ]
        
        for post in posts:
            session.add(post)
        
        session.commit()
        print("Database seeded successfully.")

if __name__ == "__main__":
    seed()
