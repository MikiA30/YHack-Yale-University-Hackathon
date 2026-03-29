"""Daily financial tracking and stockout impact reporting for A.U.R.A.

All data is in-memory and resets when the backend restarts. Sales are
recorded via ``record_sale()`` when ``update_inventory`` is called with
``action="sold"``. Restocks and corrections do not generate revenue.
"""

from datetime import date

from data import get_item, get_items
from predictor import calculate_predictions

_ledger: list[dict] = []


def _today() -> str:
    return date.today().isoformat()


def _margin_pct(revenue: float, profit: float) -> float:
    if revenue <= 0:
        return 0.0
    return round((profit / revenue) * 100, 1)


def record_sale(item_name: str, qty: int) -> None:
    """Record a sale event. Called by the update_inventory endpoint."""
    item = get_item(item_name)
    if not item or qty <= 0:
        return
    _ledger.append({
        "item":  item_name,
        "qty":   qty,
        "price": item["price"],
        "cost":  item["unit_cost"],
        "date":  date.today().isoformat(),
    })


def get_daily_financials() -> dict:
    """Aggregate today's sales into revenue, profit, and per-product breakdown."""
    today = _today()
    today_sales = [e for e in _ledger if e["date"] == today]

    by_item: dict[str, dict] = {}
    for entry in today_sales:
        name = entry["item"]
        if name not in by_item:
            by_item[name] = {"item": name, "units_sold": 0, "revenue": 0.0, "profit": 0.0}
        by_item[name]["units_sold"] += entry["qty"]
        by_item[name]["revenue"]    += entry["qty"] * entry["price"]
        by_item[name]["profit"]     += entry["qty"] * (entry["price"] - entry["cost"])

    products: list[dict] = []
    for v in by_item.values():
        rev  = round(v["revenue"], 2)
        prof = round(v["profit"],  2)
        products.append({
            "item":       v["item"],
            "units_sold": v["units_sold"],
            "revenue":    rev,
            "profit":     prof,
            "margin_pct": _margin_pct(rev, prof),
        })
    products.sort(key=lambda x: x["revenue"], reverse=True)

    total_revenue = round(sum(p["revenue"] for p in products), 2)
    total_profit  = round(sum(p["profit"]  for p in products), 2)

    return {
        "date":          today,
        "total_revenue": total_revenue,
        "total_profit":  total_profit,
        "margin_pct":    _margin_pct(total_revenue, total_profit),
        "by_product":    products,
    }


def get_stockout_losses() -> list[dict]:
    """Project lost revenue and profit for items where demand exceeds current stock."""
    items  = get_items()
    preds  = {p["item"]: p for p in calculate_predictions()}
    losses = []

    for item in items:
        name      = item["name"]
        predicted = preds.get(name, {}).get("predicted_demand", 0)
        stock     = item["current_stock"]

        if predicted > stock:
            shortfall    = predicted - stock
            price, cost  = item["price"], item["unit_cost"]
            losses.append({
                "item":             name,
                "current_stock":    stock,
                "predicted_demand": predicted,
                "shortfall":        shortfall,
                "lost_revenue":     round(shortfall * price,          2),
                "lost_profit":      round(shortfall * (price - cost), 2),
                "margin_pct":       _margin_pct(price, price - cost),
            })

    losses.sort(key=lambda x: x["lost_revenue"], reverse=True)
    return losses


def _restock_priority(
    shortfall: int,
    current_stock: int,
    reorder_threshold: int,
) -> str:
    if current_stock <= 0 or current_stock <= reorder_threshold or shortfall >= 15:
        return "critical"
    if shortfall >= 8:
        return "high"
    return "medium"


def get_eod_summary() -> dict:
    """Generate a full end-of-day business summary."""
    financials = get_daily_financials()
    losses     = get_stockout_losses()
    items      = get_items()
    preds      = {p["item"]: p for p in calculate_predictions()}

    # Best-selling item by revenue today
    best_seller = financials["by_product"][0] if financials["by_product"] else None

    # Highest-margin item across all inventory (unit margin %)
    margins = [
        {
            "item":       i["name"],
            "margin_pct": round((i["price"] - i["unit_cost"]) / i["price"] * 100, 1)
                          if i["price"] > 0 else 0.0,
        }
        for i in items
    ]
    highest_margin = max(margins, key=lambda x: x["margin_pct"]) if margins else None

    # Restock actions for tomorrow
    restock_actions: list[dict] = []
    for item in items:
        name      = item["name"]
        predicted = preds.get(name, {}).get("predicted_demand", 0)
        stock     = item["current_stock"]
        threshold = item["reorder_threshold"]

        if stock <= threshold or predicted > stock:
            shortfall   = max(0, predicted - stock)
            restock_qty = shortfall + threshold          # include buffer
            saleable    = min(shortfall, predicted)
            price, cost = item["price"], item["unit_cost"]
            restock_actions.append({
                "item":          name,
                "current_stock": stock,
                "restock_qty":   restock_qty,
                "revenue_gain":  round(saleable * price,          2),
                "profit_gain":   round(saleable * (price - cost), 2),
                "priority":      _restock_priority(shortfall, stock, threshold),
            })

    priority_rank = {"critical": 0, "high": 1, "medium": 2}
    restock_actions.sort(
        key=lambda x: (priority_rank.get(x["priority"], 99), -x["revenue_gain"])
    )

    return {
        "date":                         financials["date"],
        "total_revenue":                financials["total_revenue"],
        "total_profit":                 financials["total_profit"],
        "margin_pct":                   financials["margin_pct"],
        "best_seller":                  best_seller,
        "highest_margin_item":          highest_margin,
        "biggest_stockout_risk":        losses[0] if losses else None,
        "total_projected_lost_revenue": round(sum(l["lost_revenue"] for l in losses), 2),
        "total_projected_lost_profit":  round(sum(l["lost_profit"]  for l in losses), 2),
        "restock_actions":              restock_actions,
    }
