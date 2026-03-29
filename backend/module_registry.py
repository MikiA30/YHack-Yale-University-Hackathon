"""A.U.R.A. platform module registry."""

MODULES = [
    {
        "id": "convenience-store",
        "name": "Convenience Store",
        "category": "Retail Operations",
        "description": "Inventory intelligence for convenience retail operations.",
        "status": "active",
    },
    {
        "id": "omnicrop",
        "name": "OmniCrop",
        "category": "Agriculture",
        "description": "Planting decision intelligence using weather, soil, market, and field signals.",
        "status": "active",
    },
]


def list_modules():
    return MODULES
