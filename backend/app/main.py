from typing import Any, List, cast

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.core.registry import list_modules
from app.core.schemas.platform import ModuleMetadata
from app.domains.omnicrop.adapters import omnicrop_domain
from app.domains.omnicrop.constants import VALID_CROPS
from app.domains.omnicrop.routes import router as omnicrop_router
from app.domains.omnicrop.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    CropName,
    HealthResponse,
    SimulationRequest,
    SimulationResponse,
)
from app.domains.omnicrop.services import (
    get_mock_analysis_response,
    simulate_request,
)
from app.services.ag_context_service import (
    fallback_ag_context,
    get_agricultural_context,
)
from app.services.geocoding_service import get_coordinates_for_location
from app.services.market_service import fallback_market, get_market_signals
from app.services.soil_service import fallback_soil, get_soil_summary
from app.services.weather_service import fallback_weather, get_weather_forecast
from app.types import GeocodedLocation
from app.utils.errors import LocationResolutionError, ProviderError
from app.utils.location import normalize_location_query
from app.utils.us_states import to_state_alpha

app = FastAPI(
    title="A.U.R.A. Platform",
    description="Adaptive Uncertainty & Risk Agent platform with modular decision domains.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(omnicrop_router)


@app.get("/", tags=["system"])
def root() -> dict[str, Any]:
    return {
        "message": "A.U.R.A. Platform",
        "modules_endpoint": "/platform/modules",
        "default_module": "omnicrop",
    }


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/platform/modules", response_model=list[ModuleMetadata], tags=["platform"])
def platform_modules() -> list[ModuleMetadata]:
    return list_modules()


@app.get("/mock-data", response_model=AnalysisResponse, tags=["compatibility"])
def mock_data() -> AnalysisResponse:
    return get_mock_analysis_response()


@app.post("/analyze", response_model=AnalysisResponse, tags=["compatibility"])
def analyze(payload: AnalysisRequest) -> AnalysisResponse:
    if not normalize_location_query(payload.location):
        raise HTTPException(status_code=422, detail="Location is required.")
    try:
        return omnicrop_domain.analyze(payload)
    except LocationResolutionError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc


@app.post("/simulate", response_model=SimulationResponse, tags=["compatibility"])
def simulate(payload: SimulationRequest) -> SimulationResponse:
    return simulate_request(payload)


@app.get("/debug/geocode", tags=["debug"])
def debug_geocode(location: str = Query(..., min_length=2)) -> GeocodedLocation:
    try:
        return get_coordinates_for_location(location)
    except LocationResolutionError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc


@app.get("/debug/weather", tags=["debug"])
def debug_weather(lat: float, lon: float) -> Any:
    try:
        return get_weather_forecast(lat, lon)
    except ProviderError as exc:
        return {"status": "fallback", "detail": exc.message, "data": fallback_weather()}


@app.get("/debug/soil", tags=["debug"])
def debug_soil(lat: float, lon: float) -> Any:
    try:
        return get_soil_summary(lat, lon)
    except ProviderError as exc:
        return {"status": "fallback", "detail": exc.message, "data": fallback_soil()}


@app.get("/debug/market", tags=["debug"])
def debug_market(
    state: str,
    crops: str = Query(..., description="Comma-separated crop names"),
) -> Any:
    crop_list = _parse_debug_crops(crops)
    try:
        return get_market_signals(state, crop_list)
    except ProviderError as exc:
        return {
            "status": "fallback",
            "detail": exc.message,
            "data": fallback_market(crop_list),
        }


@app.get("/debug/ag-context", tags=["debug"])
def debug_ag_context(
    state: str,
    crops: str = Query(..., description="Comma-separated crop names"),
) -> Any:
    crop_list = _parse_debug_crops(crops)
    state_alpha = to_state_alpha(state) or state
    try:
        return get_agricultural_context(state_alpha, crop_list)
    except ProviderError as exc:
        return {
            "status": "fallback",
            "detail": exc.message,
            "data": fallback_ag_context(state_alpha, crop_list),
        }


def _parse_debug_crops(crops: str) -> List[CropName]:
    crop_list = [crop.strip() for crop in crops.split(",") if crop.strip()]
    invalid = [crop for crop in crop_list if crop not in VALID_CROPS]
    if not crop_list or invalid:
        raise HTTPException(
            status_code=422,
            detail="Use comma-separated crops from: Corn, Soybeans, Wheat.",
        )
    return cast(List[CropName], crop_list)
