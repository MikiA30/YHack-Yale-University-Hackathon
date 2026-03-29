from fastapi import APIRouter, HTTPException

from app.domains.omnicrop.chatbot import chat_harvest
from app.domains.omnicrop.adapters import omnicrop_domain
from app.domains.omnicrop.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    ChatRequest,
    ChatResponse,
    SimulationRequest,
    SimulationResponse,
)
from app.domains.omnicrop.services import (
    get_mock_analysis_response,
    simulate_request,
)
from app.utils.errors import LocationResolutionError, ProviderError
from app.utils.location import normalize_location_query

router = APIRouter(prefix="/domains/omnicrop", tags=["domains"])


@router.get("/mock-data", response_model=AnalysisResponse)
def mock_data() -> AnalysisResponse:
    return get_mock_analysis_response()


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(payload: AnalysisRequest) -> AnalysisResponse:
    if not normalize_location_query(payload.location):
        raise HTTPException(status_code=422, detail="Location is required.")
    try:
        return omnicrop_domain.analyze(payload)
    except LocationResolutionError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc
    except ProviderError:
        return get_mock_analysis_response()


@router.post("/simulate", response_model=SimulationResponse)
def simulate(payload: SimulationRequest) -> SimulationResponse:
    return simulate_request(payload)


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    result = chat_harvest(
        user_message=payload.message,
        analysis=payload.analysis.model_dump() if payload.analysis else None,
        model=payload.model,
    )
    return ChatResponse(**result)
