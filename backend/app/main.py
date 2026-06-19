from flask import Flask, jsonify, request, abort
from flask_sqlalchemy import SQLAlchemy
import os
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time
from functools import wraps
import logging
import hashlib
import hmac
import io
import json
from glob import glob
from logging.handlers import RotatingFileHandler
from PIL import Image, UnidentifiedImageError

app = Flask(__name__)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    "DATABASE_URL",
    'sqlite:///' + os.path.join(basedir, 'investcool.db'),
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        RotatingFileHandler(
            os.path.join(basedir, "../backend.log"),
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
        ),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Security
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")

db = SQLAlchemy(app)

# Enable WAL Mode for high concurrency
with app.app_context():
    try:
        db.session.execute(db.text("PRAGMA journal_mode=WAL;"))
        db.session.commit()
        logger.info("SQLite WAL mode enabled")
    except Exception as e:
        logger.error(f"Failed to enable WAL mode: {e}")

# Cache for realtime data
watchlist_cache = {"data": [], "last_update": None}
nasdaq_cache = {"data": None, "last_update": None}
macro_cache = {"data": [], "last_update": None}
risk_latest_cache = {"data": None, "last_update": None}
risk_diagnostics_cache = {"data": None, "last_update": None}
risk_scenarios_cache = {"data": None, "last_update": None}
risk_budget_cache = {"data": None, "last_update": None}
risk_concentration_cache = {"data": None, "last_update": None}
risk_factors_cache = {"data": None, "last_update": None}
risk_factor_attribution_cache = {"data": None, "last_update": None}
risk_factor_shock_cache = {"data": None, "last_update": None}
risk_levels_cache = {"data": None, "last_update": None}
risk_tail_cache = {"data": None, "last_update": None}
risk_relative_cache = {"data": None, "last_update": None}
risk_dispersion_cache = {"data": None, "last_update": None}
risk_options_cache = {"data": None, "last_update": None}
risk_gamma_map_cache = {"data": None, "last_update": None}
risk_option_skew_cache = {"data": None, "last_update": None}
risk_vol_premium_cache = {"data": None, "last_update": None}
risk_intraday_tape_cache = {"data": None, "last_update": None}
risk_volume_profile_cache = {"data": None, "last_update": None}
risk_liquidity_cache = {"data": None, "last_update": None}
risk_valuation_cache = {"data": None, "last_update": None}
risk_quality_cache = {"data": None, "last_update": None}
risk_breadth_cache = {"data": None, "last_update": None}
risk_volatility_term_cache = {"data": None, "last_update": None}
risk_earnings_cache = {"data": None, "last_update": None}
risk_theme_rotation_cache = {"data": None, "last_update": None}
risk_hedge_overlay_cache = {"data": None, "last_update": None}
risk_condition_matrix_cache = {"data": None, "last_update": None}
risk_funding_conditions_cache = {"data": None, "last_update": None}
risk_cross_asset_cache = {"data": None, "last_update": None}
risk_regime_compass_cache = {"data": None, "last_update": None}
risk_alerts_cache = {"data": None, "last_update": None}
risk_scenario_map_cache = {"data": None, "last_update": None}
risk_recovery_path_cache = {"data": None, "last_update": None}
risk_contribution_cache = {"data": None, "last_update": None}
risk_capacity_cache = {"data": None, "last_update": None}
risk_playbook_cache = {"data": None, "last_update": None}
risk_desk_brief_cache = {"data": None, "last_update": None}
risk_rate_sensitivity_cache = {"data": None, "last_update": None}
risk_regime_analog_cache = {"data": None, "last_update": None}

RISK_BRIEF_STATUSES = ("风险偏高", "谨慎观察", "中性震荡", "防守观察", "机会窗口")


def should_refresh_empty_cache(cache, cooldown_seconds=60):
    last_attempt = cache.get("last_attempt")
    now = datetime.utcnow()
    if last_attempt and now - last_attempt < timedelta(seconds=cooldown_seconds):
        return False
    cache["last_attempt"] = now
    return True

def cache_is_fresh(cache, ttl_seconds):
    last_update = cache.get("last_update")
    return bool(last_update and datetime.utcnow() - last_update < timedelta(seconds=ttl_seconds))

# Models
class PageView(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip_hash = db.Column(db.String(64), nullable=False)
    path = db.Column(db.String(200), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Analysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    cover = db.Column(db.String(500)) 
    content_type = db.Column(db.String(20), default='analysis')
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "summary": self.summary,
            "content": self.content, "category": self.category,
            "cover": self.cover, "is_deleted": self.is_deleted,
            "content_type": self.content_type,
            "created_at": self.created_at.isoformat()
        }

class MarketMetric(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    index_value = db.Column(db.Float, nullable=False)
    rsi = db.Column(db.Float)
    vix_score = db.Column(db.Float)
    price_score = db.Column(db.Float)
    yield_score = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "value": round(self.index_value, 1),
            "details": {"rsi": round(self.rsi, 1), "vix": round(self.vix_score, 1), 
                        "valuation": round(self.price_score, 1), "macro": round(self.yield_score, 1)},
            "timestamp": self.timestamp.isoformat()
        }

class PollVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vote_type = db.Column(db.String(10), nullable=False) # 'bull' or 'bear'
    ip_hash = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class RiskBrief(db.Model):
    __tablename__ = "ai_recommendation"

    # Legacy table name kept to preserve existing production history.
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    index_position = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "summary": self.summary,
            "index_position": round(self.index_position, 2) if self.index_position else None,
            "created_at": self.created_at.isoformat()
        }

# Auth Decorator
def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not ADMIN_TOKEN:
            logger.error("ADMIN_TOKEN is not configured")
            return jsonify({"error": "Admin access is not configured"}), 503
        token = request.headers.get('Authorization')
        expected = f"Bearer {ADMIN_TOKEN}"
        if not token or not hmac.compare_digest(token, expected):
            return jsonify({"error": "Unauthorized"}), 403
        return f(*args, **kwargs)
    return decorated_function

import traceback

# Calculation Logic
def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

# Helper for safe numerical conversion
def safe_float(val, default=0.0):
    try:
        if val is None or pd.isna(val): return default
        return float(val)
    except: return default

def clamp(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, value))

def pct_change(current, base):
    return ((current - base) / base * 100) if base else 0

def risk_label(score):
    if score >= 75:
        return "高风险"
    if score >= 55:
        return "偏高"
    if score >= 35:
        return "中性"
    return "低风险"

def risk_color(score):
    if score >= 75:
        return "red"
    if score >= 55:
        return "amber"
    if score >= 35:
        return "blue"
    return "green"

def recovery_path_regime(score):
    if score >= 72:
        return "修复确认", "green"
    if score >= 52:
        return "高位修复", "blue"
    if score >= 34:
        return "支撑测试", "amber"
    return "破位恢复", "red"

def regime_analog_label(score, win_rate_20d):
    if score >= 68 and win_rate_20d >= 58:
        return "历史顺风", "green"
    if score >= 52:
        return "正偏类比", "blue"
    if score >= 38:
        return "中性类比", "amber"
    return "负偏类比", "red"

def contribution_regime(net_pressure):
    if net_pressure >= 18:
        return "风险主导", "red"
    if net_pressure >= 7:
        return "压力偏高", "amber"
    if net_pressure >= -6:
        return "均衡拉锯", "blue"
    return "支撑占优", "green"

def contribution_color(direction, score):
    if direction == "support":
        if score >= 68:
            return "green"
        if score >= 50:
            return "blue"
        if score >= 35:
            return "amber"
        return "red"
    if score >= 72:
        return "red"
    if score >= 55:
        return "amber"
    if score >= 35:
        return "blue"
    return "green"

def build_contribution_driver(key, label, direction, score, weight, evidence, action):
    normalized_score = round(clamp(score), 1)
    impact = round(normalized_score * weight / 100, 1)
    signed_impact = impact if direction == "pressure" else -impact
    return {
        "key": key,
        "label": label,
        "direction": direction,
        "score": normalized_score,
        "weight": weight,
        "impact": impact,
        "signed_impact": round(signed_impact, 1),
        "color": contribution_color(direction, normalized_score),
        "evidence": evidence,
        "action": action,
    }

def capacity_regime(score):
    if score >= 70:
        return "预算可用", "green"
    if score >= 52:
        return "中性承受", "blue"
    if score >= 36:
        return "承受力收缩", "amber"
    return "防守闸门", "red"

def rate_sensitivity_regime(score):
    if score >= 72:
        return "利率高敏", "red"
    if score >= 55:
        return "估值承压", "amber"
    if score >= 36:
        return "可控敏感", "blue"
    return "利率缓冲", "green"

def factor_shock_regime(score):
    if score >= 75:
        return "冲击高敏", "red"
    if score >= 55:
        return "冲击偏敏", "amber"
    if score >= 35:
        return "冲击可控", "blue"
    return "冲击低敏", "green"

def vol_premium_regime(underpricing_pressure, carry_cost):
    if underpricing_pressure >= 65:
        return "波动低估", "red"
    if carry_cost >= 68:
        return "保护偏贵", "amber"
    if underpricing_pressure <= 28 and carry_cost <= 42:
        return "保护便宜", "green"
    return "定价均衡", "blue"

def intraday_tape_regime(daily_return, vwap_distance, volume_pace, range_expansion, range_position, opening_gap, balance_break):
    if daily_return <= -1.15 and vwap_distance <= -0.18 and volume_pace >= 1.1:
        return "卖压主导", "red"
    if opening_gap <= -0.8 and balance_break < 0:
        return "缺口走弱", "red"
    if range_expansion >= 1.35 and abs(daily_return) >= 0.8:
        return "波动扩张", "amber"
    if daily_return >= 0.75 and vwap_distance >= 0.12 and range_position >= 68:
        return "上行动能", "green"
    if abs(vwap_distance) <= 0.18 and 35 <= range_position <= 65:
        return "VWAP 均衡", "blue"
    return "盘中观察", "blue"

def playbook_regime(score, alert_score, net_pressure):
    if score >= 68 and alert_score < 58 and net_pressure < 6:
        return "进攻可用", "green"
    if score >= 52 and alert_score < 70:
        return "核心持有", "blue"
    if score >= 38:
        return "降档观察", "amber"
    return "防守执行", "red"

def desk_brief_regime(score, alert_score, tape_pressure):
    if score >= 68 and alert_score < 58 and tape_pressure < 58:
        return "增配窗口", "green"
    if score >= 52 and alert_score < 72:
        return "持仓审查", "blue"
    if score >= 38:
        return "谨慎降速", "amber"
    return "防守晨会", "red"

def hedge_overlay_regime(score):
    if score >= 72:
        return "保护优先", "red"
    if score >= 55:
        return "提高保护", "amber"
    if score >= 38:
        return "保留保护", "blue"
    return "低保护", "green"

def condition_matrix_regime(score):
    if score >= 72:
        return "条件转弱", "red"
    if score >= 55:
        return "条件偏紧", "amber"
    if score >= 38:
        return "条件均衡", "blue"
    return "条件友好", "green"

def funding_conditions_regime(score):
    if score >= 72:
        return "融资压力高", "red"
    if score >= 55:
        return "融资偏紧", "amber"
    if score >= 38:
        return "融资均衡", "blue"
    return "融资友好", "green"

def cross_asset_regime(score, confirmation_count, divergence_count):
    if score >= 70 and confirmation_count >= 5:
        return "广泛确认", "green"
    if score >= 54 and divergence_count <= 2:
        return "选择性确认", "blue"
    if score >= 38:
        return "分歧观察", "amber"
    return "跨资产失配", "red"

def regime_compass_label(regime_score, pressure_score, support_score, axes):
    axis_map = {axis["key"]: axis for axis in axes}
    trend_score = axis_map.get("trend", {}).get("score", 50)
    internal_score = axis_map.get("internals", {}).get("score", 50)
    fundamental_score = axis_map.get("fundamentals", {}).get("score", 50)

    if regime_score >= 68 and pressure_score <= 52 and min(trend_score, internal_score) >= 55:
        return "扩张顺风", "green"
    if trend_score >= 62 and fundamental_score >= 58 and pressure_score <= 62:
        return "趋势持有", "blue"
    if pressure_score >= 68 and support_score < 52:
        return "风险收缩", "red"
    if pressure_score >= 58 and support_score >= 54:
        return "高位脆弱", "amber"
    if support_score >= 58 and trend_score < 55:
        return "修复观察", "blue"
    return "均衡震荡", "blue"

def constructive_color(score):
    if score >= 70:
        return "green"
    if score >= 50:
        return "blue"
    if score >= 35:
        return "amber"
    return "red"

def constructive_state(score):
    if score >= 70:
        return "强支撑"
    if score >= 50:
        return "可用"
    if score >= 35:
        return "偏弱"
    return "拖累"

def alert_level(score):
    if score >= 78:
        return "红色预警", "red"
    if score >= 58:
        return "重点观察", "amber"
    if score >= 38:
        return "常规监控", "blue"
    return "低扰动", "green"

def alert_severity(score):
    if score >= 78:
        return "critical"
    if score >= 58:
        return "watch"
    if score >= 38:
        return "monitor"
    return "confirm"

def build_alert(key, category, title, score, value, trigger, action, evidence, color=None):
    normalized_score = round(clamp(score), 1)
    severity = alert_severity(normalized_score)
    if color is None:
        color = "red" if severity == "critical" else "amber" if severity == "watch" else "blue" if severity == "monitor" else "green"
    return {
        "key": key,
        "category": category,
        "title": title,
        "severity": severity,
        "score": normalized_score,
        "color": color,
        "value": value,
        "trigger": trigger,
        "action": action,
        "evidence": evidence,
    }

def round_optional(value, digits=2):
    if value is None:
        return None
    return round(float(value), digits)

def get_diagnostic_pillar(diagnostics, key):
    for pillar in diagnostics.get("pillars", []):
        if pillar.get("key") == key:
            return pillar
    return {"score": 50, "level": "中性", "metrics": []}

def format_range(index_value, low_pct, high_pct):
    low_point = index_value * (1 + low_pct / 100)
    high_point = index_value * (1 + high_pct / 100)
    return {
        "low": round(low_point, 2),
        "high": round(high_point, 2),
        "label": f"{low_point:,.0f} - {high_point:,.0f}",
    }

def build_scenario(key, name, category, low_pct, high_pct, color, probability, triggers, response, rationale, index_value):
    midpoint = (low_pct + high_pct) / 2
    return {
        "key": key,
        "name": name,
        "category": category,
        "color": color,
        "probability": probability,
        "estimated_move": f"{low_pct:+.1f}% 到 {high_pct:+.1f}%",
        "midpoint_move": round(midpoint, 1),
        "ndx_range": format_range(index_value, low_pct, high_pct),
        "triggers": triggers,
        "response": response,
        "rationale": rationale,
    }

def exposure_profile(name, key, lower, upper, cash_buffer, max_loss_budget, rebalance_trigger, hedge_note, suitable_for, color):
    return {
        "key": key,
        "name": name,
        "color": color,
        "exposure": {
            "lower": round(lower),
            "upper": round(upper),
            "label": f"{round(lower)}% - {round(upper)}%",
        },
        "cash_buffer": f"{round(cash_buffer)}%+",
        "max_loss_budget": f"{max_loss_budget:.1f}%",
        "rebalance_trigger": rebalance_trigger,
        "hedge_note": hedge_note,
        "suitable_for": suitable_for,
    }

def concentration_level(top3_weight, hhi):
    if top3_weight >= 72 or hhi >= 1900:
        return "高度集中"
    if top3_weight >= 60 or hhi >= 1500:
        return "偏集中"
    return "分散"

def concentration_color(level):
    if level == "高度集中":
        return "red"
    if level == "偏集中":
        return "amber"
    return "green"

def factor_pressure_label(score):
    if score >= 75:
        return "强逆风"
    if score >= 55:
        return "偏逆风"
    if score >= 35:
        return "中性扰动"
    return "顺风"

def factor_pressure_color(score):
    if score >= 75:
        return "red"
    if score >= 55:
        return "amber"
    if score >= 35:
        return "blue"
    return "green"

def attribution_regime(semis_contribution, macro_contribution, residual, actual_return):
    if actual_return < -2 and macro_contribution < -1.2:
        return "宏观拖累", "red"
    if semis_contribution > 2 and actual_return > 0:
        return "主题驱动", "green"
    if residual > 2:
        return "主动韧性", "blue"
    if residual < -2:
        return "内生走弱", "amber"
    return "均衡归因", "blue"

def correlation_label(value):
    absolute = abs(value)
    if absolute >= 0.65:
        return "强相关"
    if absolute >= 0.35:
        return "中等相关"
    if absolute >= 0.15:
        return "弱相关"
    return "低相关"

def technical_zone_label(score):
    if score >= 75:
        return "突破延伸"
    if score >= 55:
        return "高位震荡"
    if score >= 35:
        return "均衡区间"
    if score >= 20:
        return "支撑测试"
    return "破位风险"

def technical_zone_color(score):
    if score >= 75:
        return "green"
    if score >= 55:
        return "blue"
    if score >= 35:
        return "amber"
    return "red"

def tail_risk_label(score):
    if score >= 75:
        return "尾部压力高"
    if score >= 55:
        return "尾部压力偏高"
    if score >= 35:
        return "常态波动"
    return "尾部温和"

def tail_risk_color(score):
    if score >= 75:
        return "red"
    if score >= 55:
        return "amber"
    if score >= 35:
        return "blue"
    return "green"

def relative_strength_label(score):
    if score >= 75:
        return "显著领先"
    if score >= 55:
        return "相对占优"
    if score >= 35:
        return "中性轮动"
    return "相对落后"

def relative_strength_color(score):
    if score >= 75:
        return "green"
    if score >= 55:
        return "blue"
    if score >= 35:
        return "amber"
    return "red"

def dispersion_regime(avg_corr, dispersion):
    if avg_corr >= 0.68 and dispersion >= 2.8:
        return "同步高波动", "red"
    if avg_corr >= 0.68:
        return "Beta 主导", "amber"
    if dispersion >= 3.2:
        return "个股分化", "blue"
    return "结构平衡", "green"

def options_risk_label(implied_move, put_call_oi_ratio):
    if implied_move >= 4.2 or put_call_oi_ratio >= 1.35:
        return "波动警戒", "red"
    if implied_move >= 2.8 or put_call_oi_ratio >= 1.05:
        return "波动偏高", "amber"
    if implied_move <= 1.4 and put_call_oi_ratio < 0.75:
        return "定价平静", "green"
    return "常态定价", "blue"

def gamma_map_regime(net_gamma_ratio, put_wall_distance):
    if net_gamma_ratio >= 0.25:
        return "正 Gamma 钉住", "green"
    if net_gamma_ratio >= 0.06:
        return "轻度钉住", "blue"
    if net_gamma_ratio <= -0.25 or put_wall_distance > -1.5:
        return "负 Gamma 风险", "red"
    if net_gamma_ratio <= -0.06:
        return "下方凸性", "amber"
    return "Gamma 均衡", "blue"

def option_skew_regime(score, risk_reversal, tail_oi_ratio):
    if score >= 76 or risk_reversal >= 9:
        return "尾部保护拥挤", "red"
    if score >= 58 or tail_oi_ratio >= 1.45:
        return "下行保护升温", "amber"
    if score <= 34 and risk_reversal <= 3:
        return "偏斜温和", "green"
    return "偏斜均衡", "blue"

def volume_profile_regime(last_price, value_area_low, value_area_high, poc, session_return):
    if last_price > value_area_high:
        return ("价值区上方接受", "green") if session_return >= 0 else ("上方拒绝测试", "amber")
    if last_price < value_area_low:
        return ("价值区下方失守", "red") if session_return <= 0 else ("下方修复测试", "amber")
    if abs(pct_change(last_price, poc)) <= 0.35:
        return "POC 附近均衡", "blue"
    return "价值区内轮动", "blue"

def liquidity_regime(score, distribution_days, accumulation_days, return_20d, volume_ratio, daily_return, range_expansion):
    if distribution_days >= 6 and return_20d < 0:
        return "派发压力", "red"
    if daily_return < -0.8 and (volume_ratio >= 1.35 or range_expansion >= 1.35):
        return "下跌放量", "red"
    if score >= 65 and accumulation_days >= distribution_days + 2:
        return "量价确认", "green"
    if volume_ratio <= 0.65 and abs(return_20d) < 3:
        return "缩量观望", "amber"
    if score < 35:
        return "资金转弱", "amber"
    return "流动均衡", "blue"

def signal_color(value, good_threshold, weak_threshold, inverse=False):
    if inverse:
        if value >= weak_threshold:
            return "red"
        if value >= good_threshold:
            return "amber"
        return "green"
    if value >= good_threshold:
        return "green"
    if value >= weak_threshold:
        return "blue"
    return "amber"

def valuation_pressure_label(score):
    if score >= 75:
        return "极端估值压力", "red"
    if score >= 58:
        return "估值偏贵", "amber"
    if score >= 32:
        return "成长支撑", "blue"
    return "估值舒适", "green"

def quality_regime(score):
    if score >= 75:
        return "质量支撑强", "green"
    if score >= 58:
        return "质量稳健", "blue"
    if score >= 36:
        return "质量分化", "amber"
    return "质量承压", "red"

def breadth_regime(score, cap_return_20d, equal_return_20d, participation_gap_20d):
    if cap_return_20d > 2 and participation_gap_20d < -3:
        return "窄幅领涨", "amber"
    if cap_return_20d < -2 and equal_return_20d < cap_return_20d - 1:
        return "广度走弱", "red"
    if score >= 68:
        return "广泛参与", "green"
    if score >= 45:
        return "中性扩散", "blue"
    return "参与不足", "amber"

def volatility_term_regime(front_ratio, vvix_z_score):
    if front_ratio >= 1.05 or vvix_z_score >= 1.5:
        return "波动倒挂", "red"
    if front_ratio >= 0.96 or vvix_z_score >= 0.8:
        return "曲线趋平", "amber"
    if front_ratio <= 0.82 and vvix_z_score < 0.5:
        return "深度 Contango", "green"
    return "常态 Contango", "blue"

def earnings_catalyst_regime(score, nearest_days, event_weight_45d):
    if nearest_days <= 14 or score >= 72:
        return "催化临近", "red"
    if event_weight_45d >= 50 or score >= 55:
        return "财报季预热", "amber"
    if score >= 35:
        return "事件观察", "blue"
    return "窗口较远", "green"

def theme_rotation_regime(participation_count, top_excess_20d, qqq_return_20d, dispersion_20d):
    if participation_count >= 4 and qqq_return_20d > 0:
        return "成长扩散", "green"
    if participation_count <= 1 and top_excess_20d > 4:
        return "窄幅主题", "amber"
    if qqq_return_20d < -2 and participation_count <= 2:
        return "主题退潮", "red"
    if dispersion_20d >= 5:
        return "高分化轮动", "amber"
    return "均衡轮动", "blue"

def metric_score(value, low, high, default=50):
    if value is None or value <= 0:
        return default
    return clamp((value - low) / (high - low) * 100)

def growth_value(value):
    if value is None:
        return None
    return safe_float(value, None) * 100

def update_market_index():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    try:
        ndx_ticker = yf.Ticker("^NDX")
        ndx_hist = ndx_ticker.history(period="1mo")
        if ndx_hist is None or ndx_hist.empty or 'Close' not in ndx_hist.columns:
            logger.warning("Nasdaq history unavailable for index calculation")
            return
        
        rsi_val = calculate_rsi(ndx_hist['Close']).iloc[-1]
        if pd.isna(rsi_val): rsi_val = 50
        
        # VIX Score
        try:
            vix_info = yf.Ticker("^VIX").fast_info
            vh, vl, lp = safe_float(vix_info.year_high), safe_float(vix_info.year_low), safe_float(vix_info.last_price)
            vix_score = ((vh - lp) / (vh - vl + 0.1)) * 100 if vh > vl else 50
        except Exception as e:
            logger.error(f"VIX calculation error: {e}")
            vix_score = 50

        # Price Score
        try:
            ndx_info = ndx_ticker.fast_info
            nh, nl, nlp = safe_float(ndx_info.year_high), safe_float(ndx_info.year_low), safe_float(ndx_info.last_price)
            price_score = ((nlp - nl) / (nh - nl + 0.1)) * 100 if nh > nl else 50
        except Exception as e:
            logger.error(f"Price score calculation error: {e}")
            price_score = 50
        
        # Yield Score
        try:
            tnx_info = yf.Ticker("^TNX").fast_info
            th, tlp = safe_float(tnx_info.year_high), safe_float(tnx_info.last_price)
            yield_score = ((th - tlp) / (th - tlp + 1)) * 100 if th >= tlp else 50
        except Exception as e:
            logger.error(f"Yield score calculation error: {e}")
            yield_score = 50
        
        final_index = (0.35 * rsi_val) + (0.35 * vix_score) + (0.15 * price_score) + (0.15 * yield_score)
        
        with app.app_context():
            new_metric = MarketMetric(
                index_value=float(final_index), 
                rsi=float(rsi_val), 
                vix_score=float(vix_score), 
                price_score=float(price_score), 
                yield_score=float(yield_score)
            )
            db.session.add(new_metric)
            db.session.commit()
        logger.info(f"Market Index updated: {final_index:.2f}")
    except Exception as e: 
        logger.error(f"Index update failed: {e}")
        logger.error(traceback.format_exc())

def refresh_watchlist_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global watchlist_cache
    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]
    new_data = []
    
    for symbol in tickers:
        try:
            t = yf.Ticker(symbol)
            hist = t.history(period="2d")
            if hist.empty or len(hist) < 1:
                raise ValueError(f"No history for {symbol}")

            # Use last available row for current price
            price = float(hist['Close'].iloc[-1])

            # Calculate change based on previous close if available, else use yesterday's close from history
            if len(hist) >= 2:
                prev_close = float(hist['Close'].iloc[-2])
            else:
                prev_close = price # fallback

            change = price - prev_close
            pct = (change / prev_close) * 100 if prev_close != 0 else 0

            new_data.append({
                "symbol": symbol, 
                "price": round(price, 2), 
                "change": round(change, 2), 
                "percent": round(pct, 2)
            })
        except Exception as e:
            logger.error(f"Watchlist item {symbol} error: {e}")
            existing = next((x for x in watchlist_cache.get("data", []) if x.get('symbol') == symbol), None)
            if existing: new_data.append(existing)

    if new_data:
        watchlist_cache["data"] = new_data
        watchlist_cache["last_update"] = datetime.utcnow()
        logger.info("Watchlist updated")

def refresh_nasdaq_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global nasdaq_cache
    try:
        info = yf.Ticker("^NDX").fast_info
        if info is None: raise ValueError("fast_info is None")
        
        lp = safe_float(info.last_price)
        pc = safe_float(info.previous_close)
        
        if lp == 0: raise ValueError("Price is 0")
        
        nasdaq_cache["data"] = {
            "index": round(lp, 2), 
            "change": round(lp - pc, 2), 
            "percent": round((lp - pc) / pc * 100, 2) if pc else 0,
            "last_update": datetime.now().strftime("%H:%M:%S")
        }
        nasdaq_cache["last_update"] = datetime.utcnow()
        logger.info("Nasdaq updated")
    except Exception as e: 
        logger.error(f"Nasdaq refresh failed: {e}")

def refresh_macro_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global macro_cache
    assets_map = {"DXY": "DX-Y.NYB", "GOLD": "GC=F", "OIL": "BZ=F"}
    new_data = []
    
    for name, symbol in assets_map.items():
        try:
            t = yf.Ticker(symbol)
            info = t.fast_info
            if info is None: raise ValueError("fast_info is None")
            
            lp = safe_float(info.last_price)
            pc = safe_float(info.previous_close)
            
            if lp == 0: raise ValueError("Price is 0")
            
            pct = ((lp - pc) / pc) * 100 if pc else 0
            new_data.append({"name": name, "price": round(lp, 2), "percent": round(pct, 2)})
        except Exception as e:
            logger.error(f"Macro item {name} error: {e}")
            existing = next((x for x in macro_cache.get("data", []) if x.get('name') == name), None)
            if existing: new_data.append(existing)

    if new_data:
        macro_cache["data"] = new_data
        macro_cache["last_update"] = datetime.utcnow()
        logger.info("Macro updated")


def refresh_concentration_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_concentration_cache

    try:
        if not watchlist_cache.get("data"):
            refresh_watchlist_data()

        watchlist = watchlist_cache.get("data", [])
        if not watchlist:
            raise ValueError("Watchlist unavailable for concentration analysis")

        rows = []
        for item in watchlist:
            symbol = item.get("symbol")
            if not symbol:
                continue

            market_cap = None
            try:
                market_cap = safe_float(yf.Ticker(symbol).fast_info.market_cap, None)
            except Exception as e:
                logger.error(f"Market cap fetch error for {symbol}: {e}")

            if not market_cap or market_cap <= 0:
                continue

            rows.append({
                "symbol": symbol,
                "price": safe_float(item.get("price"), 0),
                "percent": safe_float(item.get("percent"), 0),
                "market_cap": market_cap,
            })

        if len(rows) < 3:
            raise ValueError("Insufficient market cap data for concentration analysis")

        total_cap = sum(row["market_cap"] for row in rows)
        for row in rows:
            weight = row["market_cap"] / total_cap * 100 if total_cap else 0
            row["weight"] = weight
            row["contribution"] = weight * row["percent"] / 100

        rows = sorted(rows, key=lambda row: row["weight"], reverse=True)
        top3_weight = sum(row["weight"] for row in rows[:3])
        top1 = rows[0]
        hhi = sum(row["weight"] ** 2 for row in rows)
        market_weighted_return = sum(row["contribution"] for row in rows)
        equal_weight_return = sum(row["percent"] for row in rows) / len(rows)
        leadership_gap = market_weighted_return - equal_weight_return
        level = concentration_level(top3_weight, hhi)

        contributors = sorted(rows, key=lambda row: row["contribution"], reverse=True)
        detractors = sorted(rows, key=lambda row: row["contribution"])

        names = {
            "AAPL": "Apple",
            "MSFT": "Microsoft",
            "GOOGL": "Alphabet",
            "AMZN": "Amazon",
            "NVDA": "NVIDIA",
            "TSLA": "Tesla",
            "META": "Meta",
        }

        securities = [{
            "symbol": row["symbol"],
            "name": names.get(row["symbol"], row["symbol"]),
            "weight": round(row["weight"], 1),
            "percent": round(row["percent"], 2),
            "contribution": round(row["contribution"], 2),
            "market_cap": round(row["market_cap"]),
        } for row in rows]

        flags = []
        if top3_weight >= 65:
            flags.append("前三大权重股决定了大部分 MAG7 代理波动，单一龙头回撤会放大指数压力。")
        if leadership_gap < -0.5:
            flags.append("市值加权表现弱于等权表现，说明大权重股票正在拖累指数质量。")
        elif leadership_gap > 0.5:
            flags.append("市值加权表现强于等权表现，指数上涨更依赖大权重龙头。")
        if top1["weight"] >= 28:
            flags.append(f"{top1['symbol']} 权重接近单一主导区，需要观察其财报和估值波动。")
        if not flags:
            flags.append("当前 MAG7 代理未显示极端集中度，但仍需跟踪龙头间轮动。")

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "coverage": f"{len(rows)}/7 MAG7",
            "methodology": "使用 MAG7 可得市值归一化作为 NDX 权重股集中度代理，不等同于完整 NDX 官方权重。",
            "concentration_level": level,
            "concentration_color": concentration_color(level),
            "top3_weight": round(top3_weight, 1),
            "top1_symbol": top1["symbol"],
            "top1_weight": round(top1["weight"], 1),
            "hhi": round(hhi),
            "market_weighted_return": round(market_weighted_return, 2),
            "equal_weight_return": round(equal_weight_return, 2),
            "leadership_gap": round(leadership_gap, 2),
            "top_contributors": [
                {"symbol": row["symbol"], "contribution": round(row["contribution"], 2)}
                for row in contributors[:3]
            ],
            "top_detractors": [
                {"symbol": row["symbol"], "contribution": round(row["contribution"], 2)}
                for row in detractors[:3]
            ],
            "securities": securities,
            "flags": flags,
        }
        risk_concentration_cache["data"] = data
        risk_concentration_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX concentration proxy updated: {level}, top3 {top3_weight:.1f}%")
    except Exception as e:
        logger.error(f"NDX concentration refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_valuation_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_valuation_cache

    try:
        symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]
        rows = []

        for symbol in symbols:
            try:
                info = yf.Ticker(symbol).get_info()
            except Exception as e:
                logger.error(f"Valuation info fetch error for {symbol}: {e}")
                continue

            market_cap = safe_float(info.get("marketCap"), 0)
            if market_cap <= 0:
                continue

            trailing_pe = safe_float(info.get("trailingPE"), None)
            forward_pe = safe_float(info.get("forwardPE"), None)
            price_sales = safe_float(info.get("priceToSalesTrailing12Months"), None)
            peg = safe_float(info.get("pegRatio"), None)
            earnings_growth = growth_value(info.get("earningsGrowth"))
            revenue_growth = growth_value(info.get("revenueGrowth"))
            profit_margin = growth_value(info.get("profitMargins"))
            forward_eps = safe_float(info.get("forwardEps"), None)
            trailing_eps = safe_float(info.get("trailingEps"), None)

            pe_score = metric_score(forward_pe, 16, 45)
            ps_score = metric_score(price_sales, 3, 16)
            peg_score = metric_score(peg, 0.8, 3.2)
            growth_penalty = 50
            if revenue_growth is not None and earnings_growth is not None:
                growth_penalty = clamp(70 - revenue_growth * 1.1 - earnings_growth * 0.45)
            elif revenue_growth is not None:
                growth_penalty = clamp(65 - revenue_growth * 1.5)

            valuation_score = round(
                clamp(pe_score * 0.38 + ps_score * 0.26 + peg_score * 0.24 + growth_penalty * 0.12),
                1,
            )
            label, color = valuation_pressure_label(valuation_score)

            rows.append({
                "symbol": symbol,
                "name": info.get("shortName") or info.get("longName") or symbol,
                "market_cap": market_cap,
                "trailing_pe": round_optional(trailing_pe, 2),
                "forward_pe": round_optional(forward_pe, 2),
                "price_sales": round_optional(price_sales, 2),
                "peg": round_optional(peg, 2),
                "earnings_growth": round_optional(earnings_growth, 1),
                "revenue_growth": round_optional(revenue_growth, 1),
                "profit_margin": round_optional(profit_margin, 1),
                "forward_eps": round_optional(forward_eps, 2),
                "trailing_eps": round_optional(trailing_eps, 2),
                "valuation_score": valuation_score,
                "valuation_label": label,
                "color": color,
            })

        if len(rows) < 4:
            raise ValueError("Insufficient MAG7 valuation data")

        total_market_cap = sum(row["market_cap"] for row in rows)
        for row in rows:
            row["weight"] = row["market_cap"] / total_market_cap * 100 if total_market_cap else 0
            row["pressure_contribution"] = row["valuation_score"] * row["weight"] / 100

        def weighted_average(field):
            valid = [row for row in rows if row.get(field) is not None and row.get(field) > 0]
            valid_weight = sum(row["weight"] for row in valid)
            if not valid or valid_weight <= 0:
                return None
            return sum(row[field] * row["weight"] for row in valid) / valid_weight

        weighted_forward_pe = weighted_average("forward_pe")
        weighted_trailing_pe = weighted_average("trailing_pe")
        weighted_price_sales = weighted_average("price_sales")
        weighted_peg = weighted_average("peg")
        weighted_revenue_growth = weighted_average("revenue_growth")
        weighted_earnings_growth = weighted_average("earnings_growth")
        weighted_profit_margin = weighted_average("profit_margin")
        valuation_score = round(sum(row["pressure_contribution"] for row in rows), 1)
        label, color = valuation_pressure_label(valuation_score)

        top_pressure = max(rows, key=lambda row: row["pressure_contribution"])
        most_expensive = sorted(rows, key=lambda row: row["valuation_score"], reverse=True)[:3]
        strongest_growth = sorted(
            rows,
            key=lambda row: (row.get("revenue_growth") or 0) + (row.get("earnings_growth") or 0) * 0.5,
            reverse=True,
        )[:3]

        if valuation_score >= 75:
            summary = f"MAG7 估值压力处在高位，主要贡献来自 {top_pressure['symbol']}，新增 NDX 风险预算需要更强盈利兑现支撑。"
        elif valuation_score >= 58:
            summary = f"MAG7 估值偏贵，{top_pressure['symbol']} 对估值压力贡献最大，指数上行需要收入和利润增速继续配合。"
        elif valuation_score >= 32:
            summary = "MAG7 估值压力处在可解释区间，成长增速仍能部分支撑 NDX 权重股溢价。"
        else:
            summary = "MAG7 估值压力温和，当前指数风险更多来自价格波动和宏观因子而非基本面溢价。"

        controls = [
            f"若加权 Forward PE 继续升至 35x 以上且收入增速未同步上修，需要降低估值扩张假设。",
            f"若最高压力来源 {top_pressure['symbol']} 出现盈利预期下修，NDX 权重股估值压缩会更集中。",
            "优先把估值压力与技术位、期权隐含波动和流动性确认一起使用，避免单独用估值判断短线方向。",
        ]

        public_rows = []
        for row in sorted(rows, key=lambda item: item["weight"], reverse=True):
            public_rows.append({
                key: (round(value, 2) if key in ("weight", "pressure_contribution") else value)
                for key, value in row.items()
                if key != "market_cap"
            })

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "coverage": f"{len(rows)}/7 MAG7",
            "valuation_score": valuation_score,
            "valuation_label": label,
            "valuation_color": color,
            "weighted_forward_pe": round_optional(weighted_forward_pe, 1),
            "weighted_trailing_pe": round_optional(weighted_trailing_pe, 1),
            "weighted_price_sales": round_optional(weighted_price_sales, 1),
            "weighted_peg": round_optional(weighted_peg, 2),
            "weighted_revenue_growth": round_optional(weighted_revenue_growth, 1),
            "weighted_earnings_growth": round_optional(weighted_earnings_growth, 1),
            "weighted_profit_margin": round_optional(weighted_profit_margin, 1),
            "top_pressure_symbol": top_pressure["symbol"],
            "top_pressure_contribution": round(top_pressure["pressure_contribution"], 2),
            "summary": summary,
            "controls": controls,
            "most_expensive": [{"symbol": row["symbol"], "score": row["valuation_score"], "label": row["valuation_label"]} for row in most_expensive],
            "strongest_growth": [
                {
                    "symbol": row["symbol"],
                    "revenue_growth": row.get("revenue_growth"),
                    "earnings_growth": row.get("earnings_growth"),
                }
                for row in strongest_growth
            ],
            "securities": public_rows,
            "methodology": "使用 MAG7 可得基本面字段和市值权重作为 NDX 权重股估值代理，综合 Forward PE、P/S、PEG、收入增速、盈利增速和利润率生成估值压力分；该模块不是完整 NDX 官方估值，也不构成目标价。",
        }
        risk_valuation_cache["data"] = data
        risk_valuation_cache["last_update"] = datetime.utcnow()
        logger.info(f"MAG7 valuation proxy updated: {label}, score {valuation_score:.1f}")
    except Exception as e:
        logger.error(f"MAG7 valuation proxy refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_quality_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_quality_cache

    try:
        symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]
        names = {
            "AAPL": "Apple",
            "MSFT": "Microsoft",
            "GOOGL": "Alphabet",
            "AMZN": "Amazon",
            "NVDA": "NVIDIA",
            "TSLA": "Tesla",
            "META": "Meta",
        }
        rows = []

        def score_margin(operating_margin, profit_margin):
            base = operating_margin if operating_margin is not None else profit_margin
            return 50 if base is None else clamp(base * 1.7)

        def score_cashflow(fcf_margin, conversion):
            if fcf_margin is None and conversion is None:
                return 50
            return clamp((fcf_margin or 0) * 2.3 + (conversion or 0) * 0.2)

        def score_balance(net_cash_ratio):
            return 50 if net_cash_ratio is None else clamp(50 + net_cash_ratio * 2.2)

        def score_growth(revenue_growth, earnings_growth):
            if revenue_growth is None and earnings_growth is None:
                return 50
            revenue_component = max(revenue_growth or 0, -20) * 1.2
            earnings_component = max(earnings_growth or 0, -30) * 0.35
            return clamp(45 + revenue_component + earnings_component)

        def score_return(roe, roa):
            if roe is None and roa is None:
                return 50
            return clamp((roe or 0) * 1.1 + (roa or 0) * 2.2)

        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.get_info()
            except Exception as e:
                logger.error(f"Quality info fetch error for {symbol}: {e}")
                continue

            market_cap = safe_float(info.get("marketCap"), None)
            if not market_cap or market_cap <= 0:
                try:
                    market_cap = safe_float(ticker.fast_info.market_cap, None)
                except Exception as e:
                    logger.error(f"Quality market cap fetch error for {symbol}: {e}")

            if not market_cap or market_cap <= 0:
                continue

            gross_margin = growth_value(info.get("grossMargins"))
            operating_margin = growth_value(info.get("operatingMargins"))
            profit_margin = growth_value(info.get("profitMargins"))
            roe = growth_value(info.get("returnOnEquity"))
            roa = growth_value(info.get("returnOnAssets"))
            revenue_growth = growth_value(info.get("revenueGrowth"))
            earnings_growth = growth_value(info.get("earningsGrowth"))
            free_cashflow = safe_float(info.get("freeCashflow"), None)
            operating_cashflow = safe_float(info.get("operatingCashflow"), None)
            total_revenue = safe_float(info.get("totalRevenue"), None)
            total_cash = safe_float(info.get("totalCash"), None)
            total_debt = safe_float(info.get("totalDebt"), None)

            fcf_margin = None
            if free_cashflow is not None and total_revenue and total_revenue > 0:
                fcf_margin = free_cashflow / total_revenue * 100

            cashflow_conversion = None
            if free_cashflow is not None and operating_cashflow and operating_cashflow > 0:
                cashflow_conversion = free_cashflow / operating_cashflow * 100

            net_cash_ratio = None
            if total_cash is not None and total_debt is not None and market_cap > 0:
                net_cash_ratio = (total_cash - total_debt) / market_cap * 100

            margin_score = score_margin(operating_margin, profit_margin)
            fcf_score = score_cashflow(fcf_margin, cashflow_conversion)
            balance_score = score_balance(net_cash_ratio)
            growth_score = score_growth(revenue_growth, earnings_growth)
            return_score = score_return(roe, roa)
            quality_score = round(
                clamp(
                    margin_score * 0.26
                    + fcf_score * 0.24
                    + balance_score * 0.18
                    + growth_score * 0.18
                    + return_score * 0.14
                ),
                1,
            )
            label, color = quality_regime(quality_score)

            rows.append({
                "symbol": symbol,
                "name": info.get("shortName") or info.get("longName") or names.get(symbol, symbol),
                "market_cap": market_cap,
                "gross_margin": round_optional(gross_margin, 1),
                "operating_margin": round_optional(operating_margin, 1),
                "profit_margin": round_optional(profit_margin, 1),
                "fcf_margin": round_optional(fcf_margin, 1),
                "cashflow_conversion": round_optional(cashflow_conversion, 1),
                "net_cash_ratio": round_optional(net_cash_ratio, 1),
                "revenue_growth": round_optional(revenue_growth, 1),
                "earnings_growth": round_optional(earnings_growth, 1),
                "roe": round_optional(roe, 1),
                "roa": round_optional(roa, 1),
                "quality_score": quality_score,
                "quality_label": label,
                "color": color,
            })

        if len(rows) < 4:
            raise ValueError("Insufficient MAG7 quality data")

        total_market_cap = sum(row["market_cap"] for row in rows)
        for row in rows:
            row["weight"] = row["market_cap"] / total_market_cap * 100 if total_market_cap else 0
            row["quality_contribution"] = row["quality_score"] * row["weight"] / 100

        def weighted_average(field):
            valid = [row for row in rows if row.get(field) is not None]
            valid_weight = sum(row["weight"] for row in valid)
            if not valid or valid_weight <= 0:
                return None
            return sum(row[field] * row["weight"] for row in valid) / valid_weight

        quality_score = round(sum(row["quality_contribution"] for row in rows), 1)
        label, color = quality_regime(quality_score)
        top_quality = sorted(rows, key=lambda row: row["quality_score"], reverse=True)[:3]
        weak_quality = sorted(rows, key=lambda row: row["quality_score"])[:3]
        top_contributor = max(rows, key=lambda row: row["quality_contribution"])

        if quality_score >= 75:
            summary = f"MAG7 盈利质量对 NDX 估值形成较强支撑，现金流、利润率和资产回报仍以 {top_contributor['symbol']} 等龙头为主要贡献。"
        elif quality_score >= 58:
            summary = f"MAG7 盈利质量整体稳健，{top_contributor['symbol']} 对质量支撑贡献最大，但仍需观察自由现金流和增长兑现。"
        elif quality_score >= 36:
            summary = "MAG7 盈利质量出现分化，部分权重股现金流或利润率不足以完全解释当前估值溢价。"
        else:
            summary = "MAG7 盈利质量承压，若估值压力同步抬升，NDX 权重股需要更严格的风险预算约束。"

        weighted_fcf_margin = weighted_average("fcf_margin")
        weighted_net_cash_ratio = weighted_average("net_cash_ratio")
        controls = [
            "若估值压力偏高但质量分仍强，溢价有基本面支撑，但不能替代价格止损和对冲纪律。",
            "若加权自由现金流率或净现金率连续走弱，需要降低多重估值扩张假设。",
            "把该质量分与估值压力、财报催化和融资条件联合使用，优先识别“高估值且质量转弱”的脆弱组合。",
        ]
        if weighted_fcf_margin is not None and weighted_fcf_margin < 12:
            controls.insert(1, f"加权 FCF Margin 仅 {weighted_fcf_margin:.1f}%，需要关注盈利向现金流转换是否弱化。")
        if weighted_net_cash_ratio is not None and weighted_net_cash_ratio < -5:
            controls.insert(1, f"加权净现金率 {weighted_net_cash_ratio:.1f}%，资产负债表安全垫低于理想区间。")

        public_rows = []
        for row in sorted(rows, key=lambda item: item["weight"], reverse=True):
            public_rows.append({
                key: (round(value, 2) if key in ("weight", "quality_contribution") else value)
                for key, value in row.items()
                if key != "market_cap"
            })

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "coverage": f"{len(rows)}/7 MAG7",
            "quality_score": quality_score,
            "quality_label": label,
            "quality_color": color,
            "weighted_gross_margin": round_optional(weighted_average("gross_margin"), 1),
            "weighted_operating_margin": round_optional(weighted_average("operating_margin"), 1),
            "weighted_profit_margin": round_optional(weighted_average("profit_margin"), 1),
            "weighted_fcf_margin": round_optional(weighted_fcf_margin, 1),
            "weighted_cashflow_conversion": round_optional(weighted_average("cashflow_conversion"), 1),
            "weighted_net_cash_ratio": round_optional(weighted_net_cash_ratio, 1),
            "weighted_revenue_growth": round_optional(weighted_average("revenue_growth"), 1),
            "weighted_earnings_growth": round_optional(weighted_average("earnings_growth"), 1),
            "weighted_roe": round_optional(weighted_average("roe"), 1),
            "top_quality_symbol": top_quality[0]["symbol"],
            "top_contributor_symbol": top_contributor["symbol"],
            "top_contributor_score": round(top_contributor["quality_contribution"], 2),
            "summary": summary,
            "controls": controls,
            "top_quality": [{"symbol": row["symbol"], "score": row["quality_score"], "fcf_margin": row.get("fcf_margin")} for row in top_quality],
            "weak_quality": [{"symbol": row["symbol"], "score": row["quality_score"], "fcf_margin": row.get("fcf_margin")} for row in weak_quality],
            "securities": public_rows,
            "methodology": "使用 MAG7 可得基本面字段和市值权重作为 NDX 权重股盈利质量代理，综合毛利率、经营利润率、净利率、自由现金流率、现金流转换、净现金率、收入/盈利增速、ROE/ROA 生成正向质量分。该模块是质量代理，不等同于完整 NDX 官方基本面模型，也不构成单股评级。",
        }
        risk_quality_cache["data"] = data
        risk_quality_cache["last_update"] = datetime.utcnow()
        logger.info(f"MAG7 quality proxy updated: {label}, score {quality_score:.1f}")
    except Exception as e:
        logger.error(f"MAG7 quality proxy refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_earnings_catalyst_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_earnings_cache

    try:
        symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]
        names = {
            "AAPL": "Apple",
            "MSFT": "Microsoft",
            "GOOGL": "Alphabet",
            "AMZN": "Amazon",
            "NVDA": "NVIDIA",
            "TSLA": "Tesla",
            "META": "Meta",
        }
        rows = []
        today = datetime.utcnow().date()

        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                calendar = ticker.calendar or {}
            except Exception as e:
                logger.error(f"Earnings calendar fetch error for {symbol}: {e}")
                continue

            raw_dates = calendar.get("Earnings Date") or []
            if not isinstance(raw_dates, (list, tuple)):
                raw_dates = [raw_dates]

            earnings_dates = []
            for raw_date in raw_dates:
                if raw_date is None:
                    continue
                event_date = raw_date.date() if hasattr(raw_date, "date") else raw_date
                if hasattr(event_date, "isoformat") and event_date >= today:
                    earnings_dates.append(event_date)

            if not earnings_dates:
                continue

            earnings_date = min(earnings_dates)
            days_to_event = (earnings_date - today).days
            eps_avg = safe_float(calendar.get("Earnings Average"), None)
            eps_high = safe_float(calendar.get("Earnings High"), None)
            eps_low = safe_float(calendar.get("Earnings Low"), None)
            revenue_avg = safe_float(calendar.get("Revenue Average"), None)
            revenue_high = safe_float(calendar.get("Revenue High"), None)
            revenue_low = safe_float(calendar.get("Revenue Low"), None)

            eps_dispersion = None
            if eps_avg and eps_high is not None and eps_low is not None:
                eps_dispersion = abs(eps_high - eps_low) / max(abs(eps_avg), 0.01) * 100

            revenue_dispersion = None
            if revenue_avg and revenue_high is not None and revenue_low is not None:
                revenue_dispersion = abs(revenue_high - revenue_low) / max(abs(revenue_avg), 1) * 100

            market_cap = None
            try:
                market_cap = safe_float(ticker.fast_info.market_cap, None)
            except Exception as e:
                logger.error(f"Earnings market cap fetch error for {symbol}: {e}")

            if days_to_event <= 7:
                window_pressure = 88
            elif days_to_event <= 14:
                window_pressure = 74
            elif days_to_event <= 30:
                window_pressure = 56
            elif days_to_event <= 45:
                window_pressure = 42
            elif days_to_event <= 75:
                window_pressure = 24
            else:
                window_pressure = 10

            dispersion_pressure = 0
            if eps_dispersion is not None:
                dispersion_pressure += min(18, eps_dispersion * 0.45)
            if revenue_dispersion is not None:
                dispersion_pressure += min(10, revenue_dispersion * 0.7)

            event_score = round(clamp(window_pressure + dispersion_pressure), 1)
            rows.append({
                "symbol": symbol,
                "name": names.get(symbol, symbol),
                "earnings_date": earnings_date.isoformat(),
                "days_to_event": days_to_event,
                "market_cap": market_cap or 0,
                "eps_average": round_optional(eps_avg, 2),
                "eps_low": round_optional(eps_low, 2),
                "eps_high": round_optional(eps_high, 2),
                "eps_dispersion": round_optional(eps_dispersion, 1),
                "revenue_average_bn": round_optional(revenue_avg / 1_000_000_000, 1) if revenue_avg else None,
                "revenue_dispersion": round_optional(revenue_dispersion, 1),
                "event_score": event_score,
            })

        if len(rows) < 4:
            raise ValueError("Insufficient MAG7 earnings calendar data")

        total_cap = sum(row["market_cap"] for row in rows)
        equal_weight = 100 / len(rows)
        for row in rows:
            row["weight"] = row["market_cap"] / total_cap * 100 if total_cap else equal_weight
            row["weighted_event_score"] = row["event_score"] * row["weight"] / 100

        event_weight_14d = sum(row["weight"] for row in rows if row["days_to_event"] <= 14)
        event_weight_30d = sum(row["weight"] for row in rows if row["days_to_event"] <= 30)
        event_weight_45d = sum(row["weight"] for row in rows if row["days_to_event"] <= 45)
        event_score = round(sum(row["weighted_event_score"] for row in rows), 1)
        nearest = min(rows, key=lambda row: row["days_to_event"])
        label, color = earnings_catalyst_regime(event_score, nearest["days_to_event"], event_weight_45d)

        valid_eps = [row for row in rows if row.get("eps_dispersion") is not None]
        weighted_eps_dispersion = None
        if valid_eps:
            valid_weight = sum(row["weight"] for row in valid_eps)
            weighted_eps_dispersion = sum(row["eps_dispersion"] * row["weight"] for row in valid_eps) / valid_weight if valid_weight else None

        if label == "催化临近":
            summary = f"{nearest['symbol']} 将在 {nearest['days_to_event']} 天后进入财报窗口，MAG7 事件风险已经临近，短线 NDX 风险预算需要预留跳空波动。"
        elif label == "财报季预热":
            summary = f"未来 45 天内 MAG7 财报权重暴露约 {event_weight_45d:.1f}%，NDX 将进入财报季预热阶段。"
        elif label == "事件观察":
            summary = "MAG7 财报窗口尚未集中到近端，但预期分歧已经值得与估值压力和期权定价联合跟踪。"
        else:
            summary = "MAG7 财报催化窗口相对较远，当前 NDX 风险更多来自价格、宏观和波动率结构。"

        sorted_rows = sorted(rows, key=lambda row: row["days_to_event"])
        top_weight_events = sorted(rows, key=lambda row: row["weight"], reverse=True)[:3]
        highest_uncertainty = sorted(
            [row for row in rows if row.get("eps_dispersion") is not None],
            key=lambda row: row["eps_dispersion"],
            reverse=True,
        )[:3]

        controls = [
            f"最近财报为 {nearest['symbol']}，距离 {nearest['days_to_event']} 天；若进入 14 天窗口，避免把风险预算集中在单一权重股方向。",
            f"未来 30 天财报权重暴露 {event_weight_30d:.1f}%，未来 45 天暴露 {event_weight_45d:.1f}%。",
            "若 EPS 预期分歧扩大且估值压力偏高，财报前后应把跳空风险纳入 NDX 情景测试。",
        ]

        public_rows = []
        for row in sorted_rows:
            public_rows.append({
                key: (round(value, 2) if key in ("weight", "weighted_event_score") else value)
                for key, value in row.items()
                if key != "market_cap"
            })

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "coverage": f"{len(rows)}/7 MAG7",
            "event_score": event_score,
            "event_label": label,
            "event_color": color,
            "summary": summary,
            "nearest_symbol": nearest["symbol"],
            "nearest_date": nearest["earnings_date"],
            "nearest_days": nearest["days_to_event"],
            "event_weight_14d": round(event_weight_14d, 1),
            "event_weight_30d": round(event_weight_30d, 1),
            "event_weight_45d": round(event_weight_45d, 1),
            "weighted_eps_dispersion": round_optional(weighted_eps_dispersion, 1),
            "top_weight_events": [
                {"symbol": row["symbol"], "weight": round(row["weight"], 1), "days_to_event": row["days_to_event"]}
                for row in top_weight_events
            ],
            "highest_uncertainty": [
                {"symbol": row["symbol"], "eps_dispersion": row["eps_dispersion"], "days_to_event": row["days_to_event"]}
                for row in highest_uncertainty
            ],
            "securities": public_rows,
            "controls": controls,
            "methodology": "使用 yfinance calendar 中 MAG7 下一次 Earnings Date、EPS/Revenue 预期高低值与市值权重，估算 14/30/45 天财报事件权重暴露和预期分歧。该模块用于识别 NDX 财报季催化窗口，不构成单股财报预测。",
        }
        risk_earnings_cache["data"] = data
        risk_earnings_cache["last_update"] = datetime.utcnow()
        logger.info(f"MAG7 earnings catalyst updated: {label}, score {event_score:.1f}")
    except Exception as e:
        logger.error(f"MAG7 earnings catalyst refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_breadth_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_breadth_cache

    try:
        cap_symbol = "QQQ"
        equal_symbol = None
        cap_history = fetch_ohlc_history(cap_symbol, "6mo", min_rows=80, attempts=3)
        equal_history = None
        for candidate in ["QQEW", "QQQE"]:
            try:
                equal_history = fetch_ohlc_history(candidate, "6mo", min_rows=80, attempts=3)
                equal_symbol = candidate
                break
            except Exception as e:
                logger.error(f"Equal-weight breadth proxy fetch error for {candidate}: {e}")

        if equal_history is None or equal_symbol is None:
            raise ValueError("Equal-weight Nasdaq 100 proxy unavailable")

        cap_close = cap_history["Close"].rename("cap")
        equal_close = equal_history["Close"].rename("equal")
        aligned = pd.concat([cap_close, equal_close], axis=1, join="inner").dropna()
        if len(aligned) < 80:
            raise ValueError("Insufficient aligned breadth history")

        cap_returns = aligned["cap"].pct_change() * 100
        equal_returns = aligned["equal"].pct_change() * 100
        spread_returns = equal_returns - cap_returns
        ratio = aligned["equal"] / aligned["cap"]

        cap_return_5d = pct_change(aligned["cap"].iloc[-1], aligned["cap"].iloc[-6]) if len(aligned) >= 6 else 0
        cap_return_20d = pct_change(aligned["cap"].iloc[-1], aligned["cap"].iloc[-21]) if len(aligned) >= 21 else cap_return_5d
        cap_return_60d = pct_change(aligned["cap"].iloc[-1], aligned["cap"].iloc[-61]) if len(aligned) >= 61 else cap_return_20d
        equal_return_5d = pct_change(aligned["equal"].iloc[-1], aligned["equal"].iloc[-6]) if len(aligned) >= 6 else 0
        equal_return_20d = pct_change(aligned["equal"].iloc[-1], aligned["equal"].iloc[-21]) if len(aligned) >= 21 else equal_return_5d
        equal_return_60d = pct_change(aligned["equal"].iloc[-1], aligned["equal"].iloc[-61]) if len(aligned) >= 61 else equal_return_20d
        participation_gap_20d = equal_return_20d - cap_return_20d
        participation_gap_60d = equal_return_60d - cap_return_60d
        ratio_change_20d = pct_change(ratio.iloc[-1], ratio.iloc[-21]) if len(ratio) >= 21 else 0
        ratio_change_60d = pct_change(ratio.iloc[-1], ratio.iloc[-61]) if len(ratio) >= 61 else ratio_change_20d
        participation_days_20d = int((spread_returns.tail(20) > 0).sum())
        participation_rate_20d = participation_days_20d / 20 * 100
        up_days_20d = int((equal_returns.tail(20) > 0).sum())
        down_capture = None
        cap_down = cap_returns.tail(60)[cap_returns.tail(60) < 0]
        if len(cap_down) >= 5:
            equal_down = equal_returns.loc[cap_down.index]
            down_capture = safe_float(abs(equal_down.mean()) / abs(cap_down.mean()) * 100, None)

        rolling_corr = safe_float(cap_returns.tail(60).corr(equal_returns.tail(60)), 0)
        spread_vol = safe_float(spread_returns.tail(60).std(), 0)
        breadth_score = 50 + participation_gap_20d * 5 + participation_gap_60d * 1.8 + (participation_rate_20d - 50) * 0.35 + ratio_change_20d * 4
        if down_capture is not None and down_capture > 110:
            breadth_score -= min(12, (down_capture - 100) * 0.25)
        breadth_score = round(clamp(breadth_score), 1)

        regime, color = breadth_regime(breadth_score, cap_return_20d, equal_return_20d, participation_gap_20d)
        if regime == "广泛参与":
            summary = "等权 Nasdaq 100 代理跑赢 QQQ，NDX 上涨质量更接近成分股扩散而非少数龙头拉动。"
        elif regime == "窄幅领涨":
            summary = "QQQ 表现明显强于等权代理，NDX 上涨更依赖大权重龙头，追高需要更强确认。"
        elif regime == "广度走弱":
            summary = "等权代理在下跌阶段弱于 QQQ，说明内部成分股承压范围扩大。"
        elif regime == "参与不足":
            summary = "等权参与度偏弱，NDX 指数信号需要等待更广泛的成分股跟进。"
        else:
            summary = "等权代理与 QQQ 表现接近，NDX 内部参与度处在中性扩散区。"

        indicators = [
            {
                "key": "gap20",
                "label": "20日参与差",
                "value": f"{participation_gap_20d:+.2f}%",
                "state": "扩散" if participation_gap_20d > 1 else "收窄" if participation_gap_20d < -1 else "均衡",
                "color": "green" if participation_gap_20d > 1 else "amber" if participation_gap_20d < -1 else "blue",
                "detail": f"{equal_symbol} 20日 {equal_return_20d:+.2f}%，QQQ 20日 {cap_return_20d:+.2f}%。",
            },
            {
                "key": "ratio",
                "label": "等权/市值比率",
                "value": f"{ratio_change_20d:+.2f}%",
                "state": "改善" if ratio_change_20d > 1 else "恶化" if ratio_change_20d < -1 else "横盘",
                "color": "green" if ratio_change_20d > 1 else "amber" if ratio_change_20d < -1 else "blue",
                "detail": "等权代理相对 QQQ 的价格比率变化，用于观察内部扩散。",
            },
            {
                "key": "days",
                "label": "跑赢天数",
                "value": f"{participation_days_20d}/20",
                "state": "占优" if participation_days_20d >= 12 else "不足" if participation_days_20d <= 8 else "均衡",
                "color": "green" if participation_days_20d >= 12 else "amber" if participation_days_20d <= 8 else "blue",
                "detail": f"近20日等权代理有 {participation_days_20d} 天跑赢 QQQ。",
            },
            {
                "key": "down_capture",
                "label": "下跌捕获",
                "value": "--" if down_capture is None else f"{down_capture:.0f}%",
                "state": "承压" if down_capture is not None and down_capture > 110 else "抗跌" if down_capture is not None and down_capture < 90 else "常态",
                "color": "red" if down_capture is not None and down_capture > 115 else "green" if down_capture is not None and down_capture < 90 else "blue",
                "detail": "最近60日 QQQ 下跌日中，等权代理平均跌幅相对 QQQ 的比例。",
            },
        ]

        controls = [
            f"若 {equal_symbol}/QQQ 比率 20 日继续为负，指数上涨应按窄幅龙头行情处理。",
            "若等权代理连续跑赢且 QQQ 同步上涨，可提高对趋势延续的确认度。",
            "若下跌捕获率高于 110%，说明非龙头成分股在回撤日更脆弱，需要收缩进取仓位。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "cap_symbol": cap_symbol,
            "equal_symbol": equal_symbol,
            "price_date": str(aligned.index[-1].date()),
            "breadth_score": breadth_score,
            "breadth_label": regime,
            "breadth_color": color,
            "summary": summary,
            "cap_return_5d": round(cap_return_5d, 2),
            "cap_return_20d": round(cap_return_20d, 2),
            "cap_return_60d": round(cap_return_60d, 2),
            "equal_return_5d": round(equal_return_5d, 2),
            "equal_return_20d": round(equal_return_20d, 2),
            "equal_return_60d": round(equal_return_60d, 2),
            "participation_gap_20d": round(participation_gap_20d, 2),
            "participation_gap_60d": round(participation_gap_60d, 2),
            "ratio_change_20d": round(ratio_change_20d, 2),
            "ratio_change_60d": round(ratio_change_60d, 2),
            "participation_days_20d": participation_days_20d,
            "participation_rate_20d": round(participation_rate_20d, 1),
            "up_days_20d": up_days_20d,
            "down_capture": round_optional(down_capture, 1),
            "rolling_corr": round(rolling_corr, 2),
            "spread_volatility": round(spread_vol, 2),
            "indicators": indicators,
            "controls": controls,
            "methodology": "使用 QQQ 作为市值加权 NDX 可交易代理，使用 QQEW/QQQE 作为等权 Nasdaq 100 代理，比较 20/60 日收益、等权/市值比率、跑赢天数、下跌捕获和价差波动，判断指数上涨是否由更广泛成分股参与。不等同于完整 Nasdaq 100 成分股逐一广度统计。",
        }
        risk_breadth_cache["data"] = data
        risk_breadth_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX equal-weight breadth updated: {regime}, score {breadth_score:.1f}")
    except Exception as e:
        logger.error(f"NDX equal-weight breadth refresh failed: {e}")
        logger.error(traceback.format_exc())


def fetch_close_history(symbols, period="6mo"):
    if isinstance(symbols, str):
        symbols = [symbols]

    last_error = None
    for symbol in symbols:
        try:
            history = yf.Ticker(symbol).history(period=period)
            if history is not None and not history.empty and "Close" in history.columns:
                closes = history["Close"].dropna()
                closes.index = pd.to_datetime(closes.index).tz_localize(None).normalize()
                if len(closes) >= 45:
                    return symbol, closes
        except Exception as e:
            last_error = e
            logger.error(f"Factor history fetch error for {symbol}: {e}")

    raise ValueError(f"No usable history for {symbols}: {last_error}")


def fetch_ohlc_history(symbol, period="1y", min_rows=80, attempts=3):
    last_error = None
    for attempt in range(attempts):
        try:
            history = yf.Ticker(symbol).history(period=period)
            if history is not None and not history.empty and "Close" in history.columns:
                history = history.dropna(subset=["Close"]).copy()
                history.index = pd.to_datetime(history.index).tz_localize(None).normalize()
                if len(history) >= min_rows:
                    return history
        except Exception as e:
            last_error = e
            logger.error(f"OHLC history fetch error for {symbol} attempt {attempt + 1}: {e}")
        if attempt < attempts - 1:
            time.sleep(1)

    raise ValueError(f"No usable OHLC history for {symbol}: {last_error}")


def factor_metric(key, label, symbols, change_mode, higher_is_risk, ndx_returns):
    symbol, closes = fetch_close_history(symbols)

    if change_mode == "bps":
        factor_changes = closes.diff() * 100
        latest_level = f"{closes.iloc[-1]:.2f}%"
        change_5 = (closes.iloc[-1] - closes.iloc[-6]) * 100 if len(closes) >= 6 else 0
        change_20 = (closes.iloc[-1] - closes.iloc[-21]) * 100 if len(closes) >= 21 else change_5
        change_5_label = f"{change_5:+.0f} bps"
        change_20_label = f"{change_20:+.0f} bps"
        threshold = 5
    elif change_mode == "percent":
        factor_changes = closes.pct_change() * 100
        latest_level = f"{closes.iloc[-1]:.2f}"
        change_5 = pct_change(closes.iloc[-1], closes.iloc[-6]) if len(closes) >= 6 else 0
        change_20 = pct_change(closes.iloc[-1], closes.iloc[-21]) if len(closes) >= 21 else change_5
        change_5_label = f"{change_5:+.2f}%"
        change_20_label = f"{change_20:+.2f}%"
        threshold = 0.5
    else:
        factor_changes = closes.diff()
        latest_level = f"{closes.iloc[-1]:.2f}"
        change_5 = closes.iloc[-1] - closes.iloc[-6] if len(closes) >= 6 else 0
        change_20 = closes.iloc[-1] - closes.iloc[-21] if len(closes) >= 21 else change_5
        change_5_label = f"{change_5:+.2f} 点"
        change_20_label = f"{change_20:+.2f} 点"
        threshold = 1

    aligned = pd.concat(
        {"ndx": ndx_returns, "factor": factor_changes},
        axis=1,
        join="inner",
    ).dropna().tail(60)

    if len(aligned) < 30:
        raise ValueError(f"Insufficient aligned factor history for {key}")

    correlation = safe_float(aligned["ndx"].corr(aligned["factor"]), 0)
    ndx_std = safe_float(aligned["ndx"].std(), 0)
    sensitivity = correlation * ndx_std

    if higher_is_risk:
        directional_pressure = change_5 if correlation < 0 else -change_5
    else:
        directional_pressure = -change_5 if correlation < 0 else change_5

    pressure_score = clamp(abs(correlation) * 45 + max(0, directional_pressure / threshold) * 25)
    direction = "中性"
    if pressure_score >= 55 and directional_pressure > 0:
        direction = "逆风"
    elif directional_pressure < -threshold * 0.6:
        direction = "顺风"

    if direction == "逆风":
        comment = f"{label} 的近期变化与 NDX 的历史相关结构形成压力，需要控制追高和久期暴露。"
    elif direction == "顺风":
        comment = f"{label} 近期变化对 NDX 风险偏好形成缓冲，但仍需观察相关性是否稳定。"
    else:
        comment = f"{label} 对 NDX 的近期压力不突出，当前更适合作为背景变量监控。"

    return {
        "key": key,
        "label": label,
        "symbol": symbol,
        "level": latest_level,
        "change_5d": change_5_label,
        "change_20d": change_20_label,
        "correlation": round(correlation, 2),
        "correlation_label": correlation_label(correlation),
        "sensitivity": round(sensitivity, 2),
        "sensitivity_label": f"{sensitivity:+.2f}%",
        "pressure_score": round(pressure_score, 1),
        "pressure_label": factor_pressure_label(pressure_score),
        "color": factor_pressure_color(pressure_score),
        "direction": direction,
        "comment": comment,
        "sample_days": len(aligned),
    }


def refresh_factor_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_factors_cache

    try:
        ndx_symbol, ndx_closes = fetch_close_history("^NDX", "6mo")
        ndx_returns = ndx_closes.pct_change() * 100

        factors = [
            factor_metric("volatility", "VIX 波动率", "^VIX", "points", True, ndx_returns),
            factor_metric("rates", "美国 10Y 利率", "^TNX", "bps", True, ndx_returns),
            factor_metric("dollar", "美元指数", ["DX-Y.NYB", "UUP"], "percent", True, ndx_returns),
        ]

        aggregate_score = round(sum(item["pressure_score"] for item in factors) / len(factors), 1)
        main_headwind = max(factors, key=lambda item: item["pressure_score"])
        main_sensitivity = max(factors, key=lambda item: abs(item["correlation"]))
        ndx_20d_return = pct_change(ndx_closes.iloc[-1], ndx_closes.iloc[-21]) if len(ndx_closes) >= 21 else 0

        if aggregate_score >= 65:
            summary = f"宏观因子压力偏高，主要逆风来自 {main_headwind['label']}。"
        elif aggregate_score >= 40:
            summary = f"宏观因子处在中性扰动区，NDX 对 {main_sensitivity['label']} 的相关性最值得跟踪。"
        else:
            summary = "宏观因子压力温和，当前风险更多来自指数内部结构和估值预期。"

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index_symbol": ndx_symbol,
            "index_level": round(ndx_closes.iloc[-1], 2),
            "index_20d_return": round(ndx_20d_return, 2),
            "lookback_days": 60,
            "pressure_score": aggregate_score,
            "pressure_label": factor_pressure_label(aggregate_score),
            "pressure_color": factor_pressure_color(aggregate_score),
            "main_headwind": main_headwind["label"],
            "main_sensitivity": main_sensitivity["label"],
            "summary": summary,
            "methodology": "使用最近 60 个交易日的 NDX 日收益与宏观因子日变化计算相关性；敏感度表示因子上行一标准差时 NDX 的历史对应变动，不代表预测。",
            "factors": factors,
        }
        risk_factors_cache["data"] = data
        risk_factors_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX factor pressure updated: {aggregate_score:.1f}")
    except Exception as e:
        logger.error(f"NDX factor pressure refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_factor_attribution_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_factor_attribution_cache

    try:
        symbols = {
            "qqq": "QQQ",
            "spy": "SPY",
            "smh": "SMH",
            "rates": "^TNX",
            "dollar": "DX-Y.NYB",
            "vix": "^VIX",
        }
        close_map = {
            key: fetch_ohlc_history(symbol, "6mo", min_rows=80, attempts=3)["Close"]
            for key, symbol in symbols.items()
        }
        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 90:
            raise ValueError("Insufficient aligned factor attribution history")

        returns = pd.DataFrame(index=prices.index)
        returns["qqq"] = prices["qqq"].pct_change() * 100
        returns["market"] = prices["spy"].pct_change() * 100
        returns["semis_active"] = (prices["smh"].pct_change() - prices["spy"].pct_change()) * 100
        returns["rates"] = prices["rates"].diff() * 100
        returns["dollar"] = prices["dollar"].pct_change() * 100
        returns["vix"] = prices["vix"].diff()
        returns = returns.dropna()
        if len(returns) < 85:
            raise ValueError("Insufficient returns for factor attribution")

        factor_defs = [
            {
                "key": "market",
                "label": "市场 Beta",
                "unit": "%",
                "description": "SPY 日收益，代表美股系统性风险偏好。",
                "risk_direction": "higher_positive",
            },
            {
                "key": "semis_active",
                "label": "半导体超额",
                "unit": "%",
                "description": "SMH 相对 SPY 的主动收益，代表芯片/算力主题对 NDX 的边际贡献。",
                "risk_direction": "higher_positive",
            },
            {
                "key": "rates",
                "label": "10Y 利率",
                "unit": "bps",
                "description": "美国 10 年期利率日变化，衡量久期估值压力。",
                "risk_direction": "higher_negative",
            },
            {
                "key": "dollar",
                "label": "美元指数",
                "unit": "%",
                "description": "美元指数日收益，衡量全球流动性和跨国科技收入折现压力。",
                "risk_direction": "higher_negative",
            },
            {
                "key": "vix",
                "label": "VIX 波动",
                "unit": "pts",
                "description": "VIX 点数日变化，衡量风险厌恶冲击。",
                "risk_direction": "higher_negative",
            },
        ]
        factor_keys = [item["key"] for item in factor_defs]
        train = returns.tail(90)
        y = train["qqq"].to_numpy(dtype=float)
        x = train[factor_keys].to_numpy(dtype=float)
        design = np.column_stack([np.ones(len(x)), x])
        coeffs, *_ = np.linalg.lstsq(design, y, rcond=None)
        fitted = design @ coeffs
        ss_res = float(np.sum((y - fitted) ** 2))
        ss_tot = float(np.sum((y - y.mean()) ** 2))
        r_squared = 1 - ss_res / ss_tot if ss_tot else 0

        window = returns.tail(20)
        actual_return = float(window["qqq"].sum())
        intercept_contribution = float(coeffs[0] * len(window))
        factor_contributions = []
        for index, factor in enumerate(factor_defs, start=1):
            factor_sum = float(window[factor["key"]].sum())
            beta = float(coeffs[index])
            contribution = beta * factor_sum
            if contribution > 1:
                color = "green"
            elif contribution < -1:
                color = "red"
            elif abs(contribution) >= 0.35:
                color = "amber"
            else:
                color = "blue"
            factor_contributions.append({
                "key": factor["key"],
                "label": factor["label"],
                "unit": factor["unit"],
                "description": factor["description"],
                "risk_direction": factor["risk_direction"],
                "factor_move_20d": round(factor_sum, 2),
                "beta": round(beta, 3),
                "contribution": round(contribution, 2),
                "color": color,
            })

        factor_total = sum(item["contribution"] for item in factor_contributions)
        predicted_return = intercept_contribution + factor_total
        residual = actual_return - predicted_return
        macro_contribution = sum(
            item["contribution"]
            for item in factor_contributions
            if item["key"] in ("rates", "dollar", "vix")
        )
        semis_contribution = next(
            item["contribution"] for item in factor_contributions if item["key"] == "semis_active"
        )
        regime, color = attribution_regime(semis_contribution, macro_contribution, residual, actual_return)

        sorted_contributors = sorted(factor_contributions, key=lambda item: item["contribution"], reverse=True)
        top_positive = sorted_contributors[0]
        top_negative = sorted_contributors[-1]
        if regime == "主题驱动":
            summary = f"近 20 日 QQQ 表现主要由 {top_positive['label']} 贡献，半导体主动收益对 NDX 形成正向拉动。"
        elif regime == "宏观拖累":
            summary = f"近 20 日 QQQ 承压主要来自宏观变量，最大负贡献为 {top_negative['label']}。"
        elif regime == "主动韧性":
            summary = "模型解释之外的残差为正，说明 QQQ 仍存在权重股或资金面主动韧性。"
        elif regime == "内生走弱":
            summary = "模型解释之外的残差为负，说明 QQQ 内部结构弱于因子应有表现。"
        else:
            summary = "QQQ 近 20 日表现由市场 beta、主题和宏观因子共同解释，暂未出现单一极端来源。"

        controls = [
            f"若 {top_positive['label']} 的正贡献回落，NDX 短线动能需要由更广泛主题接力。",
            f"当前宏观因子合计贡献 {macro_contribution:+.2f} 个百分点，若转负扩大，应降低估值扩张假设。",
            f"模型残差 {residual:+.2f} 个百分点，残差连续为负时需要检查权重股内部风险。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": prices.index[-1].date().isoformat(),
            "window_days": 20,
            "regression_days": len(train),
            "regime": regime,
            "regime_color": color,
            "actual_return": round(actual_return, 2),
            "predicted_return": round(predicted_return, 2),
            "factor_total": round(factor_total, 2),
            "intercept_contribution": round(intercept_contribution, 2),
            "residual": round(residual, 2),
            "macro_contribution": round(macro_contribution, 2),
            "semis_contribution": round(semis_contribution, 2),
            "r_squared": round(float(r_squared), 2),
            "summary": summary,
            "top_positive": {
                "label": top_positive["label"],
                "contribution": top_positive["contribution"],
            },
            "top_negative": {
                "label": top_negative["label"],
                "contribution": top_negative["contribution"],
            },
            "factors": factor_contributions,
            "controls": controls,
            "methodology": "使用最近 90 个交易日 OLS 回归估计 QQQ 对 SPY、SMH 主动收益、10Y 利率、美元指数和 VIX 日变化的敏感度，并将最近 20 日 QQQ 日收益拆分为因子贡献、截距和残差。该模块用于风险归因，不构成收益预测。",
        }
        risk_factor_attribution_cache["data"] = data
        risk_factor_attribution_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX factor attribution updated: {regime}, actual {actual_return:.2f}%")
    except Exception as e:
        logger.error(f"NDX factor attribution refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_factor_shock_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_factor_shock_cache

    try:
        symbols = {
            "qqq": "QQQ",
            "spy": "SPY",
            "smh": "SMH",
            "rates": "^TNX",
            "vix": "^VIX",
        }
        close_map = {
            key: fetch_ohlc_history(symbol, "2y", min_rows=300, attempts=3)["Close"]
            for key, symbol in symbols.items()
        }
        try:
            close_map["dollar"] = fetch_ohlc_history("DX-Y.NYB", "2y", min_rows=300, attempts=2)["Close"]
            dollar_symbol = "DX-Y.NYB"
        except Exception:
            close_map["dollar"] = fetch_ohlc_history("UUP", "2y", min_rows=300, attempts=3)["Close"]
            dollar_symbol = "UUP"

        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 260:
            raise ValueError("Insufficient aligned factor shock history")

        returns = pd.DataFrame(index=prices.index)
        returns["qqq"] = prices["qqq"].pct_change() * 100
        returns["market"] = prices["spy"].pct_change() * 100
        returns["semis_active"] = (prices["smh"].pct_change() - prices["spy"].pct_change()) * 100
        returns["rates"] = prices["rates"].diff() * 100
        returns["dollar"] = prices["dollar"].pct_change() * 100
        returns["vix"] = prices["vix"].diff()
        returns = returns.replace([np.inf, -np.inf], np.nan).dropna()
        if len(returns) < 240:
            raise ValueError("Insufficient factor shock returns")

        factor_defs = [
            {"key": "market", "label": "市场 Beta", "unit": "SPY %"},
            {"key": "semis_active", "label": "半导体主动", "unit": "SMH-SPY pt"},
            {"key": "rates", "label": "10Y 利率", "unit": "bps"},
            {"key": "dollar", "label": "美元指数", "unit": "%"},
            {"key": "vix", "label": "VIX", "unit": "pts"},
        ]
        factor_keys = [item["key"] for item in factor_defs]
        train = returns.tail(252)
        y = train["qqq"].to_numpy(dtype=float)
        x = train[factor_keys].to_numpy(dtype=float)
        design = np.column_stack([np.ones(len(x)), x])
        coeffs, *_ = np.linalg.lstsq(design, y, rcond=None)
        fitted = design @ coeffs
        ss_res = float(np.sum((y - fitted) ** 2))
        ss_tot = float(np.sum((y - y.mean()) ** 2))
        r_squared = 1 - ss_res / ss_tot if ss_tot else 0
        beta_map = {factor["key"]: float(coeffs[index]) for index, factor in enumerate(factor_defs, start=1)}

        def scenario_move(shocks):
            contributors = []
            total = 0.0
            for factor in factor_defs:
                key = factor["key"]
                shock = safe_float(shocks.get(key), 0)
                beta = beta_map[key]
                contribution = beta * shock
                total += contribution
                if contribution <= -0.75:
                    color = "red"
                elif contribution < -0.2:
                    color = "amber"
                elif contribution >= 0.75:
                    color = "green"
                else:
                    color = "blue"
                contributors.append({
                    "key": key,
                    "label": factor["label"],
                    "unit": factor["unit"],
                    "shock": round(shock, 2),
                    "beta": round(beta, 3),
                    "contribution": round(contribution, 2),
                    "color": color,
                })
            return round(total, 2), contributors

        scenario_defs = [
            {
                "key": "rates_plus_50",
                "label": "利率上行 50bps",
                "description": "10Y 突然上行，测试久期估值承压。",
                "shocks": {"rates": 50},
            },
            {
                "key": "vix_plus_5",
                "label": "VIX 上行 5 点",
                "description": "保护需求升温，测试风险厌恶冲击。",
                "shocks": {"vix": 5},
            },
            {
                "key": "dollar_plus_2",
                "label": "美元上行 2%",
                "description": "美元与全球流动性收紧的折现压力。",
                "shocks": {"dollar": 2},
            },
            {
                "key": "semis_down_5",
                "label": "半导体主动 -5pt",
                "description": "AI/芯片主线相对大盘走弱。",
                "shocks": {"semis_active": -5},
            },
            {
                "key": "market_down_3",
                "label": "SPY 下跌 3%",
                "description": "系统性 beta 压力传导至 QQQ。",
                "shocks": {"market": -3},
            },
            {
                "key": "stress_combo",
                "label": "组合压力",
                "description": "利率、VIX、美元和 beta 同时逆风。",
                "shocks": {"market": -3, "semis_active": -4, "rates": 35, "dollar": 1.5, "vix": 6},
            },
            {
                "key": "relief_combo",
                "label": "缓和组合",
                "description": "利率和波动回落，半导体重新领涨。",
                "shocks": {"market": 2, "semis_active": 3, "rates": -25, "dollar": -1, "vix": -3},
            },
            {
                "key": "ai_leadership",
                "label": "AI 主线修复",
                "description": "半导体主动走强并带动成长风险偏好。",
                "shocks": {"market": 1.5, "semis_active": 4, "vix": -1},
            },
        ]

        proxy_price = float(prices["qqq"].iloc[-1])
        scenarios = []
        for definition in scenario_defs:
            estimated_move, contributors = scenario_move(definition["shocks"])
            scenarios.append({
                "key": definition["key"],
                "label": definition["label"],
                "description": definition["description"],
                "estimated_move": estimated_move,
                "estimated_price": round(proxy_price * (1 + estimated_move / 100), 2),
                "contributors": contributors,
                "shocks": {key: round(safe_float(value, 0), 2) for key, value in definition["shocks"].items()},
                "color": "green" if estimated_move >= 1 else "blue" if estimated_move >= -1 else "amber" if estimated_move >= -2.5 else "red",
            })

        stress = next(item for item in scenarios if item["key"] == "stress_combo")
        relief = next(item for item in scenarios if item["key"] == "relief_combo")
        worst = min(scenarios, key=lambda item: item["estimated_move"])
        best = max(scenarios, key=lambda item: item["estimated_move"])
        rates_move = next(item for item in scenarios if item["key"] == "rates_plus_50")
        vix_move = next(item for item in scenarios if item["key"] == "vix_plus_5")
        semis_move = next(item for item in scenarios if item["key"] == "semis_down_5")

        shock_score = clamp(
            30
            + max(0, -stress["estimated_move"]) * 8
            + max(0, -worst["estimated_move"]) * 5
            + max(0, -rates_move["estimated_move"]) * 2.5
            + max(0, -vix_move["estimated_move"]) * 2
            + max(0, -semis_move["estimated_move"]) * 1.5
            - max(0, relief["estimated_move"]) * 2
            + max(0, 0.55 - safe_float(r_squared, 0)) * 10
        )
        regime, color = factor_shock_regime(shock_score)

        if shock_score >= 75:
            summary = f"NDX 当前对组合因子冲击高度敏感，压力组合估算 {stress['estimated_move']:+.2f}%，最弱情景为 {worst['label']}。"
        elif shock_score >= 55:
            summary = f"NDX 因子冲击敏感度偏高，压力组合估算 {stress['estimated_move']:+.2f}%，需要把利率、VIX 与半导体主动收益放在同一张执行表里。"
        elif shock_score >= 35:
            summary = f"NDX 因子冲击仍可控，压力组合估算 {stress['estimated_move']:+.2f}%，但若 {worst['label']} 同时出现，应下调新增风险预算。"
        else:
            summary = f"NDX 对假设冲击的线性敏感度较低，缓和组合估算 {relief['estimated_move']:+.2f}%，当前更适合观察趋势确认。"

        betas = []
        for factor in factor_defs:
            key = factor["key"]
            beta = beta_map[key]
            recent_20d = float(returns[key].tail(20).sum())
            recent_impact = beta * recent_20d
            if key in ("rates", "vix", "dollar") and recent_impact < -0.4:
                color_key = "red"
            elif recent_impact > 0.4:
                color_key = "green"
            elif abs(recent_impact) >= 0.4:
                color_key = "amber"
            else:
                color_key = "blue"
            betas.append({
                "key": key,
                "label": factor["label"],
                "unit": factor["unit"],
                "beta": round(beta, 3),
                "recent_20d_move": round(recent_20d, 2),
                "recent_20d_impact": round(recent_impact, 2),
                "color": color_key,
            })

        controls = [
            f"若 {worst['label']} 开始兑现，优先把新增仓位延后到压力释放后，而不是用均值回归做加仓理由。",
            f"压力组合线性估算 {stress['estimated_move']:+.2f}%，应与 Playbook 失效线和对冲覆盖一起使用。",
            f"模型 R2 为 {safe_float(r_squared, 0):.2f}，当解释度下降时，需要用盘中 tape 和期权偏斜确认冲击是否已经转为非线性。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": prices.index[-1].date().isoformat(),
            "proxy_symbol": "QQQ",
            "proxy_price": round(proxy_price, 2),
            "dollar_symbol": dollar_symbol,
            "regression_days": len(train),
            "shock_score": round(shock_score, 1),
            "regime": regime,
            "regime_color": color,
            "stress_move": stress["estimated_move"],
            "relief_move": relief["estimated_move"],
            "worst_case_label": worst["label"],
            "worst_case_move": worst["estimated_move"],
            "best_case_label": best["label"],
            "best_case_move": best["estimated_move"],
            "r_squared": round(float(r_squared), 2),
            "summary": summary,
            "scenarios": scenarios,
            "betas": betas,
            "controls": controls,
            "methodology": "使用最近 252 个交易日 QQQ 日收益对 SPY、SMH 主动收益、10Y 利率变化、美元和 VIX 变化做 OLS 回归，再把假设冲击乘以估计 beta 得到线性情景影响。结果用于风险敏感度和执行约束，不构成收益预测。",
        }
        risk_factor_shock_cache["data"] = data
        risk_factor_shock_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX factor shock updated: {regime}, stress {stress['estimated_move']:+.2f}%")
    except Exception as e:
        logger.error(f"NDX factor shock refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_condition_item(key, label, value, value_label, score, favorable_when, detail):
    score = round(clamp(score), 1)
    if score >= 72:
        color = "red"
        state = "压力高"
    elif score >= 55:
        color = "amber"
        state = "偏紧"
    elif score >= 38:
        color = "blue"
        state = "中性"
    else:
        color = "green"
        state = "友好"

    return {
        "key": key,
        "label": label,
        "value": value_label,
        "raw_value": round(value, 2),
        "score": score,
        "state": state,
        "color": color,
        "favorable_when": favorable_when,
        "detail": detail,
    }


def build_condition_scenario(key, label, mask, returns):
    valid = pd.concat(
        {
            "mask": mask,
            "qqq_return": returns["qqq"],
            "forward_5d": returns["forward_5d"],
        },
        axis=1,
    ).dropna()
    sample = valid[valid["mask"]]
    sample_count = int(len(sample))
    if sample_count:
        same_day = safe_float(sample["qqq_return"].mean(), 0)
        forward_5d = safe_float(sample["forward_5d"].mean(), 0)
        positive_rate = safe_float((sample["forward_5d"] > 0).mean() * 100, 0)
    else:
        same_day = 0
        forward_5d = 0
        positive_rate = 0

    if sample_count < 5:
        color = "blue"
        state = "样本少"
    elif forward_5d <= -1.2 or positive_rate < 40:
        color = "red"
        state = "历史偏弱"
    elif forward_5d < 0.2 or positive_rate < 50:
        color = "amber"
        state = "胜率不足"
    elif forward_5d >= 1.0 and positive_rate >= 58:
        color = "green"
        state = "历史偏强"
    else:
        color = "blue"
        state = "中性"

    return {
        "key": key,
        "label": label,
        "sample_count": sample_count,
        "same_day_return": round(same_day, 2),
        "forward_5d_return": round(forward_5d, 2),
        "positive_rate_5d": round(positive_rate, 1),
        "state": state,
        "color": color,
    }


def refresh_condition_matrix_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_condition_matrix_cache

    try:
        symbols = {
            "qqq": "QQQ",
            "spy": "SPY",
            "smh": "SMH",
            "rates": "^TNX",
            "dollar": "DX-Y.NYB",
            "vix": "^VIX",
        }
        close_map = {
            key: fetch_ohlc_history(symbol, "6mo", min_rows=90, attempts=3)["Close"]
            for key, symbol in symbols.items()
        }

        equal_symbol = None
        for candidate in ["QQEW", "QQQE"]:
            try:
                close_map["equal"] = fetch_ohlc_history(candidate, "6mo", min_rows=90, attempts=3)["Close"]
                equal_symbol = candidate
                break
            except Exception as e:
                logger.error(f"Condition matrix equal-weight proxy fetch error for {candidate}: {e}")
        if not equal_symbol:
            raise ValueError("Equal-weight Nasdaq 100 proxy unavailable for condition matrix")

        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 90:
            raise ValueError("Insufficient aligned history for condition matrix")

        returns = pd.DataFrame(index=prices.index)
        returns["qqq"] = prices["qqq"].pct_change() * 100
        returns["spy"] = prices["spy"].pct_change() * 100
        returns["smh_active"] = (prices["smh"].pct_change() - prices["spy"].pct_change()) * 100
        returns["rates_bps"] = prices["rates"].diff() * 100
        returns["dollar"] = prices["dollar"].pct_change() * 100
        returns["vix_pts"] = prices["vix"].diff()
        returns["breadth_spread"] = (prices["equal"].pct_change() - prices["qqq"].pct_change()) * 100
        returns["forward_5d"] = (prices["qqq"].shift(-5) / prices["qqq"] - 1) * 100
        returns = returns.dropna()
        if len(returns) < 80:
            raise ValueError("Insufficient return rows for condition matrix")

        qqq_return_5d = pct_change(prices["qqq"].iloc[-1], prices["qqq"].iloc[-6]) if len(prices) >= 6 else 0
        qqq_return_20d = pct_change(prices["qqq"].iloc[-1], prices["qqq"].iloc[-21]) if len(prices) >= 21 else qqq_return_5d
        rates_change_20d = safe_float((prices["rates"].iloc[-1] - prices["rates"].iloc[-21]) * 100, 0) if len(prices) >= 21 else 0
        dollar_return_20d = pct_change(prices["dollar"].iloc[-1], prices["dollar"].iloc[-21]) if len(prices) >= 21 else 0
        vix_change_20d = safe_float(prices["vix"].iloc[-1] - prices["vix"].iloc[-21], 0) if len(prices) >= 21 else 0
        semis_active_20d = safe_float(((prices["smh"].iloc[-1] / prices["smh"].iloc[-21]) - (prices["spy"].iloc[-1] / prices["spy"].iloc[-21])) * 100, 0) if len(prices) >= 21 else 0
        breadth_gap_20d = safe_float(((prices["equal"].iloc[-1] / prices["equal"].iloc[-21]) - (prices["qqq"].iloc[-1] / prices["qqq"].iloc[-21])) * 100, 0) if len(prices) >= 21 else 0

        rates_score = clamp(48 + rates_change_20d * 0.75)
        dollar_score = clamp(48 + dollar_return_20d * 9)
        vix_score = clamp(44 + vix_change_20d * 6)
        semis_score = clamp(48 - semis_active_20d * 8)
        breadth_score = clamp(50 - breadth_gap_20d * 10)
        trend_score = clamp(48 - qqq_return_20d * 4)

        conditions = [
            build_condition_item(
                "rates",
                "利率条件",
                rates_change_20d,
                f"{rates_change_20d:+.0f}bps",
                rates_score,
                "20 日利率变化稳定或回落",
                f"美国 10Y 利率 20 日变化 {rates_change_20d:+.0f}bps，成长股久期估值对其敏感。",
            ),
            build_condition_item(
                "dollar",
                "美元条件",
                dollar_return_20d,
                f"{dollar_return_20d:+.2f}%",
                dollar_score,
                "美元指数横盘或走弱",
                f"美元指数 20 日收益 {dollar_return_20d:+.2f}%，走强通常压制全球风险偏好和跨国科技收入折现。",
            ),
            build_condition_item(
                "volatility",
                "波动条件",
                vix_change_20d,
                f"{vix_change_20d:+.1f}pt",
                vix_score,
                "VIX 回落或低位横盘",
                f"VIX 20 日变化 {vix_change_20d:+.1f} 点，反映保护需求和风险厌恶变化。",
            ),
            build_condition_item(
                "semis",
                "半导体条件",
                semis_active_20d,
                f"{semis_active_20d:+.2f}pt",
                semis_score,
                "SMH 相对 SPY 保持主动收益",
                f"SMH 相对 SPY 20 日主动收益 {semis_active_20d:+.2f} 个百分点，是 NDX 主题动能的核心确认项。",
            ),
            build_condition_item(
                "breadth",
                "广度条件",
                breadth_gap_20d,
                f"{breadth_gap_20d:+.2f}pt",
                breadth_score,
                f"{equal_symbol} 相对 QQQ 改善",
                f"{equal_symbol} 相对 QQQ 20 日收益差 {breadth_gap_20d:+.2f} 个百分点，用于判断上涨是否扩散。",
            ),
            build_condition_item(
                "trend",
                "价格条件",
                qqq_return_20d,
                f"{qqq_return_20d:+.2f}%",
                trend_score,
                "QQQ 20 日趋势为正且不远离支撑",
                f"QQQ 20 日收益 {qqq_return_20d:+.2f}%，用于约束当前条件是否已经被价格充分反映。",
            ),
        ]

        condition_score = round(sum(item["score"] for item in conditions) / len(conditions), 1)
        regime, color = condition_matrix_regime(condition_score)

        rates_up = returns["rates_bps"] > 3
        rates_stable = returns["rates_bps"].abs() < 3
        dollar_up = returns["dollar"] > 0.25
        vix_up = returns["vix_pts"] > 0.7
        vix_down = returns["vix_pts"] < -0.7
        semis_down = returns["smh_active"] < -0.35
        semis_up = returns["smh_active"] > 0.35
        breadth_down = returns["breadth_spread"] < -0.25
        breadth_up = returns["breadth_spread"] > 0.15
        qqq_up = returns["qqq"] > 0.35

        scenarios = [
            build_condition_scenario("rates_vol_up", "利率 + VIX 同步上行", rates_up & vix_up, returns),
            build_condition_scenario("dollar_semis_down", "美元走强 + 半导体失速", dollar_up & semis_down, returns),
            build_condition_scenario("narrow_rally", "QQQ 上涨但广度落后", qqq_up & breadth_down, returns),
            build_condition_scenario("semis_breadth_up", "半导体领涨 + 广度扩散", semis_up & breadth_up, returns),
            build_condition_scenario("vix_down_rates_stable", "VIX 回落 + 利率稳定", vix_down & rates_stable, returns),
        ]

        strongest_condition = max(conditions, key=lambda item: item["score"])
        weakest_condition = min(conditions, key=lambda item: item["score"])
        if regime == "条件转弱":
            summary = f"NDX 条件矩阵转弱，主要压力来自 {strongest_condition['label']}，上涨更需要成交和广度确认。"
        elif regime == "条件偏紧":
            summary = f"NDX 条件偏紧，{strongest_condition['label']} 是当前最需要监控的风险源。"
        elif regime == "条件友好":
            summary = f"NDX 条件相对友好，最有利的确认项是 {weakest_condition['label']}。"
        else:
            summary = "NDX 条件矩阵处在均衡区，宏观压力和内部扩散信号需要联合观察。"

        controls = [
            f"若 {strongest_condition['label']} 继续恶化，应降低对 QQQ 20 日趋势 {qqq_return_20d:+.2f}% 的外推权重。",
            f"若半导体主动收益和 {equal_symbol}/QQQ 同时改善，可提高对 NDX 上涨质量的确认度。",
            "条件组合样本用于历史参照，不是预测模型；样本少的组合只作为提示，不应直接驱动仓位。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": prices.index[-1].date().isoformat(),
            "regime": regime,
            "regime_color": color,
            "condition_score": condition_score,
            "summary": summary,
            "qqq_return_5d": round(qqq_return_5d, 2),
            "qqq_return_20d": round(qqq_return_20d, 2),
            "rates_change_20d_bps": round(rates_change_20d, 1),
            "dollar_return_20d": round(dollar_return_20d, 2),
            "vix_change_20d": round(vix_change_20d, 2),
            "semis_active_20d": round(semis_active_20d, 2),
            "breadth_gap_20d": round(breadth_gap_20d, 2),
            "equal_symbol": equal_symbol,
            "conditions": conditions,
            "scenarios": scenarios,
            "controls": controls,
            "methodology": "使用 QQQ、SPY、SMH、10Y 利率、美元指数、VIX 和等权 Nasdaq 100 代理最近 6 个月日线，计算当前 20 日条件读数，并统计若干条件组合出现后的历史 5 日 QQQ 平均表现和胜率。该模块用于条件风险参照，不构成预测或交易指令。",
        }
        risk_condition_matrix_cache["data"] = data
        risk_condition_matrix_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX condition matrix updated: {regime}, score {condition_score:.1f}")
    except Exception as e:
        logger.error(f"NDX condition matrix refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_funding_item(key, label, value, value_label, score, detail):
    score = round(clamp(score), 1)
    if score >= 72:
        color = "red"
        state = "压力高"
    elif score >= 55:
        color = "amber"
        state = "偏紧"
    elif score >= 38:
        color = "blue"
        state = "中性"
    else:
        color = "green"
        state = "友好"

    return {
        "key": key,
        "label": label,
        "value": value_label,
        "raw_value": round(value, 2),
        "score": score,
        "state": state,
        "color": color,
        "detail": detail,
    }


def build_funding_scenario(key, label, mask, returns):
    valid = pd.concat(
        {
            "mask": mask,
            "qqq_return": returns["qqq"],
            "forward_5d": returns["forward_5d"],
        },
        axis=1,
    ).dropna()
    sample = valid[valid["mask"]]
    sample_count = int(len(sample))
    if sample_count:
        same_day = safe_float(sample["qqq_return"].mean(), 0)
        forward_5d = safe_float(sample["forward_5d"].mean(), 0)
        positive_rate = safe_float((sample["forward_5d"] > 0).mean() * 100, 0)
    else:
        same_day = 0
        forward_5d = 0
        positive_rate = 0

    if sample_count < 5:
        color = "blue"
        state = "样本少"
    elif forward_5d <= -1.2 or positive_rate < 40:
        color = "red"
        state = "历史偏弱"
    elif forward_5d < 0.2 or positive_rate < 50:
        color = "amber"
        state = "胜率不足"
    elif forward_5d >= 1.0 and positive_rate >= 58:
        color = "green"
        state = "历史偏强"
    else:
        color = "blue"
        state = "中性"

    return {
        "key": key,
        "label": label,
        "sample_count": sample_count,
        "same_day_return": round(same_day, 2),
        "forward_5d_return": round(forward_5d, 2),
        "positive_rate_5d": round(positive_rate, 1),
        "state": state,
        "color": color,
    }


def refresh_funding_conditions_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_funding_conditions_cache

    try:
        symbols = {
            "qqq": "QQQ",
            "hyg": "HYG",
            "lqd": "LQD",
            "tlt": "TLT",
            "shy": "SHY",
            "vix": "^VIX",
        }
        close_map = {
            key: fetch_ohlc_history(symbol, "6mo", min_rows=90, attempts=3)["Close"]
            for key, symbol in symbols.items()
        }
        try:
            close_map["dollar"] = fetch_ohlc_history("DX-Y.NYB", "6mo", min_rows=90, attempts=3)["Close"]
            dollar_symbol = "DXY"
        except Exception as e:
            logger.error(f"DXY fetch failed for funding conditions, falling back to UUP: {e}")
            close_map["dollar"] = fetch_ohlc_history("UUP", "6mo", min_rows=90, attempts=3)["Close"]
            dollar_symbol = "UUP"

        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 90:
            raise ValueError("Insufficient aligned history for funding conditions")

        credit_ratio = prices["hyg"] / prices["lqd"]
        duration_ratio = prices["tlt"] / prices["shy"]
        returns = pd.DataFrame(index=prices.index)
        returns["qqq"] = prices["qqq"].pct_change() * 100
        returns["hyg"] = prices["hyg"].pct_change() * 100
        returns["lqd"] = prices["lqd"].pct_change() * 100
        returns["credit_ratio"] = credit_ratio.pct_change() * 100
        returns["duration_ratio"] = duration_ratio.pct_change() * 100
        returns["dollar"] = prices["dollar"].pct_change() * 100
        returns["vix_pts"] = prices["vix"].diff()
        returns["forward_5d"] = (prices["qqq"].shift(-5) / prices["qqq"] - 1) * 100
        returns = returns.dropna()
        if len(returns) < 80:
            raise ValueError("Insufficient return rows for funding conditions")

        qqq_return_20d = pct_change(prices["qqq"].iloc[-1], prices["qqq"].iloc[-21]) if len(prices) >= 21 else 0
        hyg_return_20d = pct_change(prices["hyg"].iloc[-1], prices["hyg"].iloc[-21]) if len(prices) >= 21 else 0
        lqd_return_20d = pct_change(prices["lqd"].iloc[-1], prices["lqd"].iloc[-21]) if len(prices) >= 21 else 0
        credit_ratio_20d = pct_change(credit_ratio.iloc[-1], credit_ratio.iloc[-21]) if len(credit_ratio) >= 21 else 0
        duration_ratio_20d = pct_change(duration_ratio.iloc[-1], duration_ratio.iloc[-21]) if len(duration_ratio) >= 21 else 0
        dollar_return_20d = pct_change(prices["dollar"].iloc[-1], prices["dollar"].iloc[-21]) if len(prices) >= 21 else 0
        vix_change_20d = safe_float(prices["vix"].iloc[-1] - prices["vix"].iloc[-21], 0) if len(prices) >= 21 else 0

        credit_score = clamp(48 - credit_ratio_20d * 14 - hyg_return_20d * 2)
        duration_score = clamp(50 - duration_ratio_20d * 10)
        dollar_score = clamp(48 + dollar_return_20d * 8)
        volatility_score = clamp(46 + vix_change_20d * 5.5)
        carry_score = clamp(48 - qqq_return_20d * 2 + max(0, -credit_ratio_20d) * 9)

        items = [
            build_funding_item(
                "credit_risk",
                "高收益信用",
                credit_ratio_20d,
                f"{credit_ratio_20d:+.2f}%",
                credit_score,
                f"HYG/LQD 20 日变化 {credit_ratio_20d:+.2f}%，HYG {hyg_return_20d:+.2f}%，用于观察信用风险偏好。",
            ),
            build_funding_item(
                "investment_grade",
                "投资级信用",
                lqd_return_20d,
                f"{lqd_return_20d:+.2f}%",
                clamp(50 - lqd_return_20d * 4),
                f"LQD 20 日收益 {lqd_return_20d:+.2f}%，反映投资级信用和久期资产承压程度。",
            ),
            build_funding_item(
                "duration",
                "久期条件",
                duration_ratio_20d,
                f"{duration_ratio_20d:+.2f}%",
                duration_score,
                f"TLT/SHY 20 日变化 {duration_ratio_20d:+.2f}%，长久期相对短债走强通常利好成长估值。",
            ),
            build_funding_item(
                "dollar_liquidity",
                "美元流动性",
                dollar_return_20d,
                f"{dollar_return_20d:+.2f}%",
                dollar_score,
                f"{dollar_symbol} 20 日收益 {dollar_return_20d:+.2f}%，美元走强通常压制全球风险偏好。",
            ),
            build_funding_item(
                "volatility",
                "波动融资",
                vix_change_20d,
                f"{vix_change_20d:+.1f}pt",
                volatility_score,
                f"VIX 20 日变化 {vix_change_20d:+.1f} 点，保护成本上行会提高组合融资压力。",
            ),
            build_funding_item(
                "ndx_carry",
                "NDX 承载",
                qqq_return_20d,
                f"{qqq_return_20d:+.2f}%",
                carry_score,
                f"QQQ 20 日收益 {qqq_return_20d:+.2f}%，若价格上行但信用走弱，需警惕脆弱上涨。",
            ),
        ]

        funding_score = round(
            clamp(
                credit_score * 0.26
                + duration_score * 0.18
                + dollar_score * 0.18
                + volatility_score * 0.20
                + carry_score * 0.18
            ),
            1,
        )
        regime, color = funding_conditions_regime(funding_score)

        credit_down = returns["credit_ratio"] < -0.20
        credit_up = returns["credit_ratio"] > 0.15
        duration_down = returns["duration_ratio"] < -0.25
        duration_up = returns["duration_ratio"] > 0.25
        dollar_up = returns["dollar"] > 0.25
        vix_up = returns["vix_pts"] > 0.7
        vix_down = returns["vix_pts"] < -0.7
        qqq_up = returns["qqq"] > 0.35

        scenarios = [
            build_funding_scenario("credit_vix_stress", "信用走弱 + VIX 上行", credit_down & vix_up, returns),
            build_funding_scenario("dollar_credit_tight", "美元走强 + 信用走弱", dollar_up & credit_down, returns),
            build_funding_scenario("duration_credit_relief", "久期修复 + 信用改善", duration_up & credit_up, returns),
            build_funding_scenario("fragile_rally", "QQQ 上涨但信用落后", qqq_up & credit_down, returns),
            build_funding_scenario("vol_relief", "VIX 回落 + 信用改善", vix_down & credit_up, returns),
            build_funding_scenario("duration_shock", "久期下跌 + VIX 上行", duration_down & vix_up, returns),
        ]

        main_pressure = max(items, key=lambda item: item["score"])
        main_support = min(items, key=lambda item: item["score"])
        if regime == "融资压力高":
            summary = f"NDX 融资条件压力偏高，主要压力来自 {main_pressure['label']}，追高需要更严格的止损和保护预算。"
        elif regime == "融资偏紧":
            summary = f"NDX 融资条件偏紧，{main_pressure['label']} 是当前最需要监控的流动性约束。"
        elif regime == "融资友好":
            summary = f"NDX 融资条件友好，主要支持来自 {main_support['label']}，有利于成长股估值承载。"
        else:
            summary = "NDX 融资条件处在均衡区，信用、久期、美元和 VIX 暂未形成单边极端压力。"

        controls = [
            f"若 HYG/LQD 继续下行并伴随 VIX 上行，应把 NDX 上涨视为脆弱反弹而非风险扩散。",
            f"若 TLT/SHY 修复且 HYG/LQD 同步改善，可提高成长股估值承载的确认度。",
            "融资条件是宏观流动性代理，不等同于真实融资利差；样本少的历史组合只作为辅助参照。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": prices.index[-1].date().isoformat(),
            "regime": regime,
            "regime_color": color,
            "funding_score": funding_score,
            "summary": summary,
            "qqq_return_20d": round(qqq_return_20d, 2),
            "hyg_return_20d": round(hyg_return_20d, 2),
            "lqd_return_20d": round(lqd_return_20d, 2),
            "credit_ratio_20d": round(credit_ratio_20d, 2),
            "duration_ratio_20d": round(duration_ratio_20d, 2),
            "dollar_return_20d": round(dollar_return_20d, 2),
            "vix_change_20d": round(vix_change_20d, 2),
            "dollar_symbol": dollar_symbol,
            "items": items,
            "scenarios": scenarios,
            "controls": controls,
            "methodology": "使用 HYG/LQD 代理信用风险偏好、TLT/SHY 代理久期融资环境，并结合美元指数、VIX 和 QQQ 最近 6 个月日线，评估 NDX 成长股估值承载与融资压力。该模块是流动性风控代理，不构成信用或 ETF 交易建议。",
        }
        risk_funding_conditions_cache["data"] = data
        risk_funding_conditions_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX funding conditions updated: {regime}, score {funding_score:.1f}")
    except Exception as e:
        logger.error(f"NDX funding conditions refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_cross_asset_item(key, label, value, value_label, score, detail, metric_label="20D"):
    normalized_score = round(clamp(score), 1)
    color = constructive_color(normalized_score)
    if normalized_score >= 70:
        state = "强确认"
    elif normalized_score >= 55:
        state = "确认"
    elif normalized_score >= 42:
        state = "中性"
    else:
        state = "分歧"

    return {
        "key": key,
        "label": label,
        "metric_label": metric_label,
        "value": value_label,
        "raw_value": round(safe_float(value, 0), 2),
        "score": normalized_score,
        "state": state,
        "color": color,
        "detail": detail,
    }


def refresh_cross_asset_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_cross_asset_cache

    try:
        symbols = {
            "qqq": "QQQ",
            "spy": "SPY",
            "iwm": "IWM",
            "smh": "SMH",
            "hyg": "HYG",
            "lqd": "LQD",
            "tlt": "TLT",
            "shy": "SHY",
            "vix": "^VIX",
            "rates": "^TNX",
        }
        close_map = {
            key: fetch_ohlc_history(symbol, "6mo", min_rows=90, attempts=3)["Close"]
            for key, symbol in symbols.items()
        }
        try:
            close_map["dollar"] = fetch_ohlc_history("DX-Y.NYB", "6mo", min_rows=90, attempts=3)["Close"]
            dollar_symbol = "DXY"
        except Exception as e:
            logger.error(f"DXY fetch failed for cross-asset confirmation, falling back to UUP: {e}")
            close_map["dollar"] = fetch_ohlc_history("UUP", "6mo", min_rows=90, attempts=3)["Close"]
            dollar_symbol = "UUP"

        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 90:
            raise ValueError("Insufficient aligned history for cross-asset confirmation")

        credit_ratio = prices["hyg"] / prices["lqd"]
        duration_ratio = prices["tlt"] / prices["shy"]
        daily_returns = prices.pct_change() * 100

        qqq_return_5d = pct_change(prices["qqq"].iloc[-1], prices["qqq"].iloc[-6]) if len(prices) >= 6 else 0
        qqq_return_20d = pct_change(prices["qqq"].iloc[-1], prices["qqq"].iloc[-21]) if len(prices) >= 21 else qqq_return_5d
        spy_return_20d = pct_change(prices["spy"].iloc[-1], prices["spy"].iloc[-21]) if len(prices) >= 21 else 0
        iwm_return_20d = pct_change(prices["iwm"].iloc[-1], prices["iwm"].iloc[-21]) if len(prices) >= 21 else 0
        smh_return_20d = pct_change(prices["smh"].iloc[-1], prices["smh"].iloc[-21]) if len(prices) >= 21 else 0
        qqq_spy_20d = qqq_return_20d - spy_return_20d
        qqq_iwm_20d = qqq_return_20d - iwm_return_20d
        smh_spy_20d = smh_return_20d - spy_return_20d
        credit_ratio_20d = pct_change(credit_ratio.iloc[-1], credit_ratio.iloc[-21]) if len(credit_ratio) >= 21 else 0
        duration_ratio_20d = pct_change(duration_ratio.iloc[-1], duration_ratio.iloc[-21]) if len(duration_ratio) >= 21 else 0
        dollar_return_20d = pct_change(prices["dollar"].iloc[-1], prices["dollar"].iloc[-21]) if len(prices) >= 21 else 0
        vix_change_20d = safe_float(prices["vix"].iloc[-1] - prices["vix"].iloc[-21], 0) if len(prices) >= 21 else 0
        rates_change_20d_bps = safe_float((prices["rates"].iloc[-1] - prices["rates"].iloc[-21]) * 100, 0) if len(prices) >= 21 else 0

        qqq_returns_60 = daily_returns["qqq"].tail(60)
        def corr_to_qqq(key):
            aligned = pd.concat([qqq_returns_60, daily_returns[key].tail(60)], axis=1, join="inner").dropna()
            return safe_float(aligned.iloc[:, 0].corr(aligned.iloc[:, 1]), 0) if len(aligned) >= 30 else 0

        broad_score = clamp(52 + qqq_spy_20d * 7 + max(0, spy_return_20d) * 1.6)
        small_cap_score = clamp(50 + min(max(iwm_return_20d, -6), 8) * 3.2 - max(0, qqq_iwm_20d - 6) * 4)
        semis_score = clamp(52 + smh_spy_20d * 7 + max(0, smh_return_20d) * 1.1)
        credit_score = clamp(50 + credit_ratio_20d * 15)
        duration_score = clamp(52 + duration_ratio_20d * 11 - max(0, rates_change_20d_bps) * 0.34)
        dollar_score = clamp(54 - dollar_return_20d * 8)
        volatility_score = clamp(54 - vix_change_20d * 6)

        items = [
            build_cross_asset_item(
                "broad_market",
                "大盘确认",
                qqq_spy_20d,
                f"{qqq_spy_20d:+.2f}pt",
                broad_score,
                f"QQQ 20 日 {qqq_return_20d:+.2f}%，SPY {spy_return_20d:+.2f}%；科技超额需要大盘不明显掉队。",
            ),
            build_cross_asset_item(
                "small_caps",
                "小盘风险偏好",
                iwm_return_20d,
                f"{iwm_return_20d:+.2f}%",
                small_cap_score,
                f"IWM 20 日 {iwm_return_20d:+.2f}%，QQQ/IWM 主动差 {qqq_iwm_20d:+.2f}pt，用于识别是否只有巨头上涨。",
            ),
            build_cross_asset_item(
                "semis",
                "半导体确认",
                smh_spy_20d,
                f"{smh_spy_20d:+.2f}pt",
                semis_score,
                f"SMH 20 日 {smh_return_20d:+.2f}%，相对 SPY {smh_spy_20d:+.2f}pt，衡量 NDX 核心增长链条是否同步。",
            ),
            build_cross_asset_item(
                "credit",
                "信用风险偏好",
                credit_ratio_20d,
                f"{credit_ratio_20d:+.2f}%",
                credit_score,
                f"HYG/LQD 20 日 {credit_ratio_20d:+.2f}%，信用改善通常提高权益上涨质量。",
            ),
            build_cross_asset_item(
                "duration",
                "久期与利率",
                duration_ratio_20d,
                f"{duration_ratio_20d:+.2f}%",
                duration_score,
                f"TLT/SHY 20 日 {duration_ratio_20d:+.2f}%，10Y 同期 {rates_change_20d_bps:+.1f}bps，久期修复更利于成长估值。",
            ),
            build_cross_asset_item(
                "dollar",
                "美元条件",
                dollar_return_20d,
                f"{dollar_return_20d:+.2f}%",
                dollar_score,
                f"{dollar_symbol} 20 日 {dollar_return_20d:+.2f}%，美元走强会削弱全球风险资产确认度。",
            ),
            build_cross_asset_item(
                "volatility",
                "波动确认",
                vix_change_20d,
                f"{vix_change_20d:+.1f}pt",
                volatility_score,
                f"VIX 20 日 {vix_change_20d:+.1f} 点；波动率下行代表上涨更容易被期权和风险预算吸收。",
                "20D 点差",
            ),
        ]

        confirmation_count = len([item for item in items if item["score"] >= 55])
        divergence_count = len([item for item in items if item["score"] < 42])
        confirmation_score = round(clamp(
            broad_score * 0.17
            + small_cap_score * 0.12
            + semis_score * 0.18
            + credit_score * 0.17
            + duration_score * 0.13
            + dollar_score * 0.11
            + volatility_score * 0.12
            - max(0, qqq_return_20d) * max(0, divergence_count - 1) * 0.75
        ), 1)
        regime, color = cross_asset_regime(confirmation_score, confirmation_count, divergence_count)

        leaders = sorted(items, key=lambda item: item["score"], reverse=True)[:3]
        laggards = sorted(items, key=lambda item: item["score"])[:3]
        main_support = leaders[0]
        main_lag = laggards[0]
        if regime == "广泛确认":
            summary = f"NDX/QQQ 上涨获得跨资产广泛确认，{confirmation_count}/{len(items)} 个维度为确认状态，主要支撑来自 {main_support['label']}。"
        elif regime == "选择性确认":
            summary = f"NDX/QQQ 跨资产确认度可用但不全面，{main_support['label']} 提供支撑，{main_lag['label']} 仍是主要短板。"
        elif regime == "分歧观察":
            summary = f"跨资产信号出现分歧，{divergence_count} 个维度低于确认线；若 QQQ 继续上行，需要等待信用、久期或广度式风险偏好补确认。"
        else:
            summary = f"QQQ 当前走势与跨资产环境失配，主要拖累来自 {main_lag['label']}，新增风险预算应降低速度。"

        controls = [
            f"确认线：至少 5 个维度维持确认，且信用和波动两项不能同时低于 45。",
            f"失效线：QQQ 继续上涨但分歧维度升至 3 个以上，应把上涨视为集中权重行情。",
            f"宏观约束：若 10Y 上行超过 20bps 且 {dollar_symbol} 同步走强，降低估值扩张假设权重。",
            "跨资产确认是风险质量过滤器，不等同于单一买卖信号。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": prices.index[-1].date().isoformat(),
            "regime": regime,
            "regime_color": color,
            "confirmation_score": confirmation_score,
            "summary": summary,
            "qqq_return_5d": round(qqq_return_5d, 2),
            "qqq_return_20d": round(qqq_return_20d, 2),
            "spy_return_20d": round(spy_return_20d, 2),
            "iwm_return_20d": round(iwm_return_20d, 2),
            "smh_return_20d": round(smh_return_20d, 2),
            "qqq_spy_20d": round(qqq_spy_20d, 2),
            "qqq_iwm_20d": round(qqq_iwm_20d, 2),
            "smh_spy_20d": round(smh_spy_20d, 2),
            "credit_ratio_20d": round(credit_ratio_20d, 2),
            "duration_ratio_20d": round(duration_ratio_20d, 2),
            "dollar_return_20d": round(dollar_return_20d, 2),
            "vix_change_20d": round(vix_change_20d, 2),
            "rates_change_20d_bps": round(rates_change_20d_bps, 1),
            "dollar_symbol": dollar_symbol,
            "confirmation_count": confirmation_count,
            "divergence_count": divergence_count,
            "items": items,
            "leaders": leaders,
            "laggards": laggards,
            "correlations": [
                {"label": "SPY", "value": round(corr_to_qqq("spy"), 2)},
                {"label": "IWM", "value": round(corr_to_qqq("iwm"), 2)},
                {"label": "SMH", "value": round(corr_to_qqq("smh"), 2)},
                {"label": "HYG", "value": round(corr_to_qqq("hyg"), 2)},
                {"label": "TLT", "value": round(corr_to_qqq("tlt"), 2)},
            ],
            "controls": controls,
            "methodology": "使用 QQQ、SPY、IWM、SMH、HYG/LQD、TLT/SHY、美元、VIX 和 10Y 利率最近 6 个月日线，评估 NDX 上涨是否得到风格、信用、久期、美元和波动率共同确认。分数越高代表上涨质量越好，不构成买卖建议。",
        }
        risk_cross_asset_cache["data"] = data
        risk_cross_asset_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX cross-asset confirmation updated: {regime}, score {confirmation_score:.1f}")
    except Exception as e:
        logger.error(f"NDX cross-asset confirmation refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_level(label, value, level_type, latest):
    distance = pct_change(value, latest)
    return {
        "label": label,
        "value": round(value, 2),
        "type": level_type,
        "distance": round(distance, 2),
        "distance_label": f"{distance:+.2f}%",
    }


def refresh_technical_levels():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_levels_cache

    try:
        history = fetch_ohlc_history("^NDX", "1y", min_rows=80, attempts=3)
        closes = history["Close"]
        highs = history["High"] if "High" in history.columns else closes
        lows = history["Low"] if "Low" in history.columns else closes

        if len(closes) < 80:
            raise ValueError("Insufficient NDX history for technical levels")

        latest = float(closes.iloc[-1])
        previous_close = float(closes.iloc[-2]) if len(closes) >= 2 else latest
        high_20 = float(highs.tail(20).max())
        low_20 = float(lows.tail(20).min())
        high_60 = float(highs.tail(60).max())
        low_60 = float(lows.tail(60).min())
        high_52w = float(highs.max())
        low_52w = float(lows.min())

        ma_windows = [20, 50, 100, 200]
        moving_averages = []
        for window in ma_windows:
            if len(closes) >= window:
                value = float(closes.rolling(window).mean().iloc[-1])
                moving_averages.append({
                    "label": f"{window}日均线",
                    "window": window,
                    "value": round(value, 2),
                    "distance": round(pct_change(latest, value), 2),
                    "distance_label": f"{pct_change(latest, value):+.2f}%",
                    "state": "上方" if latest >= value else "下方",
                })

        true_ranges = pd.concat([
            highs - lows,
            (highs - closes.shift()).abs(),
            (lows - closes.shift()).abs(),
        ], axis=1).max(axis=1)
        atr14 = float(true_ranges.tail(14).mean())
        atr_pct = pct_change(latest + atr14, latest)

        candidates = [
            build_level("20日低点", low_20, "support", latest),
            build_level("60日低点", low_60, "support", latest),
            build_level("52周低点", low_52w, "support", latest),
            build_level("20日高点", high_20, "resistance", latest),
            build_level("60日高点", high_60, "resistance", latest),
            build_level("52周高点", high_52w, "resistance", latest),
        ]
        for average in moving_averages:
            candidates.append(build_level(average["label"], average["value"], "support" if average["value"] <= latest else "resistance", latest))

        support_levels = sorted(
            [level for level in candidates if level["value"] <= latest],
            key=lambda level: abs(level["distance"]),
        )[:4]
        resistance_levels = sorted(
            [level for level in candidates if level["value"] >= latest],
            key=lambda level: abs(level["distance"]),
        )[:4]

        ma20 = next((item for item in moving_averages if item["window"] == 20), None)
        ma50 = next((item for item in moving_averages if item["window"] == 50), None)
        ma200 = next((item for item in moving_averages if item["window"] == 200), None)
        ma20_value = safe_float(ma20.get("value") if ma20 else None, latest)
        ma50_value = safe_float(ma50.get("value") if ma50 else None, latest)
        ma200_value = safe_float(ma200.get("value") if ma200 else None, latest)

        channel_position = pct_change(latest, low_60) / max(pct_change(high_60, low_60), 0.01) * 100
        channel_position = clamp(channel_position)
        extension = pct_change(latest, ma20_value)

        if latest > high_20 and extension > atr_pct:
            zone_score = 82
            summary = "NDX 处在短线突破延伸区，新增风险预算需要等待回踩或波动降温确认。"
        elif latest >= ma20_value and latest >= ma50_value:
            zone_score = 64
            summary = "NDX 位于主要短中期均线上方，趋势仍有支撑，但需要观察是否过度远离 20 日均线。"
        elif latest >= ma50_value:
            zone_score = 48
            summary = "NDX 处在均衡震荡区，50 日均线是短线风险预算的核心观察位。"
        elif latest >= ma200_value:
            zone_score = 28
            summary = "NDX 已跌破短中期均线但仍在 200 日线上方，适合降低追涨并观察支撑修复。"
        else:
            zone_score = 12
            summary = "NDX 跌破 200 日均线，技术结构进入破位风险区，需要优先控制回撤。"

        triggers = [
            f"向上突破 {high_20:,.0f} 且收盘站稳，可视为短线动能延续确认。",
            f"跌破 {ma50_value:,.0f} 的 50 日均线，风险预算应向下沿收缩。",
            f"单日波动超过 1 ATR（约 {atr14:,.0f} 点 / {atr_pct:.2f}%）时，避免用盘中情绪追单。",
        ]
        if ma200:
            triggers.append(f"若跌破 {ma200_value:,.0f} 的 200 日均线，应把趋势破位情景置为主场景。")

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": history.index[-1].date().isoformat(),
            "index": round(latest, 2),
            "daily_change": round(pct_change(latest, previous_close), 2),
            "zone_score": round(zone_score, 1),
            "zone_label": technical_zone_label(zone_score),
            "zone_color": technical_zone_color(zone_score),
            "summary": summary,
            "atr14": round(atr14, 2),
            "atr_pct": round(atr_pct, 2),
            "channel_position": round(channel_position, 1),
            "channel_label": f"{channel_position:.0f}%",
            "support_levels": support_levels,
            "resistance_levels": resistance_levels,
            "moving_averages": moving_averages,
            "triggers": triggers,
            "methodology": "基于 NDX 最近 1 年日线计算均线、20/60 日通道、52 周高低点和 14 日 ATR；技术位用于风险触发监控，不构成交易指令。",
        }
        risk_levels_cache["data"] = data
        risk_levels_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX technical levels updated: {technical_zone_label(zone_score)}")
    except Exception as e:
        logger.error(f"NDX technical levels refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_tail_risk_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_tail_cache

    try:
        history = fetch_ohlc_history("^NDX", "2y", min_rows=250, attempts=3)
        closes = history["Close"]
        returns = closes.pct_change().dropna() * 100
        if len(returns) < 180:
            raise ValueError("Insufficient NDX return history for tail risk")

        latest = float(closes.iloc[-1])
        previous_close = float(closes.iloc[-2]) if len(closes) >= 2 else latest
        rolling_peak = closes.cummax()
        drawdowns = (closes / rolling_peak - 1) * 100
        current_drawdown = float(drawdowns.iloc[-1])
        max_drawdown_1y = float(drawdowns.tail(252).min())
        max_drawdown_2y = float(drawdowns.min())

        var95 = float(returns.quantile(0.05))
        var99 = float(returns.quantile(0.01))
        expected_shortfall_95 = float(returns[returns <= var95].mean())
        vol20 = float(returns.tail(20).std() * (252 ** 0.5))
        vol60 = float(returns.tail(60).std() * (252 ** 0.5))
        downside_vol60 = float(returns.tail(60)[returns.tail(60) < 0].std() * (252 ** 0.5))
        positive_ratio = float((returns.tail(60) > 0).mean() * 100)

        current_streak = 0
        streak_direction = "flat"
        for value in reversed(returns.tail(20).tolist()):
            if value < 0:
                if streak_direction in ("flat", "down"):
                    streak_direction = "down"
                    current_streak += 1
                else:
                    break
            elif value > 0:
                if streak_direction in ("flat", "up"):
                    streak_direction = "up"
                    current_streak += 1
                else:
                    break
            else:
                break

        worst_days = []
        for date, value in returns.sort_values().head(5).items():
            worst_days.append({
                "date": date.date().isoformat(),
                "return": round(float(value), 2),
            })

        monthly_returns = (closes.resample("ME").last().pct_change().dropna() * 100).tail(6)
        recent_months = [
            {
                "month": date.strftime("%Y-%m"),
                "return": round(float(value), 2),
            }
            for date, value in monthly_returns.items()
        ]

        tail_score = clamp(
            abs(expected_shortfall_95) * 7
            + abs(current_drawdown) * 2.2
            + max(0, vol60 - 18) * 1.3
            + max(0, 45 - positive_ratio) * 0.8
        )

        if tail_score >= 65:
            summary = "NDX 尾部风险偏高，仓位管理应优先考虑单日极端波动和连续回撤承受力。"
        elif tail_score >= 35:
            summary = "NDX 处在常态波动区，仍需用 VaR 和预期尾部损失约束短线加仓节奏。"
        else:
            summary = "NDX 尾部风险温和，历史损失分布暂未显示明显压力扩散。"

        if streak_direction == "down":
            streak_label = f"连续下跌 {current_streak} 日"
        elif streak_direction == "up":
            streak_label = f"连续上涨 {current_streak} 日"
        else:
            streak_label = "无连续方向"

        controls = [
            f"用 95% 历史 VaR 估计，单日常规尾部损失约 {var95:.2f}%。",
            f"跌破 95% VaR 后的平均损失约 {expected_shortfall_95:.2f}%，这是止损和保证金缓冲的核心参考。",
            f"过去 60 日上涨占比 {positive_ratio:.0f}%，若继续下降，说明回撤质量正在恶化。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": history.index[-1].date().isoformat(),
            "index": round(latest, 2),
            "daily_change": round(pct_change(latest, previous_close), 2),
            "tail_score": round(tail_score, 1),
            "tail_label": tail_risk_label(tail_score),
            "tail_color": tail_risk_color(tail_score),
            "summary": summary,
            "current_drawdown": round(current_drawdown, 2),
            "max_drawdown_1y": round(max_drawdown_1y, 2),
            "max_drawdown_2y": round(max_drawdown_2y, 2),
            "var95": round(var95, 2),
            "var99": round(var99, 2),
            "expected_shortfall_95": round(expected_shortfall_95, 2),
            "vol20": round(vol20, 1),
            "vol60": round(vol60, 1),
            "downside_vol60": round(downside_vol60, 1) if downside_vol60 == downside_vol60 else 0,
            "positive_ratio": round(positive_ratio, 1),
            "streak_label": streak_label,
            "worst_days": worst_days,
            "recent_months": recent_months,
            "controls": controls,
            "methodology": "使用 NDX 最近 2 年日收益计算历史 VaR、预期尾部损失、最大回撤和年化波动率；该模块衡量历史损失分布，不代表未来保证损失上限。",
        }
        risk_tail_cache["data"] = data
        risk_tail_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX tail risk updated: {tail_risk_label(tail_score)}")
    except Exception as e:
        logger.error(f"NDX tail risk refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_relative_benchmark(key, label, symbol, ndx_closes, ndx_returns):
    benchmark = fetch_ohlc_history(symbol, "6mo", min_rows=80, attempts=3)["Close"]
    aligned_prices = pd.concat(
        {"ndx": ndx_closes, "benchmark": benchmark},
        axis=1,
        join="inner",
    ).dropna()
    if len(aligned_prices) < 80:
        raise ValueError(f"Insufficient aligned relative history for {symbol}")

    aligned_returns = pd.concat(
        {"ndx": ndx_returns, "benchmark": benchmark.pct_change() * 100},
        axis=1,
        join="inner",
    ).dropna().tail(60)
    if len(aligned_returns) < 45:
        raise ValueError(f"Insufficient aligned relative returns for {symbol}")

    ndx_return_20 = pct_change(aligned_prices["ndx"].iloc[-1], aligned_prices["ndx"].iloc[-21])
    benchmark_return_20 = pct_change(aligned_prices["benchmark"].iloc[-1], aligned_prices["benchmark"].iloc[-21])
    ndx_return_60 = pct_change(aligned_prices["ndx"].iloc[-1], aligned_prices["ndx"].iloc[-61])
    benchmark_return_60 = pct_change(aligned_prices["benchmark"].iloc[-1], aligned_prices["benchmark"].iloc[-61])
    excess_20 = ndx_return_20 - benchmark_return_20
    excess_60 = ndx_return_60 - benchmark_return_60

    ratio = aligned_prices["ndx"] / aligned_prices["benchmark"]
    ratio_change_20 = pct_change(ratio.iloc[-1], ratio.iloc[-21])
    ratio_change_60 = pct_change(ratio.iloc[-1], ratio.iloc[-61])
    correlation = safe_float(aligned_returns["ndx"].corr(aligned_returns["benchmark"]), 0)
    benchmark_var = safe_float(aligned_returns["benchmark"].var(), 0)
    beta = safe_float(aligned_returns["ndx"].cov(aligned_returns["benchmark"]) / benchmark_var, 0) if benchmark_var else 0
    hit_ratio = safe_float((aligned_returns["ndx"] > aligned_returns["benchmark"]).mean() * 100, 0)

    if excess_20 > 1 and excess_60 > 2:
        direction = "领先"
        color = "green"
    elif excess_20 > 0:
        direction = "短线占优"
        color = "blue"
    elif excess_20 < -1 and excess_60 < -2:
        direction = "落后"
        color = "red"
    else:
        direction = "轮动"
        color = "amber"

    return {
        "key": key,
        "label": label,
        "symbol": symbol,
        "direction": direction,
        "color": color,
        "ndx_return_20d": round(ndx_return_20, 2),
        "benchmark_return_20d": round(benchmark_return_20, 2),
        "excess_20d": round(excess_20, 2),
        "excess_60d": round(excess_60, 2),
        "ratio_change_20d": round(ratio_change_20, 2),
        "ratio_change_60d": round(ratio_change_60, 2),
        "correlation": round(correlation, 2),
        "beta": round(beta, 2),
        "hit_ratio": round(hit_ratio, 1),
        "sample_days": len(aligned_returns),
    }


def refresh_relative_strength_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_relative_cache

    try:
        ndx_history = fetch_ohlc_history("^NDX", "6mo", min_rows=80, attempts=3)
        ndx_closes = ndx_history["Close"]
        ndx_returns = ndx_closes.pct_change() * 100

        benchmarks = [
            build_relative_benchmark("spx", "S&P 500", "^GSPC", ndx_closes, ndx_returns),
            build_relative_benchmark("sox", "半导体指数", "^SOX", ndx_closes, ndx_returns),
            build_relative_benchmark("rut", "罗素 2000", "^RUT", ndx_closes, ndx_returns),
        ]

        spx = next(item for item in benchmarks if item["key"] == "spx")
        sox = next(item for item in benchmarks if item["key"] == "sox")
        rut = next(item for item in benchmarks if item["key"] == "rut")
        leadership_score = clamp(
            50
            + spx["excess_20d"] * 4
            + spx["excess_60d"] * 1.5
            + sox["excess_20d"] * 1.2
            - max(0, spx["beta"] - 1.3) * 12
            + (spx["hit_ratio"] - 50) * 0.4
        )

        if leadership_score >= 65:
            summary = "NDX 相对大盘保持领先，成长股风险偏好仍在提供支撑。"
        elif leadership_score >= 40:
            summary = "NDX 相对强弱处于轮动区，需要观察相对 SPX 的超额收益能否延续。"
        else:
            summary = "NDX 相对大盘走弱，组合风险更可能来自成长风格退潮而非单纯指数波动。"

        beta_note = (
            f"NDX 对 SPX 的 60 日 beta 为 {spx['beta']:.2f}，"
            f"与半导体指数的 20 日相对收益为 {sox['excess_20d']:+.2f}%，"
            f"相对小盘股为 {rut['excess_20d']:+.2f}%。"
        )

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": ndx_history.index[-1].date().isoformat(),
            "index": round(ndx_closes.iloc[-1], 2),
            "leadership_score": round(leadership_score, 1),
            "leadership_label": relative_strength_label(leadership_score),
            "leadership_color": relative_strength_color(leadership_score),
            "summary": summary,
            "beta_note": beta_note,
            "primary_beta": spx["beta"],
            "primary_correlation": spx["correlation"],
            "primary_excess_20d": spx["excess_20d"],
            "primary_excess_60d": spx["excess_60d"],
            "benchmarks": benchmarks,
            "methodology": "使用最近 6 个月日线计算 NDX 相对 SPX、SOX、RUT 的超额收益、价格比率变化、60 日相关性和 beta，用于识别成长股领导力与系统性风险暴露。",
        }
        risk_relative_cache["data"] = data
        risk_relative_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX relative strength updated: {relative_strength_label(leadership_score)}")
    except Exception as e:
        logger.error(f"NDX relative strength refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_theme_rotation_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_theme_rotation_cache

    try:
        themes = [
            {"key": "semis", "label": "半导体", "symbol": "SMH", "description": "芯片、算力与半导体设备"},
            {"key": "software", "label": "软件云", "symbol": "IGV", "description": "软件、云服务与应用平台"},
            {"key": "communication", "label": "通信平台", "symbol": "XLC", "description": "通信服务、广告与内容平台"},
            {"key": "consumer", "label": "可选消费", "symbol": "XLY", "description": "电商、汽车与消费平台"},
            {"key": "broad_tech", "label": "广义科技", "symbol": "IYW", "description": "美国科技板块宽基代理"},
            {"key": "cybersecurity", "label": "网络安全", "symbol": "CIBR", "description": "安全软件与基础设施"},
        ]
        qqq_history = fetch_ohlc_history("QQQ", "6mo", min_rows=80, attempts=3)
        qqq_close = qqq_history["Close"].rename("QQQ")
        close_map = {"QQQ": qqq_close}
        for theme in themes:
            close_map[theme["symbol"]] = fetch_ohlc_history(theme["symbol"], "6mo", min_rows=80, attempts=3)["Close"]

        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 80:
            raise ValueError("Insufficient aligned theme rotation history")

        def native_round(value, digits=2):
            return round(float(value), digits)

        returns = prices.pct_change().dropna() * 100
        qqq_return_5d = pct_change(prices["QQQ"].iloc[-1], prices["QQQ"].iloc[-6]) if len(prices) >= 6 else 0
        qqq_return_20d = pct_change(prices["QQQ"].iloc[-1], prices["QQQ"].iloc[-21]) if len(prices) >= 21 else qqq_return_5d
        qqq_return_60d = pct_change(prices["QQQ"].iloc[-1], prices["QQQ"].iloc[-61]) if len(prices) >= 61 else qqq_return_20d

        theme_rows = []
        qqq_returns_60 = returns["QQQ"].tail(60)
        qqq_var = safe_float(qqq_returns_60.var(), 0)

        for theme in themes:
            symbol = theme["symbol"]
            return_5d = pct_change(prices[symbol].iloc[-1], prices[symbol].iloc[-6]) if len(prices) >= 6 else 0
            return_20d = pct_change(prices[symbol].iloc[-1], prices[symbol].iloc[-21]) if len(prices) >= 21 else return_5d
            return_60d = pct_change(prices[symbol].iloc[-1], prices[symbol].iloc[-61]) if len(prices) >= 61 else return_20d
            excess_20d = return_20d - qqq_return_20d
            excess_60d = return_60d - qqq_return_60d
            theme_returns_60 = returns[symbol].tail(60)
            correlation = safe_float(theme_returns_60.corr(qqq_returns_60), 0)
            beta = safe_float(theme_returns_60.cov(qqq_returns_60) / qqq_var, 0) if qqq_var else 0
            hit_ratio = safe_float((returns[symbol].tail(20) > returns["QQQ"].tail(20)).mean() * 100, 0)
            volatility_20d = safe_float(returns[symbol].tail(20).std() * (252 ** 0.5), 0)

            if excess_20d >= 3 and excess_60d >= 3:
                direction = "持续领先"
                color = "green"
            elif excess_20d >= 1:
                direction = "短线领先"
                color = "blue"
            elif excess_20d <= -3 and excess_60d <= -3:
                direction = "持续落后"
                color = "red"
            elif excess_20d <= -1:
                direction = "短线落后"
                color = "amber"
            else:
                direction = "跟随指数"
                color = "blue"

            theme_rows.append({
                "key": theme["key"],
                "label": theme["label"],
                "symbol": symbol,
                "description": theme["description"],
                "price": native_round(prices[symbol].iloc[-1], 2),
                "return_5d": native_round(return_5d, 2),
                "return_20d": native_round(return_20d, 2),
                "return_60d": native_round(return_60d, 2),
                "excess_20d": native_round(excess_20d, 2),
                "excess_60d": native_round(excess_60d, 2),
                "correlation_to_qqq": native_round(correlation, 2),
                "beta_to_qqq": native_round(beta, 2),
                "hit_ratio_20d": native_round(hit_ratio, 1),
                "volatility_20d": native_round(volatility_20d, 1),
                "direction": direction,
                "color": color,
            })

        sorted_by_excess = sorted(theme_rows, key=lambda row: row["excess_20d"], reverse=True)
        leaders = sorted_by_excess[:3]
        laggards = sorted_by_excess[-3:]
        participation_count = len([row for row in theme_rows if row["excess_20d"] > 0])
        strong_participation_count = len([row for row in theme_rows if row["excess_20d"] > 1.5])
        top_theme = leaders[0]
        weakest_theme = laggards[0]
        dispersion_20d = safe_float(pd.Series([row["return_20d"] for row in theme_rows]).std(), 0)
        avg_beta = safe_float(sum(row["beta_to_qqq"] for row in theme_rows) / len(theme_rows), 0)
        leadership_score = round(clamp(
            50
            + participation_count * 6
            + strong_participation_count * 4
            + qqq_return_20d * 1.2
            - max(0, dispersion_20d - 4) * 3
            - max(0, top_theme["excess_20d"] - 6) * 2
        ), 1)
        regime, color = theme_rotation_regime(participation_count, top_theme["excess_20d"], qqq_return_20d, dispersion_20d)

        if regime == "成长扩散":
            summary = f"NDX 相关主题正在扩散，{participation_count}/{len(theme_rows)} 个主题跑赢 QQQ，领涨来自 {top_theme['label']}。"
        elif regime == "窄幅主题":
            summary = f"主题轮动偏窄，{top_theme['label']} 明显跑赢 QQQ，但多数主题未同步扩散。"
        elif regime == "主题退潮":
            summary = "NDX 相关主题多数跑输 QQQ，成长风格内部风险偏好正在退潮。"
        elif regime == "高分化轮动":
            summary = f"主题间 20 日收益分化较高，领涨 {top_theme['label']}，拖累 {weakest_theme['label']}，指数方向更依赖少数主题。"
        else:
            summary = "NDX 相关主题轮动处在均衡区，尚未形成单一主题极端主导。"

        controls = [
            f"若跑赢 QQQ 的主题少于 2 个，同时指数继续上涨，需要按窄幅行情降低突破确认度。",
            f"当前领涨主题为 {top_theme['label']}（20日超额 {top_theme['excess_20d']:+.2f}%），若其转弱，NDX 动能可能快速降温。",
            f"主题收益离散度 {dispersion_20d:.2f} 个百分点，越高越需要关注主题拥挤和轮动踩踏。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": prices.index[-1].date().isoformat(),
            "benchmark_symbol": "QQQ",
            "benchmark_return_5d": native_round(qqq_return_5d, 2),
            "benchmark_return_20d": native_round(qqq_return_20d, 2),
            "benchmark_return_60d": native_round(qqq_return_60d, 2),
            "regime": regime,
            "regime_color": color,
            "leadership_score": leadership_score,
            "summary": summary,
            "participation_count": participation_count,
            "strong_participation_count": strong_participation_count,
            "theme_count": len(theme_rows),
            "dispersion_20d": native_round(dispersion_20d, 2),
            "average_beta": native_round(avg_beta, 2),
            "top_theme": top_theme["label"],
            "top_theme_symbol": top_theme["symbol"],
            "top_theme_excess_20d": native_round(top_theme["excess_20d"], 2),
            "weakest_theme": weakest_theme["label"],
            "weakest_theme_symbol": weakest_theme["symbol"],
            "weakest_theme_excess_20d": native_round(weakest_theme["excess_20d"], 2),
            "leaders": leaders,
            "laggards": list(reversed(laggards)),
            "themes": sorted_by_excess,
            "controls": controls,
            "methodology": "使用 QQQ 作为 NDX 可交易基准，跟踪 SMH、IGV、XLC、XLY、IYW、CIBR 等主题 ETF 的 5/20/60 日收益、相对 QQQ 超额收益、20 日跑赢率、60 日相关性和 beta，用于判断 NDX 上涨是否由多个成长主题扩散支撑。不等同于官方 Nasdaq 100 行业权重。",
        }
        risk_theme_rotation_cache["data"] = data
        risk_theme_rotation_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX theme rotation updated: {regime}, score {leadership_score:.1f}")
    except Exception as e:
        logger.error(f"NDX theme rotation refresh failed: {e}")
        logger.error(traceback.format_exc())


def average_pairwise_correlation(frame):
    corr = frame.corr()
    values = []
    columns = list(corr.columns)
    for i, left in enumerate(columns):
        for right in columns[i + 1:]:
            value = corr.loc[left, right]
            if value == value:
                values.append(float(value))
    return sum(values) / len(values) if values else 0


def refresh_dispersion_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_dispersion_cache

    try:
        names = {
            "AAPL": "Apple",
            "MSFT": "Microsoft",
            "GOOGL": "Alphabet",
            "AMZN": "Amazon",
            "NVDA": "NVIDIA",
            "TSLA": "Tesla",
            "META": "Meta",
        }
        symbols = list(names.keys())
        close_map = {}
        for symbol in symbols:
            close_map[symbol] = fetch_ohlc_history(symbol, "6mo", min_rows=80, attempts=3)["Close"]

        ndx_closes = fetch_ohlc_history("^NDX", "6mo", min_rows=80, attempts=3)["Close"]
        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 80:
            raise ValueError("Insufficient aligned MAG7 history for dispersion")

        returns = prices.pct_change().dropna() * 100
        ndx_returns = ndx_closes.pct_change().dropna() * 100
        aligned = returns.join(ndx_returns.rename("NDX"), how="inner").dropna()
        if len(aligned) < 60:
            raise ValueError("Insufficient aligned MAG7 and NDX return history")

        mag7_returns = aligned[symbols]
        ndx_aligned = aligned["NDX"]
        corr20 = average_pairwise_correlation(mag7_returns.tail(20))
        corr60 = average_pairwise_correlation(mag7_returns.tail(60))
        dispersion20 = float(mag7_returns.tail(20).std(axis=1).mean())
        dispersion60 = float(mag7_returns.tail(60).std(axis=1).mean())
        regime, color = dispersion_regime(corr20, dispersion20)

        ndx_20 = pct_change(ndx_closes.iloc[-1], ndx_closes.iloc[-21])
        securities = []
        for symbol in symbols:
            stock_returns = aligned[symbol].tail(60)
            ndx_tail = ndx_aligned.tail(60)
            ndx_var = safe_float(ndx_tail.var(), 0)
            beta = safe_float(stock_returns.cov(ndx_tail) / ndx_var, 0) if ndx_var else 0
            correlation = safe_float(stock_returns.corr(ndx_tail), 0)
            return20 = pct_change(prices[symbol].iloc[-1], prices[symbol].iloc[-21])
            return60 = pct_change(prices[symbol].iloc[-1], prices[symbol].iloc[-61])
            active20 = return20 - ndx_20
            securities.append({
                "symbol": symbol,
                "name": names[symbol],
                "return_20d": round(float(return20), 2),
                "return_60d": round(float(return60), 2),
                "active_20d": round(float(active20), 2),
                "beta_to_ndx": round(float(beta), 2),
                "correlation_to_ndx": round(float(correlation), 2),
            })

        leaders = sorted(securities, key=lambda item: item["active_20d"], reverse=True)[:3]
        laggards = sorted(securities, key=lambda item: item["active_20d"])[:3]

        if regime == "同步高波动":
            summary = "MAG7 内部相关性和离散度同时偏高，说明权重股同步波动且个股振幅扩大。"
        elif regime == "Beta 主导":
            summary = "MAG7 同涨同跌特征较强，NDX 更容易被系统性 beta 和资金风险偏好驱动。"
        elif regime == "个股分化":
            summary = "MAG7 内部分化明显，指数方向更依赖个股财报、估值和主题轮动。"
        else:
            summary = "MAG7 相关性和离散度处于相对均衡区，权重股结构暂未显示极端拥挤。"

        controls = [
            f"20 日平均成对相关 {corr20:.2f}，若继续升高，单股分散化保护会下降。",
            f"20 日横截面离散度 {dispersion20:.2f} 个百分点，越高越需要关注个股事件风险。",
            f"当前 20 日主动贡献领先者为 {', '.join(item['symbol'] for item in leaders)}；拖累者为 {', '.join(item['symbol'] for item in laggards)}。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": prices.index[-1].date().isoformat(),
            "regime": regime,
            "regime_color": color,
            "summary": summary,
            "avg_corr_20d": round(corr20, 2),
            "avg_corr_60d": round(corr60, 2),
            "dispersion_20d": round(dispersion20, 2),
            "dispersion_60d": round(dispersion60, 2),
            "ndx_return_20d": round(ndx_20, 2),
            "leaders": leaders,
            "laggards": laggards,
            "securities": sorted(securities, key=lambda item: item["active_20d"], reverse=True),
            "controls": controls,
            "methodology": "使用 MAG7 最近 6 个月日收益计算 20/60 日平均成对相关、横截面离散度、相对 NDX beta 与主动收益，用于识别权重股同步风险和个股分化。",
        }
        risk_dispersion_cache["data"] = data
        risk_dispersion_cache["last_update"] = datetime.utcnow()
        logger.info(f"MAG7 dispersion updated: {regime}")
    except Exception as e:
        logger.error(f"MAG7 dispersion refresh failed: {e}")
        logger.error(traceback.format_exc())


def option_mid(row):
    bid = safe_float(row.get("bid"), 0)
    ask = safe_float(row.get("ask"), 0)
    last = safe_float(row.get("lastPrice"), 0)
    if bid > 0 and ask > 0 and ask >= bid:
        return (bid + ask) / 2
    return last if last > 0 else 0


def clean_option_rows(frame):
    rows = []
    for _, row in frame.iterrows():
        strike = safe_float(row.get("strike"), None)
        mid = option_mid(row)
        if strike is None or strike <= 0 or mid <= 0:
            continue
        rows.append({
            "strike": strike,
            "mid": mid,
            "volume": safe_float(row.get("volume"), 0),
            "open_interest": safe_float(row.get("openInterest"), 0),
            "iv": safe_float(row.get("impliedVolatility"), 0),
        })
    return rows


def nearest_option_row(rows, target_strike):
    valid = [row for row in rows if safe_float(row.get("iv"), 0) > 0]
    if not valid:
        return None
    return min(valid, key=lambda row: abs(row["strike"] - target_strike))


def option_gamma_notional(row, spot, dte, sign=1):
    strike = safe_float(row.get("strike"), 0)
    iv = safe_float(row.get("iv"), 0)
    open_interest = safe_float(row.get("open_interest"), 0)
    if strike <= 0 or spot <= 0 or iv <= 0.01 or open_interest <= 0:
        return 0

    sigma = clamp(iv, 0.03, 3.0)
    time_to_expiry = max(dte / 365, 1 / 365)
    sqrt_time = time_to_expiry ** 0.5
    d1 = (np.log(spot / strike) + 0.5 * sigma * sigma * time_to_expiry) / (sigma * sqrt_time)
    pdf = np.exp(-0.5 * d1 * d1) / ((2 * np.pi) ** 0.5)
    gamma = pdf / (spot * sigma * sqrt_time)
    return sign * gamma * open_interest * 100 * spot * spot * 0.01


def refresh_gamma_map_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_gamma_map_cache

    try:
        proxy_symbol = "QQQ"
        ticker = yf.Ticker(proxy_symbol)
        price = safe_float(ticker.fast_info.last_price, 0)
        if price <= 0:
            raise ValueError("QQQ price unavailable for gamma map")

        today = datetime.utcnow().date()
        expirations = [
            exp for exp in ticker.options
            if datetime.strptime(exp, "%Y-%m-%d").date() > today
        ]
        if not expirations:
            raise ValueError("No future QQQ option expirations available for gamma map")

        selected_expiration = expirations[0]
        expiry_date = datetime.strptime(selected_expiration, "%Y-%m-%d").date()
        dte = max((expiry_date - today).days, 1)
        chain = ticker.option_chain(selected_expiration)
        calls = clean_option_rows(chain.calls)
        puts = clean_option_rows(chain.puts)
        if not calls or not puts:
            raise ValueError("QQQ option chain unavailable or illiquid for gamma map")

        call_by_strike = {}
        for row in calls:
            strike = row["strike"]
            if abs(strike / price - 1) > 0.18:
                continue
            call_by_strike[strike] = call_by_strike.get(strike, 0) + option_gamma_notional(row, price, dte, sign=1)

        put_by_strike = {}
        for row in puts:
            strike = row["strike"]
            if abs(strike / price - 1) > 0.18:
                continue
            put_by_strike[strike] = put_by_strike.get(strike, 0) + option_gamma_notional(row, price, dte, sign=-1)

        strikes = sorted(set(call_by_strike.keys()) | set(put_by_strike.keys()))
        if not strikes:
            raise ValueError("No strikes inside gamma map window")

        rows = []
        for strike in strikes:
            call_gamma = safe_float(call_by_strike.get(strike), 0)
            put_gamma = safe_float(put_by_strike.get(strike), 0)
            net_gamma = call_gamma + put_gamma
            total_abs = abs(call_gamma) + abs(put_gamma)
            distance_pct = pct_change(strike, price)
            rows.append({
                "strike": round(strike, 2),
                "call_gamma": round(call_gamma / 1_000_000, 2),
                "put_gamma": round(put_gamma / 1_000_000, 2),
                "net_gamma": round(net_gamma / 1_000_000, 2),
                "total_abs_gamma": round(total_abs / 1_000_000, 2),
                "distance_pct": round(distance_pct, 2),
                "color": "green" if net_gamma > 0 else "red" if net_gamma < 0 else "blue",
            })

        call_gamma_total = sum(max(0, row["call_gamma"]) for row in rows)
        put_gamma_total = abs(sum(min(0, row["put_gamma"]) for row in rows))
        net_gamma_total = call_gamma_total - put_gamma_total
        total_gamma = call_gamma_total + put_gamma_total
        net_gamma_ratio = net_gamma_total / total_gamma if total_gamma else 0

        gamma_wall = max(rows, key=lambda row: row["call_gamma"])
        put_wall = min(rows, key=lambda row: row["put_gamma"])
        max_abs_wall = max(rows, key=lambda row: row["total_abs_gamma"])
        nearest_wall = min(
            sorted(rows, key=lambda row: row["total_abs_gamma"], reverse=True)[:10],
            key=lambda row: abs(row["distance_pct"]),
        )
        positive_walls = sorted([row for row in rows if row["net_gamma"] > 0], key=lambda row: row["net_gamma"], reverse=True)[:4]
        negative_walls = sorted([row for row in rows if row["net_gamma"] < 0], key=lambda row: row["net_gamma"])[:4]
        focus_rows = sorted(rows, key=lambda row: row["total_abs_gamma"], reverse=True)[:10]
        focus_rows = sorted(focus_rows, key=lambda row: row["strike"])

        flip_candidates = []
        cumulative = 0
        for row in sorted(rows, key=lambda item: item["strike"]):
            cumulative += row["net_gamma"]
            flip_candidates.append((abs(cumulative), row["strike"], cumulative))
        _, flip_strike, flip_cumulative = min(flip_candidates, key=lambda item: item[0])

        regime, color = gamma_map_regime(net_gamma_ratio, put_wall["distance_pct"])
        gamma_score = round(clamp(50 - net_gamma_ratio * 85 + max(0, put_wall["distance_pct"] + 2) * 9), 1)

        if regime == "正 Gamma 钉住":
            summary = f"QQQ 最近到期 gamma 偏正，{gamma_wall['strike']:.0f} 附近是主要上方钉住位，短线波动可能被压低。"
        elif regime == "轻度钉住":
            summary = f"QQQ gamma 结构轻度偏正，现价附近 {nearest_wall['strike']:.0f} 的 OI/gamma 可能影响日内路径。"
        elif regime == "负 Gamma 风险":
            summary = f"QQQ gamma 结构偏负，下方 put wall 在 {put_wall['strike']:.0f}，跌近该区域时波动可能被放大。"
        elif regime == "下方凸性":
            summary = f"QQQ 下方 put gamma 更重，若跌破现价附近支撑，交易台需要关注负 gamma 放大效应。"
        else:
            summary = "QQQ gamma 结构接近均衡，单一行权价对 NDX 路径的钉住效应有限。"

        controls = [
            f"主要 gamma wall：{gamma_wall['strike']:.0f}（距现价 {gamma_wall['distance_pct']:+.2f}%），上破后短线阻力可能重定价。",
            f"主要 put wall：{put_wall['strike']:.0f}（距现价 {put_wall['distance_pct']:+.2f}%），跌近该位时优先检查保护覆盖。",
            f"Gamma flip 代理：{flip_strike:.0f}，累计净 gamma 约 {flip_cumulative:+.2f} 百万美元/1%。",
            "该模块只用公开 OI 和 IV 估算定位压力，不能代表真实做市商库存方向。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "proxy_symbol": proxy_symbol,
            "proxy_price": round(price, 2),
            "expiration": selected_expiration,
            "days_to_expiration": dte,
            "gamma_score": gamma_score,
            "regime": regime,
            "regime_color": color,
            "summary": summary,
            "net_gamma": round(net_gamma_total, 2),
            "call_gamma": round(call_gamma_total, 2),
            "put_gamma": round(put_gamma_total, 2),
            "net_gamma_ratio": round(net_gamma_ratio, 3),
            "gamma_wall": gamma_wall,
            "put_wall": put_wall,
            "max_abs_wall": max_abs_wall,
            "nearest_wall": nearest_wall,
            "flip_strike": round(flip_strike, 2),
            "flip_cumulative": round(flip_cumulative, 2),
            "positive_walls": positive_walls,
            "negative_walls": negative_walls,
            "strikes": focus_rows,
            "controls": controls,
            "methodology": "使用 QQQ 最近未来到期期权链，按公开 IV、未平仓量和 Black-Scholes gamma 估算每个行权价的 call/put gamma notional，并用 call gamma 为正、put gamma 为负构造净 gamma 代理。该模块用于观察行权价定位和短线波动放大/钉住风险，不代表真实做市商库存或交易建议。",
        }
        risk_gamma_map_cache["data"] = data
        risk_gamma_map_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX gamma map updated: {regime}, score {gamma_score:.1f}")
    except Exception as e:
        logger.error(f"NDX gamma map refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_options_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_options_cache

    try:
        proxy_symbol = "QQQ"
        ticker = yf.Ticker(proxy_symbol)
        price = safe_float(ticker.fast_info.last_price, 0)
        if price <= 0:
            raise ValueError("QQQ price unavailable for options analysis")

        today = datetime.utcnow().date()
        expirations = [
            exp for exp in ticker.options
            if datetime.strptime(exp, "%Y-%m-%d").date() > today
        ]
        if not expirations:
            raise ValueError("No future QQQ option expirations available")

        selected_expiration = expirations[0]
        expiry_date = datetime.strptime(selected_expiration, "%Y-%m-%d").date()
        dte = max((expiry_date - today).days, 1)
        chain = ticker.option_chain(selected_expiration)
        calls = clean_option_rows(chain.calls)
        puts = clean_option_rows(chain.puts)
        if not calls or not puts:
            raise ValueError("QQQ option chain unavailable or illiquid")

        call_atm = min(calls, key=lambda row: abs(row["strike"] - price))
        put_atm = min(puts, key=lambda row: abs(row["strike"] - price))
        atm_strike = (call_atm["strike"] + put_atm["strike"]) / 2
        straddle_mid = call_atm["mid"] + put_atm["mid"]
        implied_move = straddle_mid / price * 100
        annualized_iv_proxy = implied_move / ((dte / 365) ** 0.5)
        atm_iv = (call_atm["iv"] + put_atm["iv"]) / 2 * 100

        call_oi = sum(row["open_interest"] for row in calls)
        put_oi = sum(row["open_interest"] for row in puts)
        call_volume = sum(row["volume"] for row in calls)
        put_volume = sum(row["volume"] for row in puts)
        put_call_oi_ratio = put_oi / call_oi if call_oi else 0
        put_call_volume_ratio = put_volume / call_volume if call_volume else 0

        strikes = sorted(set([row["strike"] for row in calls] + [row["strike"] for row in puts]))
        call_oi_by_strike = {row["strike"]: row["open_interest"] for row in calls}
        put_oi_by_strike = {row["strike"]: row["open_interest"] for row in puts}
        max_pain = None
        min_payout = None
        for strike in strikes:
            payout = sum(max(0, strike - k) * oi for k, oi in call_oi_by_strike.items())
            payout += sum(max(0, k - strike) * oi for k, oi in put_oi_by_strike.items())
            if min_payout is None or payout < min_payout:
                min_payout = payout
                max_pain = strike

        high_interest = sorted(
            [
                {
                    "strike": strike,
                    "call_oi": round(call_oi_by_strike.get(strike, 0)),
                    "put_oi": round(put_oi_by_strike.get(strike, 0)),
                    "total_oi": round(call_oi_by_strike.get(strike, 0) + put_oi_by_strike.get(strike, 0)),
                }
                for strike in strikes
            ],
            key=lambda row: row["total_oi"],
            reverse=True,
        )[:6]

        label, color = options_risk_label(implied_move, put_call_oi_ratio)
        low = price * (1 - implied_move / 100)
        high = price * (1 + implied_move / 100)
        summary = (
            f"QQQ 最近到期期权定价约 {implied_move:.2f}% 的到期波动区间，"
            f"Put/Call 未平仓比 {put_call_oi_ratio:.2f}。"
        )

        controls = [
            f"若 QQQ 跌破隐含下沿 {low:.2f}，说明现货波动超过期权定价，需要收缩短线风险预算。",
            f"若 Put/Call 未平仓比继续升至 1.35 以上，保护性需求可能上升。",
            f"最大痛点代理在 {max_pain:.2f}，可作为到期附近仓位拥挤观察位，不作为目标价。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "proxy_symbol": proxy_symbol,
            "proxy_price": round(price, 2),
            "expiration": selected_expiration,
            "days_to_expiration": dte,
            "regime": label,
            "regime_color": color,
            "summary": summary,
            "atm_strike": round(atm_strike, 2),
            "call_mid": round(call_atm["mid"], 2),
            "put_mid": round(put_atm["mid"], 2),
            "straddle_mid": round(straddle_mid, 2),
            "implied_move": round(implied_move, 2),
            "implied_range_low": round(low, 2),
            "implied_range_high": round(high, 2),
            "annualized_iv_proxy": round(annualized_iv_proxy, 1),
            "atm_iv": round(atm_iv, 1),
            "put_call_oi_ratio": round(put_call_oi_ratio, 2),
            "put_call_volume_ratio": round(put_call_volume_ratio, 2),
            "max_pain": round(max_pain, 2) if max_pain is not None else None,
            "high_interest": high_interest,
            "controls": controls,
            "methodology": "使用 QQQ 作为 NDX 可交易期权代理，选择最近未来到期日，基于 ATM call+put 跨式中价估算到期隐含波动区间；该指标反映期权市场定价，不代表预测。",
        }
        risk_options_cache["data"] = data
        risk_options_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX options proxy updated: {label}, move {implied_move:.2f}%")
    except Exception as e:
        logger.error(f"NDX options proxy refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_option_skew_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_option_skew_cache

    try:
        proxy_symbol = "QQQ"
        ticker = yf.Ticker(proxy_symbol)
        price = safe_float(ticker.fast_info.last_price, 0)
        if price <= 0:
            raise ValueError("QQQ price unavailable for option skew")

        today = datetime.utcnow().date()
        expirations = sorted([
            exp for exp in ticker.options
            if datetime.strptime(exp, "%Y-%m-%d").date() > today
        ])
        if not expirations:
            raise ValueError("No future QQQ option expirations available for skew")

        selected_expiration = None
        for exp in expirations:
            exp_date = datetime.strptime(exp, "%Y-%m-%d").date()
            dte_candidate = (exp_date - today).days
            if 7 <= dte_candidate <= 45:
                selected_expiration = exp
                break
        if selected_expiration is None:
            selected_expiration = expirations[0]

        expiry_date = datetime.strptime(selected_expiration, "%Y-%m-%d").date()
        dte = max((expiry_date - today).days, 1)
        chain = ticker.option_chain(selected_expiration)
        calls = clean_option_rows(chain.calls)
        puts = clean_option_rows(chain.puts)
        if not calls or not puts:
            raise ValueError("QQQ option chain unavailable or illiquid for skew")

        call_atm = nearest_option_row(calls, price)
        put_atm = nearest_option_row(puts, price)
        put_95 = nearest_option_row(puts, price * 0.95)
        put_90 = nearest_option_row(puts, price * 0.90)
        call_105 = nearest_option_row(calls, price * 1.05)
        call_110 = nearest_option_row(calls, price * 1.10)
        required_rows = [call_atm, put_atm, put_95, put_90, call_105]
        if any(row is None for row in required_rows):
            raise ValueError("Missing required option strikes for skew")

        atm_iv = (call_atm["iv"] + put_atm["iv"]) / 2 * 100
        put_95_iv = put_95["iv"] * 100
        put_90_iv = put_90["iv"] * 100
        call_105_iv = call_105["iv"] * 100
        call_110_iv = call_110["iv"] * 100 if call_110 else call_105_iv
        put_skew = put_95_iv - atm_iv
        deep_put_skew = put_90_iv - atm_iv
        call_skew = call_105_iv - atm_iv
        risk_reversal = put_95_iv - call_105_iv

        downside_puts = [row for row in puts if price * 0.86 <= row["strike"] <= price * 0.97]
        upside_calls = [row for row in calls if price * 1.03 <= row["strike"] <= price * 1.14]
        downside_put_oi = sum(row["open_interest"] for row in downside_puts)
        upside_call_oi = sum(row["open_interest"] for row in upside_calls)
        downside_put_volume = sum(row["volume"] for row in downside_puts)
        upside_call_volume = sum(row["volume"] for row in upside_calls)
        tail_oi_ratio = downside_put_oi / upside_call_oi if upside_call_oi else 0
        tail_volume_ratio = downside_put_volume / upside_call_volume if upside_call_volume else 0

        put_spread_cost = max(0, put_95["mid"] - put_90["mid"])
        put_spread_cost_pct = put_spread_cost / price * 100 if price else 0
        put_95_distance = pct_change(put_95["strike"], price)
        put_90_distance = pct_change(put_90["strike"], price)
        call_105_distance = pct_change(call_105["strike"], price)

        skew_score = round(clamp(
            34
            + max(0, put_skew) * 2.4
            + max(0, deep_put_skew) * 1.1
            + max(0, risk_reversal) * 1.9
            + max(0, tail_oi_ratio - 1.0) * 12
            + max(0, tail_volume_ratio - 1.0) * 8
            + max(0, put_spread_cost_pct - 0.6) * 10
        ), 1)
        regime, color = option_skew_regime(skew_score, risk_reversal, tail_oi_ratio)

        metrics = [
            {
                "key": "put_skew",
                "label": "5% Put Skew",
                "value": f"{put_skew:+.1f} vol pts",
                "score": round(clamp(35 + max(0, put_skew) * 4), 1),
                "color": risk_color(clamp(35 + max(0, put_skew) * 4)),
                "detail": f"{put_95['strike']:.0f} put IV {put_95_iv:.1f}% 对比 ATM IV {atm_iv:.1f}%。",
            },
            {
                "key": "risk_reversal",
                "label": "Put/Call 风险逆转",
                "value": f"{risk_reversal:+.1f} vol pts",
                "score": round(clamp(32 + max(0, risk_reversal) * 4.5), 1),
                "color": risk_color(clamp(32 + max(0, risk_reversal) * 4.5)),
                "detail": f"5% OTM put IV {put_95_iv:.1f}%，5% OTM call IV {call_105_iv:.1f}%。",
            },
            {
                "key": "tail_oi",
                "label": "OTM Put/Call OI",
                "value": f"{tail_oi_ratio:.2f}x",
                "score": round(clamp(34 + max(0, tail_oi_ratio - 0.9) * 28), 1),
                "color": risk_color(clamp(34 + max(0, tail_oi_ratio - 0.9) * 28)),
                "detail": f"下方 3%-14% put OI {downside_put_oi:,.0f}，上方 3%-14% call OI {upside_call_oi:,.0f}。",
            },
            {
                "key": "put_spread",
                "label": "95/90 Put Spread",
                "value": f"{put_spread_cost_pct:.2f}%",
                "score": round(clamp(30 + put_spread_cost_pct * 20), 1),
                "color": risk_color(clamp(30 + put_spread_cost_pct * 20)),
                "detail": f"{put_95['strike']:.0f}/{put_90['strike']:.0f} put spread 中价约 {put_spread_cost:.2f}。",
            },
        ]

        if regime == "尾部保护拥挤":
            summary = f"QQQ 下行偏斜显著抬升，5% put/call 风险逆转 {risk_reversal:+.1f} vol pts，保护需求可能已经拥挤。"
        elif regime == "下行保护升温":
            summary = f"QQQ 下行保护需求升温，OTM put/call OI 为 {tail_oi_ratio:.2f}x，尾部保护成本需要纳入仓位预算。"
        elif regime == "偏斜温和":
            summary = f"QQQ 期权偏斜温和，5% put skew {put_skew:+.1f} vol pts，尾部保护暂未明显拥挤。"
        else:
            summary = f"QQQ 偏斜处在均衡区，5% put IV {put_95_iv:.1f}%、ATM IV {atm_iv:.1f}%，保护成本没有给出极端信号。"

        controls = [
            f"若 5% put/call 风险逆转升至 +9 vol pts 以上，避免在保护需求最拥挤时一次性补保险。",
            f"若 QQQ 跌近 {put_95['strike']:.0f}（{put_95_distance:+.2f}%）且 skew 同步上行，优先降低净暴露而不是追高买保护。",
            f"若 skew 分数低于 35 且 VIX 曲线仍为 contango，可用分批方式补基础保护。",
            "偏斜只反映公开期权链定价，不代表真实做市商库存或保证收益的保护策略。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "proxy_symbol": proxy_symbol,
            "proxy_price": round(price, 2),
            "expiration": selected_expiration,
            "days_to_expiration": dte,
            "skew_score": skew_score,
            "regime": regime,
            "regime_color": color,
            "summary": summary,
            "atm_iv": round(atm_iv, 1),
            "put_95_iv": round(put_95_iv, 1),
            "put_90_iv": round(put_90_iv, 1),
            "call_105_iv": round(call_105_iv, 1),
            "call_110_iv": round(call_110_iv, 1),
            "put_skew": round(put_skew, 1),
            "deep_put_skew": round(deep_put_skew, 1),
            "call_skew": round(call_skew, 1),
            "risk_reversal": round(risk_reversal, 1),
            "tail_oi_ratio": round(tail_oi_ratio, 2),
            "tail_volume_ratio": round(tail_volume_ratio, 2),
            "downside_put_oi": round(downside_put_oi),
            "upside_call_oi": round(upside_call_oi),
            "downside_put_volume": round(downside_put_volume),
            "upside_call_volume": round(upside_call_volume),
            "put_spread_cost": round(put_spread_cost, 2),
            "put_spread_cost_pct": round(put_spread_cost_pct, 2),
            "put_95_strike": round(put_95["strike"], 2),
            "put_90_strike": round(put_90["strike"], 2),
            "call_105_strike": round(call_105["strike"], 2),
            "put_95_distance": round(put_95_distance, 2),
            "put_90_distance": round(put_90_distance, 2),
            "call_105_distance": round(call_105_distance, 2),
            "metrics": metrics,
            "controls": controls,
            "methodology": "使用 QQQ 7-45 天内最近到期期权链，比较 ATM IV、5%/10% OTM put IV、5%/10% OTM call IV，并统计 OTM put/call 未平仓量与成交量，用于观察 NDX 下行尾部保护需求和期权偏斜压力。该模块是公开期权链风险读数，不构成期权交易建议。",
        }
        risk_option_skew_cache["data"] = data
        risk_option_skew_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX option skew updated: {regime}, score {skew_score:.1f}")
    except Exception as e:
        logger.error(f"NDX option skew refresh failed: {e}")
        logger.error(traceback.format_exc())


def analog_feature_metric(key, label, value, percentile, detail, higher_is_support=True):
    percentile = round(clamp(percentile), 1)
    if higher_is_support:
        color = constructive_color(percentile)
        state = constructive_state(percentile)
    else:
        color = risk_color(percentile)
        if percentile >= 75:
            state = "偏高"
        elif percentile >= 55:
            state = "抬升"
        elif percentile >= 35:
            state = "中性"
        else:
            state = "温和"
    return {
        "key": key,
        "label": label,
        "value": value,
        "percentile": percentile,
        "state": state,
        "color": color,
        "detail": detail,
    }


def refresh_regime_analog_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_regime_analog_cache

    try:
        symbols = {
            "qqq": "QQQ",
            "spy": "SPY",
            "smh": "SMH",
            "vix": "^VIX",
            "rates": "^TNX",
        }
        close_map = {
            key: fetch_ohlc_history(symbol, "5y", min_rows=700, attempts=3)["Close"]
            for key, symbol in symbols.items()
        }
        try:
            close_map["dollar"] = fetch_ohlc_history("DX-Y.NYB", "5y", min_rows=700, attempts=3)["Close"]
            dollar_symbol = "DXY"
        except Exception as e:
            logger.error(f"DXY fetch failed for regime analogs, falling back to UUP: {e}")
            close_map["dollar"] = fetch_ohlc_history("UUP", "5y", min_rows=700, attempts=3)["Close"]
            dollar_symbol = "UUP"

        prices = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(prices) < 700:
            raise ValueError("Insufficient aligned history for regime analogs")

        qqq_returns = prices["qqq"].pct_change() * 100
        spy_returns = prices["spy"].pct_change() * 100
        smh_returns = prices["smh"].pct_change() * 100

        features = pd.DataFrame(index=prices.index)
        features["qqq_return_20d"] = prices["qqq"].pct_change(20) * 100
        features["qqq_return_60d"] = prices["qqq"].pct_change(60) * 100
        features["realized_vol_20d"] = qqq_returns.rolling(20).std() * (252 ** 0.5)
        features["drawdown_60d"] = (prices["qqq"] / prices["qqq"].rolling(60).max() - 1) * 100
        features["vix_level"] = prices["vix"]
        features["vix_change_20d"] = prices["vix"].diff(20)
        features["rates_change_20d_bps"] = prices["rates"].diff(20) * 100
        features["dollar_return_20d"] = prices["dollar"].pct_change(20) * 100
        features["qqq_spy_20d"] = (prices["qqq"].pct_change(20) - prices["spy"].pct_change(20)) * 100
        features["smh_spy_20d"] = (prices["smh"].pct_change(20) - prices["spy"].pct_change(20)) * 100
        features["corr_spy_60d"] = qqq_returns.rolling(60).corr(spy_returns)
        features["corr_smh_60d"] = qqq_returns.rolling(60).corr(smh_returns)
        features["forward_5d"] = (prices["qqq"].shift(-5) / prices["qqq"] - 1) * 100
        features["forward_10d"] = (prices["qqq"].shift(-10) / prices["qqq"] - 1) * 100
        features["forward_20d"] = (prices["qqq"].shift(-20) / prices["qqq"] - 1) * 100

        feature_cols = [
            "qqq_return_20d",
            "qqq_return_60d",
            "realized_vol_20d",
            "drawdown_60d",
            "vix_level",
            "vix_change_20d",
            "rates_change_20d_bps",
            "dollar_return_20d",
            "qqq_spy_20d",
            "smh_spy_20d",
            "corr_spy_60d",
            "corr_smh_60d",
        ]
        feature_frame = features[feature_cols].dropna()
        if len(feature_frame) < 400:
            raise ValueError("Insufficient feature rows for regime analogs")

        current = feature_frame.iloc[-1]
        forward_cols = ["forward_5d", "forward_10d", "forward_20d"]
        candidates = features.loc[feature_frame.index, feature_cols + forward_cols].dropna()
        current_date = feature_frame.index[-1]
        candidates = candidates[candidates.index <= current_date - pd.Timedelta(days=30)]
        if len(candidates) < 180:
            raise ValueError("Insufficient historical analog candidates")

        means = candidates[feature_cols].mean()
        stds = candidates[feature_cols].std().replace(0, 1)
        weights = pd.Series({
            "qqq_return_20d": 1.10,
            "qqq_return_60d": 0.90,
            "realized_vol_20d": 1.05,
            "drawdown_60d": 0.90,
            "vix_level": 1.10,
            "vix_change_20d": 0.80,
            "rates_change_20d_bps": 0.95,
            "dollar_return_20d": 0.80,
            "qqq_spy_20d": 0.95,
            "smh_spy_20d": 1.00,
            "corr_spy_60d": 0.55,
            "corr_smh_60d": 0.55,
        })
        current_z = (current - means) / stds
        candidate_z = (candidates[feature_cols] - means) / stds
        distances = (((candidate_z - current_z) ** 2) * weights).sum(axis=1) ** 0.5
        top_n = min(24, len(distances))
        analog_index = distances.nsmallest(top_n).index
        analogs = candidates.loc[analog_index].copy()
        analogs["distance"] = distances.loc[analog_index]
        analogs = analogs.sort_values("distance")

        f5 = analogs["forward_5d"]
        f10 = analogs["forward_10d"]
        f20 = analogs["forward_20d"]
        forward_5d_avg = safe_float(f5.mean(), 0)
        forward_10d_avg = safe_float(f10.mean(), 0)
        forward_20d_avg = safe_float(f20.mean(), 0)
        forward_20d_median = safe_float(f20.median(), 0)
        win_rate_20d = safe_float((f20 > 0).mean() * 100, 0)
        downside_tail_20d = safe_float(f20.quantile(0.20), 0)
        upside_tail_20d = safe_float(f20.quantile(0.80), 0)
        avg_distance = safe_float(analogs["distance"].mean(), 0)

        analog_score = round(clamp(
            50
            + forward_20d_avg * 3.0
            + (win_rate_20d - 50) * 0.35
            + downside_tail_20d * 1.8
            + max(0, upside_tail_20d) * 0.9
            - avg_distance * 2.2
        ), 1)
        regime, color = regime_analog_label(analog_score, win_rate_20d)

        current_percentiles = {}
        for col in feature_cols:
            series = candidates[col].dropna()
            current_percentiles[col] = safe_float((series <= current[col]).mean() * 100, 50) if len(series) else 50

        metrics = [
            analog_feature_metric(
                "trend_20d",
                "QQQ 20日趋势",
                f"{current['qqq_return_20d']:+.2f}%",
                current_percentiles["qqq_return_20d"],
                "当前 QQQ 20 日收益在历史候选窗口中的相对位置。",
            ),
            analog_feature_metric(
                "volatility",
                "20日实现波动",
                f"{current['realized_vol_20d']:.1f}%",
                current_percentiles["realized_vol_20d"],
                "实现波动率越高，历史类比的尾部误差通常越大。",
                higher_is_support=False,
            ),
            analog_feature_metric(
                "vix",
                "VIX 水位",
                f"{current['vix_level']:.1f}",
                current_percentiles["vix_level"],
                "VIX 水位用于匹配期权市场风险定价环境。",
                higher_is_support=False,
            ),
            analog_feature_metric(
                "semis_active",
                "半导体超额",
                f"{current['smh_spy_20d']:+.2f}pt",
                current_percentiles["smh_spy_20d"],
                "SMH 相对 SPY 的 20 日超额用于识别 NDX 成长链条强弱。",
            ),
            analog_feature_metric(
                "rates",
                "10Y 变化",
                f"{current['rates_change_20d_bps']:+.1f}bps",
                current_percentiles["rates_change_20d_bps"],
                "10Y 利率上行会改变成长股估值容错。",
                higher_is_support=False,
            ),
            analog_feature_metric(
                "dollar",
                dollar_symbol,
                f"{current['dollar_return_20d']:+.2f}%",
                current_percentiles["dollar_return_20d"],
                "美元走强通常压制全球风险偏好和远端成长估值。",
                higher_is_support=False,
            ),
        ]

        analog_rows = []
        for date, row in analogs.head(10).iterrows():
            analog_rows.append({
                "date": date.date().isoformat(),
                "distance": round(safe_float(row["distance"], 0), 2),
                "qqq_return_20d": round(safe_float(row["qqq_return_20d"], 0), 2),
                "realized_vol_20d": round(safe_float(row["realized_vol_20d"], 0), 1),
                "vix_level": round(safe_float(row["vix_level"], 0), 1),
                "rates_change_20d_bps": round(safe_float(row["rates_change_20d_bps"], 0), 1),
                "forward_5d": round(safe_float(row["forward_5d"], 0), 2),
                "forward_10d": round(safe_float(row["forward_10d"], 0), 2),
                "forward_20d": round(safe_float(row["forward_20d"], 0), 2),
                "color": "green" if row["forward_20d"] > 1 else "red" if row["forward_20d"] < -1 else "blue",
            })

        if regime == "历史顺风":
            summary = f"当前 NDX/QQQ 环境与过去偏正收益窗口相似，前 {top_n} 个类比样本 20 日平均 {forward_20d_avg:+.2f}%，胜率 {win_rate_20d:.1f}%。"
        elif regime == "正偏类比":
            summary = f"历史相似窗口给出温和正偏，20 日中位数 {forward_20d_median:+.2f}%，但仍需用风险预算控制尾部误差。"
        elif regime == "中性类比":
            summary = f"历史相似窗口接近中性，20 日平均 {forward_20d_avg:+.2f}%，上行和下行分布没有明显单边优势。"
        else:
            summary = f"历史相似窗口偏负，20 日平均 {forward_20d_avg:+.2f}%，20% 分位 {downside_tail_20d:+.2f}%，应降低追高速度。"

        controls = [
            f"若后续 5 日走势低于类比 20% 分位，应把当前环境从 {regime} 下调一个风险档位。",
            f"若 QQQ 继续上涨但 VIX/利率环境脱离相似样本区间，历史类比权重应降低。",
            f"类比样本只保留距离最近的 {top_n} 个窗口，避免用全样本平均掩盖当前结构。",
            "历史类比是条件分布，不是预测模型；必须与技术位、期权和资金流模块交叉验证。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": current_date.date().isoformat(),
            "proxy_symbol": "QQQ",
            "proxy_price": round(safe_float(prices["qqq"].iloc[-1], 0), 2),
            "regime": regime,
            "regime_color": color,
            "analog_score": analog_score,
            "summary": summary,
            "lookback_years": 5,
            "candidate_count": int(len(candidates)),
            "analog_count": int(top_n),
            "avg_distance": round(avg_distance, 2),
            "forward_5d_avg": round(forward_5d_avg, 2),
            "forward_10d_avg": round(forward_10d_avg, 2),
            "forward_20d_avg": round(forward_20d_avg, 2),
            "forward_20d_median": round(forward_20d_median, 2),
            "win_rate_20d": round(win_rate_20d, 1),
            "downside_tail_20d": round(downside_tail_20d, 2),
            "upside_tail_20d": round(upside_tail_20d, 2),
            "current_features": {
                "qqq_return_20d": round(safe_float(current["qqq_return_20d"], 0), 2),
                "qqq_return_60d": round(safe_float(current["qqq_return_60d"], 0), 2),
                "realized_vol_20d": round(safe_float(current["realized_vol_20d"], 0), 1),
                "drawdown_60d": round(safe_float(current["drawdown_60d"], 0), 2),
                "vix_level": round(safe_float(current["vix_level"], 0), 1),
                "vix_change_20d": round(safe_float(current["vix_change_20d"], 0), 1),
                "rates_change_20d_bps": round(safe_float(current["rates_change_20d_bps"], 0), 1),
                "dollar_return_20d": round(safe_float(current["dollar_return_20d"], 0), 2),
                "qqq_spy_20d": round(safe_float(current["qqq_spy_20d"], 0), 2),
                "smh_spy_20d": round(safe_float(current["smh_spy_20d"], 0), 2),
            },
            "metrics": metrics,
            "analogs": analog_rows,
            "controls": controls,
            "methodology": "使用 QQQ、SPY、SMH、VIX、10Y 利率和美元近 5 年日线，构造趋势、实现波动、回撤、宏观和半导体超额等特征；将当前特征标准化后与历史窗口计算加权欧氏距离，并用最相似窗口的 5/10/20 日后续收益形成条件分布。该模块用于历史类比和风险预算，不构成收益预测或买卖建议。",
        }
        risk_regime_analog_cache["data"] = data
        risk_regime_analog_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX regime analog updated: {regime}, score {analog_score:.1f}")
    except Exception as e:
        logger.error(f"NDX regime analog refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_volatility_term_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_volatility_term_cache

    try:
        symbols = {
            "vix": "^VIX",
            "vix3m": "^VIX3M",
            "vix6m": "^VIX6M",
            "vvix": "^VVIX",
        }
        close_map = {}
        for key, symbol in symbols.items():
            close_map[key] = fetch_ohlc_history(symbol, "6mo", min_rows=80, attempts=3)["Close"]

        aligned = pd.concat(close_map, axis=1, join="inner").dropna()
        if len(aligned) < 80:
            raise ValueError("Insufficient aligned VIX term structure history")

        latest = aligned.iloc[-1]
        vix = safe_float(latest["vix"], 0)
        vix3m = safe_float(latest["vix3m"], 0)
        vix6m = safe_float(latest["vix6m"], 0)
        vvix = safe_float(latest["vvix"], 0)
        if min(vix, vix3m, vix6m, vvix) <= 0:
            raise ValueError("Invalid VIX term structure latest values")

        front_ratio_series = aligned["vix"] / aligned["vix3m"]
        mid_ratio_series = aligned["vix3m"] / aligned["vix6m"]
        front_ratio = safe_float(front_ratio_series.iloc[-1], 0)
        mid_ratio = safe_float(mid_ratio_series.iloc[-1], 0)
        front_spread = vix3m - vix
        mid_spread = vix6m - vix3m
        front_percentile = safe_float((front_ratio_series <= front_ratio).mean() * 100, 50)
        vvix_mean = safe_float(aligned["vvix"].tail(60).mean(), vvix)
        vvix_std = safe_float(aligned["vvix"].tail(60).std(), 0)
        vvix_z_score = (vvix - vvix_mean) / vvix_std if vvix_std else 0

        vix_change_5d = vix - safe_float(aligned["vix"].iloc[-6], vix) if len(aligned) >= 6 else 0
        vix_change_20d = vix - safe_float(aligned["vix"].iloc[-21], vix) if len(aligned) >= 21 else vix_change_5d
        vvix_change_20d = vvix - safe_float(aligned["vvix"].iloc[-21], vvix) if len(aligned) >= 21 else 0

        front_pressure = clamp((front_ratio - 0.78) / 0.30 * 62)
        vvix_pressure = clamp((vvix_z_score + 0.8) / 2.6 * 28)
        vix_momentum = clamp(max(0, vix_change_5d) * 3.2 + max(0, vix_change_20d) * 1.2, 0, 10)
        term_score = round(clamp(front_pressure + vvix_pressure + vix_momentum), 1)
        regime, color = volatility_term_regime(front_ratio, vvix_z_score)

        if regime == "波动倒挂":
            summary = "VIX 前端已经接近或高于 3M 波动率，曲线进入压力结构，短线风险预算需要优先考虑去杠杆和保护成本。"
        elif regime == "曲线趋平":
            summary = "VIX 期限结构正在趋平，现货波动或波动率交易需求上升，NDX 追高需要更强成交与广度确认。"
        elif regime == "深度 Contango":
            summary = "VIX 低于中期波动率且曲线较陡，市场仍按常态风险定价，但低波动环境下不宜放松止损纪律。"
        else:
            summary = "VIX 期限结构保持 Contango，波动率压力处在常态区，更适合与技术位和期权隐含区间联合观察。"

        indicators = [
            {
                "key": "front_curve",
                "label": "前端曲线",
                "value": f"{front_ratio:.2f}x",
                "state": "倒挂" if front_ratio >= 1 else "趋平" if front_ratio >= 0.96 else "Contango",
                "color": "red" if front_ratio >= 1.03 else "amber" if front_ratio >= 0.96 else "green",
                "detail": f"VIX/VIX3M 为 {front_ratio:.2f}，3M-VIX 点差 {front_spread:+.2f}。",
            },
            {
                "key": "mid_curve",
                "label": "中段曲线",
                "value": f"{mid_ratio:.2f}x",
                "state": "倒挂" if mid_ratio >= 1 else "平缓" if mid_ratio >= 0.94 else "陡峭",
                "color": "red" if mid_ratio >= 1 else "amber" if mid_ratio >= 0.94 else "blue",
                "detail": f"VIX3M/VIX6M 为 {mid_ratio:.2f}，6M-3M 点差 {mid_spread:+.2f}。",
            },
            {
                "key": "vvix",
                "label": "VVIX",
                "value": f"{vvix:.1f}",
                "state": "波动交易升温" if vvix_z_score >= 1 else "偏低" if vvix_z_score <= -0.8 else "常态",
                "color": "red" if vvix_z_score >= 1.5 else "amber" if vvix_z_score >= 0.8 else "green" if vvix_z_score <= -0.8 else "blue",
                "detail": f"60日 z-score {vvix_z_score:+.2f}，20日变化 {vvix_change_20d:+.1f} 点。",
            },
            {
                "key": "vix_momentum",
                "label": "VIX 动量",
                "value": f"{vix_change_5d:+.1f}",
                "state": "上行" if vix_change_5d > 1.5 else "回落" if vix_change_5d < -1.5 else "横盘",
                "color": "red" if vix_change_5d > 3 else "amber" if vix_change_5d > 1.5 else "green" if vix_change_5d < -1.5 else "blue",
                "detail": f"VIX 5日变化 {vix_change_5d:+.1f} 点，20日变化 {vix_change_20d:+.1f} 点。",
            },
        ]

        controls = [
            f"若 VIX/VIX3M 升破 1.00，应把短线波动倒挂视为风险预算收缩信号。",
            f"若 VVIX z-score 高于 1.5，保护性期权成本可能快速抬升，避免在恐慌时集中补保险。",
            "当期限结构维持 Contango 且技术位未破，波动率压力可按背景风险处理，不单独作为追涨理由。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": aligned.index[-1].date().isoformat(),
            "regime": regime,
            "regime_color": color,
            "term_score": term_score,
            "summary": summary,
            "vix": round(vix, 2),
            "vix3m": round(vix3m, 2),
            "vix6m": round(vix6m, 2),
            "vvix": round(vvix, 2),
            "front_ratio": round(front_ratio, 2),
            "mid_ratio": round(mid_ratio, 2),
            "front_spread": round(front_spread, 2),
            "mid_spread": round(mid_spread, 2),
            "front_ratio_percentile": round(front_percentile, 1),
            "vvix_z_score": round(vvix_z_score, 2),
            "vix_change_5d": round(vix_change_5d, 2),
            "vix_change_20d": round(vix_change_20d, 2),
            "vvix_change_20d": round(vvix_change_20d, 2),
            "indicators": indicators,
            "controls": controls,
            "methodology": "使用 VIX、VIX3M、VIX6M 和 VVIX 最近 6 个月日线，计算前端/中段期限结构、点差、百分位、VVIX z-score 与 VIX 动量，用于判断波动率曲线是否趋平或倒挂；该模块衡量风险定价结构，不构成波动率交易建议。",
        }
        risk_volatility_term_cache["data"] = data
        risk_volatility_term_cache["last_update"] = datetime.utcnow()
        logger.info(f"VIX term structure updated: {regime}, score {term_score:.1f}")
    except Exception as e:
        logger.error(f"VIX term structure refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_vol_premium_data(allow_dependency_refresh=True):
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_vol_premium_cache

    try:
        dependencies = [
            ("options", risk_options_cache, refresh_options_data, 15 * 60),
            ("volatility_term", risk_volatility_term_cache, refresh_volatility_term_data, 15 * 60),
            ("tail", risk_tail_cache, refresh_tail_risk_data, 15 * 60),
            ("hedge", risk_hedge_overlay_cache, refresh_hedge_overlay_data, 15 * 60),
        ]
        light_dependencies = {"options", "volatility_term", "tail"}
        dependency_status = []
        for key, cache, refresher, ttl in dependencies:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Vol premium dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        if dependency_status.count("ok") < 3:
            return

        options = risk_options_cache.get("data") or {}
        volatility_term = risk_volatility_term_cache.get("data") or {}
        tail = risk_tail_cache.get("data") or {}
        hedge = risk_hedge_overlay_cache.get("data") or {}

        qqq_history = fetch_ohlc_history("QQQ", "1y", min_rows=80, attempts=3)
        qqq_returns = qqq_history["Close"].pct_change().dropna() * 100
        if len(qqq_returns) < 60:
            raise ValueError("Insufficient QQQ history for volatility premium")

        dte = max(1, safe_float(options.get("days_to_expiration"), 7))
        implied_move = safe_float(options.get("implied_move"), 1.5)
        annualized_iv = safe_float(options.get("annualized_iv_proxy"), None)
        if annualized_iv is None:
            annualized_iv = implied_move / max((dte / 365) ** 0.5, 0.01)

        realized_vol_10d = safe_float(qqq_returns.tail(10).std() * (252 ** 0.5), 0)
        realized_vol_20d = safe_float(qqq_returns.tail(20).std() * (252 ** 0.5), 0)
        realized_vol_60d = safe_float(qqq_returns.tail(60).std() * (252 ** 0.5), 0)
        realized_vol = realized_vol_20d * 0.55 + realized_vol_60d * 0.30 + realized_vol_10d * 0.15
        realized_move = realized_vol * ((dte / 365) ** 0.5)
        premium_points = implied_move - realized_move
        premium_ratio = annualized_iv / realized_vol if realized_vol > 0 else 1

        tail_score = safe_float(tail.get("tail_score"), 45)
        term_score = safe_float(volatility_term.get("term_score"), 35)
        front_ratio = safe_float(volatility_term.get("front_ratio"), 0.85)
        vvix_z = safe_float(volatility_term.get("vvix_z_score"), 0)
        put_call_oi_ratio = safe_float(options.get("put_call_oi_ratio"), 1)
        hedge_score = safe_float(hedge.get("hedge_score"), 45)

        underpricing_pressure = round(clamp(
            max(0, realized_move - implied_move) * 18
            + max(0, 1 - premium_ratio) * 38
            + max(0, tail_score - 45) * 0.45
            + max(0, front_ratio - 0.96) * 58
            + max(0, vvix_z) * 6
        ), 1)
        carry_cost = round(clamp(
            max(0, implied_move - realized_move) * 16
            + max(0, premium_ratio - 1) * 34
            + max(0, put_call_oi_ratio - 1.1) * 18
            + max(0, hedge_score - 45) * 0.30
        ), 1)
        premium_score = round(clamp(underpricing_pressure * 0.58 + carry_cost * 0.28 + term_score * 0.14), 1)
        regime, color = vol_premium_regime(underpricing_pressure, carry_cost)

        if regime == "波动低估":
            summary = f"QQQ 期权隐含到期波动低于同期限实现波动代理，市场可能低估 NDX 短线波动，保护相对便宜但风险被低估。"
        elif regime == "保护偏贵":
            summary = f"QQQ 期权隐含波动高于历史实现波动，保护成本偏贵，更适合分批保留而不是集中补保护。"
        elif regime == "保护便宜":
            summary = "期权保护价格相对历史波动不贵，若组合需要尾部保护，可用更低成本建立基础覆盖。"
        else:
            summary = "期权隐含波动与历史实现波动大致匹配，保护成本处在均衡区，需要结合技术位和曲线结构执行。"

        metrics = [
            {
                "key": "implied",
                "label": "隐含到期波动",
                "value": f"{implied_move:.2f}%",
                "score": round(clamp(annualized_iv), 1),
                "color": color,
                "detail": f"最近到期 QQQ ATM 跨式隐含区间，年化代理 {annualized_iv:.1f}%。",
            },
            {
                "key": "realized",
                "label": "实现波动代理",
                "value": f"{realized_move:.2f}%",
                "score": round(clamp(realized_vol), 1),
                "color": "blue",
                "detail": f"按 {dte:.0f} 天期限折算，20日年化 {realized_vol_20d:.1f}%，60日年化 {realized_vol_60d:.1f}%。",
            },
            {
                "key": "premium",
                "label": "风险溢价",
                "value": f"{premium_points:+.2f}pt",
                "score": round(clamp(50 + premium_points * 18), 1),
                "color": "green" if premium_points < -0.4 else "amber" if premium_points > 0.8 else "blue",
                "detail": "隐含波动减同期限实现波动。负值表示保护相对便宜，正值表示保护成本偏贵。",
            },
            {
                "key": "term",
                "label": "曲线压力",
                "value": f"{front_ratio:.2f}x",
                "score": round(term_score, 1),
                "color": volatility_term.get("regime_color", "blue"),
                "detail": f"VIX/VIX3M {front_ratio:.2f}，VVIX z-score {vvix_z:+.2f}。",
            },
        ]

        controls = [
            f"若 QQQ 跌破隐含下沿 {options.get('implied_range_low', '--')}，说明现货波动超过期权市场短线定价。",
            f"隐含/实现比 {premium_ratio:.2f}x；低于 0.9x 时优先检查保护是否被低估，高于 1.25x 时避免集中补保险。",
            f"尾部风险分 {tail_score:.1f}，若同时伴随 VIX 曲线趋平，应优先保留保护而不是卖出波动。",
            "波动溢价用于保护成本和风险预算校准，不等同于期权交易建议。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "proxy_symbol": options.get("proxy_symbol", "QQQ"),
            "proxy_price": options.get("proxy_price"),
            "expiration": options.get("expiration"),
            "days_to_expiration": round(dte),
            "premium_score": premium_score,
            "premium_regime": regime,
            "premium_color": color,
            "summary": summary,
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "implied_move": round(implied_move, 2),
            "annualized_iv": round(annualized_iv, 1),
            "realized_move": round(realized_move, 2),
            "realized_vol_10d": round(realized_vol_10d, 1),
            "realized_vol_20d": round(realized_vol_20d, 1),
            "realized_vol_60d": round(realized_vol_60d, 1),
            "premium_points": round(premium_points, 2),
            "premium_ratio": round(premium_ratio, 2),
            "underpricing_pressure": underpricing_pressure,
            "carry_cost": carry_cost,
            "tail_score": round(tail_score, 1),
            "term_score": round(term_score, 1),
            "front_ratio": round(front_ratio, 2),
            "vvix_z_score": round(vvix_z, 2),
            "put_call_oi_ratio": round(put_call_oi_ratio, 2),
            "implied_range_low": options.get("implied_range_low"),
            "implied_range_high": options.get("implied_range_high"),
            "metrics": metrics,
            "controls": controls,
            "methodology": "使用 QQQ 最近到期期权隐含到期波动与 QQQ 10/20/60 日实现波动折算值比较，并结合 NDX 尾部风险、VIX 期限结构、VVIX 和 Put/Call OI 判断保护成本是否偏贵或波动是否被低估。该模块是风险预算和保护成本参考，不构成期权交易建议。",
        }
        risk_vol_premium_cache["data"] = data
        risk_vol_premium_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX volatility risk premium updated: {regime}, score {premium_score:.1f}")
    except Exception as e:
        logger.error(f"NDX volatility risk premium refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_intraday_tape_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_intraday_tape_cache

    try:
        proxy_symbol = "QQQ"
        intraday = yf.Ticker(proxy_symbol).history(period="5d", interval="5m")
        if intraday is None or intraday.empty or "Close" not in intraday.columns:
            raise ValueError("No intraday QQQ tape data")

        intraday = intraday.dropna(subset=["Close"]).copy()
        intraday.index = pd.to_datetime(intraday.index).tz_localize(None)
        if len(intraday) < 12:
            raise ValueError("Insufficient intraday QQQ tape rows")

        intraday["session_date"] = intraday.index.date
        latest_session_date = max(intraday["session_date"])
        session = intraday[intraday["session_date"] == latest_session_date].copy()
        if len(session) < 6:
            raise ValueError("Insufficient latest QQQ session rows")

        daily = fetch_ohlc_history(proxy_symbol, "3mo", min_rows=40, attempts=3)
        daily_before = daily[daily.index.date < latest_session_date]
        previous_close = safe_float(daily_before["Close"].iloc[-1], None) if not daily_before.empty else None
        if previous_close is None or previous_close <= 0:
            previous_sessions = intraday[intraday["session_date"] < latest_session_date]
            previous_close = safe_float(previous_sessions["Close"].iloc[-1], None) if not previous_sessions.empty else None
        if previous_close is None or previous_close <= 0:
            raise ValueError("Missing previous close for intraday tape")

        open_price = safe_float(session["Open"].iloc[0], previous_close)
        latest_price = safe_float(session["Close"].iloc[-1], open_price)
        high_price = safe_float(session["High"].max(), latest_price)
        low_price = safe_float(session["Low"].min(), latest_price)
        session_volume = safe_float(session["Volume"].fillna(0).sum(), 0)
        avg_volume_20 = safe_float(daily["Volume"].fillna(0).tail(20).mean(), session_volume)
        if avg_volume_20 <= 0:
            avg_volume_20 = max(session_volume, 1)

        opening_gap = pct_change(open_price, previous_close)
        intraday_return = pct_change(latest_price, open_price)
        daily_return = pct_change(latest_price, previous_close)
        range_pct = (high_price - low_price) / previous_close * 100 if previous_close else 0
        avg_range_20 = safe_float(((daily["High"] - daily["Low"]) / daily["Close"].shift(1) * 100).dropna().tail(20).mean(), range_pct)
        range_expansion = range_pct / avg_range_20 if avg_range_20 > 0 else 1
        range_position = (latest_price - low_price) / (high_price - low_price) * 100 if high_price > low_price else 50

        typical_price = (session["High"] + session["Low"] + session["Close"]) / 3
        volume_series = session["Volume"].fillna(0)
        vwap = safe_float((typical_price * volume_series).sum() / volume_series.sum(), latest_price) if volume_series.sum() > 0 else latest_price
        vwap_distance = pct_change(latest_price, vwap)

        first_hour = session.head(12)
        first_hour_high = safe_float(first_hour["High"].max(), high_price)
        first_hour_low = safe_float(first_hour["Low"].min(), low_price)
        if latest_price > first_hour_high:
            balance_break = 1
            balance_state = "上破首小时"
        elif latest_price < first_hour_low:
            balance_break = -1
            balance_state = "下破首小时"
        else:
            balance_break = 0
            balance_state = "首小时区间内"

        elapsed_minutes = max(5, (session.index[-1] - session.index[0]).total_seconds() / 60 + 5)
        session_fraction = clamp(elapsed_minutes / 390, 0.05, 1)
        expected_volume = avg_volume_20 * session_fraction
        volume_pace = session_volume / expected_volume if expected_volume > 0 else 1

        five_min_returns = session["Close"].pct_change().dropna() * 100
        realized_vol_intraday = safe_float(five_min_returns.std() * (78 ** 0.5), 0)
        range_pressure = clamp((range_expansion - 0.85) / 0.75 * 28)
        volume_pressure = clamp((volume_pace - 0.85) / 0.8 * 18) if daily_return < 0 else clamp((volume_pace - 1.35) / 1.0 * 8)
        vwap_pressure = clamp(max(0, -vwap_distance) * 16 + max(0, abs(vwap_distance) - 0.8) * 8)
        gap_pressure = clamp(max(0, -opening_gap) * 12 + max(0, abs(opening_gap) - 1.2) * 8)
        location_pressure = clamp((55 - range_position) / 55 * 20)
        balance_pressure = 12 if balance_break < 0 else 0
        tape_pressure_score = round(clamp(
            22 + range_pressure + volume_pressure + vwap_pressure + gap_pressure + location_pressure + balance_pressure
        ), 1)

        regime, color = intraday_tape_regime(
            daily_return,
            vwap_distance,
            volume_pace,
            range_expansion,
            range_position,
            opening_gap,
            balance_break,
        )

        if regime == "卖压主导":
            summary = "QQQ 盘中位于 VWAP 下方且放量下行，NDX 交易台应把反弹视为减仓/降低追高的窗口。"
        elif regime == "缺口走弱":
            summary = "QQQ 低开后跌破首小时区间，盘中结构转弱，新增风险预算需要等价格重新收复 VWAP。"
        elif regime == "波动扩张":
            summary = "QQQ 日内振幅明显高于 20 日均值，盘中执行应降低单笔规模并避免在区间边缘追价。"
        elif regime == "上行动能":
            summary = "QQQ 位于 VWAP 上方且靠近日内高位，短线买盘仍有承接，但需要确认成交节奏没有过热。"
        elif regime == "VWAP 均衡":
            summary = "QQQ 围绕 VWAP 震荡，盘中多空尚未打开方向，适合等待首小时区间突破后再提高执行强度。"
        else:
            summary = "QQQ 盘中结构处在观察区，需结合 VWAP、成交节奏和首小时区间判断 NDX 风险执行方向。"

        indicators = [
            {
                "key": "gap",
                "label": "开盘缺口",
                "value": f"{opening_gap:+.2f}%",
                "state": "跳空上行" if opening_gap >= 0.6 else "跳空下行" if opening_gap <= -0.6 else "平开",
                "color": "green" if opening_gap >= 0.6 else "red" if opening_gap <= -0.8 else "blue",
                "detail": f"开盘 {open_price:.2f}，前收 {previous_close:.2f}。",
            },
            {
                "key": "vwap",
                "label": "VWAP 偏离",
                "value": f"{vwap_distance:+.2f}%",
                "state": "VWAP 上方" if vwap_distance > 0.15 else "VWAP 下方" if vwap_distance < -0.15 else "贴近 VWAP",
                "color": "green" if vwap_distance >= 0.25 else "red" if vwap_distance <= -0.25 else "blue",
                "detail": f"VWAP {vwap:.2f}，现价 {latest_price:.2f}。",
            },
            {
                "key": "range",
                "label": "日内区间",
                "value": f"{range_position:.0f}%",
                "state": "靠近高位" if range_position >= 72 else "靠近低位" if range_position <= 28 else "区间中部",
                "color": "green" if range_position >= 72 else "red" if range_position <= 28 else "blue",
                "detail": f"日内 {low_price:.2f}-{high_price:.2f}，振幅 {range_pct:.2f}%。",
            },
            {
                "key": "volume",
                "label": "成交节奏",
                "value": f"{volume_pace:.2f}x",
                "state": "放量" if volume_pace >= 1.25 else "缩量" if volume_pace <= 0.75 else "正常",
                "color": "amber" if volume_pace >= 1.25 else "blue" if volume_pace > 0.75 else "amber",
                "detail": f"已成交 {session_volume / 1_000_000:.1f}M，20日均量 {avg_volume_20 / 1_000_000:.1f}M。",
            },
            {
                "key": "first_hour",
                "label": "首小时区间",
                "value": balance_state,
                "state": "突破" if balance_break > 0 else "跌破" if balance_break < 0 else "盘整",
                "color": "green" if balance_break > 0 else "red" if balance_break < 0 else "blue",
                "detail": f"首小时区间 {first_hour_low:.2f}-{first_hour_high:.2f}。",
            },
        ]

        controls = [
            f"若价格重新跌破 VWAP {vwap:.2f} 且成交节奏高于 1.20x，应降低追涨执行强度。",
            f"若收复首小时高点 {first_hour_high:.2f} 并维持在区间上 70%，可把盘中信号从观察升级为确认。",
            f"当前振幅为 20日均值的 {range_expansion:.2f}x；高于 1.35x 时降低单笔下单规模。",
            "盘中模块只用于执行节奏和风险预算微调，不替代收盘级别风险模型。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "proxy_symbol": proxy_symbol,
            "session_date": latest_session_date.isoformat(),
            "last_bar_time": session.index[-1].isoformat(),
            "previous_close": round(previous_close, 2),
            "open": round(open_price, 2),
            "last_price": round(latest_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "opening_gap": round(opening_gap, 2),
            "intraday_return": round(intraday_return, 2),
            "daily_return": round(daily_return, 2),
            "range_pct": round(range_pct, 2),
            "avg_range_20": round(avg_range_20, 2),
            "range_expansion": round(range_expansion, 2),
            "range_position": round(range_position, 1),
            "vwap": round(vwap, 2),
            "vwap_distance": round(vwap_distance, 2),
            "first_hour_high": round(first_hour_high, 2),
            "first_hour_low": round(first_hour_low, 2),
            "balance_state": balance_state,
            "balance_break": balance_break,
            "volume": round(session_volume),
            "avg_volume_20": round(avg_volume_20),
            "volume_pace": round(volume_pace, 2),
            "elapsed_minutes": round(elapsed_minutes),
            "realized_vol_intraday": round(realized_vol_intraday, 2),
            "tape_pressure_score": tape_pressure_score,
            "regime": regime,
            "regime_color": color,
            "summary": summary,
            "indicators": indicators,
            "controls": controls,
            "methodology": "使用 QQQ 5 分钟线作为 NDX 可交易盘中代理，计算开盘缺口、VWAP 偏离、日内区间位置、首小时区间突破、成交节奏和日内波动扩张。该模块用于交易台执行和风险预算微调，不构成日内交易建议。",
        }
        risk_intraday_tape_cache["data"] = data
        risk_intraday_tape_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX intraday tape updated: {regime}, pressure {tape_pressure_score:.1f}")
    except Exception as e:
        logger.error(f"NDX intraday tape refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_volume_profile(rows, bin_count=32):
    low = safe_float(rows["Low"].min(), None)
    high = safe_float(rows["High"].max(), None)
    if low is None or high is None or high <= low:
        raise ValueError("Invalid price range for volume profile")

    bins = np.linspace(low, high, bin_count + 1)
    typical_price = (rows["High"] + rows["Low"] + rows["Close"]) / 3
    volumes = rows["Volume"].fillna(0)
    volume_by_bin = np.zeros(bin_count)

    for price, volume in zip(typical_price, volumes):
        idx = int(np.searchsorted(bins, price, side="right") - 1)
        idx = max(0, min(bin_count - 1, idx))
        volume_by_bin[idx] += safe_float(volume, 0)

    total_volume = safe_float(volume_by_bin.sum(), 0)
    if total_volume <= 0:
        raise ValueError("No usable volume for volume profile")

    centers = (bins[:-1] + bins[1:]) / 2
    poc_index = int(np.argmax(volume_by_bin))
    value_volume = volume_by_bin[poc_index]
    left = right = poc_index
    target_volume = total_volume * 0.70

    while value_volume < target_volume and (left > 0 or right < bin_count - 1):
        left_volume = volume_by_bin[left - 1] if left > 0 else -1
        right_volume = volume_by_bin[right + 1] if right < bin_count - 1 else -1
        if right_volume >= left_volume and right < bin_count - 1:
            right += 1
            value_volume += volume_by_bin[right]
        elif left > 0:
            left -= 1
            value_volume += volume_by_bin[left]
        else:
            break

    nodes = []
    max_volume = safe_float(volume_by_bin.max(), 1)
    for idx, volume in enumerate(volume_by_bin):
        share = volume / total_volume * 100
        nodes.append({
            "price": round(float(centers[idx]), 2),
            "low": round(float(bins[idx]), 2),
            "high": round(float(bins[idx + 1]), 2),
            "volume": round(float(volume)),
            "volume_share": round(float(share), 2),
            "relative_volume": round(float(volume / max_volume * 100), 1),
            "in_value_area": left <= idx <= right,
        })

    return {
        "poc": round(float(centers[poc_index]), 2),
        "value_area_low": round(float(bins[left]), 2),
        "value_area_high": round(float(bins[right + 1]), 2),
        "value_area_volume_pct": round(float(value_volume / total_volume * 100), 1),
        "total_volume": round(float(total_volume)),
        "nodes": nodes,
    }


def refresh_volume_profile_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_volume_profile_cache

    try:
        proxy_symbol = "QQQ"
        intraday = yf.Ticker(proxy_symbol).history(period="5d", interval="5m")
        if intraday is None or intraday.empty or "Close" not in intraday.columns or "Volume" not in intraday.columns:
            raise ValueError("No intraday QQQ data for volume profile")

        intraday = intraday.dropna(subset=["Close", "High", "Low"]).copy()
        intraday.index = pd.to_datetime(intraday.index).tz_localize(None)
        intraday["session_date"] = intraday.index.date
        if len(intraday) < 40:
            raise ValueError("Insufficient intraday rows for volume profile")

        latest_session_date = max(intraday["session_date"])
        session = intraday[intraday["session_date"] == latest_session_date].copy()
        if len(session) < 6:
            raise ValueError("Insufficient latest session rows for volume profile")

        profile = build_volume_profile(intraday.tail(390), bin_count=32)
        session_profile = build_volume_profile(session, bin_count=20)

        last_price = safe_float(session["Close"].iloc[-1], 0)
        open_price = safe_float(session["Open"].iloc[0], last_price)
        session_return = pct_change(last_price, open_price)
        range_low = safe_float(session["Low"].min(), last_price)
        range_high = safe_float(session["High"].max(), last_price)
        volume_series = session["Volume"].fillna(0)
        typical_price = (session["High"] + session["Low"] + session["Close"]) / 3
        session_vwap = safe_float((typical_price * volume_series).sum() / volume_series.sum(), last_price) if volume_series.sum() > 0 else last_price

        value_area_low = profile["value_area_low"]
        value_area_high = profile["value_area_high"]
        poc = profile["poc"]
        regime, color = volume_profile_regime(last_price, value_area_low, value_area_high, poc, session_return)
        distance_to_poc = pct_change(last_price, poc)
        distance_to_val = pct_change(last_price, value_area_low)
        distance_to_vah = pct_change(last_price, value_area_high)
        value_area_width_pct = (value_area_high - value_area_low) / last_price * 100 if last_price else 0

        if last_price > value_area_high:
            profile_pressure = clamp(35 - min(25, max(0, session_return) * 6) + max(0, abs(distance_to_vah) - 1.2) * 9, 20, 75)
            summary = f"QQQ 现价位于 5日价值区上方，若能维持在 {value_area_high:.2f} 上方，短线说明买盘接受更高价格。"
        elif last_price < value_area_low:
            profile_pressure = clamp(62 + max(0, -session_return) * 7 + max(0, abs(distance_to_val) - 1.0) * 8, 45, 92)
            summary = f"QQQ 现价跌到 5日价值区下方，{value_area_low:.2f} 变成修复线，下方成交稀疏区容易放大波动。"
        elif abs(distance_to_poc) <= 0.35:
            profile_pressure = 42
            summary = f"QQQ 围绕 5日 POC {poc:.2f} 成交，市场处于成交密集区均衡，方向信号需要等待价值区边界突破。"
        else:
            profile_pressure = clamp(48 + abs(distance_to_poc) * 3 - max(0, session_return) * 2, 30, 70)
            summary = f"QQQ 仍在 5日价值区内轮动，{value_area_low:.2f}-{value_area_high:.2f} 是当前最重要的接受区间。"

        high_volume_nodes = sorted(profile["nodes"], key=lambda row: row["volume"], reverse=True)[:6]
        high_volume_nodes = sorted(high_volume_nodes, key=lambda row: row["price"])
        nearest_node = min(profile["nodes"], key=lambda row: abs(row["price"] - last_price))
        low_volume_gaps = sorted(
            [row for row in profile["nodes"] if row["relative_volume"] <= 28],
            key=lambda row: abs(row["price"] - last_price),
        )[:5]
        nodes_window = sorted(
            sorted(profile["nodes"], key=lambda row: abs(row["price"] - last_price))[:14],
            key=lambda row: row["price"],
        )

        sessions = []
        for date_value, group in intraday.groupby("session_date"):
            if len(group) < 6:
                continue
            session_p = build_volume_profile(group, bin_count=18)
            session_open = safe_float(group["Open"].iloc[0], group["Close"].iloc[0])
            session_close = safe_float(group["Close"].iloc[-1], session_open)
            sessions.append({
                "date": date_value.isoformat(),
                "close": round(session_close, 2),
                "return": round(pct_change(session_close, session_open), 2),
                "poc": session_p["poc"],
                "value_area_low": session_p["value_area_low"],
                "value_area_high": session_p["value_area_high"],
                "volume": session_p["total_volume"],
            })

        controls = [
            f"价值区上沿 {value_area_high:.2f}：站稳上方说明买盘接受高价，跌回区内则视为突破失败。",
            f"POC {poc:.2f}：回到该区域意味着市场重新进入成交密集均衡区。",
            f"价值区下沿 {value_area_low:.2f}：跌破后应降低追涨执行强度，并检查 gamma put wall 和保护覆盖。",
            f"最近低量区在 {low_volume_gaps[0]['price']:.2f} 附近，若价格穿越低量区，盘中速度可能放大。",
        ] if low_volume_gaps else [
            f"价值区上沿 {value_area_high:.2f}：站稳上方说明买盘接受高价，跌回区内则视为突破失败。",
            f"POC {poc:.2f}：回到该区域意味着市场重新进入成交密集均衡区。",
            f"价值区下沿 {value_area_low:.2f}：跌破后应降低追涨执行强度，并检查 gamma put wall 和保护覆盖。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "proxy_symbol": proxy_symbol,
            "session_date": latest_session_date.isoformat(),
            "last_bar_time": session.index[-1].isoformat(),
            "last_price": round(last_price, 2),
            "open": round(open_price, 2),
            "session_return": round(session_return, 2),
            "session_low": round(range_low, 2),
            "session_high": round(range_high, 2),
            "session_vwap": round(session_vwap, 2),
            "profile_score": round(profile_pressure, 1),
            "regime": regime,
            "regime_color": color,
            "summary": summary,
            "poc": poc,
            "value_area_low": value_area_low,
            "value_area_high": value_area_high,
            "value_area_volume_pct": profile["value_area_volume_pct"],
            "value_area_width_pct": round(value_area_width_pct, 2),
            "distance_to_poc": round(distance_to_poc, 2),
            "distance_to_value_low": round(distance_to_val, 2),
            "distance_to_value_high": round(distance_to_vah, 2),
            "total_volume": profile["total_volume"],
            "session_poc": session_profile["poc"],
            "session_value_area_low": session_profile["value_area_low"],
            "session_value_area_high": session_profile["value_area_high"],
            "nearest_node": nearest_node,
            "high_volume_nodes": high_volume_nodes,
            "low_volume_gaps": low_volume_gaps,
            "nodes": nodes_window,
            "sessions": sessions[-5:],
            "controls": controls,
            "methodology": "使用 QQQ 5 分钟线作为 NDX 可交易代理，把最近 5 个交易日成交量按典型价格分箱，计算 POC、70% 价值区、成交密集节点和低量区。该模块用于识别价格接受/拒绝、盘中执行区间和成交密集支撑/阻力，不构成日内交易建议。",
        }
        risk_volume_profile_cache["data"] = data
        risk_volume_profile_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX volume profile updated: {regime}, score {profile_pressure:.1f}")
    except Exception as e:
        logger.error(f"NDX volume profile refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_liquidity_data():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_liquidity_cache

    try:
        proxy_symbol = "QQQ"
        history = fetch_ohlc_history(proxy_symbol, "6mo", min_rows=80, attempts=3)
        closes = history["Close"].dropna()
        volumes = history["Volume"].fillna(0) if "Volume" in history.columns else pd.Series(0, index=closes.index)
        highs = history["High"] if "High" in history.columns else closes
        lows = history["Low"] if "Low" in history.columns else closes

        aligned = pd.concat(
            {"close": closes, "volume": volumes, "high": highs, "low": lows},
            axis=1,
            join="inner",
        ).dropna()
        if len(aligned) < 80:
            raise ValueError("Insufficient QQQ history for liquidity analysis")

        closes = aligned["close"]
        volumes = aligned["volume"]
        highs = aligned["high"]
        lows = aligned["low"]
        returns = closes.pct_change() * 100
        latest_close = safe_float(closes.iloc[-1], 0)
        previous_close = safe_float(closes.iloc[-2], latest_close)
        latest_volume = safe_float(volumes.iloc[-1], 0)
        volume_avg20 = safe_float(volumes.tail(20).mean(), 0)
        volume_avg60 = safe_float(volumes.tail(60).mean(), 0)
        volume_std60 = safe_float(volumes.tail(60).std(), 0)
        volume_ratio_20 = latest_volume / volume_avg20 if volume_avg20 else 0
        volume_z_score = (latest_volume - volume_avg60) / volume_std60 if volume_std60 else 0
        dollar_volume_bn = latest_close * latest_volume / 1_000_000_000

        daily_return = pct_change(latest_close, previous_close)
        return_5d = pct_change(closes.iloc[-1], closes.iloc[-6]) if len(closes) >= 6 else daily_return
        return_20d = pct_change(closes.iloc[-1], closes.iloc[-21]) if len(closes) >= 21 else return_5d

        range_pct = (safe_float(highs.iloc[-1], latest_close) - safe_float(lows.iloc[-1], latest_close)) / latest_close * 100 if latest_close else 0
        range_series = (highs - lows) / closes * 100
        avg_range20 = safe_float(range_series.tail(20).mean(), range_pct)
        range_expansion = range_pct / avg_range20 if avg_range20 else 1

        tail_returns = returns.tail(20).fillna(0)
        tail_volumes = volumes.tail(20)
        previous_tail_volumes = volumes.shift(1).tail(20).fillna(0)
        up_volume = safe_float(tail_volumes[tail_returns > 0].sum(), 0)
        down_volume = safe_float(tail_volumes[tail_returns < 0].sum(), 0)
        total_tail_volume = safe_float(tail_volumes.sum(), 0)
        flow_balance = ((up_volume - down_volume) / total_tail_volume * 100) if total_tail_volume else 0
        accumulation_days = int(((tail_returns > 0.25) & (tail_volumes > previous_tail_volumes)).sum())
        distribution_days = int(((tail_returns < -0.25) & (tail_volumes > previous_tail_volumes)).sum())

        signed_volume = []
        for ret, volume in zip(returns.fillna(0), volumes):
            if ret > 0:
                signed_volume.append(volume)
            elif ret < 0:
                signed_volume.append(-volume)
            else:
                signed_volume.append(0)
        obv = pd.Series(signed_volume, index=closes.index).cumsum()
        obv_base_volume = safe_float(volumes.tail(20).sum(), 0)
        obv_20_change = ((obv.iloc[-1] - obv.iloc[-21]) / obv_base_volume * 100) if obv_base_volume and len(obv) >= 21 else 0

        flow_score = 50 + return_20d * 1.4 + flow_balance * 0.35 + (accumulation_days - distribution_days) * 3 + obv_20_change * 0.15
        if daily_return < 0 and volume_ratio_20 > 1.2:
            flow_score -= min(18, (volume_ratio_20 - 1) * 16)
        if daily_return < 0 and range_expansion > 1.25:
            flow_score -= min(10, (range_expansion - 1) * 10)
        if volume_ratio_20 < 0.65 and abs(return_20d) < 3:
            flow_score -= 5
        flow_score = round(clamp(flow_score), 1)

        regime, color = liquidity_regime(
            flow_score,
            distribution_days,
            accumulation_days,
            return_20d,
            volume_ratio_20,
            daily_return,
            range_expansion,
        )

        if regime == "量价确认":
            summary = "QQQ 量价结构对 NDX 风险偏好形成确认，上涨日成交占比和 OBV 方向较健康。"
        elif regime in ("派发压力", "下跌放量", "资金转弱"):
            summary = "QQQ 成交结构显示防守压力，上涨缺少成交确认或下跌日成交占比偏高。"
        elif regime == "缩量观望":
            summary = "QQQ 成交量低于近期均值，价格信号需要等待更明确的成交确认。"
        else:
            summary = "QQQ 流动性与成交结构处在均衡区，暂未显示极端放量派发或缩量失真。"

        if daily_return > 0 and volume_ratio_20 >= 1.1:
            volume_state = "放量上涨"
            volume_color = "green"
        elif daily_return < 0 and volume_ratio_20 >= 1.1:
            volume_state = "放量下跌"
            volume_color = "red"
        elif volume_ratio_20 < 0.75:
            volume_state = "缩量"
            volume_color = "amber"
        else:
            volume_state = "常态"
            volume_color = "blue"

        signals = [
            {
                "key": "volume",
                "label": "成交量倍率",
                "value": f"{volume_ratio_20:.2f}x",
                "state": volume_state,
                "color": volume_color,
                "detail": f"最新成交量 {latest_volume / 1_000_000:.1f}M，20日均量 {volume_avg20 / 1_000_000:.1f}M。",
            },
            {
                "key": "flow_balance",
                "label": "20日资金流平衡",
                "value": f"{flow_balance:+.1f}%",
                "state": "上行成交占优" if flow_balance > 12 else "下行成交占优" if flow_balance < -12 else "均衡",
                "color": "green" if flow_balance > 12 else "red" if flow_balance < -12 else "blue",
                "detail": "按上涨日成交量减下跌日成交量估算方向性成交占比。",
            },
            {
                "key": "distribution",
                "label": "放量派发天数",
                "value": f"{distribution_days}/20",
                "state": "偏高" if distribution_days >= 5 else "可控",
                "color": "red" if distribution_days >= 6 else "amber" if distribution_days >= 4 else "green",
                "detail": f"近20日放量上涨 {accumulation_days} 天，放量下跌 {distribution_days} 天。",
            },
            {
                "key": "range",
                "label": "日内振幅倍率",
                "value": f"{range_expansion:.2f}x",
                "state": "扩张" if range_expansion >= 1.25 else "收敛" if range_expansion <= 0.75 else "常态",
                "color": "amber" if range_expansion >= 1.25 else "green" if range_expansion <= 0.75 else "blue",
                "detail": f"最新振幅 {range_pct:.2f}%，20日均值 {avg_range20:.2f}%。",
            },
            {
                "key": "obv",
                "label": "OBV 方向",
                "value": f"{obv_20_change:+.1f}%",
                "state": "改善" if obv_20_change > 8 else "走弱" if obv_20_change < -8 else "横盘",
                "color": "green" if obv_20_change > 8 else "red" if obv_20_change < -8 else "blue",
                "detail": "用方向性成交量累计变化观察量价背离，不代表真实申赎资金流。",
            },
        ]

        controls = [
            f"若 QQQ 继续上涨但成交量倍率低于 0.75x，需降低突破确认度。",
            f"若近 20 日放量派发天数升至 6 天以上，优先收缩短线风险预算。",
            f"若日内振幅倍率高于 1.25x 且收跌，说明波动扩张开始压制流动性承接。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "proxy_symbol": proxy_symbol,
            "price_date": str(closes.index[-1].date()),
            "price": round(latest_close, 2),
            "daily_return": round(daily_return, 2),
            "return_5d": round(return_5d, 2),
            "return_20d": round(return_20d, 2),
            "volume": round(latest_volume),
            "volume_avg20": round(volume_avg20),
            "volume_avg60": round(volume_avg60),
            "volume_ratio_20": round(volume_ratio_20, 2),
            "volume_z_score": round(volume_z_score, 2),
            "dollar_volume_bn": round(dollar_volume_bn, 2),
            "range_pct": round(range_pct, 2),
            "avg_range20": round(avg_range20, 2),
            "range_expansion": round(range_expansion, 2),
            "flow_balance": round(flow_balance, 1),
            "accumulation_days": accumulation_days,
            "distribution_days": distribution_days,
            "obv_20_change": round(obv_20_change, 1),
            "flow_score": flow_score,
            "regime": regime,
            "regime_color": color,
            "summary": summary,
            "signals": signals,
            "controls": controls,
            "methodology": "使用 QQQ 作为 NDX 可交易流动性代理，基于最近 6 个月日线计算成交量倍率、成交额、日内振幅、20 日上涨/下跌成交量平衡、放量派发天数和 OBV 方向。该模块衡量量价确认，不代表真实 ETF 申赎或机构订单流。",
        }
        risk_liquidity_cache["data"] = data
        risk_liquidity_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX liquidity proxy updated: {regime}, score {flow_score:.1f}")
    except Exception as e:
        logger.error(f"NDX liquidity proxy refresh failed: {e}")
        logger.error(traceback.format_exc())


def build_pillar(key, label, score, comment, metrics):
    normalized_score = round(clamp(score), 1)
    return {
        "key": key,
        "label": label,
        "score": normalized_score,
        "level": risk_label(normalized_score),
        "color": risk_color(normalized_score),
        "comment": comment,
        "metrics": metrics,
    }

def refresh_risk_diagnostics():
    os.environ['HTTP_PROXY'] = ''; os.environ['HTTPS_PROXY'] = ''
    global risk_diagnostics_cache

    try:
        ndx_hist = yf.Ticker("^NDX").history(period="1y")
        if ndx_hist is None or ndx_hist.empty or "Close" not in ndx_hist.columns:
            raise ValueError("NDX history unavailable for diagnostics")

        closes = ndx_hist["Close"].dropna()
        if closes.empty:
            raise ValueError("NDX close history unavailable for diagnostics")

        latest = float(closes.iloc[-1])
        ma50 = float(closes.rolling(50).mean().iloc[-1]) if len(closes) >= 50 else float(closes.mean())
        ma200 = float(closes.rolling(200).mean().iloc[-1]) if len(closes) >= 200 else float(closes.mean())
        distance_50 = pct_change(latest, ma50)
        distance_200 = pct_change(latest, ma200)
        one_month_return = pct_change(latest, float(closes.iloc[-22])) if len(closes) > 22 else 0
        three_month_return = pct_change(latest, float(closes.iloc[-64])) if len(closes) > 64 else 0

        if latest >= ma50 and ma50 >= ma200:
            trend_score = 25
            trend_comment = "价格位于 50/200 日均线上方，趋势结构仍偏多。"
        elif latest >= ma50:
            trend_score = 45
            trend_comment = "价格站上 50 日线，但中长期结构仍需确认。"
        elif latest >= ma200:
            trend_score = 60
            trend_comment = "价格跌破 50 日线，短线趋势进入修复观察区。"
        else:
            trend_score = 82
            trend_comment = "价格跌破 200 日线，趋势结构转弱，需要优先控制回撤。"

        if distance_50 > 8:
            trend_score += 8
            trend_comment = "价格显著高于 50 日线，趋势虽强但追高风险上升。"
        if one_month_return < -5:
            trend_score += 8
        if three_month_return < -10:
            trend_score += 8

        returns = closes.pct_change().dropna()
        vol20 = float(returns.tail(20).std() * (252 ** 0.5) * 100) if len(returns) >= 20 else 0
        vol60 = float(returns.tail(60).std() * (252 ** 0.5) * 100) if len(returns) >= 60 else vol20
        try:
            vix_price = safe_float(yf.Ticker("^VIX").fast_info.last_price, None)
        except Exception as e:
            logger.error(f"VIX diagnostics fetch error: {e}")
            vix_price = None

        if vol20 < 18:
            volatility_score = 25
            volatility_comment = "20 日实现波动率处于低位，短线风险定价较温和。"
        elif vol20 < 25:
            volatility_score = 45
            volatility_comment = "波动率回到常态区间，适合用仓位纪律管理日内扰动。"
        elif vol20 < 35:
            volatility_score = 68
            volatility_comment = "实现波动率偏高，指数对利率和权重股消息更敏感。"
        else:
            volatility_score = 86
            volatility_comment = "波动率处于压力区，组合需要优先考虑尾部风险和止损纪律。"

        if vix_price is not None and vix_price >= 25:
            volatility_score += 8
        elif vix_price is not None and vix_price <= 14:
            volatility_score -= 5

        high_52w = float(closes.max())
        low_52w = float(closes.min())
        drawdown = pct_change(latest, high_52w)
        drawdown_depth = abs(min(drawdown, 0))

        if drawdown_depth < 5:
            drawdown_score = 28
            drawdown_comment = "指数距离 52 周高点较近，尚未出现系统性回撤压力。"
        elif drawdown_depth < 10:
            drawdown_score = 45
            drawdown_comment = "回撤进入温和区间，适合观察支撑位和资金回流强度。"
        elif drawdown_depth < 18:
            drawdown_score = 67
            drawdown_comment = "回撤压力偏高，需要关注是否演化为中期趋势破位。"
        else:
            drawdown_score = 88
            drawdown_comment = "指数已进入深度回撤，风险预算和再平衡节奏比择时更重要。"

        if not watchlist_cache.get("data"):
            refresh_watchlist_data()
        watchlist = watchlist_cache.get("data", [])
        total = len(watchlist)
        advancers = len([item for item in watchlist if safe_float(item.get("percent"), -999) >= 0])
        avg_change = sum(safe_float(item.get("percent"), 0) for item in watchlist) / total if total else 0
        breadth_ratio = advancers / total if total else 0.5

        if breadth_ratio >= 0.65:
            breadth_score = 25
            breadth_comment = "MAG7 上涨家数占优，权重股广度对指数构成支撑。"
        elif breadth_ratio >= 0.45:
            breadth_score = 45
            breadth_comment = "权重股涨跌分化，指数需要观察龙头之间的轮动质量。"
        elif breadth_ratio >= 0.25:
            breadth_score = 68
            breadth_comment = "多数权重股走弱，指数上涨若只靠少数股票会降低持续性。"
        else:
            breadth_score = 86
            breadth_comment = "MAG7 广度明显转弱，组合层面需要降低单一主题暴露。"

        if avg_change < -1.5:
            breadth_score += 8
        elif avg_change > 1:
            breadth_score -= 5

        sorted_watchlist = sorted(watchlist, key=lambda item: safe_float(item.get("percent"), 0), reverse=True)
        leaders = [
            {"symbol": item.get("symbol"), "percent": round_optional(item.get("percent"), 2)}
            for item in sorted_watchlist[:2]
        ]
        laggards = [
            {"symbol": item.get("symbol"), "percent": round_optional(item.get("percent"), 2)}
            for item in sorted_watchlist[-2:]
        ]

        pillars = [
            build_pillar(
                "trend",
                "趋势结构",
                trend_score,
                trend_comment,
                [
                    {"label": "距50日线", "value": f"{distance_50:+.1f}%"},
                    {"label": "距200日线", "value": f"{distance_200:+.1f}%"},
                    {"label": "1个月", "value": f"{one_month_return:+.1f}%"},
                    {"label": "3个月", "value": f"{three_month_return:+.1f}%"},
                ],
            ),
            build_pillar(
                "volatility",
                "波动压力",
                volatility_score,
                volatility_comment,
                [
                    {"label": "20日波动", "value": f"{vol20:.1f}%"},
                    {"label": "60日波动", "value": f"{vol60:.1f}%"},
                    {"label": "VIX", "value": f"{vix_price:.1f}" if vix_price is not None else "--"},
                ],
            ),
            build_pillar(
                "drawdown",
                "回撤压力",
                drawdown_score,
                drawdown_comment,
                [
                    {"label": "距52周高点", "value": f"{drawdown:.1f}%"},
                    {"label": "52周高点", "value": f"{high_52w:,.0f}"},
                    {"label": "52周低点", "value": f"{low_52w:,.0f}"},
                ],
            ),
            build_pillar(
                "breadth",
                "权重股广度",
                breadth_score,
                breadth_comment,
                [
                    {"label": "上涨家数", "value": f"{advancers}/{total}" if total else "--"},
                    {"label": "平均涨跌", "value": f"{avg_change:+.2f}%"},
                    {"label": "领涨", "value": ", ".join(item["symbol"] for item in leaders if item.get("symbol")) or "--"},
                    {"label": "拖累", "value": ", ".join(item["symbol"] for item in laggards if item.get("symbol")) or "--"},
                ],
            ),
        ]

        composite_score = round(sum(pillar["score"] for pillar in pillars) / len(pillars), 1)
        data = {
            "as_of": datetime.utcnow().isoformat(),
            "price_date": ndx_hist.index[-1].date().isoformat(),
            "index": round(latest, 2),
            "risk_score": composite_score,
            "risk_level": risk_label(composite_score),
            "risk_color": risk_color(composite_score),
            "summary": (
                f"综合风险 {composite_score:.1f}/100，{risk_label(composite_score)}。"
                f"趋势分 {pillars[0]['score']:.1f}，波动分 {pillars[1]['score']:.1f}，"
                f"回撤分 {pillars[2]['score']:.1f}，广度分 {pillars[3]['score']:.1f}。"
            ),
            "leaders": leaders,
            "laggards": laggards,
            "pillars": pillars,
        }
        risk_diagnostics_cache["data"] = data
        risk_diagnostics_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX risk diagnostics updated: {composite_score:.1f}")
    except Exception as e:
        logger.error(f"NDX risk diagnostics refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_risk_scenarios():
    global risk_scenarios_cache

    try:
        if not cache_is_fresh(risk_diagnostics_cache, 15 * 60):
            refresh_risk_diagnostics()

        diagnostics = risk_diagnostics_cache.get("data")
        if not diagnostics:
            raise ValueError("Risk diagnostics unavailable for scenario analysis")

        with app.app_context():
            metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()

        index_value = safe_float(diagnostics.get("index"), 0)
        if index_value <= 0:
            raise ValueError("Invalid NDX index value for scenario analysis")

        trend = get_diagnostic_pillar(diagnostics, "trend")
        volatility = get_diagnostic_pillar(diagnostics, "volatility")
        drawdown = get_diagnostic_pillar(diagnostics, "drawdown")
        breadth = get_diagnostic_pillar(diagnostics, "breadth")

        risk_score = safe_float(diagnostics.get("risk_score"), 50)
        trend_score = safe_float(trend.get("score"), 50)
        volatility_score = safe_float(volatility.get("score"), 50)
        drawdown_score = safe_float(drawdown.get("score"), 50)
        breadth_score = safe_float(breadth.get("score"), 50)
        yield_buffer = safe_float(metric.yield_score, 50) if metric else 50
        rate_pressure = clamp(100 - yield_buffer)

        base_down = -(1.2 + risk_score / 45)
        base_up = 1.5 + max(0, 70 - risk_score) / 28
        rate_down = -(2.5 + rate_pressure / 18 + volatility_score / 65)
        rate_up = -0.4
        vol_down = -(3.0 + volatility_score / 10 + drawdown_score / 55)
        vol_up = -(0.8 + volatility_score / 80)
        breadth_down = -(0.8 + breadth_score / 45)
        breadth_up = 1.8 + max(0, breadth_score - 35) / 16
        trend_down = -(2.8 + trend_score / 14 + volatility_score / 45)
        trend_up = -0.6

        scenarios = [
            build_scenario(
                "base_case",
                "基准延续",
                "Base Case",
                base_down,
                base_up,
                risk_color(risk_score),
                "中",
                ["风险分维持在当前区间", "VIX 未明显上行", "MAG7 未出现同步破位"],
                "维持核心仓位，新增风险预算分批投入，避免用单日涨跌调整整体方向。",
                "当前综合风险用于估计正常波动区间，上下沿随风险分自动收窄或放大。",
                index_value,
            ),
            build_scenario(
                "rate_shock",
                "利率重新上行",
                "Macro Shock",
                rate_down,
                rate_up,
                "amber" if rate_pressure < 70 else "red",
                "中低",
                ["10Y 利率重新逼近阶段高点", "美元指数走强", "高估值成长股估值压缩"],
                "压低追高仓位，优先保留现金流和盈利可见度更高的权重资产。",
                f"当前利率缓冲分 {yield_buffer:.1f}，缓冲越低时估值久期资产对利率越敏感。",
                index_value,
            ),
            build_scenario(
                "volatility_spike",
                "波动率冲击",
                "Volatility Shock",
                vol_down,
                vol_up,
                "amber" if volatility_score < 75 else "red",
                "中",
                ["VIX 快速上行", "20 日实现波动率继续抬升", "盘中振幅扩大且收盘走弱"],
                "缩短再平衡周期，降低杠杆和集中敞口，先保护最大回撤再讨论进攻。",
                f"波动压力分 {volatility_score:.1f}，反映指数对消息面和流动性的敏感度。",
                index_value,
            ),
            build_scenario(
                "breadth_repair",
                "权重股广度修复",
                "Breadth Repair",
                breadth_down,
                breadth_up,
                "green" if breadth_score >= 55 else "blue",
                "中",
                ["MAG7 上涨家数扩散", "NVDA/MSFT/AAPL 之外的权重股跟涨", "指数上涨伴随成交改善"],
                "把观察重点放在轮动质量，若广度改善可逐步恢复进攻性仓位。",
                f"广度分 {breadth_score:.1f}，当前广度越弱，修复时对指数的边际贡献越大。",
                index_value,
            ),
            build_scenario(
                "trend_break",
                "趋势破位",
                "Trend Break",
                trend_down,
                trend_up,
                "red" if trend_score >= 60 else "amber",
                "低",
                ["指数跌破 50 日线且无法快速收复", "回撤分继续上升", "权重股跌幅同步扩大"],
                "降低单边 beta，设定明确的再入场条件，避免在破位初期摊平风险。",
                f"趋势分 {trend_score:.1f}、回撤分 {drawdown_score:.1f} 共同决定破位压力。",
                index_value,
            ),
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round(index_value, 2),
            "risk_score": round(risk_score, 1),
            "risk_level": diagnostics.get("risk_level", risk_label(risk_score)),
            "summary": "基于当前 NDX 风险诊断生成 5 个压力情景，用于检查仓位在宏观、波动、广度和趋势变化下的承压范围。",
            "scenarios": scenarios,
        }
        risk_scenarios_cache["data"] = data
        risk_scenarios_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX scenario analysis updated: {len(scenarios)} scenarios")
    except Exception as e:
        logger.error(f"NDX scenario analysis refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_risk_budget():
    global risk_budget_cache

    try:
        if not cache_is_fresh(risk_scenarios_cache, 15 * 60):
            refresh_risk_scenarios()

        scenarios = risk_scenarios_cache.get("data")
        diagnostics = risk_diagnostics_cache.get("data")
        if not scenarios or not diagnostics:
            raise ValueError("Scenario or diagnostic data unavailable for risk budget")

        index_value = safe_float(scenarios.get("index"), 0)
        risk_score = safe_float(scenarios.get("risk_score"), 50)
        risk_level = scenarios.get("risk_level", risk_label(risk_score))
        scenario_items = scenarios.get("scenarios", [])

        worst_low = min(
            [safe_float(item.get("ndx_range", {}).get("low"), index_value) for item in scenario_items],
            default=index_value,
        )
        best_high = max(
            [safe_float(item.get("ndx_range", {}).get("high"), index_value) for item in scenario_items],
            default=index_value,
        )
        downside_pct = abs(min(pct_change(worst_low, index_value), 0))
        upside_pct = max(pct_change(best_high, index_value), 0)

        breadth = get_diagnostic_pillar(diagnostics, "breadth")
        volatility = get_diagnostic_pillar(diagnostics, "volatility")
        trend = get_diagnostic_pillar(diagnostics, "trend")
        breadth_score = safe_float(breadth.get("score"), 50)
        volatility_score = safe_float(volatility.get("score"), 50)
        trend_score = safe_float(trend.get("score"), 50)

        stress_penalty = downside_pct * 0.8 + max(0, volatility_score - 50) * 0.12 + max(0, breadth_score - 60) * 0.08
        trend_bonus = max(0, 45 - trend_score) * 0.12

        conservative_upper = clamp(52 - risk_score * 0.28 - stress_penalty + trend_bonus, 10, 45)
        balanced_upper = clamp(78 - risk_score * 0.34 - stress_penalty + trend_bonus, 20, 68)
        growth_upper = clamp(102 - risk_score * 0.38 - stress_penalty + trend_bonus, 35, 88)

        conservative_lower = clamp(conservative_upper - 14, 0, conservative_upper)
        balanced_lower = clamp(balanced_upper - 20, 10, balanced_upper)
        growth_lower = clamp(growth_upper - 25, 20, growth_upper)

        cash_base = clamp(20 + risk_score * 0.2 + downside_pct * 0.8, 15, 55)
        profiles = [
            exposure_profile(
                "防守型",
                "defensive",
                conservative_lower,
                conservative_upper,
                cash_base + 10,
                downside_pct * conservative_upper / 100,
                "风险分高于 60 或跌破 50 日线时，把仓位压向区间下沿。",
                "可用现金、短久期债券或货币基金承接等待区间。",
                "更重视回撤控制、未来 3-6 个月有资金使用需求的投资者。",
                "green",
            ),
            exposure_profile(
                "均衡型",
                "balanced",
                balanced_lower,
                balanced_upper,
                cash_base,
                downside_pct * balanced_upper / 100,
                "仓位超过上沿 5 个百分点或波动分高于 75 时再平衡。",
                "用分批买入替代一次性加仓，优先控制 MAG7 集中度。",
                "希望保留 NDX 长期成长暴露，同时能接受中等波动的投资者。",
                "blue",
            ),
            exposure_profile(
                "进取型",
                "growth",
                growth_lower,
                growth_upper,
                max(8, cash_base - 12),
                downside_pct * growth_upper / 100,
                "只有在广度修复且风险分低于 45 时，才考虑靠近区间上沿。",
                "若使用杠杆或期权，需要把波动率冲击情景作为硬约束。",
                "投资期限较长、能承受较大净值波动并有再平衡纪律的投资者。",
                "amber",
            ),
        ]

        controls = [
            f"当前压力测试最差区间约为 -{downside_pct:.1f}%，风险预算应先按该回撤承受力倒推仓位。",
            f"上行情景高点约 +{upside_pct:.1f}%，若广度未修复，不宜单纯因上涨扩大仓位。",
            "仓位区间是风险预算，不是买卖指令；实际组合还需考虑现金流、税务和持仓成本。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round(index_value, 2),
            "risk_score": round(risk_score, 1),
            "risk_level": risk_level,
            "stress_downside": round(downside_pct, 1),
            "stress_upside": round(upside_pct, 1),
            "summary": (
                f"以当前 {risk_level} 风险状态和 {downside_pct:.1f}% 压力回撤为约束，"
                "将 NDX 暴露拆成防守、均衡、进取三档预算。"
            ),
            "profiles": profiles,
            "controls": controls,
        }
        risk_budget_cache["data"] = data
        risk_budget_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX risk budget updated: downside {downside_pct:.1f}%")
    except Exception as e:
        logger.error(f"NDX risk budget refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_scenario_map_data(allow_dependency_refresh=True):
    global risk_scenario_map_cache

    try:
        dependencies = [
            ("scenarios", risk_scenarios_cache, refresh_risk_scenarios, 15 * 60),
            ("regime", risk_regime_compass_cache, refresh_regime_compass_data, 15 * 60),
            ("alerts", risk_alerts_cache, refresh_alerts_data, 15 * 60),
            ("budget", risk_budget_cache, refresh_risk_budget, 15 * 60),
        ]
        light_dependencies = {"scenarios", "regime", "alerts"}
        dependency_status = []
        for key, cache, refresher, ttl in dependencies:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    if key == "regime":
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    elif key == "alerts":
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    else:
                        refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Scenario map dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        scenarios = risk_scenarios_cache.get("data") or {}
        scenario_items = scenarios.get("scenarios") or []
        if not scenario_items:
            return

        regime = risk_regime_compass_cache.get("data") or {}
        alerts = risk_alerts_cache.get("data") or {}
        budget = risk_budget_cache.get("data") or {}

        regime_score = safe_float(regime.get("regime_score"), 50)
        pressure_score = safe_float(regime.get("pressure_score"), 50)
        support_score = safe_float(regime.get("support_score"), 50)
        alert_score = safe_float(alerts.get("alert_score"), 45)
        stress_downside = safe_float(budget.get("stress_downside"), None)

        base_weights = {
            "base_case": 34,
            "rate_shock": 14,
            "volatility_spike": 18,
            "breadth_repair": 20,
            "trend_break": 14,
        }
        pressure_adjustment = max(0, pressure_score - 50) * 0.28 + max(0, alert_score - 50) * 0.22
        support_adjustment = max(0, support_score - 50) * 0.22 + max(0, regime_score - 55) * 0.18

        weights = dict(base_weights)
        weights["volatility_spike"] += pressure_adjustment * 0.9
        weights["trend_break"] += pressure_adjustment * 0.75
        weights["rate_shock"] += pressure_adjustment * 0.55
        weights["base_case"] += max(0, 64 - alert_score) * 0.18
        weights["breadth_repair"] += support_adjustment
        if regime.get("regime") in ("扩张顺风", "趋势持有", "修复观察"):
            weights["base_case"] += 4
            weights["breadth_repair"] += 3
        if regime.get("regime") in ("高位脆弱", "风险收缩"):
            weights["volatility_spike"] += 5
            weights["trend_break"] += 5
            weights["base_case"] -= 5

        total_weight = sum(max(1, value) for value in weights.values())
        probability_map = {key: max(1, value) / total_weight * 100 for key, value in weights.items()}

        mapped = []
        for item in scenario_items:
            key = item.get("key")
            probability = probability_map.get(key, 100 / len(scenario_items))
            midpoint = safe_float(item.get("midpoint_move"), 0)
            low = safe_float(item.get("ndx_range", {}).get("low"), 0)
            high = safe_float(item.get("ndx_range", {}).get("high"), 0)
            contribution = midpoint * probability / 100
            mapped.append({
                "key": key,
                "name": item.get("name"),
                "category": item.get("category"),
                "color": item.get("color", "blue"),
                "probability_pct": round(probability, 1),
                "midpoint_move": round(midpoint, 1),
                "expected_contribution": round(contribution, 2),
                "ndx_range": item.get("ndx_range"),
                "range_low": round(low, 2),
                "range_high": round(high, 2),
                "trigger_count": len(item.get("triggers") or []),
                "response": item.get("response"),
                "rationale": item.get("rationale"),
            })

        expected_move = sum(item["expected_contribution"] for item in mapped)
        downside_probability = sum(item["probability_pct"] for item in mapped if item["midpoint_move"] < 0)
        upside_probability = sum(item["probability_pct"] for item in mapped if item["midpoint_move"] > 0)
        worst = min(mapped, key=lambda item: item["range_low"])
        best = max(mapped, key=lambda item: item["range_high"])
        dominant = max(mapped, key=lambda item: item["probability_pct"])
        stress_downside = stress_downside if stress_downside is not None else abs(min(safe_float(worst["midpoint_move"], 0), 0))
        probability_weighted_low = sum(item["range_low"] * item["probability_pct"] / 100 for item in mapped)
        probability_weighted_high = sum(item["range_high"] * item["probability_pct"] / 100 for item in mapped)

        if expected_move >= 1.2 and upside_probability > downside_probability:
            posture = "上行偏斜"
            color = "green"
            summary = f"概率加权路径偏上行，主导情景为 {dominant['name']}，但仍需要用 {worst['name']} 的下沿约束风险预算。"
        elif expected_move <= -1.2 or downside_probability >= 58:
            posture = "下行偏斜"
            color = "red" if downside_probability >= 65 else "amber"
            summary = f"概率加权路径偏下行，{worst['name']} 是主要尾部压力，新增风险预算应等待触发线改善。"
        else:
            posture = "双向拉锯"
            color = "blue"
            summary = f"情景概率处在拉锯区，{dominant['name']} 权重最高，但上下行情景仍相互抵消。"

        controls = [
            f"若 {worst['name']} 的触发条件出现，应按压力回撤 -{stress_downside:.1f}% 重新约束仓位。",
            f"若 {best['name']} 的确认项出现，可把新增风险预算从观察仓位升级为均衡仓位。",
            "概率权重来自当前风险模块状态，不是统计预测；需要与收盘价、成交确认和风险预算一起使用。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": scenarios.get("index"),
            "risk_score": scenarios.get("risk_score"),
            "posture": posture,
            "posture_color": color,
            "expected_move": round(expected_move, 2),
            "downside_probability": round(downside_probability, 1),
            "upside_probability": round(upside_probability, 1),
            "probability_weighted_low": round(probability_weighted_low, 2),
            "probability_weighted_high": round(probability_weighted_high, 2),
            "dominant_scenario": dominant["name"],
            "worst_scenario": worst["name"],
            "best_scenario": best["name"],
            "stress_downside": round(stress_downside, 1),
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "summary": summary,
            "scenarios": sorted(mapped, key=lambda item: item["probability_pct"], reverse=True),
            "controls": controls,
            "methodology": "基于现有 NDX 压力情景，结合市场状态罗盘、风险预警和风险预算，对 5 个情景重新分配概率权重，计算概率加权涨跌、上下行概率和尾部下沿。该模块用于组合情景管理，不构成预测或交易建议。",
        }
        risk_scenario_map_cache["data"] = data
        risk_scenario_map_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX scenario probability map updated: {posture}, expected {expected_move:.2f}%")
    except Exception as e:
        logger.error(f"NDX scenario probability map refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_recovery_path_data(allow_dependency_refresh=True):
    global risk_recovery_path_cache

    try:
        dependencies = [
            ("levels", risk_levels_cache, refresh_technical_levels, 15 * 60),
            ("tail", risk_tail_cache, refresh_tail_risk_data, 15 * 60),
            ("scenario_map", risk_scenario_map_cache, refresh_scenario_map_data, 15 * 60),
            ("scenarios", risk_scenarios_cache, refresh_risk_scenarios, 15 * 60),
            ("budget", risk_budget_cache, refresh_risk_budget, 15 * 60),
            ("hedge", risk_hedge_overlay_cache, refresh_hedge_overlay_data, 15 * 60),
            ("alerts", risk_alerts_cache, refresh_alerts_data, 15 * 60),
            ("regime", risk_regime_compass_cache, refresh_regime_compass_data, 15 * 60),
        ]
        light_dependencies = {"levels", "tail", "scenario_map", "scenarios", "budget", "alerts", "regime"}
        dependency_status = []
        for key, cache, refresher, ttl in dependencies:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    if key == "scenario_map":
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    elif key in ("alerts", "regime"):
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    else:
                        refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Recovery path dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        if dependency_status.count("ok") < 4:
            return

        levels = risk_levels_cache.get("data") or {}
        tail = risk_tail_cache.get("data") or {}
        scenario_map = risk_scenario_map_cache.get("data") or {}
        scenarios = risk_scenarios_cache.get("data") or {}
        budget = risk_budget_cache.get("data") or {}
        hedge = risk_hedge_overlay_cache.get("data") or {}
        alerts = risk_alerts_cache.get("data") or {}
        regime = risk_regime_compass_cache.get("data") or {}

        index_value = safe_float(levels.get("index"), None)
        if not index_value:
            index_value = safe_float(scenario_map.get("index"), None)
        if not index_value:
            index_value = safe_float(scenarios.get("index"), None)
        if not index_value:
            return

        support_levels = levels.get("support_levels") or []
        resistance_levels = levels.get("resistance_levels") or []
        moving_averages = levels.get("moving_averages") or []
        nearest_support = support_levels[0] if support_levels else {}
        nearest_resistance = resistance_levels[0] if resistance_levels else {}

        support_value = safe_float(nearest_support.get("value"), None)
        resistance_value = safe_float(nearest_resistance.get("value"), None)
        ma20 = next((item for item in moving_averages if item.get("window") == 20), None)
        ma50 = next((item for item in moving_averages if item.get("window") == 50), None)
        ma200 = next((item for item in moving_averages if item.get("window") == 200), None)
        ma20_value = safe_float(ma20.get("value") if ma20 else None, None)
        ma50_value = safe_float(ma50.get("value") if ma50 else None, None)
        ma200_value = safe_float(ma200.get("value") if ma200 else None, None)

        scenario_items = scenarios.get("scenarios") or []
        scenario_lows = [
            safe_float(item.get("ndx_range", {}).get("low"), None)
            for item in scenario_items
        ]
        scenario_highs = [
            safe_float(item.get("ndx_range", {}).get("high"), None)
            for item in scenario_items
        ]
        scenario_lows = [value for value in scenario_lows if value]
        scenario_highs = [value for value in scenario_highs if value]

        weighted_low = safe_float(scenario_map.get("probability_weighted_low"), None)
        weighted_high = safe_float(scenario_map.get("probability_weighted_high"), None)
        expected_move = safe_float(scenario_map.get("expected_move"), 0)
        stress_downside = safe_float(scenario_map.get("stress_downside"), None)
        if stress_downside is None:
            stress_downside = safe_float(budget.get("stress_downside"), 0)

        stress_candidates = [value for value in [weighted_low, min(scenario_lows) if scenario_lows else None] if value]
        stress_line = min(stress_candidates) if stress_candidates else index_value * (1 - stress_downside / 100)
        invalidation_candidates = [value for value in [support_value, weighted_low, ma50_value] if value and value < index_value]
        invalidation_line = max(invalidation_candidates) if invalidation_candidates else index_value * 0.985

        repair_candidates = [
            value for value in [ma20_value, ma50_value, resistance_value]
            if value and value > index_value * 0.998
        ]
        repair_line = min(repair_candidates, key=lambda value: abs(value - index_value)) if repair_candidates else index_value * 1.015
        confirmation_candidates = [
            value for value in [resistance_value, weighted_high, max(scenario_highs) if scenario_highs else None]
            if value and value > repair_line
        ]
        confirmation_line = min(confirmation_candidates, key=lambda value: abs(value - index_value)) if confirmation_candidates else max(repair_line * 1.012, index_value * 1.03)
        target_candidates = [value for value in [weighted_high, max(scenario_highs) if scenario_highs else None, resistance_value] if value and value > index_value]
        recovery_target = max(target_candidates) if target_candidates else confirmation_line

        distance_to_invalidation = pct_change(invalidation_line, index_value)
        distance_to_repair = pct_change(repair_line, index_value)
        distance_to_confirmation = pct_change(confirmation_line, index_value)
        distance_to_stress = pct_change(stress_line, index_value)
        distance_to_target = pct_change(recovery_target, index_value)
        support_cushion = max(0, -distance_to_invalidation)

        zone_score = safe_float(levels.get("zone_score"), 50)
        regime_score = safe_float(regime.get("regime_score"), 50)
        alert_score = safe_float(alerts.get("alert_score"), 45)
        tail_score = safe_float(tail.get("tail_score"), 45)
        recovery_score = round(clamp(
            38
            + zone_score * 0.22
            + regime_score * 0.18
            - alert_score * 0.16
            - tail_score * 0.10
            + max(0, expected_move) * 3.2
            - max(0, -expected_move) * 4.2
            + min(8, support_cushion * 1.4)
            - max(0, 1.2 - support_cushion) * 3.0
        ), 1)
        recovery_regime, recovery_color = recovery_path_regime(recovery_score)

        if recovery_regime == "修复确认":
            summary = "NDX 已接近或站上修复确认区，回撤路径的重点从防守转向确认后分批恢复风险预算。"
        elif recovery_regime == "高位修复":
            summary = "NDX 仍在高位修复区，结构尚可，但新增仓位应绑定失效线和确认线，避免追涨。"
        elif recovery_regime == "支撑测试":
            summary = "NDX 正在测试支撑和修复线，组合应先确认失效线没有被收盘跌破，再讨论恢复中性仓位。"
        else:
            summary = "NDX 回撤路径偏弱，当前应把压力下沿、现金缓冲和对冲覆盖放在收益目标之前。"

        def path_level(key, label, value, color, usage):
            distance = pct_change(value, index_value)
            return {
                "key": key,
                "label": label,
                "value": round(value, 2),
                "distance": round(distance, 2),
                "distance_label": f"{distance:+.2f}%",
                "color": color,
                "usage": usage,
            }

        path_levels = [
            path_level("stress", "压力下沿", stress_line, "red", "压力情景和保证金缓冲的参考下沿。"),
            path_level("invalidation", "失效线", invalidation_line, "amber", "收盘跌破后，风险预算应向防守区间下沿收缩。"),
            path_level("repair", "修复线", repair_line, "blue", "收复后可从防守观察恢复到中性观察。"),
            path_level("confirmation", "确认线", confirmation_line, "green", "站稳后才允许把新增风险预算升级为均衡/进取。"),
            path_level("target", "概率上沿", recovery_target, "green", "情景概率上沿，用于止盈和仓位上限管理。"),
        ]

        profiles = budget.get("profiles") or []
        profile_map = {profile.get("key"): profile for profile in profiles}

        def exposure_label(key, fallback):
            return profile_map.get(key, {}).get("exposure", {}).get("label", fallback)

        ladder = [
            {
                "key": "defensive",
                "label": "防守再入场",
                "color": "amber" if recovery_color != "red" else "red",
                "trigger": f"接近 {path_levels[1]['label']} 但未收盘跌破，或压力预警开始下降。",
                "max_exposure": exposure_label("defensive", "15% - 40%"),
                "action": "只保留核心 NDX 暴露，新增资金分批等待修复线确认。",
            },
            {
                "key": "balanced",
                "label": "中性恢复",
                "color": "blue",
                "trigger": f"收盘重新站上 {repair_line:,.0f}，且预警分低于 58 或确认项增加。",
                "max_exposure": exposure_label("balanced", "35% - 65%"),
                "action": "把仓位从防守区间恢复到中枢，优先使用再平衡而不是追价。",
            },
            {
                "key": "growth",
                "label": "进取确认",
                "color": "green",
                "trigger": f"站稳 {confirmation_line:,.0f} 后，广度/罗盘同步改善。",
                "max_exposure": exposure_label("growth", "55% - 85%"),
                "action": "允许靠近风险预算上沿，但必须保留压力下沿对应的最大损失预算。",
            },
        ]

        protection_lower = safe_float(hedge.get("protection_lower"), None)
        protection_upper = safe_float(hedge.get("protection_upper"), None)
        hedge_label = hedge.get("hedge_label")
        controls = [
            f"收盘跌破 {invalidation_line:,.0f} 时，把 NDX 暴露压回防守区间，并重新核算压力回撤 -{stress_downside:.1f}%。",
            f"收复 {repair_line:,.0f} 但未突破 {confirmation_line:,.0f} 前，只做中性恢复，不把反弹外推为趋势重启。",
            f"站稳 {confirmation_line:,.0f} 且预警下降后，才允许把新增风险预算从观察仓位升级为均衡/进取。",
        ]
        if protection_lower is not None and protection_upper is not None:
            controls.append(f"对冲覆盖参考 {protection_lower:.0f}% - {protection_upper:.0f}%，压力线未收复前不要提前撤掉保护。")

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round(index_value, 2),
            "recovery_score": recovery_score,
            "recovery_regime": recovery_regime,
            "recovery_color": recovery_color,
            "summary": summary,
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "stress_downside": round(stress_downside, 1),
            "expected_move": round(expected_move, 2),
            "current_drawdown": tail.get("current_drawdown"),
            "max_drawdown_1y": tail.get("max_drawdown_1y"),
            "weighted_low": round_optional(weighted_low, 2),
            "weighted_high": round_optional(weighted_high, 2),
            "distance_to_invalidation": round(distance_to_invalidation, 2),
            "distance_to_repair": round(distance_to_repair, 2),
            "distance_to_confirmation": round(distance_to_confirmation, 2),
            "distance_to_stress": round(distance_to_stress, 2),
            "distance_to_target": round(distance_to_target, 2),
            "hedge_label": hedge_label,
            "protection_lower": round_optional(protection_lower, 0),
            "protection_upper": round_optional(protection_upper, 0),
            "alert_level": alerts.get("alert_level"),
            "regime": regime.get("regime"),
            "levels": path_levels,
            "ladder": ladder,
            "controls": controls,
            "methodology": "把 NDX 技术位、情景概率、尾部风险、风险预算、市场状态、预警和对冲覆盖合成为回撤修复路径。该模块用于组合执行纪律和再入场条件管理，不构成买卖指令。",
        }
        risk_recovery_path_cache["data"] = data
        risk_recovery_path_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX recovery path updated: {recovery_regime}, score {recovery_score:.1f}")
    except Exception as e:
        logger.error(f"NDX recovery path refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_contribution_data(allow_dependency_refresh=True):
    global risk_contribution_cache

    try:
        dependencies = [
            ("diagnostics", risk_diagnostics_cache, refresh_risk_diagnostics, 15 * 60),
            ("regime", risk_regime_compass_cache, refresh_regime_compass_data, 15 * 60),
            ("alerts", risk_alerts_cache, refresh_alerts_data, 15 * 60),
            ("factors", risk_factors_cache, refresh_factor_data, 15 * 60),
            ("funding", risk_funding_conditions_cache, refresh_funding_conditions_data, 15 * 60),
            ("condition", risk_condition_matrix_cache, refresh_condition_matrix_data, 15 * 60),
            ("levels", risk_levels_cache, refresh_technical_levels, 15 * 60),
            ("tail", risk_tail_cache, refresh_tail_risk_data, 15 * 60),
            ("breadth", risk_breadth_cache, refresh_breadth_data, 15 * 60),
            ("liquidity", risk_liquidity_cache, refresh_liquidity_data, 15 * 60),
            ("valuation", risk_valuation_cache, refresh_valuation_data, 6 * 60 * 60),
            ("quality", risk_quality_cache, refresh_quality_data, 6 * 60 * 60),
            ("earnings", risk_earnings_cache, refresh_earnings_catalyst_data, 6 * 60 * 60),
            ("concentration", risk_concentration_cache, refresh_concentration_data, 15 * 60),
            ("recovery", risk_recovery_path_cache, refresh_recovery_path_data, 15 * 60),
        ]
        light_dependencies = {
            "diagnostics", "regime", "alerts", "factors", "funding", "condition",
            "levels", "tail", "breadth", "liquidity", "recovery",
        }
        dependency_status = []
        for key, cache, refresher, ttl in dependencies:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    if key in ("regime", "alerts", "recovery"):
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    else:
                        refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Risk contribution dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        if dependency_status.count("ok") < 5:
            return

        diagnostics = risk_diagnostics_cache.get("data") or {}
        regime = risk_regime_compass_cache.get("data") or {}
        alerts = risk_alerts_cache.get("data") or {}
        factors = risk_factors_cache.get("data") or {}
        funding = risk_funding_conditions_cache.get("data") or {}
        condition = risk_condition_matrix_cache.get("data") or {}
        levels = risk_levels_cache.get("data") or {}
        tail = risk_tail_cache.get("data") or {}
        breadth = risk_breadth_cache.get("data") or {}
        liquidity = risk_liquidity_cache.get("data") or {}
        valuation = risk_valuation_cache.get("data") or {}
        quality = risk_quality_cache.get("data") or {}
        earnings = risk_earnings_cache.get("data") or {}
        concentration = risk_concentration_cache.get("data") or {}
        recovery = risk_recovery_path_cache.get("data") or {}

        risk_score = safe_float(diagnostics.get("risk_score"), 50)
        macro_score = safe_float(factors.get("pressure_score"), 50)
        funding_score = safe_float(funding.get("funding_score"), 50)
        condition_score = safe_float(condition.get("condition_score"), 50)
        tail_score = safe_float(tail.get("tail_score"), 50)
        alert_score = safe_float(alerts.get("alert_score"), 35)
        valuation_score = safe_float(valuation.get("valuation_score"), 50)
        earnings_score = safe_float(earnings.get("event_score"), 50)
        zone_score = safe_float(levels.get("zone_score"), 50)
        top3_weight = safe_float(concentration.get("top3_weight"), 55)

        if zone_score >= 76:
            technical_pressure = clamp(44 + (zone_score - 76) * 1.3)
            technical_evidence = f"{levels.get('zone_label', '技术延伸')}，新增风险预算需要等待回踩。"
        else:
            technical_pressure = clamp(62 - zone_score * 0.75)
            technical_evidence = f"{levels.get('zone_label', '技术中性')}，下方支撑决定风险预算收缩速度。"

        concentration_pressure = clamp((top3_weight - 45) * 2.0, 18, 90)

        pressure_drivers = [
            build_contribution_driver(
                "diagnostics",
                "综合风险",
                "pressure",
                risk_score,
                12,
                diagnostics.get("summary", "综合风险诊断处在中性区。"),
                "先用综合风险分决定总仓位上限，再看单项信号确认执行节奏。",
            ),
            build_contribution_driver(
                "macro",
                "宏观压力",
                "pressure",
                macro_score,
                12,
                f"主逆风来自 {factors.get('main_headwind', 'VIX/利率/美元')}，状态为 {factors.get('pressure_label', '中性')}。",
                "宏观压力未回落前，新增 NDX 暴露应分批并绑定技术触发线。",
            ),
            build_contribution_driver(
                "funding",
                "融资条件",
                "pressure",
                funding_score,
                10,
                funding.get("summary", f"融资状态为 {funding.get('regime', '中性')}。"),
                "若信用和久期代理继续走弱，把反弹视为脆弱修复。",
            ),
            build_contribution_driver(
                "condition",
                "条件矩阵",
                "pressure",
                condition_score,
                9,
                condition.get("summary", f"条件矩阵为 {condition.get('regime', '中性')}。"),
                "条件矩阵偏紧时，仓位应靠近风险预算中枢以下。",
            ),
            build_contribution_driver(
                "technical",
                "技术位置",
                "pressure",
                technical_pressure,
                9,
                technical_evidence,
                "用最近支撑、50 日均线和修复线约束加仓/减仓触发。",
            ),
            build_contribution_driver(
                "tail",
                "尾部风险",
                "pressure",
                tail_score,
                11,
                tail.get("summary", f"VaR {tail.get('var95', '--')} / ES {tail.get('expected_shortfall_95', '--')}。"),
                "尾部风险偏高时，先核算最大单日损失和现金缓冲。",
            ),
            build_contribution_driver(
                "alerts",
                "预警层",
                "pressure",
                alert_score,
                10,
                alerts.get("summary", "当前预警层处在常规监控区。"),
                "优先处理红色和重点观察项，再讨论恢复风险预算。",
            ),
            build_contribution_driver(
                "valuation",
                "估值压力",
                "pressure",
                valuation_score,
                7,
                valuation.get("summary", f"估值状态为 {valuation.get('valuation_label', '中性')}。"),
                "估值压力较高时，只在盈利质量和广度同步确认后上修风险预算。",
            ),
            build_contribution_driver(
                "earnings",
                "事件窗口",
                "pressure",
                earnings_score,
                5,
                earnings.get("summary", f"最近事件为 {earnings.get('nearest_symbol', '--')}。"),
                "财报窗口集中时，给单一权重股跳空预留风险预算。",
            ),
            build_contribution_driver(
                "concentration",
                "集中度",
                "pressure",
                concentration_pressure,
                6,
                concentration.get("flags", [f"Top3 权重约 {top3_weight:.1f}%。"])[0],
                "龙头集中度高时，不要只依赖等权和广度信号判断指数风险。",
            ),
        ]

        breadth_score = safe_float(breadth.get("breadth_score"), 50)
        liquidity_score = safe_float(liquidity.get("flow_score"), 50)
        quality_score = safe_float(quality.get("quality_score"), 50)
        regime_score = safe_float(regime.get("regime_score"), 50)
        recovery_score = safe_float(recovery.get("recovery_score"), 50)
        support_from_valuation = clamp(100 - valuation_score)
        support_from_events = clamp(100 - earnings_score)

        support_drivers = [
            build_contribution_driver(
                "breadth",
                "广度支撑",
                "support",
                breadth_score,
                9,
                breadth.get("summary", f"广度状态为 {breadth.get('breadth_label', '中性')}。"),
                "广度扩散继续改善时，才允许把观察仓位升级为均衡仓位。",
            ),
            build_contribution_driver(
                "liquidity",
                "流动性承接",
                "support",
                liquidity_score,
                9,
                liquidity.get("summary", f"成交确认状态为 {liquidity.get('regime', '中性')}。"),
                "成交和资金流没有确认前，不把突破视为高置信趋势。",
            ),
            build_contribution_driver(
                "quality",
                "盈利质量",
                "support",
                quality_score,
                8,
                quality.get("summary", f"盈利质量为 {quality.get('quality_label', '中性')}。"),
                "盈利质量是估值溢价的缓冲项，弱化时应降低集中暴露。",
            ),
            build_contribution_driver(
                "regime",
                "市场状态",
                "support",
                regime_score,
                9,
                regime.get("summary", f"市场状态为 {regime.get('regime', '中性')}。"),
                "罗盘支撑不能抵消红色预警，需与压力层共同确认。",
            ),
            build_contribution_driver(
                "recovery",
                "修复路径",
                "support",
                recovery_score,
                7,
                recovery.get("summary", f"修复路径为 {recovery.get('recovery_regime', '观察')}。"),
                "只有站上修复线并降低预警后，才把再入场从防守切到中性。",
            ),
            build_contribution_driver(
                "valuation_buffer",
                "估值缓冲",
                "support",
                support_from_valuation,
                5,
                f"估值压力分 {valuation_score:.1f}，越低代表安全边际越高。",
                "估值缓冲不足时，收益预期应更多来自盈利兑现而非倍数扩张。",
            ),
            build_contribution_driver(
                "event_buffer",
                "事件缓冲",
                "support",
                support_from_events,
                4,
                f"财报事件压力分 {earnings_score:.1f}，越低代表短线跳空约束越小。",
                "事件缓冲不足时，降低财报前后的方向性仓位集中度。",
            ),
        ]

        drivers = pressure_drivers + support_drivers
        pressure_total = round(sum(item["impact"] for item in pressure_drivers), 1)
        support_total = round(sum(item["impact"] for item in support_drivers), 1)
        net_pressure = round(pressure_total - support_total, 1)
        contribution_score = round(clamp(50 + net_pressure * 1.35), 1)
        regime_label, regime_color = contribution_regime(net_pressure)
        top_pressures = sorted(pressure_drivers, key=lambda item: item["impact"], reverse=True)[:5]
        top_supports = sorted(support_drivers, key=lambda item: item["impact"], reverse=True)[:5]

        pressure_names = "、".join(item["label"] for item in top_pressures[:3])
        support_names = "、".join(item["label"] for item in top_supports[:2])
        if regime_label == "风险主导":
            summary = f"当前风险贡献由 {pressure_names} 主导，{support_names} 只能部分缓冲，组合应先压低仓位上限。"
        elif regime_label == "压力偏高":
            summary = f"NDX 压力项略强于缓冲项，主要压力来自 {pressure_names}，适合控制追高并等待确认。"
        elif regime_label == "支撑占优":
            summary = f"当前 {support_names} 足以抵消多数压力，风险预算可维持中性，但仍需跟踪 {top_pressures[0]['label']}。"
        else:
            summary = f"风险贡献处在拉锯区，{pressure_names} 与 {support_names} 相互抵消，执行上应以触发线而非观点加仓。"

        controls = [
            f"净压力 {net_pressure:+.1f}：高于 +7 时降低追高，低于 -6 时允许中性恢复。",
            f"最大压力源是 {top_pressures[0]['label']}，应先验证其证据是否继续恶化。",
            f"最大缓冲项是 {top_supports[0]['label']}，只有持续改善才允许提高风险预算。",
            "贡献拆解用于解释风险来源，不替代价格触发、仓位纪律和组合约束。",
        ]

        index_value = safe_float(levels.get("index"), None)
        if index_value is None:
            index_value = safe_float(recovery.get("index"), None)

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round_optional(index_value, 2),
            "risk_contribution_score": contribution_score,
            "contribution_regime": regime_label,
            "contribution_color": regime_color,
            "net_pressure": net_pressure,
            "pressure_total": pressure_total,
            "support_total": support_total,
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "summary": summary,
            "top_pressures": top_pressures,
            "top_supports": top_supports,
            "drivers": sorted(drivers, key=lambda item: abs(item["signed_impact"]), reverse=True),
            "controls": controls,
            "methodology": "把 NDX 风险诊断、市场罗盘、预警、宏观、融资、条件矩阵、技术位、尾部风险、广度、流动性、估值、盈利质量、财报事件、集中度和修复路径统一成压力贡献与缓冲贡献。该模块用于解释风险来源和执行优先级，不构成买卖指令。",
        }
        risk_contribution_cache["data"] = data
        risk_contribution_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX risk contribution updated: {regime_label}, net {net_pressure:+.1f}")
    except Exception as e:
        logger.error(f"NDX risk contribution refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_capacity_data(allow_dependency_refresh=True):
    global risk_capacity_cache

    try:
        dependencies = [
            ("budget", risk_budget_cache, refresh_risk_budget, 15 * 60),
            ("contribution", risk_contribution_cache, refresh_contribution_data, 15 * 60),
            ("alerts", risk_alerts_cache, refresh_alerts_data, 15 * 60),
            ("recovery", risk_recovery_path_cache, refresh_recovery_path_data, 15 * 60),
            ("hedge", risk_hedge_overlay_cache, refresh_hedge_overlay_data, 15 * 60),
            ("regime", risk_regime_compass_cache, refresh_regime_compass_data, 15 * 60),
            ("levels", risk_levels_cache, refresh_technical_levels, 15 * 60),
            ("tail", risk_tail_cache, refresh_tail_risk_data, 15 * 60),
            ("breadth", risk_breadth_cache, refresh_breadth_data, 15 * 60),
            ("liquidity", risk_liquidity_cache, refresh_liquidity_data, 15 * 60),
        ]
        light_dependencies = {"budget", "contribution", "alerts", "recovery", "regime", "levels", "tail", "breadth", "liquidity"}
        dependency_status = []
        for key, cache, refresher, ttl in dependencies:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    if key in ("contribution", "alerts", "recovery", "regime"):
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    else:
                        refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Risk capacity dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        if dependency_status.count("ok") < 5:
            return

        budget = risk_budget_cache.get("data") or {}
        contribution = risk_contribution_cache.get("data") or {}
        alerts = risk_alerts_cache.get("data") or {}
        recovery = risk_recovery_path_cache.get("data") or {}
        hedge = risk_hedge_overlay_cache.get("data") or {}
        regime = risk_regime_compass_cache.get("data") or {}
        levels = risk_levels_cache.get("data") or {}
        tail = risk_tail_cache.get("data") or {}
        breadth = risk_breadth_cache.get("data") or {}
        liquidity = risk_liquidity_cache.get("data") or {}

        profiles = budget.get("profiles") or []
        profile_map = {profile.get("key"): profile for profile in profiles}

        def exposure_value(profile_key, field, fallback):
            exposure = profile_map.get(profile_key, {}).get("exposure", {})
            return safe_float(exposure.get(field), fallback)

        defensive_lower = exposure_value("defensive", "lower", 10)
        defensive_upper = exposure_value("defensive", "upper", 35)
        balanced_lower = exposure_value("balanced", "lower", 30)
        balanced_upper = exposure_value("balanced", "upper", 58)
        growth_upper = exposure_value("growth", "upper", 78)

        pressure_total = safe_float(contribution.get("pressure_total"), 32)
        support_total = safe_float(contribution.get("support_total"), 30)
        net_pressure = safe_float(contribution.get("net_pressure"), pressure_total - support_total)
        alert_score = safe_float(alerts.get("alert_score"), 45)
        recovery_score = safe_float(recovery.get("recovery_score"), 50)
        regime_score = safe_float(regime.get("regime_score"), 50)
        hedge_score = safe_float(hedge.get("hedge_score"), 45)
        tail_score = safe_float(tail.get("tail_score"), 45)
        breadth_score = safe_float(breadth.get("breadth_score"), 50)
        liquidity_score = safe_float(liquidity.get("flow_score"), 50)
        stress_downside = safe_float(budget.get("stress_downside"), 8)
        risk_score = safe_float(budget.get("risk_score"), 50)

        capacity_score = round(clamp(
            46
            + support_total * 0.85
            - pressure_total * 0.75
            + regime_score * 0.18
            + recovery_score * 0.14
            + liquidity_score * 0.08
            + breadth_score * 0.08
            - alert_score * 0.16
            - hedge_score * 0.08
            - max(0, tail_score - 45) * 0.10
            - max(0, stress_downside - 7) * 1.10
        ), 1)
        regime_label, regime_color = capacity_regime(capacity_score)

        if capacity_score >= 72:
            recommended_key = "growth"
            recommended_profile = "进取型"
            base_lower = balanced_upper
            base_upper = growth_upper
        elif capacity_score >= 52:
            recommended_key = "balanced"
            recommended_profile = "均衡型"
            base_lower = balanced_lower
            base_upper = balanced_upper
        else:
            recommended_key = "defensive"
            recommended_profile = "防守型"
            base_lower = defensive_lower
            base_upper = defensive_upper

        capacity_adjustment = (capacity_score - 55) * 0.45 - max(0, alert_score - 62) * 0.22 - max(0, net_pressure) * 0.18
        target_upper = round(clamp(base_upper + capacity_adjustment, defensive_upper if recommended_key != "defensive" else defensive_lower, growth_upper), 0)
        if recommended_key == "defensive":
            target_upper = round(clamp(min(target_upper, defensive_upper), defensive_lower, defensive_upper), 0)
        target_lower = round(clamp(min(base_lower, target_upper - 8), 0, target_upper), 0)
        if target_upper - target_lower > 24:
            target_lower = round(target_upper - 24, 0)
        if target_upper < target_lower:
            target_lower = target_upper

        protection_lower = safe_float(hedge.get("protection_lower"), 8)
        protection_upper = safe_float(hedge.get("protection_upper"), 25)
        cash_buffer_min = round(clamp(100 - target_upper + protection_upper * 0.12 + stress_downside * 0.55, 12, 68), 0)
        max_loss_budget = round(stress_downside * target_upper / 100, 1)

        allow_increase = capacity_score >= 64 and alert_score < 58 and recovery_score >= 52 and net_pressure < 7
        allow_maintain = capacity_score >= 46 and alert_score < 78
        reduce_active = capacity_score < 52 or alert_score >= 58 or net_pressure >= 7
        pause_active = capacity_score < 36 or alert_score >= 78 or recovery_score < 34

        gates = [
            {
                "key": "increase",
                "label": "上调风险预算",
                "status": "open" if allow_increase else "blocked",
                "color": "green" if allow_increase else "amber",
                "trigger": "承受力分 >= 64，预警 < 58，修复路径 >= 52，净压力 < +7。",
                "readout": f"承受力 {capacity_score:.1f} / 预警 {alert_score:.1f} / 修复 {recovery_score:.1f} / 净压力 {net_pressure:+.1f}",
                "action": "允许把 NDX 暴露靠近目标区间上沿，但仍需分批执行。" if allow_increase else "暂不提高仓位上限，先等待预警、净压力或修复路径改善。",
            },
            {
                "key": "maintain",
                "label": "维持核心暴露",
                "status": "open" if allow_maintain else "conditional",
                "color": "blue" if allow_maintain else "amber",
                "trigger": "承受力分 >= 46，且没有红色预警。",
                "readout": f"推荐档位 {recommended_profile}，目标暴露 {target_lower:.0f}% - {target_upper:.0f}%。",
                "action": "保留核心暴露，新增资金等待回踩或确认。" if allow_maintain else "核心暴露也应降到目标区间下沿，并提高现金缓冲。",
            },
            {
                "key": "reduce",
                "label": "降档再平衡",
                "status": "active" if reduce_active else "standby",
                "color": "amber" if reduce_active else "blue",
                "trigger": "承受力 < 52，预警 >= 58，或净压力 >= +7。",
                "readout": f"压力贡献 {pressure_total:.1f} / 缓冲贡献 {support_total:.1f}。",
                "action": "把超过目标上沿的 NDX 暴露降回区间内。" if reduce_active else "暂不需要主动降档，但保留再平衡触发线。",
            },
            {
                "key": "pause",
                "label": "暂停进攻性加仓",
                "status": "active" if pause_active else "standby",
                "color": "red" if pause_active else "green",
                "trigger": "承受力 < 36，红色预警，或修复路径跌破 34。",
                "readout": f"保护覆盖 {protection_lower:.0f}% - {protection_upper:.0f}%，现金下限 {cash_buffer_min:.0f}%+。",
                "action": "暂停进攻性加仓，优先确认最大回撤、保护覆盖和失效线。" if pause_active else "没有触发暂停闸门，但进攻仓位仍需服从目标上限。",
            },
        ]

        if regime_label == "预算可用":
            summary = f"NDX 风险承受力处在可用区，目标暴露可放在 {target_lower:.0f}% - {target_upper:.0f}%，但保护覆盖仍需保留。"
        elif regime_label == "中性承受":
            summary = f"NDX 风险承受力处在中性区，适合维持 {recommended_profile} 预算，把新增资金放在确认后执行。"
        elif regime_label == "承受力收缩":
            summary = f"NDX 风险承受力正在收缩，目标暴露应压到 {target_lower:.0f}% - {target_upper:.0f}%，优先处理预警和净压力。"
        else:
            summary = "NDX 触发防守闸门，组合应暂停进攻性加仓，先确认现金缓冲、保护覆盖和技术失效线。"

        constraints = [
            f"目标 NDX 暴露：{target_lower:.0f}% - {target_upper:.0f}%，超过上沿应再平衡。",
            f"现金缓冲下限：{cash_buffer_min:.0f}%+，用于承接 -{stress_downside:.1f}% 压力回撤。",
            f"保护覆盖参考：{protection_lower:.0f}% - {protection_upper:.0f}%，与当前对冲覆盖模块同步。",
            f"目标上沿对应压力损失预算约 {max_loss_budget:.1f}%。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round_optional(safe_float(budget.get("index"), safe_float(levels.get("index"), None)), 2),
            "capacity_score": capacity_score,
            "capacity_regime": regime_label,
            "capacity_color": regime_color,
            "recommended_profile": recommended_profile,
            "recommended_key": recommended_key,
            "target_exposure": {
                "lower": target_lower,
                "upper": target_upper,
                "label": f"{target_lower:.0f}% - {target_upper:.0f}%",
            },
            "cash_buffer_min": cash_buffer_min,
            "hedge_coverage": {
                "lower": round(protection_lower, 0),
                "upper": round(protection_upper, 0),
                "label": f"{protection_lower:.0f}% - {protection_upper:.0f}%",
            },
            "max_loss_budget": max_loss_budget,
            "stress_downside": round(stress_downside, 1),
            "risk_score": round(risk_score, 1),
            "net_pressure": round(net_pressure, 1),
            "alert_score": round(alert_score, 1),
            "alert_level": alerts.get("alert_level"),
            "recovery_score": round(recovery_score, 1),
            "recovery_regime": recovery.get("recovery_regime"),
            "regime": regime.get("regime"),
            "hedge_label": hedge.get("hedge_label"),
            "pressure_total": round(pressure_total, 1),
            "support_total": round(support_total, 1),
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "summary": summary,
            "gates": gates,
            "constraints": constraints,
            "methodology": "把风险预算矩阵、风险贡献、风险预警、回撤修复路径、对冲覆盖、市场状态、尾部风险、广度和流动性压成一个组合层面的风险承受力闸门。该模块用于仓位上限、现金缓冲和保护覆盖纪律管理，不构成买卖指令。",
        }
        risk_capacity_cache["data"] = data
        risk_capacity_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX risk capacity updated: {regime_label}, score {capacity_score:.1f}")
    except Exception as e:
        logger.error(f"NDX risk capacity refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_playbook_data(allow_dependency_refresh=True):
    global risk_playbook_cache

    try:
        dependencies = [
            ("capacity", risk_capacity_cache, refresh_capacity_data, 15 * 60),
            ("regime", risk_regime_compass_cache, refresh_regime_compass_data, 15 * 60),
            ("contribution", risk_contribution_cache, refresh_contribution_data, 15 * 60),
            ("alerts", risk_alerts_cache, refresh_alerts_data, 15 * 60),
            ("recovery", risk_recovery_path_cache, refresh_recovery_path_data, 15 * 60),
            ("hedge", risk_hedge_overlay_cache, refresh_hedge_overlay_data, 15 * 60),
            ("intraday", risk_intraday_tape_cache, refresh_intraday_tape_data, 5 * 60),
            ("budget", risk_budget_cache, refresh_risk_budget, 15 * 60),
        ]
        light_dependencies = {"capacity", "regime", "contribution", "alerts", "recovery", "hedge", "intraday", "budget"}
        dependency_status = []
        for key, cache, refresher, ttl in dependencies:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    if key in ("capacity", "regime", "contribution", "alerts", "recovery"):
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    else:
                        refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Execution playbook dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        if dependency_status.count("ok") < 5:
            return

        capacity = risk_capacity_cache.get("data") or {}
        regime = risk_regime_compass_cache.get("data") or {}
        contribution = risk_contribution_cache.get("data") or {}
        alerts = risk_alerts_cache.get("data") or {}
        recovery = risk_recovery_path_cache.get("data") or {}
        hedge = risk_hedge_overlay_cache.get("data") or {}
        intraday = risk_intraday_tape_cache.get("data") or {}
        budget = risk_budget_cache.get("data") or {}

        target = capacity.get("target_exposure") or {}
        hedge_coverage = capacity.get("hedge_coverage") or {}
        target_lower = safe_float(target.get("lower"), 25)
        target_upper = safe_float(target.get("upper"), 55)
        cash_buffer = safe_float(capacity.get("cash_buffer_min"), 30)
        hedge_lower = safe_float(hedge_coverage.get("lower"), safe_float(hedge.get("protection_lower"), 12))
        hedge_upper = safe_float(hedge_coverage.get("upper"), safe_float(hedge.get("protection_upper"), 30))
        stress_downside = safe_float(capacity.get("stress_downside"), safe_float(budget.get("stress_downside"), 8))
        max_loss_budget = safe_float(capacity.get("max_loss_budget"), stress_downside * target_upper / 100)

        capacity_score = safe_float(capacity.get("capacity_score"), 50)
        regime_score = safe_float(regime.get("regime_score"), 50)
        recovery_score = safe_float(recovery.get("recovery_score"), 50)
        alert_score = safe_float(alerts.get("alert_score"), 45)
        net_pressure = safe_float(contribution.get("net_pressure"), 0)
        tape_pressure = safe_float(intraday.get("tape_pressure_score"), 45)

        playbook_score = round(clamp(
            42
            + capacity_score * 0.26
            + regime_score * 0.22
            + recovery_score * 0.18
            - alert_score * 0.17
            - max(0, net_pressure) * 0.72
            - max(0, tape_pressure - 50) * 0.10
            + max(0, -net_pressure) * 0.20
        ), 1)
        posture, color = playbook_regime(playbook_score, alert_score, net_pressure)

        level_map = {item.get("key"): item for item in recovery.get("levels", [])}
        invalidation = level_map.get("invalidation", {})
        repair = level_map.get("repair", {})
        confirmation = level_map.get("confirmation", {})
        stress = level_map.get("stress", {})
        target_level = level_map.get("target", {})
        invalidation_value = safe_float(invalidation.get("value"), None)
        repair_value = safe_float(repair.get("value"), None)
        confirmation_value = safe_float(confirmation.get("value"), None)

        def point_label(value):
            return f"{value:,.0f}" if value else "--"

        if posture == "进攻可用":
            headline_action = "允许把新增风险预算分批推向目标区间上沿，但必须保留对冲和失效线。"
        elif posture == "核心持有":
            headline_action = "维持核心 NDX 暴露，把新增资金留给回踩、VWAP 或修复线确认。"
        elif posture == "降档观察":
            headline_action = "降低追高和集中暴露，超过目标上沿的仓位优先再平衡。"
        else:
            headline_action = "暂停进攻性加仓，先确认现金缓冲、保护覆盖和技术失效线。"

        def account_row(key, label, lower, upper, cash_add, hedge_add, mandate):
            row_lower = round(clamp(lower, 0, 100), 0)
            row_upper = round(clamp(max(upper, row_lower), row_lower, 100), 0)
            row_cash = round(clamp(cash_buffer + cash_add, 8, 80), 0)
            row_hedge_lower = round(clamp(hedge_lower + hedge_add, 0, 90), 0)
            row_hedge_upper = round(clamp(hedge_upper + hedge_add, row_hedge_lower, 95), 0)
            if posture in ("防守执行", "降档观察") and key != "defensive":
                action = "降档/等待"
                color_key = "amber" if posture == "降档观察" else "red"
            elif posture == "进攻可用" and key == "tactical":
                action = "分批上调"
                color_key = "green"
            elif posture == "防守执行":
                action = "防守执行"
                color_key = "red"
            else:
                action = "核心持有"
                color_key = "blue"
            return {
                "key": key,
                "label": label,
                "action": action,
                "color": color_key,
                "target_exposure": {"lower": row_lower, "upper": row_upper, "label": f"{row_lower:.0f}% - {row_upper:.0f}%"},
                "cash_buffer": f"{row_cash:.0f}%+",
                "hedge_coverage": f"{row_hedge_lower:.0f}% - {row_hedge_upper:.0f}%",
                "max_loss_budget": f"{stress_downside * row_upper / 100:.1f}%",
                "mandate": mandate,
            }

        defensive_upper = min(target_upper, max(target_lower, target_upper - 18))
        balanced_lower = target_lower
        balanced_upper = target_upper
        tactical_upper = target_upper + (10 if posture == "进攻可用" else -6 if posture == "降档观察" else -14 if posture == "防守执行" else 3)
        account_profiles = [
            account_row("defensive", "防守账户", max(0, target_lower - 18), defensive_upper, 10, 8, "优先控制回撤和现金缓冲，只保留核心 NDX 暴露。"),
            account_row("core", "核心账户", balanced_lower, balanced_upper, 0, 0, "围绕目标区间再平衡，避免观点驱动的一次性加仓。"),
            account_row("tactical", "战术账户", max(target_lower, target_upper - 12), tactical_upper, -6, -4, "只在触发线确认后分批上调，盘中失效时快速降回核心区间。"),
        ]

        action_tickets = [
            {
                "key": "today",
                "label": "今日执行",
                "color": color,
                "trigger": f"盘中状态：{intraday.get('regime', '盘中观察')}，VWAP 偏离 {safe_float(intraday.get('vwap_distance'), 0):+.2f}%。",
                "action": headline_action,
            },
            {
                "key": "invalidation",
                "label": "失效线",
                "color": "red" if posture == "防守执行" else "amber",
                "trigger": f"NDX 收盘跌破 {point_label(invalidation_value)}。",
                "action": f"把暴露压回防守账户区间，保护覆盖提高到 {hedge_upper:.0f}% 附近。",
            },
            {
                "key": "repair",
                "label": "修复线",
                "color": "blue",
                "trigger": f"NDX 收盘重新站上 {point_label(repair_value)}，且预警分低于 58。",
                "action": "允许从防守区间恢复到核心账户目标区间。",
            },
            {
                "key": "confirmation",
                "label": "确认线",
                "color": "green",
                "trigger": f"NDX 站稳 {point_label(confirmation_value)}，罗盘和盘中 tape 同步改善。",
                "action": "允许战术账户分批靠近上沿，但不得突破 playbook 目标上限。",
            },
        ]

        guardrails = [
            f"组合层 NDX 暴露不要超过 {target_upper:.0f}%，除非确认线、罗盘和盘中 tape 同时改善。",
            f"现金缓冲维持 {cash_buffer:.0f}%+，用于承接 -{stress_downside:.1f}% 压力情景。",
            f"保护覆盖维持 {hedge_lower:.0f}% - {hedge_upper:.0f}%，失效线未收复前不要提前撤保护。",
            f"目标上沿对应压力损失预算约 {max_loss_budget:.1f}%，超过账户承受力时直接降档。",
        ]

        if posture == "进攻可用":
            summary = f"NDX Playbook 允许分批上调风险预算，目标暴露 {target_lower:.0f}% - {target_upper:.0f}%，但执行必须绑定确认线和保护覆盖。"
        elif posture == "核心持有":
            summary = f"NDX Playbook 建议核心持有，目标暴露 {target_lower:.0f}% - {target_upper:.0f}%，新增资金等待修复线或盘中确认。"
        elif posture == "降档观察":
            summary = f"NDX Playbook 进入降档观察，净压力 {net_pressure:+.1f}，超过目标上沿的暴露应先再平衡。"
        else:
            summary = f"NDX Playbook 进入防守执行，预警分 {alert_score:.1f}，先保现金和保护覆盖，再讨论恢复风险预算。"

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round_optional(safe_float(capacity.get("index"), safe_float(recovery.get("index"), None)), 2),
            "playbook_score": playbook_score,
            "posture": posture,
            "posture_color": color,
            "summary": summary,
            "headline_action": headline_action,
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "target_exposure": {"lower": round(target_lower, 0), "upper": round(target_upper, 0), "label": f"{target_lower:.0f}% - {target_upper:.0f}%"},
            "cash_buffer_min": round(cash_buffer, 0),
            "hedge_coverage": {"lower": round(hedge_lower, 0), "upper": round(hedge_upper, 0), "label": f"{hedge_lower:.0f}% - {hedge_upper:.0f}%"},
            "max_loss_budget": round(max_loss_budget, 1),
            "stress_downside": round(stress_downside, 1),
            "capacity_score": round(capacity_score, 1),
            "regime_score": round(regime_score, 1),
            "recovery_score": round(recovery_score, 1),
            "alert_score": round(alert_score, 1),
            "net_pressure": round(net_pressure, 1),
            "tape_pressure_score": round(tape_pressure, 1),
            "regime": regime.get("regime"),
            "alert_level": alerts.get("alert_level"),
            "recovery_regime": recovery.get("recovery_regime"),
            "hedge_label": hedge.get("hedge_label"),
            "intraday_regime": intraday.get("regime"),
            "levels": [
                {**stress, "key": "stress"} if stress else {"key": "stress", "label": "压力下沿", "value": None, "distance_label": "--", "color": "red"},
                {**invalidation, "key": "invalidation"} if invalidation else {"key": "invalidation", "label": "失效线", "value": None, "distance_label": "--", "color": "amber"},
                {**repair, "key": "repair"} if repair else {"key": "repair", "label": "修复线", "value": None, "distance_label": "--", "color": "blue"},
                {**confirmation, "key": "confirmation"} if confirmation else {"key": "confirmation", "label": "确认线", "value": None, "distance_label": "--", "color": "green"},
                {**target_level, "key": "target"} if target_level else {"key": "target", "label": "概率上沿", "value": None, "distance_label": "--", "color": "green"},
            ],
            "account_profiles": account_profiles,
            "action_tickets": action_tickets,
            "guardrails": guardrails,
            "methodology": "把 NDX 风险承受力闸门、市场状态罗盘、风险贡献、预警、回撤修复路径、对冲覆盖、盘中交易台脉冲和风险预算矩阵压成账户分层执行 Playbook。该模块用于投委会动作、仓位上限、现金缓冲、保护覆盖和触发线管理，不构成买卖指令。",
        }
        risk_playbook_cache["data"] = data
        risk_playbook_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX execution playbook updated: {posture}, score {playbook_score:.1f}")
    except Exception as e:
        logger.error(f"NDX execution playbook refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_desk_brief_data(allow_dependency_refresh=True):
    global risk_desk_brief_cache

    try:
        dependencies = [
            ("playbook", risk_playbook_cache, refresh_playbook_data, 15 * 60, True),
            ("regime", risk_regime_compass_cache, refresh_regime_compass_data, 15 * 60, True),
            ("alerts", risk_alerts_cache, refresh_alerts_data, 15 * 60, True),
            ("contribution", risk_contribution_cache, refresh_contribution_data, 15 * 60, True),
            ("capacity", risk_capacity_cache, refresh_capacity_data, 15 * 60, True),
            ("recovery", risk_recovery_path_cache, refresh_recovery_path_data, 15 * 60, True),
            ("analog", risk_regime_analog_cache, refresh_regime_analog_data, 15 * 60, False),
            ("rate_sensitivity", risk_rate_sensitivity_cache, refresh_rate_sensitivity_data, 15 * 60, True),
            ("factor_shock", risk_factor_shock_cache, refresh_factor_shock_data, 15 * 60, False),
            ("intraday", risk_intraday_tape_cache, refresh_intraday_tape_data, 5 * 60, False),
            ("volume_profile", risk_volume_profile_cache, refresh_volume_profile_data, 5 * 60, False),
            ("cross_asset", risk_cross_asset_cache, refresh_cross_asset_data, 15 * 60, False),
            ("hedge", risk_hedge_overlay_cache, refresh_hedge_overlay_data, 15 * 60, False),
            ("gamma", risk_gamma_map_cache, refresh_gamma_map_data, 15 * 60, False),
            ("skew", risk_option_skew_cache, refresh_option_skew_data, 15 * 60, False),
            ("vol_premium", risk_vol_premium_cache, refresh_vol_premium_data, 15 * 60, True),
            ("vol_term", risk_volatility_term_cache, refresh_volatility_term_data, 15 * 60, False),
            ("breadth", risk_breadth_cache, refresh_breadth_data, 15 * 60, False),
            ("liquidity", risk_liquidity_cache, refresh_liquidity_data, 15 * 60, False),
            ("valuation", risk_valuation_cache, refresh_valuation_data, 6 * 60 * 60, False),
            ("quality", risk_quality_cache, refresh_quality_data, 6 * 60 * 60, False),
            ("earnings", risk_earnings_cache, refresh_earnings_catalyst_data, 6 * 60 * 60, False),
        ]
        light_dependencies = {
            "playbook",
            "regime",
            "alerts",
            "contribution",
            "capacity",
            "recovery",
            "analog",
            "rate_sensitivity",
            "factor_shock",
            "intraday",
            "volume_profile",
            "cross_asset",
            "hedge",
            "gamma",
            "skew",
            "vol_premium",
            "vol_term",
            "breadth",
            "liquidity",
        }
        dependency_status = []
        for key, cache, refresher, ttl, accepts_light in dependencies:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    if accepts_light:
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    else:
                        refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Desk brief dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        if dependency_status.count("ok") < 8:
            return

        playbook = risk_playbook_cache.get("data") or {}
        regime = risk_regime_compass_cache.get("data") or {}
        alerts = risk_alerts_cache.get("data") or {}
        contribution = risk_contribution_cache.get("data") or {}
        capacity = risk_capacity_cache.get("data") or {}
        recovery = risk_recovery_path_cache.get("data") or {}
        analog = risk_regime_analog_cache.get("data") or {}
        rate_sensitivity = risk_rate_sensitivity_cache.get("data") or {}
        factor_shock = risk_factor_shock_cache.get("data") or {}
        intraday = risk_intraday_tape_cache.get("data") or {}
        volume_profile = risk_volume_profile_cache.get("data") or {}
        cross_asset = risk_cross_asset_cache.get("data") or {}
        hedge = risk_hedge_overlay_cache.get("data") or {}
        gamma = risk_gamma_map_cache.get("data") or {}
        skew = risk_option_skew_cache.get("data") or {}
        vol_premium = risk_vol_premium_cache.get("data") or {}
        vol_term = risk_volatility_term_cache.get("data") or {}
        breadth = risk_breadth_cache.get("data") or {}
        liquidity = risk_liquidity_cache.get("data") or {}
        valuation = risk_valuation_cache.get("data") or {}
        quality = risk_quality_cache.get("data") or {}
        earnings = risk_earnings_cache.get("data") or {}

        def avg(scores, default=50):
            valid = [safe_float(score, None) for score in scores]
            valid = [score for score in valid if score is not None]
            return sum(valid) / len(valid) if valid else default

        alert_score = safe_float(alerts.get("alert_score"), 50)
        tape_pressure = safe_float(intraday.get("tape_pressure_score"), 50)
        net_pressure = safe_float(contribution.get("net_pressure"), 0)
        pressure_score = avg([
            alerts.get("alert_score"),
            contribution.get("risk_contribution_score"),
            100 - safe_float(analog.get("analog_score"), 50),
            rate_sensitivity.get("rate_sensitivity_score"),
            factor_shock.get("shock_score"),
            intraday.get("tape_pressure_score"),
            volume_profile.get("profile_score"),
            100 - safe_float(cross_asset.get("confirmation_score"), 50),
            hedge.get("hedge_score"),
            gamma.get("gamma_score"),
            skew.get("skew_score"),
            vol_premium.get("premium_score"),
            vol_term.get("term_score"),
            valuation.get("valuation_score"),
            earnings.get("event_score"),
        ])
        support_score = avg([
            playbook.get("playbook_score"),
            regime.get("regime_score"),
            capacity.get("capacity_score"),
            recovery.get("recovery_score"),
            analog.get("analog_score"),
            breadth.get("breadth_score"),
            liquidity.get("flow_score"),
            cross_asset.get("confirmation_score"),
            quality.get("quality_score"),
        ])
        desk_score = round(clamp(50 + support_score * 0.38 - pressure_score * 0.34 - max(0, net_pressure) * 0.45), 1)
        stance, stance_color = desk_brief_regime(desk_score, alert_score, tape_pressure)

        target_exposure = playbook.get("target_exposure", capacity.get("target_exposure", {})) or {}
        hedge_coverage = playbook.get("hedge_coverage", capacity.get("hedge_coverage", {})) or {}
        target_label = target_exposure.get("label", "--")
        hedge_label = hedge_coverage.get("label", "--")
        cash_buffer = safe_float(playbook.get("cash_buffer_min", capacity.get("cash_buffer_min")), None)
        cash_label = f"{cash_buffer:.0f}%+" if cash_buffer is not None else "--"

        if stance == "增配窗口":
            summary = f"NDX Desk Brief 倾向增配窗口，执行上限仍以 Playbook 暴露 {target_label}、现金 {cash_label} 和保护 {hedge_label} 为边界。"
            opening_action = "允许把新增风险预算分批推进到目标区间中上部，但必须绑定盘中 tape 和确认线。"
        elif stance == "持仓审查":
            summary = f"NDX Desk Brief 倾向持仓审查，核心暴露可保留，新增资金应等待技术位、广度或利率条件确认。"
            opening_action = "维持核心仓位，先检查超配行业、MAG7 集中度和保护覆盖是否仍匹配账户承受力。"
        elif stance == "谨慎降速":
            summary = f"NDX Desk Brief 进入谨慎降速，净压力 {net_pressure:+.1f}，不宜让单日上涨自动转化为更高仓位上限。"
            opening_action = "把超过目标上沿的暴露降回区间内，新增资金只做确认后的分批执行。"
        else:
            summary = f"NDX Desk Brief 进入防守晨会，预警分 {alert_score:.1f}，优先处理现金、保护和失效线。"
            opening_action = "暂停进攻性加仓，先把最大亏损预算、对冲覆盖和技术失效线写进执行票据。"

        top_priorities = [
            {
                "key": "risk_budget",
                "label": "风险预算",
                "color": playbook.get("posture_color", capacity.get("capacity_color", "blue")),
                "state": playbook.get("posture", capacity.get("capacity_regime", "等待预算")),
                "readout": f"目标暴露 {target_label} / 现金 {cash_label} / 保护 {hedge_label}",
                "action": playbook.get("headline_action", capacity.get("summary", "先确认目标暴露、现金和保护覆盖。")),
            },
            {
                "key": "market_tape",
                "label": "盘中 tape",
                "color": risk_color(tape_pressure),
                "state": f"{intraday.get('regime', '等待盘中确认')} / {volume_profile.get('regime', '等待价值区')}",
                "readout": f"日内 {safe_float(intraday.get('daily_return'), 0):+.2f}% / VWAP {safe_float(intraday.get('vwap_distance'), 0):+.2f}% / POC {safe_float(volume_profile.get('poc'), 0):.2f}",
                "action": f"若价格站上 VWAP 且维持在价值区上沿 {safe_float(volume_profile.get('value_area_high'), 0):.2f} 上方，才允许执行靠近目标上沿。",
            },
            {
                "key": "macro_valuation",
                "label": "估值利率",
                "color": risk_color(avg([rate_sensitivity.get("rate_sensitivity_score"), factor_shock.get("shock_score")])),
                "state": f"{rate_sensitivity.get('rate_sensitivity_regime', valuation.get('valuation_label', '等待估值'))} / {factor_shock.get('regime', '等待冲击')}",
                "readout": f"10Y {safe_float(rate_sensitivity.get('rate_change_20d_bps'), 0):+.1f}bps / FPE {safe_float(rate_sensitivity.get('weighted_forward_pe'), safe_float(valuation.get('weighted_forward_pe'), 0)):.1f}x / Stress {safe_float(factor_shock.get('stress_move'), 0):+.2f}%",
                "action": "利率继续上行或因子冲击转敏时，把估值扩张假设切换为盈利兑现假设，减少远端成长暴露。",
            },
            {
                "key": "historical_analog",
                "label": "历史类比",
                "color": analog.get("regime_color", constructive_color(safe_float(analog.get("analog_score"), 50))),
                "state": analog.get("regime", "等待类比"),
                "readout": f"20D 均值 {safe_float(analog.get('forward_20d_avg'), 0):+.2f}% / 胜率 {safe_float(analog.get('win_rate_20d'), 0):.1f}% / 样本 {safe_float(analog.get('analog_count'), 0):.0f}",
                "action": "若当前路径跌出历史相似窗口的 20% 分位，应把执行 Playbook 下调一档。",
            },
            {
                "key": "internals",
                "label": "内部结构",
                "color": constructive_color(avg([breadth.get("breadth_score"), liquidity.get("flow_score"), regime.get("support_score")])),
                "state": f"{breadth.get('breadth_label', '广度待确认')} / {liquidity.get('regime', '流动性待确认')}",
                "readout": f"广度 {safe_float(breadth.get('breadth_score'), 50):.1f} / 流动性 {safe_float(liquidity.get('flow_score'), 50):.1f} / 跨资产 {safe_float(cross_asset.get('confirmation_score'), 50):.1f}",
                "action": "若等权和成交承接没有跟上，指数上涨更像权重股驱动，新增仓位应低于目标中位。",
            },
            {
                "key": "vol_hedge",
                "label": "波动保护",
                "color": hedge.get("hedge_color", risk_color(safe_float(hedge.get("hedge_score"), 50))),
                "state": hedge.get("hedge_label", gamma.get("regime", vol_term.get("regime", "等待波动定价"))),
                "readout": f"Gamma {gamma.get('regime', '--')} / Skew {skew.get('regime', '--')} / 隐含 {safe_float(vol_premium.get('implied_move'), 0):.2f}%",
                "action": f"保护覆盖跟随 Playbook 区间；若跌近 put wall {safe_float((gamma.get('put_wall') or {}).get('strike'), 0):.0f}，先提高保护再讨论加仓。",
            },
        ]

        top_alerts = alerts.get("alerts") or [{}]
        bull_case = [
            f"Playbook 分数 {safe_float(playbook.get('playbook_score'), 50):.1f}，目标暴露仍有明确区间，说明组合动作可以规则化执行。",
            f"市场罗盘 {regime.get('regime', '中性')}，支撑分 {safe_float(regime.get('support_score'), 50):.1f}，若广度和流动性同步改善，可增强反弹质量。",
            f"MAG7 质量分 {safe_float(quality.get('quality_score'), 50):.1f}，若财报窗口没有放大事件风险，估值溢价更容易被基本面吸收。",
        ]
        bear_case = [
            f"预警分 {alert_score:.1f}，最高优先级仍需先看 {top_alerts[0].get('title', '红色/观察预警')}。",
            f"估值利率敏感度 {safe_float(rate_sensitivity.get('rate_sensitivity_score'), 50):.1f}，若 10Y 上行，FPE {safe_float(rate_sensitivity.get('weighted_forward_pe'), safe_float(valuation.get('weighted_forward_pe'), 0)):.1f}x 的容错会下降。",
            f"净压力 {net_pressure:+.1f}，若压力贡献继续超过缓冲贡献，指数创新高也不等于组合承受力提高。",
        ]
        change_mind = [
            "确认线：NDX 收盘站上 Playbook 确认线，且盘中 tape 不是缩量上行。",
            "失效线：跌破 Playbook 失效线或 VIX 曲线转为 backwardation，直接把仓位降回目标下沿。",
            "基本面：MAG7 质量分跌破 50 或财报事件权重大幅上升，降低估值扩张假设权重。",
            "宏观：10Y 与美元压力同步上行时，暂停新增远端成长风险预算。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round_optional(safe_float(playbook.get("index"), safe_float(intraday.get("index"), None)), 2),
            "desk_score": desk_score,
            "stance": stance,
            "stance_color": stance_color,
            "summary": summary,
            "opening_action": opening_action,
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "support_score": round(support_score, 1),
            "pressure_score": round(pressure_score, 1),
            "alert_score": round(alert_score, 1),
            "tape_pressure_score": round(tape_pressure, 1),
            "profile_score": round(safe_float(volume_profile.get("profile_score"), 50), 1),
            "cross_asset_score": round(safe_float(cross_asset.get("confirmation_score"), 50), 1),
            "analog_score": round(safe_float(analog.get("analog_score"), 50), 1),
            "factor_shock_score": round(safe_float(factor_shock.get("shock_score"), 50), 1),
            "gamma_score": round(safe_float(gamma.get("gamma_score"), 50), 1),
            "skew_score": round(safe_float(skew.get("skew_score"), 50), 1),
            "net_pressure": round(net_pressure, 1),
            "target_exposure": target_exposure,
            "cash_buffer": cash_label,
            "hedge_coverage": hedge_coverage,
            "top_priorities": top_priorities,
            "bull_case": bull_case,
            "bear_case": bear_case,
            "change_mind": change_mind,
            "levels": playbook.get("levels", []),
            "methodology": "把 NDX 执行 Playbook、市场状态罗盘、风险预警、贡献归因、承受力闸门、历史相似情景、因子冲击、盘中 tape、成交分布、跨资产确认、估值利率敏感度、广度/流动性、MAG7 质量/财报、期权偏斜、波动风险溢价和对冲覆盖合成为机构晨会式 Desk Brief。该模块用于阅读和风控流程，不构成买卖建议。",
        }
        risk_desk_brief_cache["data"] = data
        risk_desk_brief_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX desk brief updated: {stance}, score {desk_score:.1f}")
    except Exception as e:
        logger.error(f"NDX desk brief refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_rate_sensitivity_data(allow_dependency_refresh=True):
    global risk_rate_sensitivity_cache

    try:
        dependencies = [
            ("valuation", risk_valuation_cache, refresh_valuation_data, 6 * 60 * 60),
            ("quality", risk_quality_cache, refresh_quality_data, 6 * 60 * 60),
            ("factors", risk_factors_cache, refresh_factor_data, 15 * 60),
            ("funding", risk_funding_conditions_cache, refresh_funding_conditions_data, 15 * 60),
            ("condition", risk_condition_matrix_cache, refresh_condition_matrix_data, 15 * 60),
            ("capacity", risk_capacity_cache, refresh_capacity_data, 15 * 60),
            ("contribution", risk_contribution_cache, refresh_contribution_data, 15 * 60),
        ]
        light_dependencies = {"factors", "funding", "condition", "capacity", "contribution"}
        dependency_status = []
        for key, cache, refresher, ttl in dependencies:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    if key in ("capacity", "contribution"):
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    else:
                        refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Rate sensitivity dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        if dependency_status.count("ok") < 4:
            return

        valuation = risk_valuation_cache.get("data") or {}
        quality = risk_quality_cache.get("data") or {}
        factors = risk_factors_cache.get("data") or {}
        funding = risk_funding_conditions_cache.get("data") or {}
        condition = risk_condition_matrix_cache.get("data") or {}
        capacity = risk_capacity_cache.get("data") or {}
        contribution = risk_contribution_cache.get("data") or {}

        rate_factor = next((item for item in factors.get("factors", []) if item.get("key") == "rates"), {})
        dollar_factor = next((item for item in factors.get("factors", []) if item.get("key") == "dollar"), {})
        rate_level = safe_float(str(rate_factor.get("level", "")).replace("%", ""), None)
        if rate_level is not None and rate_level > 15:
            rate_level = rate_level / 10
        rate_change_20d_bps = safe_float(condition.get("rates_change_20d_bps"), 0)
        if not rate_change_20d_bps:
            rate_change_20d_bps = safe_float(str(rate_factor.get("change_20d", "0")).replace("点", "").replace("+", ""), 0) * 100
        rate_pressure = safe_float(rate_factor.get("pressure_score"), 50)
        rate_sensitivity = safe_float(rate_factor.get("sensitivity"), 0)
        dollar_pressure = safe_float(dollar_factor.get("pressure_score"), 45)

        weighted_forward_pe = safe_float(valuation.get("weighted_forward_pe"), 28)
        weighted_peg = safe_float(valuation.get("weighted_peg"), 1.8)
        weighted_revenue_growth = safe_float(valuation.get("weighted_revenue_growth"), 10)
        weighted_earnings_growth = safe_float(valuation.get("weighted_earnings_growth"), 10)
        valuation_score = safe_float(valuation.get("valuation_score"), 50)
        quality_score = safe_float(quality.get("quality_score"), 50)
        funding_score = safe_float(funding.get("funding_score"), 50)
        duration_ratio_20d = safe_float(funding.get("duration_ratio_20d"), 0)
        capacity_score = safe_float(capacity.get("capacity_score"), 50)
        net_pressure = safe_float(contribution.get("net_pressure"), 0)

        valuation_duration = clamp(
            24
            + max(0, weighted_forward_pe - 22) * 1.35
            + max(0, weighted_peg - 1.6) * 12
            - max(0, weighted_earnings_growth - 8) * 0.38
            - max(0, weighted_revenue_growth - 8) * 0.22,
        )
        rate_shock_pressure = clamp(
            rate_pressure * 0.42
            + max(0, rate_change_20d_bps) * 0.42
            + max(0, -duration_ratio_20d) * 9
            + funding_score * 0.16,
        )
        quality_buffer = clamp(
            quality_score * 0.50
            + max(0, weighted_revenue_growth) * 0.55
            + max(0, weighted_earnings_growth) * 0.38
            + max(0, 100 - valuation_score) * 0.22,
        )
        rate_sensitivity_score = round(clamp(
            valuation_duration * 0.34
            + rate_shock_pressure * 0.32
            + valuation_score * 0.18
            + dollar_pressure * 0.08
            + max(0, net_pressure) * 0.65
            - quality_buffer * 0.20
            - max(0, capacity_score - 55) * 0.14,
        ), 1)
        regime_label, regime_color = rate_sensitivity_regime(rate_sensitivity_score)

        valuation_gap = round(max(0, weighted_forward_pe - 24) * 0.8 + max(0, weighted_peg - 1.8) * 4, 1)
        earnings_required = round(clamp(8 + valuation_gap + max(0, rate_change_20d_bps) * 0.08, 6, 28), 1)
        pe_compression_50bps = round(clamp(weighted_forward_pe * (0.02 + rate_sensitivity_score / 2200), 0.4, 4.8), 1)
        ndx_multiple_risk = round(clamp(pe_compression_50bps * 0.85 + max(0, rate_sensitivity_score - 50) * 0.06, 0.4, 8), 1)

        if regime_label == "利率高敏":
            summary = f"NDX 权重股估值对利率重新上行较敏感，Forward PE {weighted_forward_pe:.1f}x 需要更强盈利兑现才能抵消折现率压力。"
        elif regime_label == "估值承压":
            summary = f"估值与利率的组合进入承压区，10Y 变化和 PEG 水平需要与盈利质量同步监控。"
        elif regime_label == "利率缓冲":
            summary = "当前估值-利率组合有一定缓冲，盈利质量和成长增速能吸收多数折现率扰动。"
        else:
            summary = "当前估值-利率敏感度可控，但新增风险预算仍需绑定利率、美元和久期条件确认。"

        drivers = [
            {
                "key": "valuation_duration",
                "label": "估值久期",
                "score": round(valuation_duration, 1),
                "color": contribution_color("pressure", valuation_duration),
                "value": f"FPE {weighted_forward_pe:.1f}x / PEG {weighted_peg:.2f}x",
                "detail": "Forward PE 和 PEG 越高，利率上行对估值倍数的压缩越明显。",
            },
            {
                "key": "rate_shock",
                "label": "利率冲击",
                "score": round(rate_shock_pressure, 1),
                "color": contribution_color("pressure", rate_shock_pressure),
                "value": f"10Y {rate_change_20d_bps:+.0f}bps / 敏感度 {rate_sensitivity:+.2f}%",
                "detail": rate_factor.get("comment", "10Y 利率变化用于观察成长股折现率压力。"),
            },
            {
                "key": "quality_buffer",
                "label": "质量缓冲",
                "score": round(quality_buffer, 1),
                "color": contribution_color("support", quality_buffer),
                "value": f"质量 {quality_score:.1f} / 盈利增速 {weighted_earnings_growth:.1f}%",
                "detail": "盈利质量、收入增速和盈利增速越高，越能支撑估值溢价。",
            },
            {
                "key": "funding_duration",
                "label": "久期融资",
                "score": round(funding_score, 1),
                "color": contribution_color("pressure", funding_score),
                "value": f"TLT/SHY {duration_ratio_20d:+.2f}%",
                "detail": funding.get("summary", "久期资产相对短债走弱会压制成长估值承受力。"),
            },
        ]

        controls = [
            f"若 10Y 再上行 50bps，当前代理模型估算 FPE 压缩约 {pe_compression_50bps:.1f}x，NDX 倍数风险约 {ndx_multiple_risk:.1f}%。",
            f"要维持当前估值区间，MAG7 加权盈利增速最好保持在 {earnings_required:.1f}% 以上。",
            "当利率压力和美元压力同步上行时，新增 NDX 风险预算应从估值扩张假设切回盈利兑现假设。",
            "若质量缓冲跌破 50 且估值压力高于 58，应降低集中龙头暴露和远端成长假设。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "index": round_optional(safe_float(factors.get("index_level"), None), 2),
            "rate_sensitivity_score": rate_sensitivity_score,
            "rate_sensitivity_regime": regime_label,
            "rate_sensitivity_color": regime_color,
            "summary": summary,
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "rate_level": round_optional(rate_level, 2),
            "rate_change_20d_bps": round(rate_change_20d_bps, 1),
            "rate_factor_pressure": round(rate_pressure, 1),
            "rate_sensitivity": round(rate_sensitivity, 2),
            "dollar_pressure": round(dollar_pressure, 1),
            "weighted_forward_pe": round_optional(weighted_forward_pe, 1),
            "weighted_peg": round_optional(weighted_peg, 2),
            "weighted_revenue_growth": round_optional(weighted_revenue_growth, 1),
            "weighted_earnings_growth": round_optional(weighted_earnings_growth, 1),
            "valuation_score": round(valuation_score, 1),
            "quality_score": round(quality_score, 1),
            "valuation_duration": round(valuation_duration, 1),
            "rate_shock_pressure": round(rate_shock_pressure, 1),
            "quality_buffer": round(quality_buffer, 1),
            "earnings_required": earnings_required,
            "pe_compression_50bps": pe_compression_50bps,
            "ndx_multiple_risk": ndx_multiple_risk,
            "drivers": drivers,
            "controls": controls,
            "methodology": "把 MAG7 加权估值、成长增速、盈利质量、10Y 利率因子、美元压力、信用/久期融资条件和风险承受力闸门合成为 NDX 估值-利率敏感度。该模块用于判断估值溢价对折现率变化的承受力，不构成目标价或买卖指令。",
        }
        risk_rate_sensitivity_cache["data"] = data
        risk_rate_sensitivity_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX valuation-rate sensitivity updated: {regime_label}, score {rate_sensitivity_score:.1f}")
    except Exception as e:
        logger.error(f"NDX valuation-rate sensitivity refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_hedge_overlay_data():
    global risk_hedge_overlay_cache

    try:
        dependency_refreshers = [
            (risk_diagnostics_cache, refresh_risk_diagnostics, 15 * 60),
            (risk_tail_cache, refresh_tail_risk_data, 15 * 60),
            (risk_options_cache, refresh_options_data, 15 * 60),
            (risk_volatility_term_cache, refresh_volatility_term_data, 15 * 60),
            (risk_levels_cache, refresh_technical_levels, 15 * 60),
            (risk_budget_cache, refresh_risk_budget, 15 * 60),
        ]
        for cache, refresher, ttl in dependency_refreshers:
            if not cache_is_fresh(cache, ttl):
                refresher()

        diagnostics = risk_diagnostics_cache.get("data")
        tail = risk_tail_cache.get("data")
        options = risk_options_cache.get("data")
        volatility_term = risk_volatility_term_cache.get("data")
        levels = risk_levels_cache.get("data")
        budget = risk_budget_cache.get("data")
        if not all([diagnostics, tail, options, volatility_term, levels, budget]):
            raise ValueError("Required risk modules unavailable for hedge overlay")

        risk_score = safe_float(diagnostics.get("risk_score"), 50)
        tail_score = safe_float(tail.get("tail_score"), 50)
        term_score = safe_float(volatility_term.get("term_score"), 50)
        implied_move = safe_float(options.get("implied_move"), 0)
        put_call_oi_ratio = safe_float(options.get("put_call_oi_ratio"), 1)
        zone_score = safe_float(levels.get("zone_score"), 50)
        stress_downside = safe_float(budget.get("stress_downside"), 0)

        options_pressure = clamp(
            30
            + implied_move * 8
            + max(0, put_call_oi_ratio - 0.9) * 18,
            0,
            100,
        )
        technical_pressure = clamp(55 - zone_score, 0, 55)
        hedge_score = round(clamp(
            risk_score * 0.24
            + tail_score * 0.24
            + term_score * 0.18
            + options_pressure * 0.16
            + technical_pressure * 0.10
            + stress_downside * 1.2
        ), 1)
        hedge_label, hedge_color = hedge_overlay_regime(hedge_score)

        base_protection = clamp(
            hedge_score * 0.55 + max(0, tail_score - 50) * 0.25 + max(0, stress_downside - 5) * 1.5,
            8,
            78,
        )
        if hedge_score < 38:
            base_protection = clamp(base_protection, 5, 25)
        protection_lower = round(clamp(base_protection - 10, 0, 85))
        protection_upper = round(clamp(base_protection + 10, protection_lower, 85))

        support_levels = levels.get("support_levels") or []
        resistance_levels = levels.get("resistance_levels") or []
        nearest_support = support_levels[0] if support_levels else {}
        nearest_resistance = resistance_levels[0] if resistance_levels else {}
        ndx_support = safe_float(nearest_support.get("value"), None)
        ndx_resistance = safe_float(nearest_resistance.get("value"), None)

        proxy_price = safe_float(options.get("proxy_price"), 0)
        implied_low = safe_float(options.get("implied_range_low"), 0)
        implied_high = safe_float(options.get("implied_range_high"), 0)
        atm_strike = safe_float(options.get("atm_strike"), proxy_price)
        put_spread_long = implied_low if implied_low > 0 else proxy_price * (1 - implied_move / 100)
        spread_width = max(0.02, min(0.08, implied_move / 100))
        put_spread_short = max(0, put_spread_long * (1 - spread_width))

        profiles = budget.get("profiles") or []
        balanced_profile = next((profile for profile in profiles if profile.get("key") == "balanced"), profiles[0] if profiles else {})
        balanced_exposure = balanced_profile.get("exposure", {}).get("label", "--")
        cash_buffer = balanced_profile.get("cash_buffer", "--")
        rebalance_trigger = balanced_profile.get("rebalance_trigger", "按风险预算区间执行再平衡。")

        if hedge_label == "保护优先":
            summary = (
                "尾部损失、波动率曲线或压力回撤提示保护优先，组合应先确认最大可承受回撤，"
                "再决定是否保留进攻性 NDX 暴露。"
            )
        elif hedge_label == "提高保护":
            summary = (
                "风险定价进入偏紧状态，建议把保护比例抬到中等覆盖区间，并避免在波动率快速上行时一次性补保险。"
            )
        elif hedge_label == "保留保护":
            summary = (
                "当前保护需求处在均衡区，已有仓位可维持基础保护，用技术位和期权隐含区间触发调整。"
            )
        else:
            summary = (
                "保护需求温和，重点保留现金和再平衡纪律；若 VIX 曲线趋平或跌破支撑，再提高覆盖比例。"
            )

        overlays = [
            {
                "key": "coverage",
                "label": "建议保护覆盖",
                "value": f"{protection_lower}% - {protection_upper}%",
                "color": hedge_color,
                "detail": "按组合 NDX 净暴露估算，用于约束下行情景中的保护比例。",
            },
            {
                "key": "cash_buffer",
                "label": "现金缓冲",
                "value": cash_buffer,
                "color": "blue",
                "detail": f"均衡型风险预算暴露 {balanced_exposure}，现金缓冲用于承接再平衡和补保证金。",
            },
            {
                "key": "put_spread",
                "label": "QQQ Put Spread",
                "value": f"{put_spread_long:.2f}/{put_spread_short:.2f}",
                "color": "amber" if hedge_score >= 55 else "blue",
                "detail": f"参考最近到期期权隐含下沿，ATM 代理 {atm_strike:.2f}，不作为交易指令。",
            },
            {
                "key": "technical_trigger",
                "label": "NDX 技术触发",
                "value": f"{ndx_support:,.0f}" if ndx_support else "--",
                "color": "red" if zone_score < 35 else "blue",
                "detail": nearest_support.get("label", "最近支撑位") + "；跌破后应把保护区间推向上沿。",
            },
        ]

        controls = [
            f"保护比例应与压力回撤 -{stress_downside:.1f}% 和最大损失预算匹配，避免只按情绪补仓。",
            f"若 QQQ 跌破隐含下沿 {put_spread_long:.2f}，说明现货跌幅超过期权市场短线定价。",
            f"若 VIX/VIX3M 升破 1.00 或 VVIX z-score 高于 1.5，优先降低新增风险预算，而不是追高买入保护。",
            rebalance_trigger,
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "hedge_score": hedge_score,
            "hedge_label": hedge_label,
            "hedge_color": hedge_color,
            "summary": summary,
            "protection_lower": protection_lower,
            "protection_upper": protection_upper,
            "proxy_symbol": options.get("proxy_symbol", "QQQ"),
            "proxy_price": round(proxy_price, 2),
            "expiration": options.get("expiration"),
            "days_to_expiration": options.get("days_to_expiration"),
            "implied_move": round(implied_move, 2),
            "implied_range_low": round(implied_low, 2),
            "implied_range_high": round(implied_high, 2),
            "put_call_oi_ratio": round(put_call_oi_ratio, 2),
            "vix": volatility_term.get("vix"),
            "front_ratio": volatility_term.get("front_ratio"),
            "vvix_z_score": volatility_term.get("vvix_z_score"),
            "tail_score": round(tail_score, 1),
            "var95": tail.get("var95"),
            "expected_shortfall_95": tail.get("expected_shortfall_95"),
            "stress_downside": round(stress_downside, 1),
            "balanced_exposure": balanced_exposure,
            "ndx_support": round(ndx_support, 2) if ndx_support else None,
            "ndx_resistance": round(ndx_resistance, 2) if ndx_resistance else None,
            "put_spread_long": round(put_spread_long, 2),
            "put_spread_short": round(put_spread_short, 2),
            "overlays": overlays,
            "controls": controls,
            "methodology": "把风险诊断、历史尾部损失、QQQ 期权隐含区间、VIX 期限结构、技术支撑和风险预算合成为保护覆盖区间；该模块是组合风控参考，不构成期权交易建议。",
        }
        risk_hedge_overlay_cache["data"] = data
        risk_hedge_overlay_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX hedge overlay updated: {hedge_label}, score {hedge_score:.1f}")
    except Exception as e:
        logger.error(f"NDX hedge overlay refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_regime_compass_data(allow_dependency_refresh=True):
    global risk_regime_compass_cache

    try:
        dependency_refreshers = [
            ("diagnostics", risk_diagnostics_cache, refresh_risk_diagnostics, 15 * 60),
            ("factors", risk_factors_cache, refresh_factor_data, 15 * 60),
            ("funding", risk_funding_conditions_cache, refresh_funding_conditions_data, 15 * 60),
            ("breadth", risk_breadth_cache, refresh_breadth_data, 15 * 60),
            ("theme_rotation", risk_theme_rotation_cache, refresh_theme_rotation_data, 15 * 60),
            ("cross_asset", risk_cross_asset_cache, refresh_cross_asset_data, 15 * 60),
            ("liquidity", risk_liquidity_cache, refresh_liquidity_data, 15 * 60),
            ("valuation", risk_valuation_cache, refresh_valuation_data, 6 * 60 * 60),
            ("quality", risk_quality_cache, refresh_quality_data, 6 * 60 * 60),
            ("earnings", risk_earnings_cache, refresh_earnings_catalyst_data, 6 * 60 * 60),
            ("tail", risk_tail_cache, refresh_tail_risk_data, 15 * 60),
        ]
        light_dependencies = {"diagnostics", "factors", "funding", "breadth", "theme_rotation", "cross_asset", "liquidity", "tail"}
        dependency_status = []
        for key, cache, refresher, ttl in dependency_refreshers:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Regime compass dependency refresh error: {e}")
                dependency_status.append("missing")

        if allow_dependency_refresh is False and dependency_status.count("ok") < 4:
            return

        diagnostics = risk_diagnostics_cache.get("data") or {}
        factors = risk_factors_cache.get("data") or {}
        funding = risk_funding_conditions_cache.get("data") or {}
        breadth = risk_breadth_cache.get("data") or {}
        theme_rotation = risk_theme_rotation_cache.get("data") or {}
        cross_asset = risk_cross_asset_cache.get("data") or {}
        liquidity = risk_liquidity_cache.get("data") or {}
        valuation = risk_valuation_cache.get("data") or {}
        quality = risk_quality_cache.get("data") or {}
        earnings = risk_earnings_cache.get("data") or {}
        tail = risk_tail_cache.get("data") or {}

        trend_pillar = get_diagnostic_pillar(diagnostics, "trend")
        volatility_pillar = get_diagnostic_pillar(diagnostics, "volatility")
        drawdown_pillar = get_diagnostic_pillar(diagnostics, "drawdown")
        trend_health = clamp(100 - safe_float(trend_pillar.get("score"), 50))

        macro_health = clamp(100 - (
            safe_float(factors.get("pressure_score"), 50) * 0.45
            + safe_float(funding.get("funding_score"), 50) * 0.35
            + safe_float(volatility_pillar.get("score"), 50) * 0.20
        ))
        internal_health = clamp(
            safe_float(breadth.get("breadth_score"), 50) * 0.30
            + safe_float(theme_rotation.get("leadership_score"), 50) * 0.26
            + safe_float(cross_asset.get("confirmation_score"), 50) * 0.22
            + safe_float(liquidity.get("flow_score"), 50) * 0.22
        )
        fundamental_health = clamp(
            safe_float(quality.get("quality_score"), 50) * 0.45
            + (100 - safe_float(valuation.get("valuation_score"), 50)) * 0.35
            + (100 - safe_float(earnings.get("event_score"), 50)) * 0.20
        )

        axes = [
            {
                "key": "trend",
                "label": "趋势结构",
                "score": round(trend_health, 1),
                "state": constructive_state(trend_health),
                "color": constructive_color(trend_health),
                "detail": trend_pillar.get("comment", "趋势诊断处在中性区。"),
                "inputs": [
                    {"label": "趋势风险", "value": f"{safe_float(trend_pillar.get('score'), 50):.1f}"},
                    {"label": "回撤风险", "value": f"{safe_float(drawdown_pillar.get('score'), 50):.1f}"},
                    {"label": "综合风险", "value": f"{safe_float(diagnostics.get('risk_score'), 50):.1f}"},
                ],
            },
            {
                "key": "macro",
                "label": "宏观流动性",
                "score": round(macro_health, 1),
                "state": constructive_state(macro_health),
                "color": constructive_color(macro_health),
                "detail": f"宏观压力来自 {factors.get('main_headwind', 'VIX/利率/美元')}，融资状态为 {funding.get('regime', '中性')}。",
                "inputs": [
                    {"label": "宏观压力", "value": f"{safe_float(factors.get('pressure_score'), 50):.1f}"},
                    {"label": "融资压力", "value": f"{safe_float(funding.get('funding_score'), 50):.1f}"},
                    {"label": "波动风险", "value": f"{safe_float(volatility_pillar.get('score'), 50):.1f}"},
                ],
            },
            {
                "key": "internals",
                "label": "内部结构",
                "score": round(internal_health, 1),
                "state": constructive_state(internal_health),
                "color": constructive_color(internal_health),
                "detail": f"广度为 {breadth.get('breadth_label', '中性')}，主题轮动为 {theme_rotation.get('regime', '中性')}，跨资产为 {cross_asset.get('regime', '中性')}，流动性为 {liquidity.get('regime', '中性')}。",
                "inputs": [
                    {"label": "广度", "value": f"{safe_float(breadth.get('breadth_score'), 50):.1f}"},
                    {"label": "主题", "value": f"{safe_float(theme_rotation.get('leadership_score'), 50):.1f}"},
                    {"label": "跨资产", "value": f"{safe_float(cross_asset.get('confirmation_score'), 50):.1f}"},
                    {"label": "流动性", "value": f"{safe_float(liquidity.get('flow_score'), 50):.1f}"},
                ],
            },
            {
                "key": "fundamentals",
                "label": "基本面支撑",
                "score": round(fundamental_health, 1),
                "state": constructive_state(fundamental_health),
                "color": constructive_color(fundamental_health),
                "detail": f"估值为 {valuation.get('valuation_label', '中性')}，盈利质量为 {quality.get('quality_label', '中性')}，财报窗口为 {earnings.get('event_label', '中性')}。",
                "inputs": [
                    {"label": "质量", "value": f"{safe_float(quality.get('quality_score'), 50):.1f}"},
                    {"label": "估值压力", "value": f"{safe_float(valuation.get('valuation_score'), 50):.1f}"},
                    {"label": "财报压力", "value": f"{safe_float(earnings.get('event_score'), 50):.1f}"},
                ],
            },
        ]

        support_score = round(sum(axis["score"] for axis in axes) / len(axes), 1)
        pressure_score = round(
            safe_float(diagnostics.get("risk_score"), 50) * 0.24
            + safe_float(factors.get("pressure_score"), 50) * 0.18
            + safe_float(funding.get("funding_score"), 50) * 0.14
            + safe_float(tail.get("tail_score"), 50) * 0.16
            + safe_float(valuation.get("valuation_score"), 50) * 0.16
            + safe_float(earnings.get("event_score"), 50) * 0.12,
            1,
        )
        regime_score = round(clamp(50 + support_score * 0.42 - pressure_score * 0.34), 1)
        regime, color = regime_compass_label(regime_score, pressure_score, support_score, axes)

        weakest_axes = sorted(axes, key=lambda axis: axis["score"])[:2]
        strongest_axes = sorted(axes, key=lambda axis: axis["score"], reverse=True)[:2]
        weakest_labels = "、".join(axis["label"] for axis in weakest_axes)
        strongest_labels = "、".join(axis["label"] for axis in strongest_axes)

        if regime == "扩张顺风":
            summary = f"NDX 市场状态偏顺风，{strongest_labels} 提供主要支撑，新增风险预算仍需用估值和尾部风险约束节奏。"
        elif regime == "趋势持有":
            summary = f"NDX 趋势仍可持有，{weakest_labels} 是最需要监控的短板，适合保留核心暴露并等待确认。"
        elif regime == "风险收缩":
            summary = f"NDX 罗盘进入风险收缩，{weakest_labels} 拖累状态，优先降低追高和集中暴露。"
        elif regime == "高位脆弱":
            summary = f"NDX 支撑和压力同时偏高，{weakest_labels} 决定回撤敏感度，适合把仓位靠近风险预算中枢以下。"
        elif regime == "修复观察":
            summary = f"NDX 支撑项正在修复，但趋势确认不足，{strongest_labels} 可作为后续加仓确认线索。"
        else:
            summary = f"NDX 处在均衡震荡区，{strongest_labels} 与 {weakest_labels} 信号相互抵消，需要等待罗盘方向进一步打开。"

        action_map = {
            "扩张顺风": [
                "核心 NDX 暴露可维持在预算中上沿，但避免在单日大涨后追增。",
                "若广度和流动性继续改善，可优先增加分批暴露而非一次性提高仓位。",
                "保留基础保护，防止估值和财报窗口突然压缩风险承受力。",
            ],
            "趋势持有": [
                "保留已有核心暴露，把新增资金放在回踩和广度确认后执行。",
                "若宏观流动性轴跌破 45，应把仓位从中上沿降回中枢。",
                "若基本面支撑继续改善，可允许趋势持仓延长，但不扩大单一主题集中度。",
            ],
            "高位脆弱": [
                "仓位应靠近风险预算中枢以下，避免把上涨外推成新的基准情景。",
                "优先监控最弱轴，一旦继续恶化，降低净暴露或提高对冲覆盖。",
                "若趋势仍强但内部结构走弱，不应追逐窄幅龙头行情。",
            ],
            "风险收缩": [
                "暂停新增进攻性暴露，先确认止损位、现金缓冲和保护覆盖。",
                "若尾部风险和融资压力同步升高，组合应从收益目标切换到回撤控制。",
                "只有当趋势和内部结构重新回到 50 以上，才考虑恢复中性预算。",
            ],
            "修复观察": [
                "允许小幅试探性恢复风险预算，但需要趋势确认和成交质量配合。",
                "若内部结构继续改善，可把观察仓位升级为均衡仓位。",
                "若修复只来自少数龙头，保持现金缓冲，不追高扩大净暴露。",
            ],
            "均衡震荡": [
                "维持中性风险预算，优先做再平衡而非方向性加仓。",
                "上破需要趋势和内部结构同时确认，下破则优先执行减仓纪律。",
                "把估值、财报和尾部风险作为仓位上沿约束。",
            ],
        }

        decision_ladder = [
            {
                "label": "提高风险预算",
                "trigger": "罗盘分 > 68，压力分 < 52，趋势与内部结构均高于 55。",
                "action": "分批把 NDX 暴露推向预算中上沿。",
                "color": "green",
            },
            {
                "label": "维持核心仓位",
                "trigger": "罗盘分 52-68，且至少两条支撑轴处于可用区。",
                "action": "保留核心暴露，新增资金等待回踩或广度确认。",
                "color": "blue",
            },
            {
                "label": "降低追高冲动",
                "trigger": "压力分 > 58，或任一关键轴跌破 40。",
                "action": "把仓位压回中枢以下，并提高对冲或现金缓冲。",
                "color": "amber",
            },
            {
                "label": "防守优先",
                "trigger": "罗盘分 < 38，压力分 > 68，支撑分 < 52。",
                "action": "暂停新增进攻性暴露，优先控制最大回撤。",
                "color": "red",
            },
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "regime": regime,
            "regime_color": color,
            "regime_score": regime_score,
            "support_score": support_score,
            "pressure_score": pressure_score,
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "summary": summary,
            "axes": axes,
            "strongest_axes": [{"key": axis["key"], "label": axis["label"], "score": axis["score"]} for axis in strongest_axes],
            "weakest_axes": [{"key": axis["key"], "label": axis["label"], "score": axis["score"]} for axis in weakest_axes],
            "actions": action_map.get(regime, action_map["均衡震荡"]),
            "decision_ladder": decision_ladder,
            "methodology": "把现有 NDX 风险诊断、宏观压力、融资条件、广度、主题轮动、流动性、MAG7 估值、盈利质量、财报窗口和尾部风险聚合成四条正向状态轴。罗盘用于把分散指标转化为投委会状态判断，不构成买卖指令。",
        }
        risk_regime_compass_cache["data"] = data
        risk_regime_compass_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX regime compass updated: {regime}, score {regime_score:.1f}")
    except Exception as e:
        logger.error(f"NDX regime compass refresh failed: {e}")
        logger.error(traceback.format_exc())


def refresh_alerts_data(allow_dependency_refresh=True):
    global risk_alerts_cache

    try:
        dependency_refreshers = [
            ("diagnostics", risk_diagnostics_cache, refresh_risk_diagnostics, 15 * 60),
            ("regime", risk_regime_compass_cache, refresh_regime_compass_data, 15 * 60),
            ("levels", risk_levels_cache, refresh_technical_levels, 15 * 60),
            ("tail", risk_tail_cache, refresh_tail_risk_data, 15 * 60),
            ("funding", risk_funding_conditions_cache, refresh_funding_conditions_data, 15 * 60),
            ("breadth", risk_breadth_cache, refresh_breadth_data, 15 * 60),
            ("liquidity", risk_liquidity_cache, refresh_liquidity_data, 15 * 60),
            ("options", risk_options_cache, refresh_options_data, 15 * 60),
            ("volatility_term", risk_volatility_term_cache, refresh_volatility_term_data, 15 * 60),
            ("valuation", risk_valuation_cache, refresh_valuation_data, 6 * 60 * 60),
            ("quality", risk_quality_cache, refresh_quality_data, 6 * 60 * 60),
            ("earnings", risk_earnings_cache, refresh_earnings_catalyst_data, 6 * 60 * 60),
            ("concentration", risk_concentration_cache, refresh_concentration_data, 15 * 60),
        ]
        light_dependencies = {"diagnostics", "regime", "levels", "tail", "funding", "breadth", "liquidity"}
        dependency_status = []
        for key, cache, refresher, ttl in dependency_refreshers:
            try:
                can_refresh = allow_dependency_refresh is True or (
                    allow_dependency_refresh == "light" and key in light_dependencies
                )
                if can_refresh and not cache_is_fresh(cache, ttl):
                    if key == "regime":
                        refresher(allow_dependency_refresh="light" if allow_dependency_refresh == "light" else True)
                    else:
                        refresher()
                dependency_status.append("ok" if cache.get("data") else "missing")
            except Exception as e:
                logger.error(f"Risk alerts dependency refresh error for {key}: {e}")
                dependency_status.append("missing")

        if dependency_status.count("ok") < 4:
            return

        diagnostics = risk_diagnostics_cache.get("data") or {}
        regime = risk_regime_compass_cache.get("data") or {}
        levels = risk_levels_cache.get("data") or {}
        tail = risk_tail_cache.get("data") or {}
        funding = risk_funding_conditions_cache.get("data") or {}
        breadth = risk_breadth_cache.get("data") or {}
        liquidity = risk_liquidity_cache.get("data") or {}
        options = risk_options_cache.get("data") or {}
        volatility_term = risk_volatility_term_cache.get("data") or {}
        valuation = risk_valuation_cache.get("data") or {}
        quality = risk_quality_cache.get("data") or {}
        earnings = risk_earnings_cache.get("data") or {}
        concentration = risk_concentration_cache.get("data") or {}

        alerts = []
        risk_score = safe_float(diagnostics.get("risk_score"), 50)
        if risk_score >= 55:
            alerts.append(build_alert(
                "diagnostics_risk",
                "综合风险",
                "综合风险分抬升",
                risk_score,
                f"{risk_score:.1f}/100",
                "综合风险分高于 55。",
                "把新增风险预算放在回踩后执行，并优先检查尾部风险和技术位。",
                diagnostics.get("summary", "风险诊断提示压力抬升。"),
            ))

        regime_pressure = safe_float(regime.get("pressure_score"), 50)
        regime_support = safe_float(regime.get("support_score"), 50)
        if regime_pressure >= 58 or regime.get("regime") in ("风险收缩", "高位脆弱"):
            alerts.append(build_alert(
                "regime_pressure",
                "市场状态",
                f"市场状态：{regime.get('regime', '压力上升')}",
                max(regime_pressure, 60),
                f"压力 {regime_pressure:.1f} / 支撑 {regime_support:.1f}",
                "罗盘压力分高于 58，或状态进入高位脆弱/风险收缩。",
                "仓位靠近风险预算中枢以下，等待压力轴回落或支撑轴修复。",
                regime.get("summary", "市场状态罗盘提示压力和支撑不匹配。"),
            ))

        index_value = safe_float(levels.get("index"), 0)
        nearest_support = (levels.get("support_levels") or [{}])[0]
        nearest_resistance = (levels.get("resistance_levels") or [{}])[0]
        support_distance = abs(safe_float(nearest_support.get("distance"), 99))
        resistance_distance = abs(safe_float(nearest_resistance.get("distance"), 99))
        zone_score = safe_float(levels.get("zone_score"), 50)
        if zone_score <= 35:
            alerts.append(build_alert(
                "technical_breakdown",
                "技术位",
                "技术结构转弱",
                82 - zone_score * 0.5,
                levels.get("zone_label", "--"),
                "技术区间分低于 35。",
                "把 50/200 日均线和最近支撑作为硬触发线，降低追涨暴露。",
                levels.get("summary", "技术位监控提示结构转弱。"),
            ))
        elif support_distance <= 1.25:
            alerts.append(build_alert(
                "near_support",
                "技术位",
                "接近关键支撑",
                62 + max(0, 1.25 - support_distance) * 10,
                f"{nearest_support.get('label', '支撑')} {nearest_support.get('value', 0):,.0f}",
                "NDX 距最近支撑不足 1.25%。",
                "若收盘跌破该支撑，应把风险预算向下沿收缩。",
                f"NDX {index_value:,.0f}，最近支撑距离 {nearest_support.get('distance_label', '--')}。",
            ))
        elif zone_score >= 78:
            alerts.append(build_alert(
                "technical_extension",
                "技术位",
                "短线突破延伸",
                zone_score,
                levels.get("zone_label", "--"),
                "技术区间分高于 78。",
                "新增仓位等待回踩或成交确认，避免在远离 20 日均线时追高。",
                levels.get("summary", "技术位监控提示短线延伸。"),
            ))
        elif resistance_distance <= 1.0:
            alerts.append(build_alert(
                "near_resistance",
                "技术位",
                "接近上方压力",
                45,
                f"{nearest_resistance.get('label', '压力')} {nearest_resistance.get('value', 0):,.0f}",
                "NDX 距最近压力不足 1%。",
                "若突破失败且成交转弱，降低短线加仓节奏。",
                f"最近压力距离 {nearest_resistance.get('distance_label', '--')}。",
                "blue",
            ))

        tail_score = safe_float(tail.get("tail_score"), 50)
        if tail_score >= 55:
            alerts.append(build_alert(
                "tail_risk",
                "尾部风险",
                "尾部损失分布转紧",
                tail_score,
                f"VaR {tail.get('var95', '--')}% / ES {tail.get('expected_shortfall_95', '--')}%",
                "尾部风险分高于 55。",
                "用 VaR/ES 倒推最大单日损失预算，并检查现金缓冲。",
                tail.get("summary", "尾部风险模块提示历史损失分布偏紧。"),
            ))

        funding_score = safe_float(funding.get("funding_score"), 50)
        if funding_score >= 55:
            alerts.append(build_alert(
                "funding_pressure",
                "融资条件",
                f"融资条件：{funding.get('regime', '偏紧')}",
                funding_score,
                f"HYG/LQD {funding.get('credit_ratio_20d', '--')}%",
                "融资压力分高于 55。",
                "若信用和 VIX 同时走弱，把上涨视为脆弱反弹，降低追高。",
                funding.get("summary", "融资条件提示信用、久期、美元或波动融资约束。"),
            ))

        breadth_score = safe_float(breadth.get("breadth_score"), 50)
        participation_gap = safe_float(breadth.get("participation_gap_20d"), 0)
        if breadth_score < 45 or participation_gap < -3:
            alerts.append(build_alert(
                "breadth_weakness",
                "内部结构",
                "等权参与不足",
                58 + max(0, 45 - breadth_score) * 0.7 + max(0, -participation_gap - 3) * 2,
                f"{breadth.get('equal_symbol', '等权')} 差 {participation_gap:+.2f}%",
                "广度分低于 45，或等权相对 QQQ 20 日落后超过 3%。",
                "不要把窄幅龙头上涨直接外推为指数健康扩散。",
                breadth.get("summary", "市场广度提示内部参与不足。"),
            ))

        flow_score = safe_float(liquidity.get("flow_score"), 50)
        distribution_days = safe_float(liquidity.get("distribution_days"), 0)
        volume_ratio = safe_float(liquidity.get("volume_ratio_20"), 1)
        if flow_score < 40 or distribution_days >= 5:
            alerts.append(build_alert(
                "liquidity_distribution",
                "流动性",
                f"成交确认：{liquidity.get('regime', '偏弱')}",
                max(58, 70 - flow_score + distribution_days * 3),
                f"派发 {distribution_days:.0f}/20 · 量能 {volume_ratio:.2f}x",
                "流动性分低于 40，或近 20 日放量派发不少于 5 天。",
                "上行时要求成交量和 OBV 共同确认，否则降低突破可信度。",
                liquidity.get("summary", "成交结构提示承接质量需要观察。"),
            ))

        implied_move = safe_float(options.get("implied_move"), None)
        put_call_oi_ratio = safe_float(options.get("put_call_oi_ratio"), None)
        if implied_move is not None and (implied_move >= 2.8 or (put_call_oi_ratio is not None and put_call_oi_ratio >= 1.2)):
            options_score = clamp(35 + implied_move * 10 + max(0, (put_call_oi_ratio or 0) - 1) * 30)
            alerts.append(build_alert(
                "options_pressure",
                "期权定价",
                f"期权定价：{options.get('regime', '波动抬升')}",
                options_score,
                f"隐含 {implied_move:.2f}% · PCR {put_call_oi_ratio:.2f}" if put_call_oi_ratio is not None else f"隐含 {implied_move:.2f}%",
                "隐含到期波动高于 2.8%，或 Put/Call OI 高于 1.20。",
                "若现货跌破隐含下沿，短线风险预算应立即收缩。",
                options.get("summary", "期权市场定价提示保护需求或短线波动区间抬升。"),
            ))

        front_ratio = safe_float(volatility_term.get("front_ratio"), None)
        vvix_z = safe_float(volatility_term.get("vvix_z_score"), None)
        if front_ratio is not None and (front_ratio >= 0.96 or (vvix_z is not None and vvix_z >= 1.0)):
            term_score = safe_float(volatility_term.get("term_score"), 55)
            alerts.append(build_alert(
                "vol_term_flattening",
                "波动曲线",
                f"波动曲线：{volatility_term.get('regime', '趋平')}",
                max(term_score, 58),
                f"VIX/3M {front_ratio:.2f}x · VVIX z {vvix_z:.2f}" if vvix_z is not None else f"VIX/3M {front_ratio:.2f}x",
                "VIX/VIX3M 高于 0.96，或 VVIX z-score 高于 1.0。",
                "避免在波动曲线趋平时增加杠杆；已有保护按计划分批调整。",
                volatility_term.get("summary", "波动率期限结构提示保护成本或波动交易需求上升。"),
            ))

        valuation_score = safe_float(valuation.get("valuation_score"), None)
        quality_score = safe_float(quality.get("quality_score"), None)
        if valuation_score is not None and valuation_score >= 58:
            alerts.append(build_alert(
                "valuation_pressure",
                "基本面",
                f"估值压力：{valuation.get('valuation_label', '偏高')}",
                valuation_score,
                f"FPE {valuation.get('weighted_forward_pe', '--')}x",
                "MAG7 估值压力分高于 58。",
                "只有在盈利质量和财报预期同步改善时，才允许估值扩张假设上修。",
                valuation.get("summary", "估值模块提示权重股溢价需要更强盈利兑现。"),
            ))

        if quality_score is not None and quality_score < 45:
            alerts.append(build_alert(
                "quality_deterioration",
                "基本面",
                "盈利质量转弱",
                62 + max(0, 45 - quality_score),
                f"质量 {quality_score:.1f}/100",
                "MAG7 盈利质量分低于 45。",
                "若估值仍偏高，应降低多重估值扩张和集中暴露假设。",
                quality.get("summary", "盈利质量模块提示现金流或利润率支撑不足。"),
            ))

        event_score = safe_float(earnings.get("event_score"), None)
        if event_score is not None and event_score >= 55:
            alerts.append(build_alert(
                "earnings_window",
                "事件风险",
                f"财报窗口：{earnings.get('event_label', '临近')}",
                event_score,
                f"{earnings.get('nearest_symbol', '--')} {earnings.get('nearest_days', '--')}天",
                "MAG7 财报事件分高于 55。",
                "财报前后预留跳空风险预算，避免把方向性仓位集中在单一权重股。",
                earnings.get("summary", "财报催化模块提示事件窗口或预期分歧抬升。"),
            ))

        top3_weight = safe_float(concentration.get("top3_weight"), None)
        if top3_weight is not None and top3_weight >= 65:
            alerts.append(build_alert(
                "concentration_risk",
                "集中度",
                "权重集中度偏高",
                58 + (top3_weight - 65) * 1.2,
                f"Top3 {top3_weight:.1f}%",
                "MAG7 代理前三大权重超过 65%。",
                "单一龙头回撤会放大指数波动，仓位和对冲不能只看等权信号。",
                concentration.get("flags", ["权重股集中度提示单一龙头风险。"])[0],
            ))

        if not alerts:
            alerts.append(build_alert(
                "baseline_monitor",
                "状态确认",
                "暂无高优先级风险预警",
                28,
                "低扰动",
                "主要监控项未触发红色或重点观察阈值。",
                "维持既定风险预算，继续观察技术支撑、融资条件和广度扩散。",
                "当前预警层未发现需要立即调整风险预算的单一压力源。",
                "green",
            ))

        confirmations = []
        if regime_support >= 58 and regime_pressure < 55:
            confirmations.append("市场状态支撑分高于压力分，说明当前不是单边防守环境。")
        if breadth_score >= 60:
            confirmations.append("等权参与处在可用区，指数上涨质量有一定扩散支撑。")
        if quality_score is not None and quality_score >= 58:
            confirmations.append("MAG7 盈利质量稳健，估值溢价有部分基本面支撑。")
        if flow_score >= 55:
            confirmations.append("QQQ 成交确认偏正面，短线承接质量尚可。")
        if not confirmations:
            confirmations.append("确认项不足，短线应优先等待技术位、广度或流动性改善。")

        alerts = sorted(alerts, key=lambda item: item["score"], reverse=True)
        critical_count = len([item for item in alerts if item["severity"] == "critical"])
        watch_count = len([item for item in alerts if item["severity"] == "watch"])
        monitor_count = len([item for item in alerts if item["severity"] == "monitor"])
        alert_score = round(clamp(max(item["score"] for item in alerts) * 0.55 + (critical_count * 12 + watch_count * 6 + monitor_count * 2)), 1)
        level, color = alert_level(alert_score)

        if critical_count:
            summary = f"当前有 {critical_count} 条红色预警，最高风险来自 {alerts[0]['title']}，应优先处理仓位上限和保护覆盖。"
        elif watch_count:
            summary = f"当前有 {watch_count} 条重点观察项，最高优先级是 {alerts[0]['title']}，适合控制追高并等待确认。"
        elif monitor_count:
            summary = f"当前以常规监控为主，{alerts[0]['title']} 是最靠前的观察项。"
        else:
            summary = "当前没有高优先级预警，维持既定风险预算并继续观察核心触发线。"

        playbook = [
            "先处理红色预警：降低新增风险预算、确认止损位和对冲覆盖。",
            "重点观察项需要和收盘价确认配合，避免只因盘中噪音调整组合。",
            "若预警减少且确认项增加，再把仓位从防守区逐步恢复到中性预算。",
        ]

        data = {
            "as_of": datetime.utcnow().isoformat(),
            "alert_score": alert_score,
            "alert_level": level,
            "alert_color": color,
            "active_count": len(alerts),
            "critical_count": critical_count,
            "watch_count": watch_count,
            "monitor_count": monitor_count,
            "data_coverage": f"{dependency_status.count('ok')}/{len(dependency_status)} 模块",
            "summary": summary,
            "alerts": alerts[:10],
            "confirmations": confirmations[:5],
            "playbook": playbook,
            "methodology": "把现有 NDX 技术位、风险诊断、市场状态罗盘、尾部风险、融资条件、广度、流动性、期权定价、波动率曲线、MAG7 估值/盈利质量/财报窗口和集中度转换成统一预警清单。该模块用于风险监控和执行优先级排序，不构成买卖指令。",
        }
        risk_alerts_cache["data"] = data
        risk_alerts_cache["last_update"] = datetime.utcnow()
        logger.info(f"NDX risk alerts updated: {level}, score {alert_score:.1f}")
    except Exception as e:
        logger.error(f"NDX risk alerts refresh failed: {e}")
        logger.error(traceback.format_exc())


def cleanup_old_data():
    try:
        with app.app_context():
            threshold = datetime.now() - timedelta(days=30)
            PollVote.query.filter(PollVote.created_at < threshold).delete()
            MarketMetric.query.filter(MarketMetric.timestamp < threshold).delete()
            db.session.commit()
            logger.info("Cleanup done")
    except Exception as e: logger.error(f"Cleanup error: {e}")

def describe_ndx_risk(metric, ndx_data):
    score = safe_float(metric.index_value, 50)
    rsi = safe_float(metric.rsi, 50)
    vix_buffer = safe_float(metric.vix_score, 50)
    price_position = safe_float(metric.price_score, 50)
    macro_buffer = safe_float(metric.yield_score, 50)
    change_pct = safe_float(ndx_data.get("percent"), 0)

    if score >= 80:
        status = "风险偏高"
        action = "不宜继续追高，优先检查仓位集中度、止盈纪律和权重股拥挤交易。"
    elif score >= 65:
        status = "谨慎观察"
        action = "趋势仍有韧性，但新开仓应等待回踩确认，重点观察 MAG7 轮动是否扩散。"
    elif score >= 40:
        status = "中性震荡"
        action = "指数处在均衡区间，更适合用分批和再平衡处理波动，避免单日涨跌驱动决策。"
    elif score >= 25:
        status = "防守观察"
        action = "风险偏好降温，短线先控制回撤，等待波动率和成交结构稳定后再提高敞口。"
    else:
        status = "机会窗口"
        action = "情绪已明显降温，可把关注点放在现金流稳健、盈利可见度高的纳指核心资产。"

    if change_pct > 0.2:
        intraday = f"NDX 最新上涨 {change_pct:.2f}%"
    elif change_pct < -0.2:
        intraday = f"NDX 最新下跌 {abs(change_pct):.2f}%"
    else:
        intraday = "NDX 最新基本持平"

    summary = (
        f"{intraday}，综合风险温度 {score:.1f}/100，RSI {rsi:.1f}，"
        f"价格分位 {price_position:.1f}，VIX 缓冲 {vix_buffer:.1f}，"
        f"利率缓冲 {macro_buffer:.1f}。{action}"
    )
    return status, summary

def run_ndx_risk_analysis():
    # Ensure data is available
    global nasdaq_cache
    if not nasdaq_cache.get("data"):
        refresh_nasdaq_data()
        
    ndx_data = nasdaq_cache.get("data")
    if not ndx_data:
        logger.warning("No Nasdaq data available for NDX risk analysis after refresh attempt")
        return

    index_pos = ndx_data['index']

    try:
        with app.app_context():
            metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()

        if not metric:
            update_market_index()
            with app.app_context():
                metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()

        if not metric:
            logger.warning("NDX risk analysis skipped: no market metric available")
            return

        status, summary = describe_ndx_risk(metric, ndx_data)

        with app.app_context():
            new_rec = RiskBrief(status=status[:20], summary=summary, index_position=float(index_pos))
            db.session.add(new_rec)
            db.session.commit()
            global risk_latest_cache
            risk_latest_cache["data"] = new_rec.to_dict()
            risk_latest_cache["last_update"] = datetime.utcnow()
            logger.info(f"NDX risk brief updated and cached: {status}")
            
    except Exception as e:
        logger.error(f"NDX risk analysis job failed: {e}")
        run_rule_based_ndx_analysis(index_pos)

def run_rule_based_ndx_analysis(index_pos):
    with app.app_context():
        metric = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
        if not metric:
            logger.warning("Rule-based NDX analysis skipped: no market metric available")
            return

        ndx_data = nasdaq_cache.get("data") or {"index": index_pos, "percent": 0}
        status, summary = describe_ndx_risk(metric, ndx_data)

        new_rec = RiskBrief(status=status, summary=summary, index_position=float(index_pos))
        db.session.add(new_rec)
        db.session.commit()
        global risk_latest_cache
        risk_latest_cache["data"] = new_rec.to_dict()
        risk_latest_cache["last_update"] = datetime.utcnow()
        logger.info(f"Rule-based NDX risk brief generated: {status}")

def background_worker():
    last_cleanup = 0
    last_risk_analysis = 0
    last_risk_diagnostics = 0
    last_risk_scenarios = 0
    last_risk_budget = 0
    last_concentration = 0
    last_factors = 0
    last_factor_attribution = 0
    last_factor_shock = 0
    last_condition_matrix = 0
    last_funding_conditions = 0
    last_cross_asset = 0
    last_levels = 0
    last_tail = 0
    last_relative = 0
    last_theme_rotation = 0
    last_dispersion = 0
    last_options = 0
    last_gamma_map = 0
    last_option_skew = 0
    last_volatility_term = 0
    last_vol_premium = 0
    last_intraday_tape = 0
    last_volume_profile = 0
    last_liquidity = 0
    last_valuation = 0
    last_quality = 0
    last_earnings = 0
    last_breadth = 0
    last_hedge_overlay = 0
    last_regime_compass = 0
    last_alerts = 0
    last_scenario_map = 0
    last_recovery_path = 0
    last_contribution = 0
    last_capacity = 0
    last_playbook = 0
    last_desk_brief = 0
    last_rate_sensitivity = 0
    last_regime_analog = 0
    while True:
        try:
            update_market_index()
            refresh_watchlist_data()
            refresh_nasdaq_data()
            refresh_macro_data()

            # MAG7 concentration proxy every 30 minutes
            if time.time() - last_concentration > 1800:
                refresh_concentration_data()
                last_concentration = time.time()

            # Macro factor pressure every 30 minutes
            if time.time() - last_factors > 1800:
                refresh_factor_data()
                last_factors = time.time()

            # NDX factor attribution every 30 minutes
            if time.time() - last_factor_attribution > 1800:
                refresh_factor_attribution_data()
                last_factor_attribution = time.time()

            # NDX factor shock lab every 30 minutes
            if time.time() - last_factor_shock > 1800:
                refresh_factor_shock_data()
                last_factor_shock = time.time()

            # NDX condition matrix every 30 minutes
            if time.time() - last_condition_matrix > 1800:
                refresh_condition_matrix_data()
                last_condition_matrix = time.time()

            # NDX funding and credit conditions every 30 minutes
            if time.time() - last_funding_conditions > 1800:
                refresh_funding_conditions_data()
                last_funding_conditions = time.time()

            # NDX cross-asset confirmation every 30 minutes
            if time.time() - last_cross_asset > 1800:
                refresh_cross_asset_data()
                last_cross_asset = time.time()

            # Technical levels every 30 minutes
            if time.time() - last_levels > 1800:
                refresh_technical_levels()
                last_levels = time.time()

            # Tail risk distribution every 30 minutes
            if time.time() - last_tail > 1800:
                refresh_tail_risk_data()
                last_tail = time.time()

            # Relative strength and beta every 30 minutes
            if time.time() - last_relative > 1800:
                refresh_relative_strength_data()
                last_relative = time.time()

            # NDX theme rotation every 30 minutes
            if time.time() - last_theme_rotation > 1800:
                refresh_theme_rotation_data()
                last_theme_rotation = time.time()

            # MAG7 correlation and dispersion every 30 minutes
            if time.time() - last_dispersion > 1800:
                refresh_dispersion_data()
                last_dispersion = time.time()

            # QQQ options-implied move every 30 minutes
            if time.time() - last_options > 1800:
                refresh_options_data()
                last_options = time.time()

            # QQQ option gamma map every 30 minutes
            if time.time() - last_gamma_map > 1800:
                refresh_gamma_map_data()
                last_gamma_map = time.time()

            # QQQ option skew and tail hedge demand every 30 minutes
            if time.time() - last_option_skew > 1800:
                refresh_option_skew_data()
                last_option_skew = time.time()

            # VIX term structure every 30 minutes
            if time.time() - last_volatility_term > 1800:
                refresh_volatility_term_data()
                last_volatility_term = time.time()

            # QQQ volatility risk premium every 30 minutes
            if time.time() - last_vol_premium > 1800:
                refresh_vol_premium_data()
                last_vol_premium = time.time()

            # QQQ intraday trading-desk tape every 5 minutes
            if time.time() - last_intraday_tape > 300:
                refresh_intraday_tape_data()
                last_intraday_tape = time.time()

            # QQQ volume-at-price profile every 5 minutes
            if time.time() - last_volume_profile > 300:
                refresh_volume_profile_data()
                last_volume_profile = time.time()

            # QQQ liquidity and volume confirmation every 30 minutes
            if time.time() - last_liquidity > 1800:
                refresh_liquidity_data()
                last_liquidity = time.time()

            # MAG7 valuation proxy every 6 hours
            if time.time() - last_valuation > 21600:
                refresh_valuation_data()
                last_valuation = time.time()

            # MAG7 earnings and cash flow quality proxy every 6 hours
            if time.time() - last_quality > 21600:
                refresh_quality_data()
                last_quality = time.time()

            # MAG7 earnings catalyst calendar every 6 hours
            if time.time() - last_earnings > 21600:
                refresh_earnings_catalyst_data()
                last_earnings = time.time()

            # Equal-weight Nasdaq 100 breadth proxy every 30 minutes
            if time.time() - last_breadth > 1800:
                refresh_breadth_data()
                last_breadth = time.time()
            
            # NDX risk analysis every 2 hours (7200 seconds)
            if time.time() - last_risk_analysis > 7200:
                run_ndx_risk_analysis()
                last_risk_analysis = time.time()

            # NDX risk diagnostics every 30 minutes
            if time.time() - last_risk_diagnostics > 1800:
                refresh_risk_diagnostics()
                last_risk_diagnostics = time.time()

            # NDX scenario analysis every 30 minutes
            if time.time() - last_risk_scenarios > 1800:
                refresh_risk_scenarios()
                last_risk_scenarios = time.time()

            # NDX risk budget every 30 minutes
            if time.time() - last_risk_budget > 1800:
                refresh_risk_budget()
                last_risk_budget = time.time()

            # NDX hedge overlay every 30 minutes
            if time.time() - last_hedge_overlay > 1800:
                refresh_hedge_overlay_data()
                last_hedge_overlay = time.time()

            # NDX market regime compass every 30 minutes
            if time.time() - last_regime_compass > 1800:
                refresh_regime_compass_data()
                last_regime_compass = time.time()

            # NDX risk alert deck every 30 minutes
            if time.time() - last_alerts > 1800:
                refresh_alerts_data()
                last_alerts = time.time()

            # NDX scenario probability map every 30 minutes
            if time.time() - last_scenario_map > 1800:
                refresh_scenario_map_data()
                last_scenario_map = time.time()

            # NDX drawdown recovery path every 30 minutes
            if time.time() - last_recovery_path > 1800:
                refresh_recovery_path_data()
                last_recovery_path = time.time()

            # NDX risk contribution attribution every 30 minutes
            if time.time() - last_contribution > 1800:
                refresh_contribution_data()
                last_contribution = time.time()

            # NDX risk capacity gate every 30 minutes
            if time.time() - last_capacity > 1800:
                refresh_capacity_data()
                last_capacity = time.time()

            # NDX execution playbook every 30 minutes
            if time.time() - last_playbook > 1800:
                refresh_playbook_data()
                last_playbook = time.time()

            # NDX historical regime analogs every 30 minutes
            if time.time() - last_regime_analog > 1800:
                refresh_regime_analog_data()
                last_regime_analog = time.time()

            # NDX institutional desk brief every 30 minutes
            if time.time() - last_desk_brief > 1800:
                refresh_desk_brief_data()
                last_desk_brief = time.time()

            # NDX valuation-rate sensitivity every 30 minutes
            if time.time() - last_rate_sensitivity > 1800:
                refresh_rate_sensitivity_data()
                last_rate_sensitivity = time.time()

            # Daily cleanup
            if time.time() - last_cleanup > 86400:
                cleanup_old_data()
                last_cleanup = time.time()
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            
        time.sleep(60) 

# Routes
@app.route('/api/risk/latest', methods=['GET'])
def get_risk_latest():
    global risk_latest_cache
    # Serve from memory cache for maximum concurrency
    if risk_latest_cache["data"] and risk_latest_cache["data"].get("status") in RISK_BRIEF_STATUSES:
        return jsonify(risk_latest_cache["data"])
    
    # Lazy init cache from DB if memory is empty
    rec = RiskBrief.query.filter(RiskBrief.status.in_(RISK_BRIEF_STATUSES)).order_by(RiskBrief.created_at.desc()).first()
    if rec:
        risk_latest_cache["data"] = rec.to_dict()
        risk_latest_cache["last_update"] = datetime.utcnow()
        return jsonify(risk_latest_cache["data"])
        
    return jsonify({"error": "No recommendations yet"}), 202

@app.route('/api/risk/history', methods=['GET'])
def get_risk_history():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    recs = RiskBrief.query.filter(RiskBrief.status.in_(RISK_BRIEF_STATUSES)).order_by(RiskBrief.created_at.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        "items": [r.to_dict() for r in recs.items],
        "total": recs.total,
        "pages": recs.pages,
        "current_page": recs.page
    })

@app.route('/api/risk/diagnostics', methods=['GET'])
def get_risk_diagnostics():
    if not cache_is_fresh(risk_diagnostics_cache, 15 * 60) and should_refresh_empty_cache(risk_diagnostics_cache, 60):
        refresh_risk_diagnostics()

    data = risk_diagnostics_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/scenarios', methods=['GET'])
def get_risk_scenarios():
    if not cache_is_fresh(risk_scenarios_cache, 15 * 60) and should_refresh_empty_cache(risk_scenarios_cache, 60):
        refresh_risk_scenarios()

    data = risk_scenarios_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/budget', methods=['GET'])
def get_risk_budget():
    if not cache_is_fresh(risk_budget_cache, 15 * 60) and should_refresh_empty_cache(risk_budget_cache, 60):
        refresh_risk_budget()

    data = risk_budget_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/hedge-overlay', methods=['GET'])
def get_risk_hedge_overlay():
    if not cache_is_fresh(risk_hedge_overlay_cache, 15 * 60) and should_refresh_empty_cache(risk_hedge_overlay_cache, 60):
        refresh_hedge_overlay_data()

    data = risk_hedge_overlay_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/concentration', methods=['GET'])
def get_risk_concentration():
    if not cache_is_fresh(risk_concentration_cache, 15 * 60) and should_refresh_empty_cache(risk_concentration_cache, 60):
        refresh_concentration_data()

    data = risk_concentration_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/factors', methods=['GET'])
def get_risk_factors():
    if not cache_is_fresh(risk_factors_cache, 15 * 60) and should_refresh_empty_cache(risk_factors_cache, 60):
        refresh_factor_data()

    data = risk_factors_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/attribution', methods=['GET'])
def get_risk_attribution():
    if not cache_is_fresh(risk_factor_attribution_cache, 15 * 60) and should_refresh_empty_cache(risk_factor_attribution_cache, 60):
        refresh_factor_attribution_data()

    data = risk_factor_attribution_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/factor-shock', methods=['GET'])
def get_risk_factor_shock():
    if not cache_is_fresh(risk_factor_shock_cache, 15 * 60) and should_refresh_empty_cache(risk_factor_shock_cache, 60):
        refresh_factor_shock_data()

    data = risk_factor_shock_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/condition-matrix', methods=['GET'])
def get_risk_condition_matrix():
    if not cache_is_fresh(risk_condition_matrix_cache, 15 * 60) and should_refresh_empty_cache(risk_condition_matrix_cache, 60):
        refresh_condition_matrix_data()

    data = risk_condition_matrix_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/funding-conditions', methods=['GET'])
def get_risk_funding_conditions():
    if not cache_is_fresh(risk_funding_conditions_cache, 15 * 60) and should_refresh_empty_cache(risk_funding_conditions_cache, 60):
        refresh_funding_conditions_data()

    data = risk_funding_conditions_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/cross-asset', methods=['GET'])
def get_risk_cross_asset():
    if not cache_is_fresh(risk_cross_asset_cache, 15 * 60) and should_refresh_empty_cache(risk_cross_asset_cache, 60):
        refresh_cross_asset_data()

    data = risk_cross_asset_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/regime-compass', methods=['GET'])
def get_risk_regime_compass():
    if not cache_is_fresh(risk_regime_compass_cache, 15 * 60) and should_refresh_empty_cache(risk_regime_compass_cache, 60):
        refresh_regime_compass_data(allow_dependency_refresh="light")

    data = risk_regime_compass_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/alerts', methods=['GET'])
def get_risk_alerts():
    if not cache_is_fresh(risk_alerts_cache, 15 * 60) and should_refresh_empty_cache(risk_alerts_cache, 60):
        refresh_alerts_data(allow_dependency_refresh="light")

    data = risk_alerts_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/scenario-map', methods=['GET'])
def get_risk_scenario_map():
    if not cache_is_fresh(risk_scenario_map_cache, 15 * 60) and should_refresh_empty_cache(risk_scenario_map_cache, 60):
        refresh_scenario_map_data(allow_dependency_refresh="light")

    data = risk_scenario_map_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/recovery-path', methods=['GET'])
def get_risk_recovery_path():
    if not cache_is_fresh(risk_recovery_path_cache, 15 * 60) and should_refresh_empty_cache(risk_recovery_path_cache, 60):
        refresh_recovery_path_data(allow_dependency_refresh="light")

    data = risk_recovery_path_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/contribution', methods=['GET'])
def get_risk_contribution():
    if not cache_is_fresh(risk_contribution_cache, 15 * 60) and should_refresh_empty_cache(risk_contribution_cache, 60):
        refresh_contribution_data(allow_dependency_refresh="light")

    data = risk_contribution_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/capacity', methods=['GET'])
def get_risk_capacity():
    if not cache_is_fresh(risk_capacity_cache, 15 * 60) and should_refresh_empty_cache(risk_capacity_cache, 60):
        refresh_capacity_data(allow_dependency_refresh="light")

    data = risk_capacity_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/playbook', methods=['GET'])
def get_risk_playbook():
    if not cache_is_fresh(risk_playbook_cache, 15 * 60) and should_refresh_empty_cache(risk_playbook_cache, 60):
        refresh_playbook_data(allow_dependency_refresh="light")

    data = risk_playbook_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/regime-analog', methods=['GET'])
def get_risk_regime_analog():
    if not cache_is_fresh(risk_regime_analog_cache, 15 * 60) and should_refresh_empty_cache(risk_regime_analog_cache, 60):
        refresh_regime_analog_data()

    data = risk_regime_analog_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/desk-brief', methods=['GET'])
def get_risk_desk_brief():
    if not cache_is_fresh(risk_desk_brief_cache, 15 * 60) and should_refresh_empty_cache(risk_desk_brief_cache, 60):
        refresh_desk_brief_data(allow_dependency_refresh="light")

    data = risk_desk_brief_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/rate-sensitivity', methods=['GET'])
def get_risk_rate_sensitivity():
    if not cache_is_fresh(risk_rate_sensitivity_cache, 15 * 60) and should_refresh_empty_cache(risk_rate_sensitivity_cache, 60):
        refresh_rate_sensitivity_data(allow_dependency_refresh="light")

    data = risk_rate_sensitivity_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/levels', methods=['GET'])
def get_risk_levels():
    if not cache_is_fresh(risk_levels_cache, 15 * 60) and should_refresh_empty_cache(risk_levels_cache, 60):
        refresh_technical_levels()

    data = risk_levels_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/tail', methods=['GET'])
def get_risk_tail():
    if not cache_is_fresh(risk_tail_cache, 15 * 60) and should_refresh_empty_cache(risk_tail_cache, 60):
        refresh_tail_risk_data()

    data = risk_tail_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/relative', methods=['GET'])
def get_risk_relative():
    if not cache_is_fresh(risk_relative_cache, 15 * 60) and should_refresh_empty_cache(risk_relative_cache, 60):
        refresh_relative_strength_data()

    data = risk_relative_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/theme-rotation', methods=['GET'])
def get_risk_theme_rotation():
    if not cache_is_fresh(risk_theme_rotation_cache, 15 * 60) and should_refresh_empty_cache(risk_theme_rotation_cache, 60):
        refresh_theme_rotation_data()

    data = risk_theme_rotation_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/dispersion', methods=['GET'])
def get_risk_dispersion():
    if not cache_is_fresh(risk_dispersion_cache, 15 * 60) and should_refresh_empty_cache(risk_dispersion_cache, 60):
        refresh_dispersion_data()

    data = risk_dispersion_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/options', methods=['GET'])
def get_risk_options():
    if not cache_is_fresh(risk_options_cache, 15 * 60) and should_refresh_empty_cache(risk_options_cache, 60):
        refresh_options_data()

    data = risk_options_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/gamma-map', methods=['GET'])
def get_risk_gamma_map():
    if not cache_is_fresh(risk_gamma_map_cache, 15 * 60) and should_refresh_empty_cache(risk_gamma_map_cache, 60):
        refresh_gamma_map_data()

    data = risk_gamma_map_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/option-skew', methods=['GET'])
def get_risk_option_skew():
    if not cache_is_fresh(risk_option_skew_cache, 15 * 60) and should_refresh_empty_cache(risk_option_skew_cache, 60):
        refresh_option_skew_data()

    data = risk_option_skew_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/volatility-term', methods=['GET'])
def get_risk_volatility_term():
    if not cache_is_fresh(risk_volatility_term_cache, 15 * 60) and should_refresh_empty_cache(risk_volatility_term_cache, 60):
        refresh_volatility_term_data()

    data = risk_volatility_term_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/vol-premium', methods=['GET'])
def get_risk_vol_premium():
    if not cache_is_fresh(risk_vol_premium_cache, 15 * 60) and should_refresh_empty_cache(risk_vol_premium_cache, 60):
        refresh_vol_premium_data(allow_dependency_refresh="light")

    data = risk_vol_premium_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/intraday-tape', methods=['GET'])
def get_risk_intraday_tape():
    if not cache_is_fresh(risk_intraday_tape_cache, 5 * 60) and should_refresh_empty_cache(risk_intraday_tape_cache, 60):
        refresh_intraday_tape_data()

    data = risk_intraday_tape_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/volume-profile', methods=['GET'])
def get_risk_volume_profile():
    if not cache_is_fresh(risk_volume_profile_cache, 5 * 60) and should_refresh_empty_cache(risk_volume_profile_cache, 60):
        refresh_volume_profile_data()

    data = risk_volume_profile_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/liquidity', methods=['GET'])
def get_risk_liquidity():
    if not cache_is_fresh(risk_liquidity_cache, 15 * 60) and should_refresh_empty_cache(risk_liquidity_cache, 60):
        refresh_liquidity_data()

    data = risk_liquidity_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/valuation', methods=['GET'])
def get_risk_valuation():
    if not cache_is_fresh(risk_valuation_cache, 6 * 60 * 60) and should_refresh_empty_cache(risk_valuation_cache, 5 * 60):
        refresh_valuation_data()

    data = risk_valuation_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/quality', methods=['GET'])
def get_risk_quality():
    if not cache_is_fresh(risk_quality_cache, 6 * 60 * 60) and should_refresh_empty_cache(risk_quality_cache, 5 * 60):
        refresh_quality_data()

    data = risk_quality_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/earnings', methods=['GET'])
def get_risk_earnings():
    if not cache_is_fresh(risk_earnings_cache, 6 * 60 * 60) and should_refresh_empty_cache(risk_earnings_cache, 5 * 60):
        refresh_earnings_catalyst_data()

    data = risk_earnings_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/risk/breadth', methods=['GET'])
def get_risk_breadth():
    if not cache_is_fresh(risk_breadth_cache, 15 * 60) and should_refresh_empty_cache(risk_breadth_cache, 60):
        refresh_breadth_data()

    data = risk_breadth_cache.get("data")
    return jsonify(data) if data else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/market-index', methods=['GET'])
def get_market_index():
    m = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    return jsonify(m.to_dict()) if m else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/market-index/history', methods=['GET'])
def get_market_history():
    metrics = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).limit(30).all()
    return jsonify([m.to_dict() for m in reversed(metrics)])

@app.route('/api/nasdaq', methods=['GET'])
def get_nasdaq():
    if not nasdaq_cache["data"] and should_refresh_empty_cache(nasdaq_cache):
        refresh_nasdaq_data()
    return jsonify(nasdaq_cache["data"]) if nasdaq_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/macro-assets', methods=['GET'])
def get_macro():
    if not macro_cache["data"] and should_refresh_empty_cache(macro_cache):
        refresh_macro_data()
    return jsonify(macro_cache["data"]) if macro_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/watch-list', methods=['GET'])
def get_watch():
    if not watchlist_cache["data"] and should_refresh_empty_cache(watchlist_cache):
        refresh_watchlist_data()
    return jsonify(watchlist_cache["data"]) if watchlist_cache["data"] else (jsonify({"error": "Initializing"}), 202)

@app.route('/api/sitemap-urls', methods=['GET'])
def get_sitemap_urls():
    # Return dynamic analysis routes
    analyses = Analysis.query.all()
    urls = []
    for a in analyses:
        urls.append({"loc": f"/analysis/{a.id}", "lastmod": a.created_at.isoformat()})
    
    # Daily logs are discovered directly from the Markdown content directory.
    return jsonify(urls)

@app.route('/api/poll/status', methods=['GET'])
def get_poll_status():
    last_24h = datetime.utcnow() - timedelta(hours=24)
    bull = PollVote.query.filter(PollVote.vote_type == 'bull', PollVote.created_at > last_24h).count()
    bear = PollVote.query.filter(PollVote.vote_type == 'bear', PollVote.created_at > last_24h).count()
    total = bull + bear
    bull_pct = round((bull / total) * 100) if total > 0 else 50
    ip = request.remote_addr or 'unknown'
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()
    has_voted = PollVote.query.filter(PollVote.ip_hash == ip_hash, PollVote.created_at > last_24h).first() is not None
    return jsonify({"bull_pct": bull_pct, "bear_pct": 100 - bull_pct, "total": total, "has_voted": has_voted})

@app.route('/api/poll/vote', methods=['POST'])
def submit_vote():
    data = request.get_json(silent=True) or {}
    vote_type = data.get("type")
    if vote_type not in {"bull", "bear"}:
        return jsonify({"error": "Invalid vote type"}), 400

    ip = request.remote_addr or "unknown"
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()
    last_24h = datetime.utcnow() - timedelta(hours=24)
    existing = PollVote.query.filter(
        PollVote.ip_hash == ip_hash,
        PollVote.created_at > last_24h,
    ).first()
    if existing:
        return jsonify({"error": "Already voted"}), 403

    db.session.add(PollVote(vote_type=vote_type, ip_hash=ip_hash))
    db.session.commit()
    return jsonify({"success": True})

@app.route('/api/market-quote', methods=['GET'])
def get_market_quote():
    # Fetch latest data for context
    ndx = nasdaq_cache.get("data")
    sentiment = MarketMetric.query.order_by(MarketMetric.timestamp.desc()).first()
    
    if not ndx or not sentiment:
        return jsonify({
            "quote": "市场正在酝酿情绪，请稍后再来...",
            "author": "InvestCool Risk Desk",
            "date": datetime.now().strftime("%Y.%m.%d")
        })

    change = ndx['percent']
    value = sentiment.index_value
    
    # Rule engine for market quotes
    if change > 1.5 and value > 70:
        quotes = [
            "多头们今天可能在喝香槟，但别忘了系好安全带，高处不胜寒。",
            "纳指飞得太快，灵魂都有点跟不上了。建议：适度止盈，买个鸡腿犒劳自己。",
            "满屏的绿色（涨）让我想起春天，但别在春天还没过完就急着脱外套。"
        ]
    elif change < -1.5 and value < 30:
        quotes = [
            "今天的 K 线像极了蹦极，只是没带绳子。撑住，底部往往在绝望中诞生。",
            "别看账户了，去公园看看树吧。账户会缩水，但春天不会。",
            "这就是市场，它想拿走你的筹码，顺便考验你的血压。"
        ]
    elif change < -0.5 and change > -1.5:
        quotes = [
            "市场今天有点小感冒，正在咳出一些浮躁的筹码。",
            "阴跌不可怕，可怕的是你还没学会与波动做朋友。",
            "这只是长期增长曲线上的一点点微波，别把它当成海啸。"
        ]
    elif value > 80:
        quotes = [
            "现在的贪婪程度已经溢出屏幕了。记往：当邻居都在谈论股票时，就是该离场的时候。",
            "疯狂的派对终会结束，希望你不是那个最后留下来洗碗的人。"
        ]
    elif value < 20:
        quotes = [
            "遍地都是被打折的黄金，如果你还有子弹，现在是猎人的时间。",
            "别人恐惧我贪婪？说起来容易，做起来需要一颗大心脏。"
        ]
    else:
        quotes = [
            "市场今天在玩‘一二三木头人’，不涨不跌，最适合复盘学习。",
            "横盘是耐心者的磨刀石。既然无事发生，不如去读本好书。",
            "波动率在打瞌睡，你也可以稍微眯一会儿。"
        ]

    import random
    return jsonify({
        "quote": random.choice(quotes),
        "author": "InvestCool 市场观察员",
        "date": datetime.now().strftime("%Y.%m.%d")
    })

@app.route('/api/analysis', methods=['GET'])
def get_all_analysis():
    # Public view: Only show non-deleted items
    c_type = request.args.get('type', 'analysis')
    query = Analysis.query.filter_by(is_deleted=False)
    if c_type != 'all':
        query = query.filter_by(content_type=c_type)
    analyses = query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analyses])

@app.route('/api/track', methods=['POST'])
def track_page_view():
    data = request.json or {}
    path = data.get('path', '/')
    ip = request.remote_addr or 'unknown'
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()
    
    with app.app_context():
        # Prevent spamming the same path from the same IP within 1 minute
        recent = PageView.query.filter(
            PageView.ip_hash == ip_hash,
            PageView.path == path,
            PageView.timestamp > datetime.utcnow() - timedelta(minutes=1)
        ).first()
        if not recent:
            pv = PageView(ip_hash=ip_hash, path=path)
            db.session.add(pv)
            db.session.commit()
            
    return jsonify({"success": True})

@app.route('/api/admin/all-content', methods=['GET'])
@require_admin
def get_admin_content():
    # Admin sees everything including trash
    items = Analysis.query.order_by(Analysis.created_at.desc()).all()
    return jsonify([a.to_dict() for a in items])

@app.route('/api/admin/stats', methods=['GET'])
@require_admin
def get_admin_stats():
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_visits = PageView.query.filter(PageView.timestamp >= today_start).count()
    total_visits = PageView.query.count()
    
    # Active users (unique IPs in the last 15 minutes)
    active_users = db.session.query(db.func.count(db.func.distinct(PageView.ip_hash)))\
        .filter(PageView.timestamp >= datetime.utcnow() - timedelta(minutes=15)).scalar() or 0
        
    # Bounce rate calculation
    total_unique_ips = db.session.query(db.func.count(db.func.distinct(PageView.ip_hash))).scalar() or 1
    
    # Subquery to count single-page IPs
    subq = db.session.query(PageView.ip_hash).group_by(PageView.ip_hash).having(db.func.count(PageView.id) == 1).subquery()
    single_page_ips = db.session.query(db.func.count(subq.c.ip_hash)).scalar() or 0
        
    bounce_rate_pct = round((single_page_ips / total_unique_ips) * 100) if total_unique_ips > 0 else 0
    
    return jsonify({
        "today_visits": today_visits,
        "total_visits": total_visits,
        "active_users": active_users,
        "bounce_rate": f"{bounce_rate_pct}%"
    })

@app.route('/api/analysis/<int:id>', methods=['GET'])
def get_analysis_by_id(id):
    a = Analysis.query.get_or_404(id)
    if a.is_deleted: abort(404)
    return jsonify(a.to_dict())

def content_file_paths(analysis_id):
    content_base = os.path.abspath(os.path.join(basedir, "../../frontend/content"))
    paths = []
    for folder in ("analysis", "tutorials"):
        paths.extend(glob(os.path.join(content_base, folder, f"{analysis_id}_*.md")))
    return paths


def remove_analysis_files(analysis_id):
    for file_path in content_file_paths(analysis_id):
        try:
            os.remove(file_path)
        except FileNotFoundError:
            pass


# Keep the public Markdown collection synchronized with the admin database.
def sync_analysis_to_file(analysis_obj):
    try:
        content_base = os.path.abspath(os.path.join(basedir, "../../frontend/content"))
        folder = "analysis" if analysis_obj.content_type == 'analysis' else "tutorials"
        target_dir = os.path.join(content_base, folder)
        os.makedirs(target_dir, exist_ok=True)

        remove_analysis_files(analysis_obj.id)
        if analysis_obj.is_deleted:
            return

        filename = f"{analysis_obj.id}_{analysis_obj.title.replace(' ', '_')}.md"
        for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
            filename = filename.replace(char, '')
        file_path = os.path.join(target_dir, filename)

        fm = "---\n"
        fm += f"title: {json.dumps(analysis_obj.title, ensure_ascii=False)}\n"
        fm += f"category: {json.dumps(analysis_obj.category, ensure_ascii=False)}\n"
        fm += f"summary: {json.dumps(analysis_obj.summary, ensure_ascii=False)}\n"
        fm += f"cover: {json.dumps(analysis_obj.cover or '', ensure_ascii=False)}\n"
        fm += f"date: {json.dumps(analysis_obj.created_at.strftime('%Y-%m-%d'))}\n"
        fm += "---\n\n"

        temp_path = f"{file_path}.tmp"
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(fm + analysis_obj.content)
        os.replace(temp_path, file_path)

        logger.info(f"Synced article #{analysis_obj.id} to file: {file_path}")
    except Exception as e:
        logger.error(f"Sync to file failed: {e}")

@app.route('/api/analysis', methods=['POST'])
@require_admin
def create_analysis():
    data = request.get_json(silent=True) or {}
    required = ("title", "summary", "content", "category")
    missing = [field for field in required if not str(data.get(field, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
    try:
        new_analysis = Analysis(
            title=data.get('title'),
            summary=data.get('summary'),
            content=data.get('content'),
            category=data.get('category'),
            cover=data.get('cover'),
            content_type=data.get('content_type', 'analysis')
        )
        db.session.add(new_analysis)
        db.session.commit()
        sync_analysis_to_file(new_analysis)
        return jsonify(new_analysis.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/analysis/<int:id>', methods=['PUT'])
@require_admin
def update_analysis(id):
    a = Analysis.query.get_or_404(id)
    data = request.json
    try:
        a.title = data.get('title', a.title)
        a.summary = data.get('summary', a.summary)
        a.content = data.get('content', a.content)
        a.category = data.get('category', a.category)
        a.cover = data.get('cover', a.cover)
        a.content_type = data.get('content_type', a.content_type)
        db.session.commit()
        sync_analysis_to_file(a)
        return jsonify(a.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/analysis/<int:id>', methods=['DELETE'])
@require_admin
def delete_analysis(id):
    a = Analysis.query.get_or_404(id)
    try:
        # Move to trash instead of real delete
        a.is_deleted = True
        a.deleted_at = datetime.utcnow()
        db.session.commit()
        sync_analysis_to_file(a)
        return jsonify({"success": True, "message": "Moved to trash"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/admin/restore/<int:id>', methods=['POST'])
@require_admin
def restore_analysis(id):
    a = Analysis.query.get_or_404(id)
    try:
        a.is_deleted = False
        a.deleted_at = None
        db.session.commit()
        sync_analysis_to_file(a)
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/admin/hard-delete/<int:id>', methods=['DELETE'])
@require_admin
def hard_delete_analysis(id):
    a = Analysis.query.get_or_404(id)
    try:
        remove_analysis_files(a.id)
        db.session.delete(a)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

# Configuration for uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../../frontend/public/uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB Limit

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/uploads/<path:filename>')
def serve_upload(filename):
    from flask import send_from_directory
    return send_from_directory(UPLOAD_FOLDER, filename)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST'])
@require_admin
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        file_content = file.read()
        try:
            image = Image.open(io.BytesIO(file_content))
            image.verify()
        except (UnidentifiedImageError, OSError):
            return jsonify({"error": "Invalid image file"}), 400

        file_hash = hashlib.md5(file_content).hexdigest()
        filename = f"{file_hash}.{ext}"
        
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            with open(filepath, 'wb') as f:
                f.write(file_content)
        
        # Return the public URL path via API proxy
        return jsonify({
            "url": f"/api/uploads/{filename}",
            "filename": filename
        })
    
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/auth/verify', methods=['GET'])
@require_admin
def verify_token():
    return jsonify({"status": "valid"})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
