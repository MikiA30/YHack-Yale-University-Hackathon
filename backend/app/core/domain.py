from typing import Any, Protocol

from pydantic import BaseModel

from app.core.schemas.platform import ModuleMetadata


class DomainAdapter(Protocol):
    """Minimal contract that lets A.U.R.A. orchestrate domain modules."""

    def get_domain_metadata(self) -> ModuleMetadata: ...

    def validate_user_input(self, payload: BaseModel | dict[str, Any]) -> BaseModel: ...

    def fetch_domain_context(self, payload: BaseModel) -> Any: ...

    def normalize_domain_context(self, raw_context: Any, payload: BaseModel) -> Any: ...

    def generate_candidate_actions(self, context: Any) -> list[Any]: ...

    def score_actions(self, context: Any, candidate_actions: list[Any]) -> Any: ...

    def simulate_actions(self, context: Any, scored_actions: Any) -> Any: ...

    def build_explanation(
        self,
        context: Any,
        scored_actions: Any,
        simulation_outputs: Any,
    ) -> Any: ...
