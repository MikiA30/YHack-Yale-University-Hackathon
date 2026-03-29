from typing import Any

from pydantic import BaseModel

from app.core.domain import DomainAdapter
from app.core.schemas.platform import ModuleMetadata
from app.domains.omnicrop import services
from app.domains.omnicrop.constants import OMNICROP_METADATA
from app.domains.omnicrop.schemas import AnalysisRequest, AnalysisResponse


class OmniCropDomainAdapter(DomainAdapter):
    def get_domain_metadata(self) -> ModuleMetadata:
        return OMNICROP_METADATA

    def validate_user_input(
        self,
        payload: BaseModel | dict[str, Any],
    ) -> AnalysisRequest:
        if isinstance(payload, AnalysisRequest):
            return payload
        return AnalysisRequest.model_validate(payload)

    def fetch_domain_context(self, payload: BaseModel):
        return services.fetch_context(self.validate_user_input(payload))

    def normalize_domain_context(self, raw_context: Any, payload: BaseModel):
        del payload
        return raw_context

    def generate_candidate_actions(self, context: Any) -> list[Any]:
        snapshot = services.build_snapshot(context)
        return snapshot["scenarios"]

    def score_actions(self, context: Any, candidate_actions: list[Any]) -> dict[str, Any]:
        del candidate_actions
        return services.build_snapshot(context)

    def simulate_actions(self, context: Any, scored_actions: Any) -> dict[str, Any]:
        adjustments = scored_actions["adjustments"]
        decision_window = services.build_decision_window(context, adjustments)
        return {
            "adjustments": adjustments,
            "decision_window": decision_window,
        }

    def build_explanation(
        self,
        context: Any,
        scored_actions: Any,
        simulation_outputs: Any,
    ) -> AnalysisResponse:
        return services.compose_analysis_response(
            context=context,
            snapshot=scored_actions,
            decision_window=simulation_outputs["decision_window"],
            adjustments=simulation_outputs["adjustments"],
        )

    def analyze(self, payload: AnalysisRequest | dict[str, Any]) -> AnalysisResponse:
        validated = self.validate_user_input(payload)
        raw_context = self.fetch_domain_context(validated)
        normalized_context = self.normalize_domain_context(raw_context, validated)
        candidates = self.generate_candidate_actions(normalized_context)
        scored = self.score_actions(normalized_context, candidates)
        simulation_outputs = self.simulate_actions(normalized_context, scored)
        return self.build_explanation(normalized_context, scored, simulation_outputs)


omnicrop_domain = OmniCropDomainAdapter()
