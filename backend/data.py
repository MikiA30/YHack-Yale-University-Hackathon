"""Loads inventory_data.json into a mutable in-memory store.
All endpoints read/write through this module.

The JSON file is watched for changes on every read — if it has been modified
on disk since last load, the store is automatically reloaded. This means you
can edit inventory_data.json and see changes immediately without restarting
the server.
"""

import json
from pathlib import Path

_DATA_PATH = Path(__file__).parent / "inventory_data.json"

# In-memory state
_store = {}
_aisles = {}
_market_factors = {}
_inventory = {}
_last_mtime: float = 0.0


def _load():
    """Read the JSON file from disk and rebuild all in-memory state."""
    global _store, _aisles, _market_factors, _inventory, _last_mtime
    raw = json.loads(_DATA_PATH.read_text())
    _store = raw["store"]
    _aisles = raw.get("aisles", {})
    _market_factors = raw["market_factors"]
    _inventory = {item["name"]: dict(item) for item in raw["items"]}
    _last_mtime = _DATA_PATH.stat().st_mtime
    print(f"[data] inventory_data.json loaded ({len(_inventory)} items)")


def _reload_if_changed():
    """Check the file's modification time and reload only if it has changed."""
    current_mtime = _DATA_PATH.stat().st_mtime
    if current_mtime != _last_mtime:
        print("[data] inventory_data.json changed on disk — reloading…")
        _load()


# Load once at startup
_load()


# ---------------------------------------------------------------------------
# Public read API — each calls _reload_if_changed() so edits to the JSON
# file are picked up automatically on the next request.
# ---------------------------------------------------------------------------

def get_store_info():
    _reload_if_changed()
    return _store


def get_items():
    _reload_if_changed()
    return list(_inventory.values())


def get_item(name: str):
    _reload_if_changed()
    return _inventory.get(name)


def get_aisles():
    _reload_if_changed()
    return _aisles


def get_market_factors():
    _reload_if_changed()
    return _market_factors


# ---------------------------------------------------------------------------
# Public write API — mutates in-memory state only (no reload before writing,
# so transient changes like sold/restocked stock are never clobbered by a
# concurrent file reload).
# ---------------------------------------------------------------------------

def update_stock(name: str, new_stock: int):
    if name in _inventory:
        _inventory[name]["current_stock"] = max(0, new_stock)
        return _inventory[name]
    return None


def add_product(
    name: str,
    current_stock: int,
    base_weekly_demand: int,
    unit_cost: float,
    price: float,
    reorder_threshold: int,
    category: str,
    factors: dict,
):
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


def remove_product(name: str):
    """Remove a product from inventory and market factors."""
    if name not in _inventory:
        return None
    removed = _inventory.pop(name)
    for factor_type in _market_factors.values():
        factor_type["impacts"].pop(name, None)
    return removed


# ---------------------------------------------------------------------------
# Scan notifications for manager inbox
# ---------------------------------------------------------------------------

_notifications: list = []
_notif_id: int = 0


def add_notification(barcode: str, product_name: str, brands: str):
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


def dismiss_notification(notif_id: int):
    for n in _notifications:
        if n["id"] == notif_id:
            n["status"] = "dismissed"
            return n
    return None
