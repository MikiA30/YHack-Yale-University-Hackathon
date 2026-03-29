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


def add_product(name, current_stock, base_weekly_demand, unit_cost, price, reorder_threshold, category, factors):
    """Add a new product to inventory and market factors."""
    _inventory[name] = {
        "name": name,
        "current_stock": current_stock,
        "base_weekly_demand": base_weekly_demand,
        "unit_cost": unit_cost,
        "price": price,
        "reorder_threshold": reorder_threshold,
        "category": category,
    }
    _market_factors["weather"]["impacts"][name] = factors["weather_factor"]
    _market_factors["gas_price"]["impacts"][name] = factors["gas_price_factor"]
    _market_factors["traffic"]["impacts"][name] = factors["traffic_factor"]
    _market_factors["trend"]["impacts"][name] = factors["trend_factor"]
    return _inventory[name]


# --- Scan notifications for manager inbox ---
_notifications = []
_notif_id = 0


def add_notification(barcode, product_name, brands):
    global _notif_id
    _notif_id += 1
    notif = {
        "id": _notif_id,
        "barcode": barcode,
        "product_name": product_name,
        "brands": brands or "",
        "status": "pending",  # pending | dismissed
    }
    _notifications.append(notif)
    return notif


def get_notifications():
    return [n for n in _notifications if n["status"] == "pending"]


def dismiss_notification(notif_id):
    for n in _notifications:
        if n["id"] == notif_id:
            n["status"] = "dismissed"
            return n
    return None
