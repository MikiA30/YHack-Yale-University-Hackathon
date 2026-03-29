from app.core.normalization.fallbacks import with_data_fallback
from app.schemas import AnalysisRequest
from app.services.ag_context_service import (
    fallback_ag_context,
    get_agricultural_context,
)
from app.services.geocoding_service import get_coordinates_for_location
from app.services.market_service import fallback_market, get_market_signals
from app.services.soil_service import fallback_soil, get_soil_summary
from app.services.weather_service import fallback_weather, get_weather_forecast
from app.types import (
    AgContextData,
    DataQuality,
    FarmData,
    GeocodedLocation,
    LocationData,
    MarketData,
    NormalizedContext,
    SoilData,
    WeatherData,
)
from app.utils.us_states import to_state_alpha


def build_normalized_context(payload: AnalysisRequest) -> NormalizedContext:
    geocoded: GeocodedLocation = get_coordinates_for_location(payload.location)
    state_alpha = to_state_alpha(geocoded.get("state"))
    farm: FarmData = {
        "farm_name": payload.farm_name,
        "location": payload.location,
        "acreage": payload.acreage,
        "crop_options": payload.crop_options,
        "soil_moisture": payload.soil_moisture,
        "field_readiness": payload.field_readiness,
    }

    data_quality: DataQuality = {
        "geocoding": "live",
        "weather": "live",
        "soil": "live",
        "market": "live",
        "ag_context": "live",
    }

    weather: WeatherData = with_data_fallback(
        provider_name="weather",
        fetcher=lambda: get_weather_forecast(
            geocoded["latitude"], geocoded["longitude"]
        ),
        fallback=fallback_weather,
        data_quality=data_quality,
    )
    soil: SoilData = with_data_fallback(
        provider_name="soil",
        fetcher=lambda: get_soil_summary(geocoded["latitude"], geocoded["longitude"]),
        fallback=fallback_soil,
        data_quality=data_quality,
    )
    market: MarketData = with_data_fallback(
        provider_name="market",
        fetcher=lambda: get_market_signals(state_alpha, payload.crop_options),
        fallback=lambda: fallback_market(payload.crop_options),
        data_quality=data_quality,
    )
    ag_context: AgContextData = with_data_fallback(
        provider_name="ag_context",
        fetcher=lambda: get_agricultural_context(state_alpha, payload.crop_options),
        fallback=lambda: fallback_ag_context(state_alpha, payload.crop_options),
        data_quality=data_quality,
    )
    location: LocationData = {
        "query": payload.location,
        "resolved_name": geocoded["display_name"],
        "state": geocoded.get("state"),
        "state_alpha": state_alpha,
        "country": geocoded.get("country"),
        "latitude": geocoded["latitude"],
        "longitude": geocoded["longitude"],
        "timezone": geocoded.get("timezone") or weather.get("timezone"),
    }

    return {
        "farm": farm,
        "location": location,
        "weather": weather,
        "soil": soil,
        "market": market,
        "ag_context": ag_context,
        "data_quality": data_quality,
    }


def build_demo_context(payload: AnalysisRequest) -> NormalizedContext:
    state_alpha = to_state_alpha("Iowa")
    farm: FarmData = {
        "farm_name": payload.farm_name,
        "location": payload.location,
        "acreage": payload.acreage,
        "crop_options": payload.crop_options,
        "soil_moisture": payload.soil_moisture,
        "field_readiness": payload.field_readiness,
    }
    location: LocationData = {
        "query": payload.location,
        "resolved_name": "Des Moines, Iowa, United States",
        "state": "Iowa",
        "state_alpha": state_alpha,
        "country": "United States",
        "latitude": 41.5868,
        "longitude": -93.625,
        "timezone": "America/Chicago",
    }
    return {
        "farm": farm,
        "location": location,
        "weather": fallback_weather(),
        "soil": fallback_soil(),
        "market": fallback_market(payload.crop_options),
        "ag_context": fallback_ag_context(state_alpha, payload.crop_options),
        "data_quality": {
            "geocoding": "fallback",
            "weather": "fallback",
            "soil": "fallback",
            "market": "fallback",
            "ag_context": "fallback",
        },
    }
