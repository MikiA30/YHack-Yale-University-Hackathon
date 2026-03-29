"""AI chatbot for store managers — powered by Claude via Lava."""

import json
import os
from pathlib import Path
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

from data import get_items, get_aisles, get_store_info, get_market_factors
from predictor import calculate_predictions, get_inventory_view, get_alerts

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

    alert_lines = [f"- [{a['level'].upper()}] {a['message']}" for a in alerts] if alerts else ["- No active alerts"]

    # Revenue estimates
    total_potential = sum(
        inv_map[item["name"]]["predicted_demand"] * item["price"]
        for item in items if item["name"] in inv_map
    )
    total_stock_value = sum(item["current_stock"] * item["unit_cost"] for item in items)

    return f"""STORE: {store['name']} — {store['location']} ({store['type']})

AISLES:
{chr(10).join(aisle_lines)}

CURRENT INVENTORY & PREDICTIONS:
{chr(10).join(items_summary)}

ACTIVE ALERTS:
{chr(10).join(alert_lines)}

MARKET CONDITIONS:
- Weather: {factors['weather']['condition']}
- Gas prices: {factors['gas_price']['trend']}
- Foot traffic: {factors['traffic']['level']}
- Season: {factors['trend']['season']}

FINANCIALS:
- Total stock value (at cost): ${total_stock_value:.2f}
- Total projected weekly revenue (at predicted demand): ${total_potential:.2f}"""


SYSTEM_PROMPT = """You are A.U.R.A., a store assistant for a gas station convenience store manager.

Rules:
- Keep answers SHORT. 2-4 sentences max unless the user asks for detail.
- Use plain language. No bullet points, no headers, no emojis, no marketing speak.
- Just answer the question with real numbers from the store data below.
- Never say "Great question!" or add filler. Get straight to the point.
- If you don't have the data, say so in one sentence."""


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
        return {"response": f"Sorry, I couldn't process that right now. Error: {str(e)}", "model": model}
