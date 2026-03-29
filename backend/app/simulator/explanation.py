from collections.abc import Mapping
from typing import Any

from app.schemas import (
    CropName,
    DecisionWindowPoint,
    Recommendation,
    Scenario,
    ScenarioScores,
)
from app.types import NormalizedContext


def build_recommendation_copy(
    context: NormalizedContext,
    snapshot: Mapping[str, Any],
    decision_window: list[DecisionWindowPoint],
) -> Recommendation:
    best_scenario = _scenario(snapshot["best_scenario"])
    second_scenario = _scenario(snapshot["second_scenario"])
    best_crop = _scenario_crop(best_scenario)
    scenario_scores = _scenario_scores(best_scenario)
    weather = context["weather"]
    soil = context["soil"]
    ag_context = context["ag_context"]
    best_day = max(decision_window, key=lambda point: point.score)
    lead_gap = best_scenario.score - second_scenario.score
    timing = (
        "Now" if best_scenario.delay_days == 0 else f"{best_scenario.delay_days} days"
    )
    action = (
        f"Plant {best_crop.lower()} now"
        if best_scenario.delay_days == 0
        else f"Wait {best_scenario.delay_days} days, then plant {best_crop.lower()}"
    )
    summary = (
        f"{best_crop} leads this simulation because local operating conditions stay workable, "
        f"the crop profile holds a {lead_gap}-point edge over the next best path, and the near-term window "
        f"fits the current weather and readiness assumptions."
    )
    why_crop = (
        f"{best_crop} benefits from a weather score of {scenario_scores.weather}, a market score of "
        f"{scenario_scores.market}, and "
        f"{'strong' if ag_context['crop_context'][best_crop]['common_in_region'] else 'limited'} regional fit support."
    )
    why_timing = (
        f"The timing score improves most around {best_day.label.lower()} for {best_day.crop.lower()}, "
        f"while current rainfall risk is {'elevated' if weather['flags']['rain_risk_in_next_3_days'] else 'contained'}."
        if best_scenario.delay_days
        else f"Planting now remains viable because field readiness is {context['farm']['field_readiness'].lower()} "
        f"and soil suitability reads {soil['summary']['soil_suitability_score']}."
    )
    operational_note = (
        f"Focus on preserving workability on {context['farm']['acreage']} acres and monitor "
        f"{soil['summary']['drainage_risk_proxy'].lower()} drainage conditions if rain intensifies."
    )
    return Recommendation(
        action=action,
        crop=best_crop,
        timing=timing,
        confidence=int(snapshot["confidence"]),
        summary=summary,
        why_crop=why_crop,
        why_timing=why_timing,
        operational_note=operational_note,
    )


def build_top_reasons(
    context: NormalizedContext,
    snapshot: Mapping[str, Any],
    decision_window: list[DecisionWindowPoint],
) -> list[str]:
    best_scenario = _scenario(snapshot["best_scenario"])
    ordered_crops = snapshot["ordered_crops"]
    crop_scores = snapshot["crop_scores"]
    lead_gap = crop_scores[ordered_crops[0]] - crop_scores[ordered_crops[1]]
    best_day = max(decision_window, key=lambda point: point.score)
    return [
        f"{_scenario_crop(best_scenario)} leads the selected crop set by {lead_gap} points in the current simulation.",
        f"Timing support is strongest around {best_day.label.lower()}, where {best_day.crop.lower()} scores {best_day.score}.",
        f"Soil suitability is {context['soil']['summary']['soil_suitability_score']} with {context['soil']['summary']['drainage_risk_proxy'].lower()} drainage risk.",
    ]


def build_key_risks(
    context: NormalizedContext,
    snapshot: Mapping[str, Any],
) -> list[str]:
    best_scenario = _scenario(snapshot["best_scenario"])
    second_scenario = _scenario(snapshot["second_scenario"])
    risks = [
        "Rain probability in the next few days can still compress field flexibility."
        if context["weather"]["flags"]["rain_risk_in_next_3_days"]
        else "The current weather window is workable, but it can narrow quickly.",
        f"{context['soil']['summary']['drainage_risk_proxy']} drainage risk can reduce workability if precipitation builds.",
        f"The recommended path leads {second_scenario.label.lower()} by {best_scenario.score - second_scenario.score} points, which is solid but not absolute.",
    ]
    if context["farm"]["acreage"] >= 250:
        risks[2] = (
            "Larger acreage increases execution risk if the preferred timing window slips."
        )
    return risks


def _scenario(value: Any) -> Scenario:
    if not isinstance(value, Scenario):
        raise TypeError("Expected Scenario in explanation snapshot")
    return value


def _scenario_crop(scenario: Scenario) -> CropName:
    if scenario.crop is None:
        raise ValueError("Scenario crop is required for explanation generation")
    return scenario.crop


def _scenario_scores(scenario: Scenario) -> ScenarioScores:
    if scenario.scores is None:
        raise ValueError("Scenario scores are required for explanation generation")
    return scenario.scores
