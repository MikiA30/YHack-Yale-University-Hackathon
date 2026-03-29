"""AI-assisted product profiling via Lava forward proxy.
Generates demand impact factors for new products using Claude."""

import json
import os
from importlib import import_module
from pathlib import Path
from types import ModuleType
from urllib.parse import quote

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional convenience only
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv(Path(__file__).resolve().parent / ".env")
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DEFAULT_FACTORS = {
    "weather_factor": 0.05,
    "traffic_factor": 0.10,
    "gas_price_factor": 0.05,
    "trend_factor": 0.05,
    "reasoning": "Default factors applied — AI profiling unavailable.",
    "factor_source": "default",
}


def _get_httpx() -> ModuleType | None:
    try:
        return import_module("httpx")
    except ModuleNotFoundError:
        return None


def generate_product_profile(product_name, category):
    """Call Claude via Lava forward proxy to generate demand impact factors."""

    httpx = _get_httpx()
    lava_forward_token = os.getenv("LAVA_FORWARD_TOKEN", "").strip()
    if not lava_forward_token or httpx is None:
        return DEFAULT_FACTORS

    prompt = f"""You are generating demand factors for a convenience store product.

Product: {product_name}
Category: {category}
Location: Hartford, CT
Context: summer, high foot traffic, rising gas prices

Each factor is a decimal between -0.30 and +0.40 representing percentage impact on base weekly demand.

Return ONLY valid JSON in this exact format, no other text:
{{"weather_factor": 0.10, "traffic_factor": 0.15, "gas_price_factor": 0.05, "trend_factor": 0.08, "reasoning": "one sentence explanation"}}"""

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
                "max_tokens": 200,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        text = data["content"][0]["text"].strip()

        # Extract JSON if model wraps in markdown
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        result = json.loads(text)

        # Validate all factor keys exist and are in range
        for key in ["weather_factor", "traffic_factor", "gas_price_factor", "trend_factor"]:
            val = result.get(key)
            if not isinstance(val, (int, float)) or val < -0.5 or val > 0.5:
                return DEFAULT_FACTORS

        if "reasoning" not in result:
            result["reasoning"] = "AI-generated factors."

        result["factor_source"] = "lava"
        return result

    except Exception:
        return DEFAULT_FACTORS
