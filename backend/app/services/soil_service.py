from typing import Any, Dict, List, cast

from app.config import get_settings
from app.types import SoilData
from app.utils.errors import ProviderError
from app.utils.http import get_json

SOIL_PROPERTY_KEYS = {
    "phh2o": "ph",
    "clay": "clay",
    "sand": "sand",
    "silt": "silt",
    "soc": "organic_carbon",
    "nitrogen": "nitrogen",
    "cec": "cec",
    "bdod": "bulk_density",
}


def get_soil_summary(latitude: float, longitude: float) -> SoilData:
    settings = get_settings()
    if not settings.soilgrids_base_url:
        raise ProviderError("SoilGrids", "SOILGRIDS_BASE_URL is not configured")

    # SoilGrids access patterns vary by deployment. We keep the request isolated here and
    # expect SOILGRIDS_BASE_URL to point at a query-capable endpoint for the hackathon setup.
    payload = get_json(
        url=settings.soilgrids_base_url,
        params={"lat": latitude, "lon": longitude},
        timeout_seconds=settings.request_timeout_seconds,
        provider="SoilGrids",
    )
    return normalize_soil_payload(payload)


def normalize_soil_payload(payload: dict[str, object]) -> SoilData:
    raw: dict[str, float] = {}
    properties = payload.get("properties")
    if isinstance(properties, dict):
        layers = cast(List[Dict[str, Any]], properties.get("layers") or [])
        for layer in layers:
            name = layer.get("name")
            if name not in SOIL_PROPERTY_KEYS:
                continue
            depths = cast(List[Dict[str, Any]], layer.get("depths") or [])
            if not depths:
                continue
            first_depth = depths[0]
            values = cast(Dict[str, Any], first_depth.get("values") or {})
            mean_value = values.get("mean")
            if mean_value is not None:
                raw[SOIL_PROPERTY_KEYS[name]] = _as_float(mean_value)

    if not raw:
        # Some deployments may already expose a flattened JSON format.
        for source_key, target_key in SOIL_PROPERTY_KEYS.items():
            value = payload.get(source_key)
            if value is not None:
                raw[target_key] = _as_float(value)

    if not raw:
        raise ProviderError(
            "SoilGrids", "No recognizable soil properties were returned"
        )

    return _summarize_soil(raw)


def fallback_soil() -> SoilData:
    return _summarize_soil(
        {
            "ph": 6.5,
            "clay": 28.0,
            "sand": 36.0,
            "silt": 36.0,
            "organic_carbon": 22.0,
            "nitrogen": 1.8,
            "cec": 16.0,
            "bulk_density": 1.3,
        }
    )


def _summarize_soil(raw: dict[str, float]) -> SoilData:
    ph = raw.get("ph", 6.5)
    clay = raw.get("clay", 30.0)
    sand = raw.get("sand", 35.0)
    silt = raw.get("silt", 35.0)
    organic_carbon = raw.get("organic_carbon", 20.0)

    texture_class_proxy = _texture_class(sand=sand, silt=silt, clay=clay)
    drainage_risk_proxy = "High" if clay >= 40 else "Moderate" if clay >= 28 else "Low"
    organic_matter_proxy = (
        "Strong"
        if organic_carbon >= 25
        else "Moderate"
        if organic_carbon >= 15
        else "Low"
    )

    suitability = 72
    if 6.0 <= ph <= 7.2:
        suitability += 8
    else:
        suitability -= 8
    if drainage_risk_proxy == "High":
        suitability -= 10
    elif drainage_risk_proxy == "Moderate":
        suitability -= 4
    if organic_matter_proxy == "Strong":
        suitability += 6
    elif organic_matter_proxy == "Low":
        suitability -= 4
    if texture_class_proxy in {"Loam", "Silt Loam"}:
        suitability += 6

    return {
        "raw": raw,
        "summary": {
            "ph": round(ph, 2),
            "texture_class_proxy": texture_class_proxy,
            "drainage_risk_proxy": drainage_risk_proxy,
            "organic_matter_proxy": organic_matter_proxy,
            "soil_suitability_score": max(45, min(90, int(round(suitability)))),
        },
    }


def _texture_class(*, sand: float, silt: float, clay: float) -> str:
    if clay >= 40:
        return "Clay"
    if sand >= 55:
        return "Sandy Loam"
    if silt >= 45:
        return "Silt Loam"
    return "Loam"


def _as_float(value: object) -> float:
    if isinstance(value, (int, float, str)):
        return float(value)
    raise ProviderError("SoilGrids", "Unexpected soil value type")
