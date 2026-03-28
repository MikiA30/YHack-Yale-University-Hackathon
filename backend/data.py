"""Loads and parses inventory_data.json — single source of truth for store data."""

import json
from pathlib import Path

_DATA_PATH = Path(__file__).parent / "inventory_data.json"


def _load():
    with open(_DATA_PATH) as f:
        return json.load(f)


def get_store_info():
    return _load()["store"]


def get_items():
    return _load()["items"]


def get_market_factors():
    return _load()["market_factors"]
