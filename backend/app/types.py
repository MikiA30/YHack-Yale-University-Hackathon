from typing import Dict, List, Optional, TypedDict

from app.schemas import CropName, FieldReadiness, ProviderStatus, SoilMoisture


class FarmData(TypedDict):
    farm_name: str
    location: str
    acreage: int
    crop_options: List[CropName]
    soil_moisture: SoilMoisture
    field_readiness: FieldReadiness


class GeocodedLocation(TypedDict):
    query: str
    name: str
    state: Optional[str]
    country: Optional[str]
    latitude: float
    longitude: float
    timezone: Optional[str]
    display_name: str


class LocationData(TypedDict):
    query: str
    resolved_name: str
    state: Optional[str]
    state_alpha: Optional[str]
    country: Optional[str]
    latitude: float
    longitude: float
    timezone: Optional[str]


class WeatherDailyPoint(TypedDict):
    date: str
    temp_max: float
    temp_min: float
    precip_probability: int
    precipitation_sum: float
    wind_speed_max: float


class WeatherSummaryData(TypedDict):
    avg_temp_max: float
    avg_temp_min: float
    avg_precip_probability: float
    total_precipitation: float
    avg_wind_speed: float


class WeatherFlags(TypedDict):
    favorable_temperature_window: bool
    rain_risk_in_next_3_days: bool
    severe_weather_risk_proxy: bool
    plant_now_weather_score: int


class WeatherData(TypedDict):
    summary: WeatherSummaryData
    daily: List[WeatherDailyPoint]
    flags: WeatherFlags
    timezone: Optional[str]


class SoilSummaryData(TypedDict):
    ph: float
    texture_class_proxy: str
    drainage_risk_proxy: str
    organic_matter_proxy: str
    soil_suitability_score: int


class SoilData(TypedDict):
    raw: Dict[str, float]
    summary: SoilSummaryData


class MarketSignalData(TypedDict):
    price: float
    trend: str
    score: int
    source: str


class MarketPricePoint(TypedDict):
    day: str
    Corn: float
    Soybeans: float
    Wheat: float


class MarketData(TypedDict):
    source: str
    market_status: str
    crop_signals: Dict[CropName, MarketSignalData]
    summary: str
    price_trend: List[MarketPricePoint]
    state: Optional[str]


class CropContextData(TypedDict):
    common_in_region: bool
    latest_yield: Optional[float]
    latest_acreage: Optional[float]


class AgLocationContext(TypedDict):
    state: Optional[str]
    county: Optional[str]


class AgContextData(TypedDict):
    location_context: AgLocationContext
    crop_context: Dict[CropName, CropContextData]
    summary: str


class DataQuality(TypedDict):
    geocoding: ProviderStatus
    weather: ProviderStatus
    soil: ProviderStatus
    market: ProviderStatus
    ag_context: ProviderStatus


class NormalizedContext(TypedDict):
    farm: FarmData
    location: LocationData
    weather: WeatherData
    soil: SoilData
    market: MarketData
    ag_context: AgContextData
    data_quality: DataQuality
