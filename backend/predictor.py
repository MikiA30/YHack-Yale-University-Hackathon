"""Prediction engine — all math lives here, no AI involved."""

from data import get_items, get_market_factors


def calculate_predictions():
    items = get_items()
    factors = get_market_factors()
    predictions = []

    for item in items:
        name = item["name"]
        base = item["base_weekly_demand"]

        weather = factors["weather"]["impacts"][name]
        gas = factors["gas_price"]["impacts"][name]
        traffic = factors["traffic"]["impacts"][name]
        trend = factors["trend"]["impacts"][name]

        total_factor = weather + gas + traffic + trend
        predicted_demand = round(base * (1 + total_factor))
        demand_change_pct = round(total_factor * 100, 1)

        # Confidence: stronger combined signal → higher probability, clamped 50–95
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
            "predicted_demand": p["predicted_demand"],
            "demand_change_pct": p["demand_change_pct"],
            "recommended_change": p["predicted_demand"] - item["current_stock"],
            "recommendation": p["recommendation"],
        })
    return rows


def build_explanation_summary():
    """Build a small summary payload for the explanation endpoint.
    This keeps AI away from raw inventory data."""
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
    """Mock explanation generator — will be replaced with Lava API later.

    Takes a small summary dict, NOT full inventory data.
    """
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
