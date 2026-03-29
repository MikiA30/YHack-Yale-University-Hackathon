import logging
from collections.abc import Callable
from typing import TypeVar

from app.types import DataQuality
from app.utils.errors import ProviderError

logger = logging.getLogger(__name__)
T = TypeVar("T")


def with_data_fallback(
    *,
    provider_name: str,
    fetcher: Callable[[], T],
    fallback: Callable[[], T],
    data_quality: DataQuality,
) -> T:
    try:
        return fetcher()
    except ProviderError as exc:
        logger.info("%s falling back: %s", provider_name, exc.message)
        data_quality[provider_name] = "fallback"
        return fallback()
    except Exception as exc:  # pragma: no cover - defensive guard for demo stability
        logger.warning("%s unexpected failure: %s", provider_name, exc)
        data_quality[provider_name] = "fallback"
        return fallback()
