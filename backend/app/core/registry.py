from app.core.domain import DomainAdapter
from app.core.schemas.platform import ModuleMetadata
from app.domains.convenience_store.adapters import convenience_store_domain
from app.domains.omnicrop.adapters import omnicrop_domain

DOMAIN_REGISTRY: dict[str, DomainAdapter] = {
    "convenience-store": convenience_store_domain,
    "omnicrop": omnicrop_domain,
}


def list_modules() -> list[ModuleMetadata]:
    return [domain.get_domain_metadata() for domain in DOMAIN_REGISTRY.values()]


def get_domain(domain_id: str) -> DomainAdapter:
    return DOMAIN_REGISTRY[domain_id]
