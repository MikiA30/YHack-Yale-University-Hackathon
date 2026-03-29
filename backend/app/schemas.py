from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

CropName = Literal["Corn", "Soybeans", "Wheat"]
SoilMoisture = Literal["Low", "Medium", "High"]
FieldReadiness = Literal["Not Ready", "Nearly Ready", "Ready"]
ProviderStatus = Literal["live", "fallback", "failed"]
RiskTolerance = Literal["conservative", "balanced", "aggressive"]
MarketOutlook = Literal["bearish", "neutral", "bullish"]
CropPreference = Literal["None", "Favor Corn", "Favor Soybeans", "Favor Wheat"]
ConfidenceLabel = Literal["low", "moderate", "high"]


class AnalysisRequest(BaseModel):
    farm_name: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=120)
    acreage: int = Field(ge=1, le=100_000)
    crop_options: list[CropName] = Field(min_length=2)
    soil_moisture: SoilMoisture
    field_readiness: FieldReadiness


class HealthResponse(BaseModel):
    status: str


class ResolvedLocation(BaseModel):
    display_name: str
    latitude: float
    longitude: float
    state: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None


class Recommendation(BaseModel):
    action: str
    crop: CropName
    timing: str
    confidence: int = Field(ge=0, le=100)
    summary: str
    why_crop: str = ""
    why_timing: str = ""
    operational_note: str = ""


class ScenarioScores(BaseModel):
    weather: int = Field(ge=0, le=30)
    soil: int = Field(ge=0, le=30)
    market: int = Field(ge=0, le=30)
    regional_fit: int = Field(ge=0, le=20)
    timing: int = Field(ge=0, le=30)
    risk_penalty: int = Field(ge=-30, le=0)
    preference_bonus: int = Field(ge=0, le=10, default=0)


class SignalCard(BaseModel):
    label: str
    status: str
    score: int = Field(ge=0, le=100)
    summary: str


class Signals(BaseModel):
    local: SignalCard
    market: SignalCard
    risk: SignalCard


class Scenario(BaseModel):
    label: str
    score: int = Field(ge=0, le=100)
    risk_level: str
    summary: str
    crop: Optional[CropName] = None
    delay_days: int = Field(default=0, ge=0, le=7)
    scores: Optional[ScenarioScores] = None
    delta_from_best: int = Field(default=0, ge=0, le=100)


class PricePoint(BaseModel):
    day: str
    Corn: float
    Soybeans: float
    Wheat: float


class WeatherPoint(BaseModel):
    day: str
    temp: float
    rain: int


class Charts(BaseModel):
    price_trend: list[PricePoint]
    weather_forecast: list[WeatherPoint]


class DataSources(BaseModel):
    geocoding: ProviderStatus
    weather: ProviderStatus
    soil: ProviderStatus
    market: ProviderStatus
    ag_context: ProviderStatus


class DecisionWindowPoint(BaseModel):
    day: int = Field(ge=0, le=7)
    label: str
    score: int = Field(ge=0, le=100)
    risk: str
    crop: CropName


class ConfidenceBreakdown(BaseModel):
    weather: float = Field(ge=0, le=1)
    soil: float = Field(ge=0, le=1)
    market: float = Field(ge=0, le=1)
    regional_fit: float = Field(ge=0, le=1)
    timing: float = Field(ge=0, le=1)


class SimulationAdjustments(BaseModel):
    risk_tolerance: RiskTolerance = "balanced"
    delay_days: int = Field(default=0, ge=0, le=7)
    rain_adjustment_pct: int = Field(default=0, ge=-30, le=30)
    market_outlook: MarketOutlook = "neutral"
    field_readiness_override: Optional[FieldReadiness] = None
    crop_preference: CropPreference = "None"


class SimulationMetadata(BaseModel):
    delay_days: int = Field(ge=0, le=7)
    rain_adjustment_pct: int = Field(ge=-30, le=30)
    risk_tolerance: RiskTolerance
    market_outlook: MarketOutlook
    field_readiness_override: Optional[FieldReadiness] = None
    crop_preference: CropPreference


class SimulationRequest(BaseModel):
    base_context: dict[str, Any]
    user_inputs: AnalysisRequest
    adjustments: SimulationAdjustments = Field(default_factory=SimulationAdjustments)


class AnalysisResponse(BaseModel):
    resolved_location: ResolvedLocation
    data_sources: DataSources
    recommendation: Recommendation
    confidence: int = Field(ge=0, le=100)
    confidence_label: ConfidenceLabel
    confidence_breakdown: ConfidenceBreakdown
    signals: Signals
    top_reasons: list[str]
    key_risks: list[str]
    scenarios: list[Scenario]
    decision_window: list[DecisionWindowPoint]
    what_would_change: list[str]
    charts: Charts
    base_context: dict[str, Any]


class SimulationResponse(AnalysisResponse):
    simulation_metadata: SimulationMetadata
