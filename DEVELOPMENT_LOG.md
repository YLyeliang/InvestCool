# InvestCool: Implementation & Usage Guide

This document tracks all modifications made to the **InvestCool** project, outlining the architecture, key technical fixes, and usage instructions.

## 1. Project Overview
InvestCool is a decoupled market intelligence hub built with a FastAPI backend and a React (Vite) frontend. It features high-performance interactive charts and a tabbed chronological feed for financial analysis.

## 2. Architecture & Modifications

### Backend (FastAPI)
- **Modular Structure:** Organized into `/api`, `/core`, `/models`, and `/services`.
- **Database:** SQLite with `SQLModel` for ORM.
- **Service Layer:** Created `FinanceService` to encapsulate `yfinance` logic.
- **Caching:** Implemented an SQLite-based cache for ticker data with a 5-minute TTL to stay within API limits.
- **Compatibility:** Fixed `datetime.UTC` to `timezone.utc` for Python 3.8 compatibility.

### Frontend (React + Vite)
- **TypeScript Optimization:** Used `import type` for all interfaces and types to resolve Vite runtime module resolution errors.
- **Charting Engine:** Integrated `lightweight-charts` v5.
  - **Unified API Fix:** Updated implementation from the deprecated `addCandlestickSeries` to the new `addSeries(CandlestickSeries, ...)` pattern.
- **State Management:** Used `@tanstack/react-query` for asynchronous data fetching and automatic 60-second polling for a "live data" experience.
- **Responsive Layout:** Sidebar-based navigation with tabbed feed filtering.

## 3. Usage Instructions

### Prerequisites
- Python 3.8+
- Node.js 18+
- `pip` and `npm`

### Installation
1. **Backend:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm install
   ```

### Data Initialization
Seed the database with sample technical analysis and finance posts:
```bash
python3 seed_db.py
```

### Running the Application
You need to run both the API and the UI simultaneously.

1. **Start Backend (Port 8000):**
   ```bash
   uvicorn app.main:app --reload
   ```
2. **Start Frontend (Port 5173):**
   ```bash
   cd frontend
   npm run dev
   ```

## 4. Key Components

### `MarketChart.tsx`
A high-performance interactive chart. It automatically fetches and polls data from the backend when a `symbol` prop is provided.

### `FinanceService.py`
The backend engine that proxies requests to Yahoo Finance. It handles DataFrame-to-JSON transformation optimized for the charting library.

## 5. Decision Log Summary
- **Caching:** 5 minutes (Backend) / 60 seconds (Frontend polling).
- **Charting:** Used `lightweight-charts` for its superior performance over SVG-based libraries for candlestick data.
- **Stack:** Decoupled architecture chosen to allow Python for data processing and React for dashboard-like interactivity.
