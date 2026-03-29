import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Dict

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional convenience only
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")


@dataclass(frozen=True)
class Settings:
    open_meteo_base_url: str = os.getenv(
        "OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1"
    )
    open_meteo_forecast_url: str = os.getenv(
        "OPEN_METEO_FORECAST_URL",
        f"{os.getenv('OPEN_METEO_BASE_URL', 'https://api.open-meteo.com/v1').rstrip('/')}/forecast",
    )
    open_meteo_geocoding_url: str = os.getenv(
        "OPEN_METEO_GEOCODING_URL",
        "https://geocoding-api.open-meteo.com/v1/search",
    )
    soilgrids_base_url: str = os.getenv("SOILGRIDS_BASE_URL", "").strip()
    usda_ams_api_key: str = os.getenv("USDA_AMS_API_KEY", "").strip()
    usda_ams_base_url: str = os.getenv(
        "USDA_AMS_BASE_URL", "https://marsapi.ams.usda.gov/services/v1.2"
    )
    usda_nass_api_key: str = os.getenv("USDA_NASS_API_KEY", "").strip()
    usda_nass_base_url: str = os.getenv(
        "USDA_NASS_BASE_URL", "https://quickstats.nass.usda.gov/api"
    )
    request_timeout_seconds: float = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "10"))
    usda_ams_report_slugs: Dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "usda_ams_report_slugs",
            {
                "Corn": os.getenv("USDA_AMS_CORN_REPORT_SLUG", "").strip(),
                "Soybeans": os.getenv("USDA_AMS_SOYBEANS_REPORT_SLUG", "").strip(),
                "Wheat": os.getenv("USDA_AMS_WHEAT_REPORT_SLUG", "").strip(),
            },
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
