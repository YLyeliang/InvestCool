# InvestCool: Requirements & Architecture Design

InvestCool is a high-performance market intelligence hub and blog designed for finance and technical analysis. It is inspired by the "Intelligence Feed" model of XiaoHu.AI, focusing on high-density, chronological content with integrated real-time market data.

## 1. Project Goals
- **Intelligence Feed:** A chronological, tab-filtered feed for Finance News and Technical Analysis.
- **Interactive Technical Analysis:** High-performance charting components allowing users to interact with market data (zoom, timeframe toggles).
- **Data-Driven:** Automated market data reports and tickers integrated directly into the blog experience.
- **Private/Small Group Use:** Optimized for personal use and a limited number of readers.

## 2. Technical Stack
- **Backend:** FastAPI (Python 3.12+) - Chosen for async performance and financial library compatibility.
- **Frontend:** React + Vite + TypeScript - Chosen for a responsive, dashboard-like user experience.
- **Database:** SQLite (via SQLModel/SQLAlchemy) - Chosen for simplicity, portability, and low-scale needs.
- **Data Sources:** `yfinance` (Yahoo Finance) for stocks, crypto, and forex.
- **Charting:** `lightweight-charts` (TradingView) for professional candlestick rendering.
- **Data Fetching:** TanStack Query (React Query) for real-time polling and synchronization.

## 3. Core Requirements

### Functional
- **Feed Management:** Tab-based filtering (e.g., "All", "Finance", "Technical Analysis").
- **Analysis Posts:** Support for Markdown content with embedded live ticker widgets.
- **Market Data Proxy:** Backend service to fetch and normalize `yfinance` data into UI-ready JSON.
- **Admin Dashboard:** Secure interface for creating, editing, and deleting posts.
- **Near Real-time Updates:** Automatic UI refreshes for ticker data (polling every 1-5 minutes).

### Non-Functional
- **Scalability:** Support for up to 50 concurrent users.
- **Performance:** Sub-200ms API response time for cached market data.
- **Data Freshness:** 5-minute server-side caching strategy to respect API rate limits.
- **Security:** Simple JWT or Session-based authentication for the admin route.

## 4. Architecture Design (Option 1: Decoupled)
The project utilizes a decoupled Client-Server model to separate heavy financial processing from interactive UI rendering.

### Data Flow
1. **Frontend** requests ticker data from **FastAPI**.
2. **FastAPI** checks **SQLite Cache**.
3. If cache is valid (< 5 min), returns stored data.
4. If cache is expired, fetches from **yfinance**, transforms to normalized JSON, updates cache, and returns to UI.

## 5. Decision Log
| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| **Data Source** | `yfinance` | Robust, free, and covers necessary asset classes. |
| **AI Integration** | Deferred (Future) | Focus first on structural integrity and charting. |
| **Navigation** | Tabbed Central Feed | Mirrors XiaoHu.AI's efficient content discovery. |
| **Caching Strategy** | SQLite-based (5 min) | Prevents API throttling and ensures fast page loads. |
| **UI Framework** | React + Lightweight Charts | Industry standard for high-performance finance apps. |

## 6. Future Roadmap
- **LLM Integration:** AI-generated market summaries and technical signal alerts.
- **Advanced TA:** Integration of `pandas-ta` for automated indicator calculations.
- **User Watchlists:** Personalization features for visitors to track specific symbols.
