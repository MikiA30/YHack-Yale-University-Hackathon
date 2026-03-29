from typing import Any

from pydantic import BaseModel

from app.core.domain import DomainAdapter
from app.core.schemas.platform import ModuleMetadata
from app.domains.convenience_store.constants import CONVENIENCE_STORE_METADATA


class ConvenienceStoreDomainAdapter(DomainAdapter):
    def get_domain_metadata(self) -> ModuleMetadata:
        return CONVENIENCE_STORE_METADATA

    def validate_user_input(self, payload: BaseModel | dict[str, Any]) -> BaseModel:
        raise NotImplementedError("Convenience store module is not implemented in this repo")

    def fetch_domain_context(self, payload: BaseModel) -> Any:
        raise NotImplementedError("Convenience store module is not implemented in this repo")

    def normalize_domain_context(self, raw_context: Any, payload: BaseModel) -> Any:
        raise NotImplementedError("Convenience store module is not implemented in this repo")

    def generate_candidate_actions(self, context: Any) -> list[Any]:
        raise NotImplementedError("Convenience store module is not implemented in this repo")

    def score_actions(self, context: Any, candidate_actions: list[Any]) -> Any:
        raise NotImplementedError("Convenience store module is not implemented in this repo")

    def simulate_actions(self, context: Any, scored_actions: Any) -> Any:
        raise NotImplementedError("Convenience store module is not implemented in this repo")

    def build_explanation(
        self,
        context: Any,
        scored_actions: Any,
        simulation_outputs: Any,
    ) -> Any:
        raise NotImplementedError("Convenience store module is not implemented in this repo")


convenience_store_domain = ConvenienceStoreDomainAdapter()
