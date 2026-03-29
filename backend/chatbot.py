"""AI chatbot for store managers — powered by Claude via Lava."""

import json
import os
from importlib import import_module
import re
from pathlib import Path
from types import ModuleType
from urllib.parse import quote

from data import get_aisles, get_items, get_market_factors, get_store_info
from finance import get_daily_financials, get_stockout_losses
from live_factors import get_live_factors
from predictor import calculate_predictions, get_alerts, get_inventory_view, get_all_factor_breakdowns

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional convenience only
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv(Path(__file__).resolve().parent / ".env")
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Default model — can be overridden per request
DEFAULT_MODEL = "claude-sonnet-4-6-20250514"

# ── Report action detection ───────────────────────────────────────────────────
_REPORT_RE  = re.compile(r'\b(generate|create|make|show|export|download|get)\b.{0,30}\breport\b', re.I)
_EXPORT_RE  = re.compile(r'\b(export|download|save)\b.{0,20}\b(pdf|excel|spreadsheet)\b', re.I)
_FORECAST_RE = re.compile(r'\bshow\b.{0,20}\bforecast\b.{0,20}\bfor\b\s+(.+?)(?:\?|$)', re.I)


def _detect_action(message: str) -> tuple:
    if _REPORT_RE.search(message) or _EXPORT_RE.search(message):
        return "open_report", None
    m = _FORECAST_RE.search(message)
    if m:
        return "show_forecast", {"item": m.group(1).strip().rstrip("?").strip()}
    return None, None


def _get_httpx() -> ModuleType | None:
    try:
        return import_module("httpx")
    except ModuleNotFoundError:
        return None


def _build_store_context():
    """Build a complete store snapshot for the AI to reason about."""
    store = get_store_info()
    aisles = get_aisles()
    items = get_items()
    predictions = calculate_predictions()
    inventory = get_inventory_view()
    alerts = get_alerts()
    factors = get_market_factors()

    pred_map = {p["item"]: p for p in predictions}
    inv_map = {r["item"]: r for r in inventory}

    items_summary = []
    for item in items:
        name = item["name"]
        pred = pred_map.get(name, {})
        inv = inv_map.get(name, {})
        aisle_code = item.get("aisle", "")
        items_summary.append(
            f"- {name}: stock={item['current_stock']}, price=${item['price']}, "
            f"cost=${item['unit_cost']}, demand_change={pred.get('demand_change_pct', 0)}%, "
            f"predicted_demand={pred.get('predicted_demand', '?')}, "
            f"recommendation={pred.get('recommendation', '?')}, "
            f"aisle={aisle_code} ({aisles.get(aisle_code, '')})"
        )

    aisle_lines = [f"- {code}: {name}" for code, name in aisles.items()]

    alert_lines = (
        [f"- [{a['level'].upper()}] {a['message']}" for a in alerts]
        if alerts
        else ["- No active alerts"]
    )

    # Live real-world signals
    live = {}
    live_lines = ["- Live signals unavailable (using static fallback)"]
    try:
        live = get_live_factors()
        live_lines = [
            f"- Weather forecast ({live['weather'].get('forecast_days', '?')} days): "
            f"{live['weather'].get('summary', 'n/a')} "
            f"[score: {live['weather'].get('score', 0.0):+.2f}]",
            f"- Economic (CPI): {live['economic'].get('summary', 'n/a')} "
            f"[score: {live['economic'].get('score', 0.0):+.2f}]",
            f"- Event signals: {live['event'].get('summary', 'n/a')} "
            f"[score: {live['event'].get('score', 0.0):+.2f}]",
        ]
    except Exception:
        pass

    # Daily financials and stockout loss projections
    fin_lines = ["- Live financial data unavailable"]
    try:
        financials = get_daily_financials()
        losses = get_stockout_losses()
        fin_lines = [
            f"- Today Revenue: ${financials['total_revenue']:.2f}",
            f"- Today Profit: ${financials['total_profit']:.2f}",
            f"- Today Margin: {financials['margin_pct']:.1f}%",
        ]
        if financials["by_product"]:
            top = financials["by_product"][0]
            fin_lines.append(
                f"- Top seller today: {top['item']} "
                f"(${top['revenue']:.2f} revenue, {top['units_sold']} units, "
                f"${top['profit']:.2f} profit)"
            )
        else:
            fin_lines.append("- No sales recorded yet today")
        total_loss_rev    = round(sum(l["lost_revenue"] for l in losses), 2)
        total_loss_profit = round(sum(l["lost_profit"]  for l in losses), 2)
        fin_lines.append(
            f"- Projected lost revenue this week (stockout risk): ${total_loss_rev:.2f}"
        )
        fin_lines.append(
            f"- Projected lost profit this week (stockout risk): ${total_loss_profit:.2f}"
        )
        if losses:
            worst = losses[0]
            fin_lines.append(
                f"- Highest-risk stockout: {worst['item']} "
                f"(shortfall {worst['shortfall']} units, "
                f"${worst['lost_revenue']:.2f} revenue at risk, "
                f"{worst['margin_pct']:.1f}% margin)"
            )
        # Per-product margin overview
        items_for_margin = get_items()
        margin_ranked = sorted(
            [
                {
                    "item": i["name"],
                    "margin_pct": round(
                        (i["price"] - i["unit_cost"]) / i["price"] * 100, 1
                    ) if i["price"] > 0 else 0.0,
                    "price": i["price"],
                    "unit_cost": i["unit_cost"],
                }
                for i in items_for_margin
            ],
            key=lambda x: x["margin_pct"],
            reverse=True,
        )
        if margin_ranked:
            best  = margin_ranked[0]
            worst_margin = margin_ranked[-1]
            fin_lines.append(
                f"- Highest margin item: {best['item']} "
                f"({best['margin_pct']:.1f}% margin, "
                f"${best['price']:.2f} sell / ${best['unit_cost']:.2f} cost)"
            )
            fin_lines.append(
                f"- Lowest margin item: {worst_margin['item']} "
                f"({worst_margin['margin_pct']:.1f}% margin, "
                f"${worst_margin['price']:.2f} sell / ${worst_margin['unit_cost']:.2f} cost)"
            )
    except Exception:
        pass

    # Per-item factor breakdowns — the exact math behind every prediction
    breakdown_lines = []
    try:
        breakdowns = get_all_factor_breakdowns()
        for b in breakdowns:
            if not b:
                continue
            bf = b["base_factors"]
            la = b["live_adjustment"]
            breakdown_lines.append(
                f"- {b['item']} ({b['category']}): "
                f"static base = weather:{bf['weather']:+.1f}% + gas:{bf['gas_price']:+.1f}% + "
                f"traffic:{bf['traffic']:+.1f}% + trend:{bf['trend']:+.1f}% = {bf['subtotal']:+.1f}% subtotal | "
                f"live adjustment = forecast_weather:{la['weather_forecast']:+.1f}% + "
                f"economic:{la['economic']:+.1f}% + events:{la['events']:+.1f}% = {la['subtotal']:+.1f}% | "
                f"FINAL = {b['total_factor_pct']:+.1f}% demand change → {b['predicted_demand']} units predicted "
                f"(base weekly demand: {b['base_weekly_demand']})"
            )
    except Exception:
        breakdown_lines = ["- Factor breakdown unavailable"]

    # Revenue estimates
    total_potential = sum(
        inv_map[item["name"]]["predicted_demand"] * item["price"]
        for item in items
        if item["name"] in inv_map
    )
    total_stock_value = sum(item["current_stock"] * item["unit_cost"] for item in items)

    # Determine the authoritative weather description — live overrides static
    live_weather_score = live.get("weather", {}).get("score", None)
    if live_weather_score is not None:
        if live_weather_score >= 0.15:
            weather_authority = f"HOT (live forecast, overrides static label '{factors['weather']['condition']}')"
        elif live_weather_score <= -0.15:
            weather_authority = f"COLD (live forecast, overrides static label '{factors['weather']['condition']}')"
        else:
            weather_authority = f"MILD (live forecast, overrides static label '{factors['weather']['condition']}')"
    else:
        weather_authority = factors["weather"]["condition"] + " (static config, no live data)"

    return f"""STORE: {store["name"]} — {store["location"]} ({store["type"]})

AISLES:
{chr(10).join(aisle_lines)}

CURRENT INVENTORY & PREDICTIONS:
{chr(10).join(items_summary)}

ACTIVE ALERTS:
{chr(10).join(alert_lines)}

MARKET CONDITIONS:
- Authoritative weather: {weather_authority}
- Gas prices: {factors["gas_price"]["trend"]} (static config)
- Foot traffic: {factors["traffic"]["level"]} (static config)
- Season: {factors["trend"]["season"]} (static config)
NOTE: The static config above is the baseline. Live signals below were applied on top and are what actually shifted the predictions.

LIVE REAL-WORLD SIGNALS (these directly adjusted all predictions):
{chr(10).join(live_lines)}

FINANCIALS & DAILY PERFORMANCE:
{chr(10).join(fin_lines)}

STOCK VALUE & WEEKLY OUTLOOK:
- Total stock value (at cost): ${total_stock_value:.2f}
- Total projected weekly revenue (at predicted demand): ${total_potential:.2f}

EXACT PREDICTION MATH (how every demand-change % was calculated):
{chr(10).join(breakdown_lines)}"""


SYSTEM_PROMPT = """You are A.U.R.A. — the intelligent business advisor for a gas station convenience store manager.

Your expertise covers inventory management, demand forecasting, revenue and profit analysis, stockout risk, margin optimization, and overall business health assessment.

Rules:
- ALWAYS cite exact numbers. Quote specific percentages, dollar amounts, and unit counts directly from the data.
- When asked about a prediction or demand change, quote the exact percentages from the EXACT PREDICTION MATH section — explain the static base AND the live adjustment separately.
- When asked about weather, use ONLY the Authoritative Weather line and live forecast data. Never cite the static config label as current conditions.
- When asked about business health, profitability, or "how am I doing", structure your answer: today's financials first, then stockout risks, then one clear action to take.
- When asked "what can I improve", identify the single highest-impact opportunity: biggest stockout risk, lowest-margin item, or a strong demand signal being missed.
- When asked about revenue or profit, use the FINANCIALS & DAILY PERFORMANCE section for today's actuals and the inventory projected figures for weekly outlook.
- Be concise but data-rich. 2–4 sentences for simple questions. 4–8 sentences for health, analysis, or improvement questions.
- Never say "Great question!", "Certainly!", or any filler. Get directly to the data.
- If you don't have specific data, say so in one sentence and pivot to what you do have.

Good example: "Your margin today is 48.6% on $45.50 revenue — solid. Biggest risk is Red Bull Cherry Sakura: 14-unit shortfall projects $69.86 in lost revenue this week. Restock both Red Bull SKUs before tomorrow; together they represent your highest weekly revenue potential."
Bad example: "Your business is performing well based on current market conditions." — never this vague."""


def chat(user_message, model=None):
    """Send a message to Claude with full store context."""
    httpx = _get_httpx()
    lava_forward_token = os.getenv("LAVA_FORWARD_TOKEN", "").strip()
    action, action_data = _detect_action(user_message)

    if not lava_forward_token or httpx is None:
        return {
            "response": "AI chatbot is not configured. Set LAVA_FORWARD_TOKEN to enable.",
            "model": "none",
            "action": action,
            "action_data": action_data,
        }

    model = model or DEFAULT_MODEL
    store_context = _build_store_context()

    # Augment the message so the AI knows what action was triggered
    if action == "open_report":
        user_message = (
            user_message
            + "\n\n[System: A full business report has been generated and is now displayed "
            "to the user. Acknowledge it briefly in 1-2 sentences and offer to explain any metric.]"
        )
    elif action == "show_forecast":
        item = (action_data or {}).get("item", "")
        user_message = (
            user_message
            + f"\n\n[System: The demand forecast for '{item}' has been highlighted in the report. "
            "Reference the exact numbers from the EXACT PREDICTION MATH section.]"
        )

    target_url = "https://api.anthropic.com/v1/messages"
    lava_url = f"https://api.lava.so/v1/forward?u={quote(target_url, safe='')}"

    try:
        response = httpx.post(
            lava_url,
            headers={
                "Authorization": f"Bearer {lava_forward_token}",
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": model,
                "max_tokens": 250,
                "messages": [
                    {
                        "role": "user",
                        "content": f"{SYSTEM_PROMPT}\n\n---\n\nCURRENT STORE DATA:\n{store_context}\n\n---\n\nUSER QUESTION: {user_message}",
                    },
                ],
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        text = data["content"][0]["text"].strip()
        return {"response": text, "model": model, "action": action, "action_data": action_data}

    except Exception as e:
        return {
            "response": f"Sorry, I couldn't process that right now. Error: {str(e)}",
            "model": model,
            "action": action,
            "action_data": action_data,
        }


def explain_store(summary):
    """Generate a short, plain-English explanation of current recommendations.
    Takes a small structured summary — NOT full inventory JSON.
    Uses Haiku only for speed and reliability."""
    httpx = _get_httpx()
    lava_forward_token = os.getenv("LAVA_FORWARD_TOKEN", "").strip()
    if not lava_forward_token or httpx is None:
        return None  # caller will fall back to mock

    movers = summary["top_movers"]
    mover_text = ", ".join(
        f"{m['item']} ({'+' if m['change'] > 0 else ''}{m['change']}%, {m['rec']})"
        for m in movers
    )

    live = summary.get("live", {})
    live_context = ""
    if live:
        parts = []
        if live.get("weather_forecast"):
            parts.append(f"forecast: {live['weather_forecast']}")
        if live.get("economic"):
            parts.append(f"economy: {live['economic']}")
        if live.get("events"):
            parts.append(f"news signals: {live['events']}")
        if parts:
            live_context = f" Real-world data — {'; '.join(parts)}."

    prompt = (
        f"You help a gas station convenience store owner understand their weekly inventory.\n\n"
        f"This week: weather is {summary['weather']}, gas prices are {summary['gas_trend']}, "
        f"foot traffic is {summary['traffic']}, season is {summary['season'].replace('_', ' ')}."
        f"{live_context}\n"
        f"Top movers: {mover_text}.\n\n"
        f"Write 2-3 plain sentences explaining why these items are moving the way they are. "
        f"Reference the real-world forecast data if it is available and relevant. "
        f"Speak directly to the owner — no bullet points, no emojis, no filler phrases like 'Great news!' "
        f"Just tell them what's happening and what to do, like a trusted advisor would."
    )

    target_url = "https://api.anthropic.com/v1/messages"
    lava_url = f"https://api.lava.so/v1/forward?u={quote(target_url, safe='')}"

    try:
        response = httpx.post(
            lava_url,
            headers={
                "Authorization": f"Bearer {lava_forward_token}",
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 150,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"].strip()
    except Exception:
        return None  # caller will fall back to mock
