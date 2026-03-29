"""Financial helpers for sales tracking and stockout impact reporting."""

from datetime import date

from data import get_item, get_items
from predictor import calculate_predictions

_sales_log: dict[str, dict[str, int]] = {}


def _today() -> str:
    return date.today().isoformat()


def _margin_pct(revenue: float, profit: float) -> float:
    if revenue <= 0:
        return 0.0
    return round((profit / revenue) * 100, 1)


def record_sale(item_name: str, amount: int) -> None:
    """Track units sold for the current day."""
    if amount <= 0:
        return
    item = get_item(item_name)
    if not item:
        return

    daily_sales = _sales_log.setdefault(_today(), {})
    daily_sales[item_name] = daily_sales.get(item_name, 0) + amount


def get_daily_financials() -> dict:
    """Return realized daily revenue/profit from recorded sales."""
    sales = _sales_log.get(_today(), {})
    by_product: list[dict] = []
    total_revenue = 0.0
    total_profit = 0.0

    for item_name, units_sold in sales.items():
        item = get_item(item_name)
        if not item or units_sold <= 0:
            continue

        revenue = round(units_sold * item["price"], 2)
        profit = round(units_sold * (item["price"] - item["unit_cost"]), 2)
        total_revenue += revenue
        total_profit += profit
        by_product.append(
            {
                "item": item_name,
                "units_sold": units_sold,
                "revenue": revenue,
                "profit": profit,
                "margin_pct": _margin_pct(revenue, profit),
            }
        )

    by_product.sort(key=lambda row: row["revenue"], reverse=True)
    total_revenue = round(total_revenue, 2)
    total_profit = round(total_profit, 2)

    return {
        "date": _today(),
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "margin_pct": _margin_pct(total_revenue, total_profit),
        "by_product": by_product,
    }


def get_stockout_losses() -> list[dict]:
    """Estimate unrealized revenue/profit where demand exceeds stock."""
    predictions = {row["item"]: row for row in calculate_predictions()}
    losses: list[dict] = []

    for item in get_items():
        predicted = predictions[item["name"]]["predicted_demand"]
        shortfall = max(0, predicted - item["current_stock"])
        if shortfall <= 0:
            continue

        lost_revenue = round(shortfall * item["price"], 2)
        lost_profit = round(shortfall * (item["price"] - item["unit_cost"]), 2)
        losses.append(
            {
                "item": item["name"],
                "current_stock": item["current_stock"],
                "predicted_demand": predicted,
                "shortfall": shortfall,
                "lost_revenue": lost_revenue,
                "lost_profit": lost_profit,
                "margin_pct": _margin_pct(lost_revenue, lost_profit),
            }
        )

    losses.sort(key=lambda row: row["lost_profit"], reverse=True)
    return losses


def _restock_priority(shortfall: int, current_stock: int) -> str:
    if current_stock <= 0 or shortfall >= 15:
        return "critical"
    if shortfall >= 8:
        return "high"
    return "medium"


def get_eod_summary() -> dict:
    """Combine realized sales and projected stockout risks into one summary."""
    financials = get_daily_financials()
    losses = get_stockout_losses()

    best_seller = financials["by_product"][0] if financials["by_product"] else None
    highest_margin_item = (
        max(financials["by_product"], key=lambda row: row["margin_pct"])
        if financials["by_product"]
        else None
    )
    biggest_stockout_risk = losses[0] if losses else None

    restock_actions: list[dict] = []
    for loss in losses[:5]:
        item = get_item(loss["item"])
        if not item:
            continue
        restock_actions.append(
            {
                "item": loss["item"],
                "current_stock": loss["current_stock"],
                "restock_qty": loss["shortfall"],
                "revenue_gain": loss["lost_revenue"],
                "profit_gain": loss["lost_profit"],
                "priority": _restock_priority(loss["shortfall"], loss["current_stock"]),
            }
        )

    return {
        "date": financials["date"],
        "total_revenue": financials["total_revenue"],
        "total_profit": financials["total_profit"],
        "margin_pct": financials["margin_pct"],
        "best_seller": best_seller,
        "highest_margin_item": highest_margin_item,
        "biggest_stockout_risk": biggest_stockout_risk,
        "total_projected_lost_revenue": round(sum(row["lost_revenue"] for row in losses), 2),
        "total_projected_lost_profit": round(sum(row["lost_profit"] for row in losses), 2),
        "restock_actions": restock_actions,
    }
