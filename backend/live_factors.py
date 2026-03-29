"""Real-world signal integration for A.U.R.A. demand predictions.

Fetches live data from three sources (all proxied via Lava):
  - Open-Meteo  → 14-day weather forecast  → weather_factor adjustment
  - FRED        → CPI / inflation data      → economic_factor adjustment
  - Serper      → news headlines            → event_factor adjustment

All signals are cached with TTL to avoid hammering external APIs.
All signals fall back to score=0.0 gracefully if an API is unavailable.

Usage in predictor.py:
    from live_factors import get_live_adjustment, get_live_factors
    live_adj = get_live_adjustment(item_name, category)
"""

import os
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

LAVA_FORWARD_TOKEN = os.getenv("LAVA_FORWARD_TOKEN", "")
FRED_API_KEY       = os.getenv("FRED_API_KEY", "")
SERPER_API_KEY     = os.getenv("SERPER_API_KEY", "")

# Store location — mutable, defaults to Hartford, CT (QuickStop #47)
_location: dict = {
    "lat":   41.7637,
    "lon":   -72.6851,
    "zip":   "06103",
    "label": "Hartford, CT",
}
_FORECAST_DAYS = 14

# Cache TTLs in seconds
_WEATHER_TTL  = 1800    # 30 minutes
_ECONOMIC_TTL = 86400   # 24 hours
_EVENT_TTL    = 900     # 15 minutes

# ---------------------------------------------------------------------------
# Category weather-sensitivity multipliers
#   Positive  → demand rises with heat
#   Negative  → demand rises with cold (inverse)
# ---------------------------------------------------------------------------
WEATHER_SENSITIVITY: dict[str, float] = {
    "energy_drinks": 0.8,
    "beverages":     1.2,
    "frozen":        1.5,
    "snacks":        0.2,
    "hot_beverages": -0.9,
    "accessories":   0.7,
    "general":       0.2,
}

# ---------------------------------------------------------------------------
# Regex patterns for event/news scoring
# ---------------------------------------------------------------------------
_GAS_UP        = re.compile(
    r"gas price.*(rise|surge|jump|high|increas|soar)|fuel.*(cost|price).*(rise|surge|high|soar)", re.I)
_GAS_DOWN      = re.compile(
    r"gas price.*(fall|drop|low|declin|decreas)|fuel.*(cost|price).*(fall|drop|low)", re.I)
_SUPPLY_RISK   = re.compile(r"supply chain|shortage|disruption|recall|out.of.stock", re.I)
_WEATHER_ALERT = re.compile(
    r"\bstorm\b|hurricane|blizzard|tornado|flood|heat wave|severe weather|nor'easter", re.I)
_ECON_BAD      = re.compile(r"recession|layoff|unemploy|slowdown|downturn|job cut", re.I)


# ---------------------------------------------------------------------------
# Simple TTL cache (no external dependencies)
# ---------------------------------------------------------------------------
class _TTLCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str, ttl: int) -> Any | None:
        entry = self._store.get(key)
        if entry and (time.time() - entry[0]) < ttl:
            return entry[1]
        return None

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (time.time(), value)


_cache = _TTLCache()


# ---------------------------------------------------------------------------
# Lava proxy helpers — identical pattern to ai_profiler.py / chatbot.py
# ---------------------------------------------------------------------------
def _lava_url(target: str) -> str:
    return f"https://api.lava.so/v1/forward?u={quote(target, safe='')}"


def _lava_get(target: str, extra_headers: dict | None = None, timeout: int = 10) -> dict:
    headers: dict[str, str] = {"Authorization": f"Bearer {LAVA_FORWARD_TOKEN}"}
    if extra_headers:
        headers.update(extra_headers)
    resp = httpx.get(_lava_url(target), headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def _lava_post(target: str, body: dict,
               extra_headers: dict | None = None, timeout: int = 10) -> dict:
    headers: dict[str, str] = {
        "Authorization": f"Bearer {LAVA_FORWARD_TOKEN}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    resp = httpx.post(_lava_url(target), headers=headers, json=body, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# 1. WEATHER — Open-Meteo 14-day forecast
# ---------------------------------------------------------------------------
def geocode_zip(zip_code: str) -> dict:
    """Convert a US zip code to lat/lon using Nominatim (OpenStreetMap) via Lava.
    Returns {"lat": float, "lon": float, "label": str}.
    Raises ValueError if the zip code is not found.
    """
    if not LAVA_FORWARD_TOKEN:
        raise ValueError("LAVA_FORWARD_TOKEN not set")
    target = (
        f"https://nominatim.openstreetmap.org/search"
        f"?postalcode={zip_code}&country=us&format=json&limit=1"
    )
    data = _lava_get(target, extra_headers={"User-Agent": "AURA-Inventory-System/1.0"})
    if not data:
        raise ValueError(f"Zip code '{zip_code}' not found")
    result = data[0]
    lat = float(result["lat"])
    lon = float(result["lon"])
    parts = [p.strip() for p in result.get("display_name", zip_code).split(",")]
    label = ", ".join(parts[:3]) if len(parts) >= 3 else result.get("display_name", zip_code)
    return {"lat": lat, "lon": lon, "label": label}


def get_store_location() -> dict:
    """Return the current store location dict (lat, lon, zip, label)."""
    return dict(_location)


def set_store_location(lat: float, lon: float, zip_code: str, label: str) -> None:
    """Update the store location and immediately expire the weather cache."""
    global _location
    _location = {"lat": lat, "lon": lon, "zip": zip_code, "label": label}
    _cache._store.pop("weather", None)   # force fresh fetch on next request
    print(f"[live_factors] location updated → {label} ({lat:.4f}, {lon:.4f})")


def _fetch_weather() -> dict:
    if not LAVA_FORWARD_TOKEN:
        raise ValueError("LAVA_FORWARD_TOKEN not set")
    loc = _location
    target = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={loc['lat']}&longitude={loc['lon']}"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode"
        f"&forecast_days={_FORECAST_DAYS}"
        f"&timezone=America%2FNew_York"
        f"&temperature_unit=fahrenheit"
    )
    return _lava_get(target)


def _score_weather(data: dict) -> dict:
    """Convert 14-day forecast into a normalized weather signal in [-0.30, +0.30]."""
    daily  = data.get("daily", {})
    highs  = daily.get("temperature_2m_max", [])
    lows   = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_sum", [])
    codes  = daily.get("weathercode", [])

    if not highs:
        return {"score": 0.0, "summary": "no forecast data"}

    n         = len(highs)
    avg_high  = sum(h for h in highs if h is not None) / n
    avg_low   = sum(l for l in lows  if l is not None) / n if lows else avg_high - 15
    rain_days = sum(1 for p in precip if p and p > 1.0)
    snow_days = sum(1 for c in codes  if c and 71 <= c <= 77)
    hot_days  = sum(1 for h in highs  if h and h > 85)
    cold_days = sum(1 for l in lows   if l and l < 40)

    # Heat score normalised around 72°F: +1.0 at 102°F, -1.0 at 42°F
    heat_score    = max(-1.0, min(1.0, (avg_high - 72) / 30))
    weather_score = heat_score * 0.30
    weather_score -= (rain_days / n) * 0.12   # rain reduces walk-in traffic
    weather_score -= (snow_days / n) * 0.08   # snow reduces it further
    weather_score  = round(max(-0.30, min(0.30, weather_score)), 4)

    parts: list[str] = [f"avg high {avg_high:.0f}°F over {n} days"]
    if hot_days:  parts.append(f"{hot_days} hot days (>85°F)")
    if cold_days: parts.append(f"{cold_days} cold days (<40°F)")
    if rain_days: parts.append(f"{rain_days} rainy days")
    if snow_days: parts.append(f"{snow_days} snowy days")

    return {
        "score":       weather_score,
        "avg_high_f":  round(avg_high, 1),
        "avg_low_f":   round(avg_low,  1),
        "hot_days":    hot_days,
        "cold_days":   cold_days,
        "rain_days":   rain_days,
        "snow_days":   snow_days,
        "forecast_days": n,
        "summary":     ", ".join(parts),
    }


# ---------------------------------------------------------------------------
# 2. ECONOMIC — FRED CPI (CPIAUCSL, 13 months for YoY)
# ---------------------------------------------------------------------------
def _fetch_economic() -> dict:
    if not FRED_API_KEY:
        raise ValueError("FRED_API_KEY not set")
    target = (
        f"https://api.stlouisfed.org/fred/series/observations"
        f"?series_id=CPIAUCSL&api_key={FRED_API_KEY}"
        f"&limit=13&sort_order=desc&file_type=json"
    )
    return _lava_get(target)


def _score_economic(data: dict) -> dict:
    """Derive economic pressure score from year-over-year CPI change."""
    observations = data.get("observations", [])
    valid = [o for o in observations if o.get("value", ".") != "."]
    if len(valid) < 2:
        return {"score": 0.0, "summary": "insufficient FRED data"}

    latest   = float(valid[0]["value"])   # most recent (sort_order=desc)
    year_ago = float(valid[-1]["value"])  # 12 months prior
    yoy      = (latest - year_ago) / year_ago * 100

    if yoy > 6.0:
        score, label = -0.10, "very high"
    elif yoy > 4.0:
        score, label = -0.06, "high"
    elif yoy > 3.0:
        score, label = -0.03, "elevated"
    elif yoy > 2.0:
        score, label =  0.00, "moderate"
    else:
        score, label =  0.05, "low"

    return {
        "score":             score,
        "yoy_inflation_pct": round(yoy, 2),
        "latest_cpi":        round(latest, 3),
        "summary":           f"{label} inflation ({yoy:.1f}% YoY CPI)",
    }


# ---------------------------------------------------------------------------
# 3. EVENT / NEWS — Serper news search
# ---------------------------------------------------------------------------
def _fetch_events() -> dict:
    if not SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY not set")
    target = "https://google.serper.dev/news"
    body   = {
        "q":   "gas prices supply chain shortage weather alert Hartford Connecticut convenience store",
        "num": 10,
        "gl":  "us",
        "hl":  "en",
    }
    return _lava_post(target, body, extra_headers={"X-API-KEY": SERPER_API_KEY})


def _score_events(data: dict) -> dict:
    """Parse news headlines into a demand-signal score in [-0.20, +0.20]."""
    articles = data.get("news", [])[:10]

    gas_score      = 0.0
    supply_score   = 0.0
    weather_score  = 0.0
    economic_score = 0.0
    triggered: list[str] = []

    for a in articles:
        text = f"{a.get('title', '')} {a.get('snippet', '')}"
        if _GAS_UP.search(text):
            gas_score += 0.03;  triggered.append("gas↑")
        if _GAS_DOWN.search(text):
            gas_score -= 0.02;  triggered.append("gas↓")
        if _SUPPLY_RISK.search(text):
            supply_score += 0.04;  triggered.append("supply risk")
        if _WEATHER_ALERT.search(text):
            weather_score += 0.05; triggered.append("weather alert")
        if _ECON_BAD.search(text):
            economic_score -= 0.02; triggered.append("econ pressure")

    gas_score      = max(-0.10, min( 0.10, gas_score))
    supply_score   = max( 0.00, min( 0.15, supply_score))
    weather_score  = max( 0.00, min( 0.15, weather_score))
    economic_score = max(-0.10, min( 0.00, economic_score))

    total    = round(max(-0.20, min(0.20,
                    gas_score + supply_score + weather_score + economic_score)), 4)
    unique   = list(dict.fromkeys(triggered))  # preserve order, deduplicate

    return {
        "score":                total,
        "gas_score":            round(gas_score,      4),
        "supply_score":         round(supply_score,   4),
        "weather_alert_score":  round(weather_score,  4),
        "economic_score":       round(economic_score, 4),
        "articles_scanned":     len(articles),
        "signals_triggered":    unique,
        "summary": (
            f"{len(articles)} articles scanned; "
            f"signals: {', '.join(unique) if unique else 'none'}"
        ),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def get_live_factors() -> dict:
    """
    Return cached real-world signals:
      {
        "weather":  {"score": float, "summary": str, ...details},
        "economic": {"score": float, "summary": str, ...details},
        "event":    {"score": float, "summary": str, ...details},
      }
    Each sub-dict always has at least {"score": 0.0, "summary": "..."}.
    Falls back gracefully — never raises.
    """
    result: dict[str, dict] = {}

    # --- Weather (30-min TTL) ---
    cached = _cache.get("weather", _WEATHER_TTL)
    if cached is not None:
        result["weather"] = cached
    else:
        try:
            result["weather"] = _score_weather(_fetch_weather())
            _cache.set("weather", result["weather"])
            print(f"[live_factors] weather refreshed: {result['weather']['summary']}")
        except Exception as exc:
            print(f"[live_factors] weather unavailable: {exc}")
            result["weather"] = {"score": 0.0, "summary": "unavailable (using fallback)"}

    # --- Economic (24-hr TTL) ---
    cached = _cache.get("economic", _ECONOMIC_TTL)
    if cached is not None:
        result["economic"] = cached
    else:
        try:
            result["economic"] = _score_economic(_fetch_economic())
            _cache.set("economic", result["economic"])
            print(f"[live_factors] economic refreshed: {result['economic']['summary']}")
        except Exception as exc:
            print(f"[live_factors] economic unavailable: {exc}")
            result["economic"] = {"score": 0.0, "summary": "unavailable (using fallback)"}

    # --- Events (15-min TTL) ---
    cached = _cache.get("events", _EVENT_TTL)
    if cached is not None:
        result["event"] = cached
    else:
        try:
            result["event"] = _score_events(_fetch_events())
            _cache.set("events", result["event"])
            print(f"[live_factors] events refreshed: {result['event']['summary']}")
        except Exception as exc:
            print(f"[live_factors] events unavailable: {exc}")
            result["event"] = {"score": 0.0, "summary": "unavailable (using fallback)"}

    return result


def get_live_adjustment(name: str, category: str) -> float:
    """
    Return the total live-signal factor adjustment for one product.
    Always safe to call — returns 0.0 on any failure.

    Weights:
      weather  → category-specific sensitivity multiplier  (dominant signal)
      economic → 0.5× weight (light macro pressure)
      event    → 0.4× weight (light news pressure)
    """
    try:
        live = get_live_factors()

        w_score     = live["weather"].get("score", 0.0)
        sensitivity = WEATHER_SENSITIVITY.get(category, WEATHER_SENSITIVITY["general"])
        weather_adj = w_score * sensitivity

        economic_adj = live["economic"].get("score", 0.0) * 0.5
        event_adj    = live["event"].get("score",    0.0) * 0.4

        total = weather_adj + economic_adj + event_adj
        return round(max(-0.40, min(0.40, total)), 4)

    except Exception as exc:
        print(f"[live_factors] get_live_adjustment failed for {name}: {exc}")
        return 0.0
