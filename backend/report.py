"""Structured business report generation for A.U.R.A."""

from datetime import date

from data import get_items, get_store_info
from finance import get_daily_financials, get_stockout_losses
from live_factors import get_live_factors
from predictor import calculate_predictions, get_alerts, get_inventory_view


def generate_report() -> dict:
    """Build a full business report from existing in-memory data."""
    store       = get_store_info()
    items       = get_items()
    predictions = calculate_predictions()
    inventory   = get_inventory_view()
    alerts      = get_alerts()
    financials  = get_daily_financials()
    losses      = get_stockout_losses()

    item_map = {i["name"]: i for i in items}

    # Demand forecast (all items, sorted by abs demand change)
    forecast = sorted(
        [
            {
                "item":             p["item"],
                "current_stock":    item_map.get(p["item"], {}).get("current_stock", 0),
                "predicted_demand": p["predicted_demand"],
                "demand_change_pct": p["demand_change_pct"],
                "recommendation":   p["recommendation"],
            }
            for p in predictions
        ],
        key=lambda x: abs(x["demand_change_pct"]),
        reverse=True,
    )

    # Revenue / profit per item (projected weekly)
    revenue_data = sorted(
        [
            {
                "item":                     row["item"],
                "price":                    row["price"],
                "unit_cost":                row["unit_cost"],
                "current_stock":            row["current_stock"],
                "projected_weekly_revenue": round(row["predicted_demand"] * row["price"], 2),
                "projected_weekly_profit":  round(
                    row["predicted_demand"] * (row["price"] - row["unit_cost"]), 2
                ),
            }
            for row in inventory
        ],
        key=lambda x: x["projected_weekly_revenue"],
        reverse=True,
    )

    # Top 5 sellers by projected revenue
    top_sellers = revenue_data[:5]

    # Action items (anything not "Hold")
    recommendations = [
        {
            "item":             p["item"],
            "action":           p["recommendation"],
            "demand_change_pct": p["demand_change_pct"],
            "current_stock":    item_map.get(p["item"], {}).get("current_stock", 0),
            "predicted_demand": p["predicted_demand"],
        }
        for p in predictions
        if p["recommendation"] != "Hold"
    ]

    # Live signals summary (only include signals with real data)
    live_summary: dict = {}
    try:
        live = get_live_factors()
        for key, signal_key in [("weather", "weather"), ("economic", "economic"), ("events", "event")]:
            summary = live[signal_key].get("summary", "")
            if summary and "unavailable" not in summary and summary.strip():
                live_summary[key] = summary
    except Exception:
        pass

    total_lost_rev    = round(sum(l["lost_revenue"] for l in losses), 2)
    total_lost_profit = round(sum(l["lost_profit"]  for l in losses), 2)

    return {
        "generated_at": date.today().isoformat(),
        "store":        store,
        "summary": {
            "total_items":               len(items),
            "total_alerts":              len(alerts),
            "today_revenue":             financials["total_revenue"],
            "today_profit":              financials["total_profit"],
            "today_margin_pct":          financials["margin_pct"],
            "projected_lost_revenue":    total_lost_rev,
            "projected_lost_profit":     total_lost_profit,
        },
        "forecast":        forecast,
        "revenue_data":    revenue_data,
        "top_sellers":     top_sellers,
        "stockout_risks":  losses,
        "recommendations": recommendations,
        "alerts":          alerts,
        "live_signals":    live_summary,
    }
