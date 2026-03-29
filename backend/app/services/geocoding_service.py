from typing import Any, Dict, List, Optional, cast

from app.config import get_settings
from app.types import GeocodedLocation
from app.utils.errors import LocationResolutionError
from app.utils.http import get_json
from app.utils.location import looks_like_zip_code, normalize_location_query
from app.utils.us_states import STATE_NAME_TO_ALPHA


def get_coordinates_for_location(location_query: str) -> GeocodedLocation:
    settings = get_settings()
    normalized_query = normalize_location_query(location_query)
    results: List[Dict[str, Any]] = []
    for geocoding_query in _build_search_queries(normalized_query):
        payload = get_json(
            url=settings.open_meteo_geocoding_url,
            params={
                "name": geocoding_query,
                "count": 1,
                "language": "en",
                "format": "json",
            },
            timeout_seconds=settings.request_timeout_seconds,
            provider="Open-Meteo Geocoding",
        )
        results = cast(List[Dict[str, Any]], payload.get("results") or [])
        if results:
            break

    if not results:
        raise LocationResolutionError(
            "Open-Meteo Geocoding",
            "We couldn't resolve that location. Try a ZIP code or city/state.",
        )

    best_match = results[0]
    name = best_match.get("name", location_query)
    admin1 = best_match.get("admin1")
    country = best_match.get("country")

    display_name_parts = [part for part in [name, admin1, country] if part]
    return {
        "query": normalized_query,
        "name": name,
        "state": admin1,
        "country": country,
        "latitude": float(best_match["latitude"]),
        "longitude": float(best_match["longitude"]),
        "timezone": best_match.get("timezone"),
        "display_name": ", ".join(display_name_parts) or location_query,
    }


def _build_search_queries(location_query: str) -> List[str]:
    queries: List[str] = [location_query]
    if looks_like_zip_code(location_query):
        return queries

    compact_query = location_query.replace(",", "")
    if compact_query != location_query:
        queries.append(compact_query)

    city_variant = _city_with_state_alpha(location_query)
    if city_variant:
        queries.append(city_variant)

    city_only = _city_only(location_query)
    if city_only and city_only not in queries:
        queries.append(city_only)

    deduped_queries: List[str] = []
    for query in queries:
        if query and query not in deduped_queries:
            deduped_queries.append(query)
    return deduped_queries


def _city_with_state_alpha(location_query: str) -> Optional[str]:
    parts = [part.strip() for part in location_query.split(",") if part.strip()]
    if len(parts) >= 2:
        state_alpha = STATE_NAME_TO_ALPHA.get(parts[-1])
        if state_alpha:
            return f"{parts[0]}, {state_alpha}"

    for state_name, state_alpha in STATE_NAME_TO_ALPHA.items():
        suffix = f" {state_name}"
        if location_query.endswith(suffix):
            city = location_query[: -len(suffix)].strip(", ").strip()
            if city:
                return f"{city}, {state_alpha}"
    return None


def _city_only(location_query: str) -> Optional[str]:
    if "," in location_query:
        city = location_query.split(",", 1)[0].strip()
        return city or None

    for state_name in STATE_NAME_TO_ALPHA:
        suffix = f" {state_name}"
        if location_query.endswith(suffix):
            city = location_query[: -len(suffix)].strip(", ").strip()
            return city or None
    return None
