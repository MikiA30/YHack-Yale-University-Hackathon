from statistics import mean
from typing import Any, List, Optional, cast

from app.config import get_settings
from app.types import WeatherDailyPoint, WeatherData
from app.utils.errors import ProviderError
from app.utils.http import get_json


def get_weather_forecast(latitude: float, longitude: float) -> WeatherData:
    settings = get_settings()
    payload = get_json(
        url=settings.open_meteo_forecast_url,
        params={
            "latitude": latitude,
            "longitude": longitude,
            "daily": ",".join(
                [
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_probability_max",
                    "precipitation_sum",
                    "wind_speed_10m_max",
                ]
            ),
            "forecast_days": 7,
            "timezone": "auto",
        },
        timeout_seconds=settings.request_timeout_seconds,
        provider="Open-Meteo Forecast",
    )
    return normalize_weather_payload(payload)


def normalize_weather_payload(payload: dict[str, object]) -> WeatherData:
    daily = payload.get("daily")
    if not isinstance(daily, dict):
        raise ProviderError(
            "Open-Meteo Forecast", "Weather payload missing daily forecast"
        )

    dates = cast(List[object], daily.get("time") or [])
    temp_max = cast(List[object], daily.get("temperature_2m_max") or [])
    temp_min = cast(List[object], daily.get("temperature_2m_min") or [])
    precip_prob = cast(List[object], daily.get("precipitation_probability_max") or [])
    precip_sum = cast(List[object], daily.get("precipitation_sum") or [])
    wind_speed = cast(List[object], daily.get("wind_speed_10m_max") or [])

    row_count = min(
        len(dates),
        len(temp_max) if temp_max else len(dates),
        len(temp_min) if temp_min else len(dates),
        len(precip_prob) if precip_prob else len(dates),
        len(precip_sum) if precip_sum else len(dates),
        len(wind_speed) if wind_speed else len(dates),
    )

    points: List[WeatherDailyPoint] = []
    for index in range(row_count):
        date = str(dates[index])
        points.append(
            {
                "date": date,
                "temp_max": _to_float(temp_max[index]),
                "temp_min": _to_float(temp_min[index]),
                "precip_probability": int(round(_to_float(precip_prob[index]))),
                "precipitation_sum": _to_float(precip_sum[index]),
                "wind_speed_max": _to_float(wind_speed[index]),
            }
        )

    if not points:
        raise ProviderError(
            "Open-Meteo Forecast", "Weather payload returned no forecast rows"
        )

    avg_temp_max = round(mean(point["temp_max"] for point in points), 1)
    avg_temp_min = round(mean(point["temp_min"] for point in points), 1)
    avg_precip_probability = round(
        mean(point["precip_probability"] for point in points), 1
    )
    total_precipitation = round(sum(point["precipitation_sum"] for point in points), 2)
    avg_wind_speed = round(mean(point["wind_speed_max"] for point in points), 1)

    favorable_temperature_window = 58 <= avg_temp_max <= 78 and avg_temp_min >= 40
    rain_risk_in_next_3_days = any(
        point["precip_probability"] >= 55 or point["precipitation_sum"] >= 0.5
        for point in points[:3]
    )
    severe_weather_risk_proxy = any(
        point["wind_speed_max"] >= 28 for point in points[:3]
    )

    plant_now_weather_score = 76
    if favorable_temperature_window:
        plant_now_weather_score += 8
    else:
        plant_now_weather_score -= 7
    if rain_risk_in_next_3_days:
        plant_now_weather_score -= 10
    if severe_weather_risk_proxy:
        plant_now_weather_score -= 8

    timezone = payload.get("timezone")
    normalized_timezone: Optional[str] = timezone if isinstance(timezone, str) else None

    return {
        "summary": {
            "avg_temp_max": avg_temp_max,
            "avg_temp_min": avg_temp_min,
            "avg_precip_probability": avg_precip_probability,
            "total_precipitation": total_precipitation,
            "avg_wind_speed": avg_wind_speed,
        },
        "daily": points,
        "flags": {
            "favorable_temperature_window": favorable_temperature_window,
            "rain_risk_in_next_3_days": rain_risk_in_next_3_days,
            "severe_weather_risk_proxy": severe_weather_risk_proxy,
            "plant_now_weather_score": max(
                40, min(92, int(round(plant_now_weather_score)))
            ),
        },
        "timezone": normalized_timezone,
    }


def fallback_weather() -> WeatherData:
    fallback_points: List[WeatherDailyPoint] = [
        {
            "date": "Mon",
            "temp_max": 61.0,
            "temp_min": 46.0,
            "precip_probability": 10,
            "precipitation_sum": 0.0,
            "wind_speed_max": 12.0,
        },
        {
            "date": "Tue",
            "temp_max": 64.0,
            "temp_min": 47.0,
            "precip_probability": 15,
            "precipitation_sum": 0.05,
            "wind_speed_max": 11.0,
        },
        {
            "date": "Wed",
            "temp_max": 66.0,
            "temp_min": 49.0,
            "precip_probability": 20,
            "precipitation_sum": 0.08,
            "wind_speed_max": 13.0,
        },
        {
            "date": "Thu",
            "temp_max": 63.0,
            "temp_min": 48.0,
            "precip_probability": 30,
            "precipitation_sum": 0.15,
            "wind_speed_max": 14.0,
        },
        {
            "date": "Fri",
            "temp_max": 59.0,
            "temp_min": 45.0,
            "precip_probability": 50,
            "precipitation_sum": 0.4,
            "wind_speed_max": 16.0,
        },
        {
            "date": "Sat",
            "temp_max": 57.0,
            "temp_min": 43.0,
            "precip_probability": 60,
            "precipitation_sum": 0.55,
            "wind_speed_max": 17.0,
        },
        {
            "date": "Sun",
            "temp_max": 58.0,
            "temp_min": 44.0,
            "precip_probability": 35,
            "precipitation_sum": 0.2,
            "wind_speed_max": 13.0,
        },
    ]

    return {
        "summary": {
            "avg_temp_max": 61.1,
            "avg_temp_min": 46.0,
            "avg_precip_probability": 31.4,
            "total_precipitation": 1.43,
            "avg_wind_speed": 13.7,
        },
        "daily": fallback_points,
        "flags": {
            "favorable_temperature_window": True,
            "rain_risk_in_next_3_days": False,
            "severe_weather_risk_proxy": False,
            "plant_now_weather_score": 82,
        },
        "timezone": "America/Chicago",
    }


def _to_float(value: object) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float, str)):
        return float(value)
    raise ProviderError("Open-Meteo Forecast", "Unexpected weather value type")
