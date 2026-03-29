from pydantic import BaseModel

from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    Charts,
    ConfidenceBreakdown,
    ConfidenceLabel,
    CropName,
    DataSources,
    DecisionWindowPoint,
    HealthResponse,
    Recommendation,
    ResolvedLocation,
    Scenario,
    ScenarioScores,
    SignalCard,
    Signals,
    SimulationAdjustments,
    SimulationMetadata,
    SimulationRequest,
    SimulationResponse,
)


class ChatRequest(BaseModel):
    message: str
    model: str | None = None
    analysis: AnalysisResponse | None = None


class ChatResponse(BaseModel):
    response: str
    model: str

__all__ = [
    "AnalysisRequest",
    "AnalysisResponse",
    "ChatRequest",
    "ChatResponse",
    "Charts",
    "ConfidenceBreakdown",
    "ConfidenceLabel",
    "CropName",
    "DataSources",
    "DecisionWindowPoint",
    "HealthResponse",
    "Recommendation",
    "ResolvedLocation",
    "Scenario",
    "ScenarioScores",
    "SignalCard",
    "Signals",
    "SimulationAdjustments",
    "SimulationMetadata",
    "SimulationRequest",
    "SimulationResponse",
]
