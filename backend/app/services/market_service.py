import re
from statistics import mean
from typing import Dict, List, Optional, TypedDict

from app.config import get_settings
from app.schemas import CropName
from app.types import MarketData, MarketPricePoint, MarketSignalData
from app.utils.errors import ProviderError
from app.utils.http import get_json


class MarketSignalResult(TypedDict):
    price: float
    trend: str
    score: int


CROP_ORDER: List[CropName] = ["Corn", "Soybeans", "Wheat"]

FALLBACK_MARKET: Dict[CropName, MarketSignalResult] = {
    "Corn": {"price": 4.81, "trend": "Up", "score": 78},
    "Soybeans": {"price": 10.92, "trend": "Flat", "score": 72},
    "Wheat": {"price": 5.35, "trend": "Soft", "score": 68},
}

FALLBACK_PRICE_TREND: List[MarketPricePoint] = [
    {"day": "Mon", "Corn": 4.62, "Soybeans": 11.10, "Wheat": 5.48},
    {"day": "Tue", "Corn": 4.68, "Soybeans": 11.03, "Wheat": 5.44},
    {"day": "Wed", "Corn": 4.73, "Soybeans": 10.98, "Wheat": 5.40},
    {"day": "Thu", "Corn": 4.77, "Soybeans": 10.95, "Wheat": 5.37},
    {"day": "Fri", "Corn": 4.81, "Soybeans": 10.92, "Wheat": 5.35},
]


def get_market_signals(state: Optional[str], crops: List[CropName]) -> MarketData:
    settings = get_settings()
    if not settings.usda_ams_api_key:
        raise ProviderError("USDA AMS", "USDA_AMS_API_KEY is not configured")

    crop_signals: Dict[CropName, MarketSignalData] = {}
    series_map: Dict[CropName, List[float]] = {crop: [] for crop in CROP_ORDER}
    live_crop_count = 0

    for crop in CROP_ORDER:
        slug = settings.usda_ams_report_slugs.get(crop)
        if not slug:
            crop_signals[crop] = _signal_with_source(FALLBACK_MARKET[crop], "fallback")
            series_map[crop] = [point[crop] for point in FALLBACK_PRICE_TREND]
            continue

        report = get_json(
            url=f"{settings.usda_ams_base_url}/reports/{slug}",
            auth=(settings.usda_ams_api_key, ""),
            timeout_seconds=settings.request_timeout_seconds,
            provider="USDA AMS",
        )
        normalized = _extract_market_signal(report, crop)
        if normalized:
            crop_signals[crop] = _signal_with_source(normalized, "live")
            series_map[crop] = _series_from_price(
                normalized["price"], normalized["trend"]
            )
            live_crop_count += 1
        else:
            crop_signals[crop] = _signal_with_source(FALLBACK_MARKET[crop], "fallback")
            series_map[crop] = [point[crop] for point in FALLBACK_PRICE_TREND]

    selected_crops: List[CropName] = [crop for crop in crops if crop in crop_signals]
    if not selected_crops:
        selected_crops = list(CROP_ORDER)
    selected_scores = [crop_signals[crop]["score"] for crop in selected_crops]
    leading_crop = max(selected_crops, key=lambda crop: crop_signals[crop]["score"])
    market_status = f"{leading_crop} stronger"
    summary = (
        f"{leading_crop} shows the best current market setup for the selected crop set."
        if selected_scores
        else "Market signals are using fallback assumptions."
    )

    return {
        "source": "USDA_AMS" if live_crop_count else "fallback",
        "market_status": market_status,
        "crop_signals": crop_signals,
        "summary": summary,
        "price_trend": [
            {
                "day": FALLBACK_PRICE_TREND[index]["day"],
                "Corn": round(series_map["Corn"][index], 2),
                "Soybeans": round(series_map["Soybeans"][index], 2),
                "Wheat": round(series_map["Wheat"][index], 2),
            }
            for index in range(5)
        ],
        "state": state,
    }


def fallback_market(crops: List[CropName]) -> MarketData:
    selected_crops: List[CropName] = [crop for crop in crops if crop in FALLBACK_MARKET]
    if not selected_crops:
        selected_crops = list(CROP_ORDER)
    leading_crop = max(selected_crops, key=lambda crop: FALLBACK_MARKET[crop]["score"])
    return {
        "source": "fallback",
        "market_status": f"{leading_crop} stronger",
        "crop_signals": {
            crop: _signal_with_source(FALLBACK_MARKET[crop], "fallback")
            for crop in CROP_ORDER
        },
        "summary": f"{leading_crop} retains a modest pricing edge in the fallback market model.",
        "price_trend": FALLBACK_PRICE_TREND,
        "state": None,
    }


def _extract_market_signal(
    payload: Dict[str, object], crop: CropName
) -> Optional[MarketSignalResult]:
    numbers = _collect_numeric_candidates(payload)
    if not numbers:
        return None

    recent_price = round(mean(numbers[: min(3, len(numbers))]), 2)
    if len(numbers) >= 2 and numbers[0] > numbers[-1]:
        trend = "Up"
    elif len(numbers) >= 2 and numbers[0] < numbers[-1]:
        trend = "Soft"
    else:
        trend = "Flat"

    baseline = FALLBACK_MARKET[crop]["score"]
    price_factor = int(round((recent_price - FALLBACK_MARKET[crop]["price"]) * 8))
    trend_factor = 4 if trend == "Up" else -4 if trend == "Soft" else 0

    return {
        "price": recent_price,
        "trend": trend,
        "score": max(58, min(88, baseline + price_factor + trend_factor)),
    }


def _collect_numeric_candidates(payload: object) -> List[float]:
    collected: List[float] = []

    def walk(node: object) -> None:
        if isinstance(node, dict):
            for value in node.values():
                walk(value)
            return
        if isinstance(node, list):
            for item in node:
                walk(item)
            return
        if isinstance(node, (int, float)) and 0.5 <= float(node) <= 25:
            collected.append(float(node))
            return
        if isinstance(node, str):
            for match in re.findall(r"\d+(?:\.\d+)?", node.replace(",", "")):
                value = float(match)
                if 0.5 <= value <= 25:
                    collected.append(value)

    walk(payload)
    return collected[:12]


def _series_from_price(price: float, trend: str) -> List[float]:
    if trend == "Up":
        return [price - 0.16, price - 0.12, price - 0.08, price - 0.04, price]
    if trend == "Soft":
        return [price + 0.16, price + 0.12, price + 0.08, price + 0.04, price]
    return [price - 0.04, price - 0.02, price, price - 0.01, price]


def _signal_with_source(
    signal: MarketSignalResult,
    source: str,
) -> MarketSignalData:
    return {
        "price": signal["price"],
        "trend": signal["trend"],
        "score": signal["score"],
        "source": source,
    }
