import logging
from typing import Any, Dict, Optional, Tuple

import httpx

from app.utils.errors import ProviderError

logger = logging.getLogger(__name__)


def get_json(
    *,
    url: str,
    timeout_seconds: float,
    params: Optional[Dict[str, Any]] = None,
    auth: Optional[Tuple[str, str]] = None,
    headers: Optional[Dict[str, str]] = None,
    provider: str,
) -> Any:
    try:
        response = httpx.get(
            url,
            params=params,
            auth=auth,
            headers=headers,
            timeout=timeout_seconds,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        logger.warning("%s request failed: %s", provider, exc)
        raise ProviderError(provider, f"{provider} request failed") from exc
