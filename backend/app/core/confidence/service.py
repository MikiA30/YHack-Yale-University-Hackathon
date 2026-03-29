from app.core.scenario.ranking import rank_scored_items
from app.schemas import ConfidenceBreakdown, CropName, Scenario, ScenarioScores
from app.types import DataQuality


def compute_confidence_breakdown(
    data_quality: DataQuality,
    best_scenario: Scenario,
    crop_scores: dict[CropName, int],
    scenario_gap: int,
) -> ConfidenceBreakdown:
    scenario_scores = require_scenario_scores(best_scenario)
    weather_penalty = 0.08 if data_quality["weather"] != "live" else 0.0
    soil_penalty = 0.08 if data_quality["soil"] != "live" else 0.0
    market_penalty = 0.08 if data_quality["market"] != "live" else 0.0
    regional_penalty = 0.07 if data_quality["ag_context"] != "live" else 0.0
    timing_penalty = 0.05 if data_quality["weather"] != "live" else 0.0
    ranked = rank_scored_items(crop_scores)
    crop_gap = crop_scores[ranked[0]] - crop_scores[ranked[1]]

    return ConfidenceBreakdown(
        weather=round(_bounded_ratio(scenario_scores.weather, 7, 22) - weather_penalty, 2),
        soil=round(_bounded_ratio(scenario_scores.soil, 7, 20) - soil_penalty, 2),
        market=round(_bounded_ratio(scenario_scores.market, 7, 20) - market_penalty, 2),
        regional_fit=round(
            _bounded_ratio(scenario_scores.regional_fit, 6, 14) - regional_penalty,
            2,
        ),
        timing=round(
            min(
                0.96,
                _bounded_ratio(scenario_scores.timing, 5, 22)
                + min(scenario_gap, 12) / 100
                + min(crop_gap, 10) / 120,
            )
            - timing_penalty,
            2,
        ),
    )


def compute_overall_confidence(
    *,
    confidence_breakdown: ConfidenceBreakdown,
    crop_scores: dict[CropName, int],
    scenario_gap: int,
) -> int:
    values = list(confidence_breakdown.model_dump().values())
    ranked = rank_scored_items(crop_scores)
    crop_gap = crop_scores[ranked[0]] - crop_scores[ranked[1]]
    alignment = sum(values) / len(values)
    spread_penalty = max(values) - min(values)
    confidence = (
        28
        + alignment * 46
        + scenario_gap * 1.4
        + min(crop_gap, 10) * 1.1
        - spread_penalty * 18
    )
    return _clamp(confidence, 50, 91)


def confidence_label(confidence: int) -> str:
    if confidence >= 76:
        return "high"
    if confidence >= 60:
        return "moderate"
    return "low"


def require_scenario_scores(scenario: Scenario) -> ScenarioScores:
    if scenario.scores is None:
        raise ValueError("Scenario scores are required for confidence scoring")
    return scenario.scores


def _bounded_ratio(value: int, minimum: int, maximum: int) -> float:
    return max(0.35, min(0.96, (value - minimum) / max(maximum - minimum, 1)))


def _clamp(value: float, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, int(round(value))))
