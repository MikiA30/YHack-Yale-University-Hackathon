from copy import deepcopy
from statistics import mean
from typing import Any, Sequence, cast

from app.schemas import AnalysisRequest, CropName, MarketOutlook, SimulationAdjustments
from app.services.weather_service import normalize_weather_payload
from app.types import MarketData, MarketPricePoint, NormalizedContext, WeatherData


def coerce_base_context(
    base_context: dict[str, Any] | NormalizedContext,
) -> NormalizedContext:
    return cast(NormalizedContext, deepcopy(base_context))


def build_simulation_context(
    base_context: dict[str, Any] | NormalizedContext,
    adjustments: SimulationAdjustments,
    user_inputs: AnalysisRequest,
) -> NormalizedContext:
    context = coerce_base_context(base_context)
    farm = context["farm"]
    farm["farm_name"] = user_inputs.farm_name
    farm["location"] = user_inputs.location
    farm["acreage"] = user_inputs.acreage
    farm["crop_options"] = list(user_inputs.crop_options)
    farm["soil_moisture"] = user_inputs.soil_moisture
    farm["field_readiness"] = user_inputs.field_readiness

    if adjustments.field_readiness_override:
        farm["field_readiness"] = adjustments.field_readiness_override

    context["location"]["query"] = user_inputs.location
    context["weather"] = _adjust_weather_context(
        context["weather"],
        adjustments.rain_adjustment_pct,
    )
    context["market"] = _adjust_market_context(
        context["market"],
        user_inputs.crop_options,
        adjustments.market_outlook,
    )
    return context


def _adjust_weather_context(
    weather: WeatherData,
    rain_adjustment_pct: int,
) -> WeatherData:
    if rain_adjustment_pct == 0:
        return deepcopy(weather)

    factor = 1 + (rain_adjustment_pct / 100)
    payload = {
        "timezone": weather.get("timezone"),
        "daily": {
            "time": [point["date"] for point in weather["daily"]],
            "temperature_2m_max": [point["temp_max"] for point in weather["daily"]],
            "temperature_2m_min": [point["temp_min"] for point in weather["daily"]],
            "precipitation_probability_max": [
                max(0, min(100, round(point["precip_probability"] * factor)))
                for point in weather["daily"]
            ],
            "precipitation_sum": [
                round(point["precipitation_sum"] * factor, 2)
                for point in weather["daily"]
            ],
            "wind_speed_10m_max": [
                point["wind_speed_max"] for point in weather["daily"]
            ],
        },
    }
    return normalize_weather_payload(payload)


def _adjust_market_context(
    market: MarketData,
    crop_options: Sequence[CropName],
    market_outlook: MarketOutlook,
) -> MarketData:
    updated = deepcopy(market)
    delta_map: dict[MarketOutlook, int] = {"bearish": -3, "neutral": 0, "bullish": 3}
    trend_bonus = {"Up": 1, "Flat": 0, "Soft": -1}
    price_factor: dict[MarketOutlook, float] = {
        "bearish": 0.985,
        "neutral": 1.0,
        "bullish": 1.015,
    }

    for crop, signal in updated["crop_signals"].items():
        delta = delta_map[market_outlook] + trend_bonus.get(signal["trend"], 0)
        signal["score"] = max(58, min(90, signal["score"] + delta))
        signal["price"] = round(signal["price"] * price_factor[market_outlook], 2)

    adjusted_trend: list[MarketPricePoint] = []
    for point in updated["price_trend"]:
        adjusted_trend.append(
            {
                "day": point["day"],
                "Corn": round(point["Corn"] * price_factor[market_outlook], 2),
                "Soybeans": round(
                    point["Soybeans"] * price_factor[market_outlook],
                    2,
                ),
                "Wheat": round(point["Wheat"] * price_factor[market_outlook], 2),
            }
        )
    updated["price_trend"] = adjusted_trend

    selected: list[CropName] = [
        crop for crop in crop_options if crop in updated["crop_signals"]
    ]
    leading_crop = max(
        selected,
        key=lambda crop: updated["crop_signals"][crop]["score"],
    )
    score_values = [updated["crop_signals"][crop]["score"] for crop in selected]
    avg_score = round(mean(score_values), 1) if score_values else 0.0
    updated["market_status"] = f"{leading_crop} stronger"
    updated["summary"] = (
        f"{leading_crop} retains the cleanest market setup under a {market_outlook} outlook, "
        f"with the selected crop basket averaging {avg_score} on the market signal."
    )
    return updated
