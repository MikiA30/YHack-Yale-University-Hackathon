from datetime import datetime
from typing import Optional

from app.config import get_settings
from app.schemas import CropName
from app.types import AgContextData, CropContextData
from app.utils.errors import ProviderError
from app.utils.http import get_json

COMMODITY_NAMES = {"Corn": "CORN", "Soybeans": "SOYBEANS", "Wheat": "WHEAT"}
REGIONAL_FIT_STATES = {
    "Corn": {"IA", "IL", "IN", "MN", "NE", "OH", "SD", "WI"},
    "Soybeans": {"IA", "IL", "IN", "MN", "MO", "NE", "OH", "WI"},
    "Wheat": {"KS", "ND", "OK", "MT", "WA", "TX", "CO"},
}


def get_agricultural_context(
    state_alpha: Optional[str], crops: list[CropName]
) -> AgContextData:
    settings = get_settings()
    if not settings.usda_nass_api_key:
        raise ProviderError("USDA NASS", "USDA_NASS_API_KEY is not configured")
    if not state_alpha:
        raise ProviderError("USDA NASS", "A U.S. state is required for NASS context")

    crop_context: dict[CropName, CropContextData] = {}
    for crop in crops:
        crop_context[crop] = {
            "common_in_region": state_alpha in REGIONAL_FIT_STATES[crop],
            "latest_yield": _query_latest_value(
                state_alpha=state_alpha,
                crop=crop,
                statisticcat_desc="YIELD",
            ),
            "latest_acreage": _query_latest_value(
                state_alpha=state_alpha,
                crop=crop,
                statisticcat_desc="AREA PLANTED",
            ),
        }

    summary_crops = [
        crop for crop, details in crop_context.items() if details["common_in_region"]
    ]
    summary = (
        f"{', '.join(summary_crops)} are regionally common in {state_alpha}."
        if summary_crops
        else f"NASS context is available, but the selected crops are not strongly represented in {state_alpha}."
    )

    return {
        "location_context": {"state": state_alpha, "county": None},
        "crop_context": crop_context,
        "summary": summary,
    }


def fallback_ag_context(
    state_alpha: Optional[str], crops: list[CropName]
) -> AgContextData:
    return {
        "location_context": {"state": state_alpha, "county": None},
        "crop_context": {
            crop: {
                "common_in_region": bool(
                    state_alpha and state_alpha in REGIONAL_FIT_STATES[crop]
                ),
                "latest_yield": None,
                "latest_acreage": None,
            }
            for crop in crops
        },
        "summary": "Regional crop context is using neutral defaults.",
    }


def _query_latest_value(
    *,
    state_alpha: str,
    crop: CropName,
    statisticcat_desc: str,
) -> Optional[float]:
    settings = get_settings()
    current_year = datetime.now().year
    payload = get_json(
        url=f"{settings.usda_nass_base_url}/api_GET/",
        params={
            "key": settings.usda_nass_api_key,
            "commodity_desc": COMMODITY_NAMES[crop],
            "state_alpha": state_alpha,
            "year__GE": current_year - 5,
            "statisticcat_desc": statisticcat_desc,
            "agg_level_desc": "STATE",
            "format": "json",
        },
        timeout_seconds=settings.request_timeout_seconds,
        provider="USDA NASS",
    )

    rows = payload.get("data") or []
    numeric_rows = []
    for row in rows:
        value = _parse_value(row.get("Value"))
        year = row.get("year")
        if value is None or year is None:
            continue
        numeric_rows.append((int(year), value))

    if not numeric_rows:
        return None
    numeric_rows.sort(reverse=True)
    return numeric_rows[0][1]


def _parse_value(raw: Optional[str]) -> Optional[float]:
    if not raw or raw in {"(D)", "(Z)"}:
        return None
    try:
        return float(raw.replace(",", ""))
    except ValueError:
        return None
