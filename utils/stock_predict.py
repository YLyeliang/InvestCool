import yfinance as yf
from datetime import datetime

def fetch_market_data():
    """获取原油和纳指的最新实时/盘前数据"""
    tickers = {
        "Brent_Oil": "BZ=F",  # 布伦特原油连续合约
        "NQ_Futures": "NQ=F", # 纳斯达克100指数期货
        "NDX_Spot": "^NDX"    # 纳斯达克100指数现货
    }

    data = {}
    for name, ticker in tickers.items():
        try:
            tkr = yf.Ticker(ticker)
            # 获取最近几天的数据
            hist = tkr.history(period="5d", interval="1m")
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                daily_hist = tkr.history(period="5d")
                prev_close = daily_hist['Close'].iloc[-2] if len(daily_hist) >=2 else current_price

                data[name] = {
                    "current": current_price,
                    "prev_close": prev_close
                }
        except Exception as e:
            print(f"获取 {name} 数据失败: {e}")

    return data

def analyze_market(data, oil_spike_threshold=3.0, nq_discount_threshold=-1.5):
    """
    分析数据并返回分析结果字典
    """
    if not data or len(data) < 3:
        return None

    oil_current = data['Brent_Oil']['current']
    oil_prev = data['Brent_Oil']['prev_close']
    oil_change_pct = ((oil_current - oil_prev) / oil_prev) * 100

    nq_current = data['NQ_Futures']['current']
    ndx_prev = data['NDX_Spot']['prev_close']
    nq_discount_pct = ((nq_current - ndx_prev) / ndx_prev) * 100

    risk_level = 0
    if oil_change_pct >= oil_spike_threshold:
        risk_level += 1
    if nq_discount_pct <= nq_discount_threshold:
        risk_level += 1

    status = "green"
    status_text = "暂无危机"
    if risk_level == 2:
        status = "red"
        status_text = "极度危险"
    elif risk_level == 1:
        status = "yellow"
        status_text = "中度风险"

    recommendations = []
    if risk_level == 2:
        recommendations = [
            "考虑买入 SQQQ 或 VXX 对冲。",
            "严格执行科技股多头止损。",
            "降低半导体相关仓位。"
        ]
    elif risk_level == 1:
        recommendations = ["资金正在避险，建议买入适量 Put 期权锁定下行风险。"]
    else:
        recommendations = ["市场情绪尚稳，建议观望。"]

    return {
        "update_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "oil_price": round(oil_current, 2),
        "oil_change": round(oil_change_pct, 2),
        "nq_price": round(nq_current, 2),
        "nq_discount": round(nq_discount_pct, 2),
        "status": status,
        "status_text": status_text,
        "recommendations": recommendations
    }

if __name__ == "__main__":
    # 保留原来的 CLI 功能
    data = fetch_market_data()
    analysis = analyze_market(data)
    if analysis:
        print(f"[{analysis['update_time']}] 监控报告")
        print(f"油价: ${analysis['oil_price']} ({analysis['oil_change']}%)")
        print(f"纳指贴水: {analysis['nq_discount']}%")
        print(f"状态: {analysis['status_text']}")
        for rec in analysis['recommendations']:
            print(f"- {rec}")
    else:
        print("数据获取失败")
