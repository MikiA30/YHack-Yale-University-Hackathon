from app.schemas import AnalysisRequest, AnalysisResponse
from app.services.normalization_service import build_demo_context
from app.simulator.simulation_engine import build_analysis_response

SAMPLE_REQUEST = AnalysisRequest(
    farm_name="North Field",
    location="Des Moines, IA",
    acreage=120,
    crop_options=["Corn", "Soybeans"],
    soil_moisture="Medium",
    field_readiness="Ready",
)


def get_mock_analysis() -> AnalysisResponse:
    return build_analysis_response(build_demo_context(SAMPLE_REQUEST))
