"""Prediction engine — all math lives here, no AI involved."""

from data import get_items, get_item, get_market_factors


def _get_factors(name):
    factors = get_market_factors()
    weather = factors["weather"]["impacts"][name]
    gas = factors["gas_price"]["impacts"][name]
    traffic = factors["traffic"]["impacts"][name]
    trend = factors["trend"]["impacts"][name]
    return weather + gas + traffic + trend


def calculate_predictions():
    items = get_items()
    predictions = []

    for item in items:
        name = item["name"]
        base = item["base_weekly_demand"]
        total_factor = _get_factors(name)

        predicted_demand = round(base * (1 + total_factor))
        demand_change_pct = round(total_factor * 100, 1)
        probability = round(min(95, max(50, 50 + abs(total_factor) * 100)), 1)

        if demand_change_pct > 10:
            recommendation = "Buy More"
        elif demand_change_pct < -10:
            recommendation = "Buy Less"
        else:
            recommendation = "Hold"

        predictions.append({
            "item": name,
            "demand_change_pct": demand_change_pct,
            "probability": probability,
            "predicted_demand": predicted_demand,
            "recommendation": recommendation,
        })

    return predictions


def get_inventory_view():
    items = get_items()
    preds = {p["item"]: p for p in calculate_predictions()}

    rows = []
    for item in items:
        p = preds[item["name"]]
        rows.append({
            "item": item["name"],
            "current_stock": item["current_stock"],
            "unit_cost": item["unit_cost"],
            "price": item["price"],
            "predicted_demand": p["predicted_demand"],
            "demand_change_pct": p["demand_change_pct"],
            "recommended_change": p["predicted_demand"] - item["current_stock"],
            "recommendation": p["recommendation"],
        })
    return rows


def get_alerts():
    items = get_items()
    preds = {p["item"]: p for p in calculate_predictions()}
    alerts = []

    for item in items:
        name = item["name"]
        stock = item["current_stock"]
        threshold = item["reorder_threshold"]
        predicted = preds[name]["predicted_demand"]

        if stock <= threshold:
            alerts.append({
                "item": name,
                "level": "critical",
                "message": f"{name} is at or below reorder threshold ({stock} left, threshold {threshold})",
            })
        elif predicted > stock:
            gap = predicted - stock
            if gap > stock * 0.5:
                alerts.append({
                    "item": name,
                    "level": "warning",
                    "message": f"{name} likely to stock out — predicted demand {predicted} vs {stock} in stock",
                })
            else:
                alerts.append({
                    "item": name,
                    "level": "info",
                    "message": f"{name} may run low — demand {predicted} is close to stock {stock}",
                })

    return alerts


def simulate(item_name, restock_qty):
    item = get_item(item_name)
    if not item:
        return None

    base = item["base_weekly_demand"]
    total_factor = _get_factors(item_name)
    predicted_demand = round(base * (1 + total_factor))
    price = item["price"]

    current_stock = item["current_stock"]
    new_stock = current_stock + restock_qty
    surplus = new_stock - predicted_demand

    # Stockout risk
    if new_stock <= 0:
        stockout_risk = "critical"
        stockout_pct = 100
    elif new_stock < predicted_demand * 0.5:
        stockout_risk = "high"
        stockout_pct = round((1 - new_stock / predicted_demand) * 100)
    elif new_stock < predicted_demand:
        stockout_risk = "medium"
        stockout_pct = round((1 - new_stock / predicted_demand) * 100)
    else:
        stockout_risk = "low"
        stockout_pct = 0

    # Waste risk
    if surplus > predicted_demand * 0.5:
        waste_risk = "high"
    elif surplus > 0:
        waste_risk = "low"
    else:
        waste_risk = "none"

    # Revenue impact
    units_sold_now = min(current_stock, predicted_demand)
    units_sold_new = min(new_stock, predicted_demand)
    additional_sales = units_sold_new - units_sold_now
    revenue_gain = round(additional_sales * price, 2)

    lost_units = max(0, predicted_demand - new_stock)
    lost_revenue = round(lost_units * price, 2)

    return {
        "item": item_name,
        "current_stock": current_stock,
        "restock_qty": restock_qty,
        "new_stock": new_stock,
        "predicted_demand": predicted_demand,
        "price": price,
        "stockout_risk": stockout_risk,
        "stockout_pct": stockout_pct,
        "waste_risk": waste_risk,
        "surplus": max(0, surplus),
        "revenue_gain": revenue_gain,
        "lost_revenue": lost_revenue,
    }


def build_explanation_summary():
    factors = get_market_factors()
    preds = calculate_predictions()
    top_movers = sorted(preds, key=lambda p: abs(p["demand_change_pct"]), reverse=True)[:3]

    return {
        "weather": factors["weather"]["condition"],
        "gas_trend": factors["gas_price"]["trend"],
        "traffic": factors["traffic"]["level"],
        "season": factors["trend"]["season"],
        "top_movers": [
            {"item": m["item"], "change": m["demand_change_pct"], "rec": m["recommendation"]}
            for m in top_movers
        ],
    }


def generate_explanation(summary):
    """Mock explanation — will be replaced with Lava API later."""
    movers = summary["top_movers"]
    mover_lines = ", ".join(
        f"{m['item']} ({'+' if m['change'] > 0 else ''}{m['change']}%)"
        for m in movers
    )

    return (
        f"Current conditions: weather is {summary['weather']}, "
        f"gas prices are {summary['gas_trend']}, "
        f"foot traffic is {summary['traffic']}, "
        f"and we're in {summary['season'].replace('_', ' ')}.\n\n"
        f"Top movers: {mover_lines}.\n\n"
        f"Hot weather is driving demand for cold beverages and ice. "
        f"Rising gas prices mean more fuel stops, which increases impulse purchases. "
        f"High foot traffic amplifies all categories. "
        f"Summer seasonal trends favor cold drinks over hot beverages like coffee."
    )
