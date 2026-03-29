"""AI chatbot for store managers — powered by Claude via Lava."""

import json
import os
from pathlib import Path
from urllib.parse import quote

import httpx
from data import get_aisles, get_items, get_market_factors, get_store_info
from dotenv import load_dotenv
from live_factors import get_live_factors
from predictor import calculate_predictions, get_alerts, get_inventory_view, get_all_factor_breakdowns

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

LAVA_FORWARD_TOKEN = os.getenv("LAVA_FORWARD_TOKEN", "")

# Default model — can be overridden per request
DEFAULT_MODEL = "claude-sonnet-4-6-20250514"


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

EXACT PREDICTION MATH (how every demand-change % was calculated):
{chr(10).join(breakdown_lines)}

FINANCIALS:
- Total stock value (at cost): ${total_stock_value:.2f}
- Total projected weekly revenue (at predicted demand): ${total_potential:.2f}"""


SYSTEM_PROMPT = """You are A.U.R.A., a store assistant for a gas station convenience store manager.

Rules:
- Keep answers SHORT. 2-4 sentences max unless the user asks for detail.
- Use plain language. No bullet points, no headers, no emojis, no marketing speak.
- ALWAYS cite exact numbers from the store data. Never say "factors" vaguely — name them.
- When asked about a prediction or demand change, quote the exact percentages from the EXACT PREDICTION MATH section.
- When asked about weather, use ONLY the authoritative weather line and the live forecast data. Never contradict it with the static config label.
- Never say "Great question!" or add filler. Get straight to the point.
- If you don't have the data, say so in one sentence.
- Example of good answer: "Red Bull White Peach is +39% because the static base adds up to +63% (weather +18%, gas +10%, traffic +20%, trend +15%), then the live cold forecast knocked it down -24%, landing at +39%, which predicts 35 units sold against 20 in stock."
- Example of bad answer: "The predictions are based on demand trends and market conditions." — never be this vague."""


def chat(user_message, model=None):
    """Send a message to Claude with full store context."""
    if not LAVA_FORWARD_TOKEN:
        return {
            "response": "AI chatbot is not configured. Set LAVA_FORWARD_TOKEN to enable.",
            "model": "none",
        }

    model = model or DEFAULT_MODEL
    store_context = _build_store_context()

    target_url = "https://api.anthropic.com/v1/messages"
    lava_url = f"https://api.lava.so/v1/forward?u={quote(target_url, safe='')}"

    try:
        response = httpx.post(
            lava_url,
            headers={
                "Authorization": f"Bearer {LAVA_FORWARD_TOKEN}",
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
        return {"response": text, "model": model}

    except Exception as e:
        return {
            "response": f"Sorry, I couldn't process that right now. Error: {str(e)}",
            "model": model,
        }


def explain_store(summary):
    """Generate a short, plain-English explanation of current recommendations.
    Takes a small structured summary — NOT full inventory JSON.
    Uses Haiku only for speed and reliability."""
    if not LAVA_FORWARD_TOKEN:
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
                "Authorization": f"Bearer {LAVA_FORWARD_TOKEN}",
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
