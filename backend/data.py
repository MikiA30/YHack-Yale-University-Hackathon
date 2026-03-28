"""Loads inventory_data.json into a mutable in-memory store.
All endpoints read/write through this module."""

import json
from pathlib import Path

_DATA_PATH = Path(__file__).parent / "inventory_data.json"

# Load once at startup into mutable state
_raw = json.loads(_DATA_PATH.read_text())
_store = _raw["store"]
_market_factors = _raw["market_factors"]

# Mutable inventory — keyed by item name for fast lookup
_inventory = {item["name"]: dict(item) for item in _raw["items"]}


def get_store_info():
    return _store


def get_items():
    return list(_inventory.values())


def get_item(name):
    return _inventory.get(name)


def update_stock(name, new_stock):
    if name in _inventory:
        _inventory[name]["current_stock"] = max(0, new_stock)
        return _inventory[name]
    return None


def get_market_factors():
    return _market_factors
