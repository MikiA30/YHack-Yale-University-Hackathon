from typing import Final

from app.core.schemas.platform import ModuleMetadata
from app.schemas import CropName

VALID_CROPS: Final[frozenset[CropName]] = frozenset({"Corn", "Soybeans", "Wheat"})

OMNICROP_METADATA = ModuleMetadata(
    id="omnicrop",
    name="OmniCrop",
    category="Agriculture",
    description=(
        "Planting decision intelligence using weather, market, soil, and regional signals"
    ),
)
