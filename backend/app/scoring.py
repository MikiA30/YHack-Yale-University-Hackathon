from datetime import datetime
from typing import Any

from app.core.confidence.service import (
    compute_confidence_breakdown,
    compute_overall_confidence,
    confidence_label as compute_confidence_label,
)
from app.core.scenario.ranking import annotate_scenario_deltas, rank_scored_items

from app.schemas import (
    Charts,
    ConfidenceBreakdown,
    CropName,
    FieldReadiness,
    PricePoint,
    Scenario,
    ScenarioScores,
    SignalCard,
    Signals,
    SimulationAdjustments,
    SoilMoisture,
    WeatherPoint,
)
from app.types import (
    AgContextData,
    DataQuality,
    FarmData,
    MarketData,
    NormalizedContext,
    SoilData,
    WeatherDailyPoint,
    WeatherData,
)

BASE_CROP_SCORES = {"Corn": 12, "Soybeans": 11, "Wheat": 10}
SOIL_MOISTURE_EFFECTS = {
    "Low": {"Corn": -3, "Soybeans": -1, "Wheat": 2},
    "Medium": {"Corn": 3, "Soybeans": 2, "Wheat": 1},
    "High": {"Corn": -4, "Soybeans": 4, "Wheat": 1},
}
FIELD_READINESS_EFFECTS = {
    "Not Ready": {"now": -8, "wait_3": 5, "wait_7": 7},
    "Nearly Ready": {"now": -1, "wait_3": 3, "wait_7": 1},
    "Ready": {"now": 6, "wait_3": -2, "wait_7": -6},
}
RISK_TOLERANCE_PROFILES = {
    "conservative": {"risk_multiplier": 1.25, "wait_bias": 2, "delay_decay": 0.45},
    "balanced": {"risk_multiplier": 1.0, "wait_bias": 0, "delay_decay": 0.7},
    "aggressive": {"risk_multiplier": 0.82, "wait_bias": -1, "delay_decay": 1.0},
}
MARKET_OUTLOOK_EFFECTS = {
    "bearish": {"Up": -4, "Flat": -3, "Soft": -2},
    "neutral": {"Up": 0, "Flat": 0, "Soft": 0},
    "bullish": {"Up": 4, "Flat": 3, "Soft": 2},
}
PREFERENCE_BONUS = {
    "None": {"Corn": 0, "Soybeans": 0, "Wheat": 0},
    "Favor Corn": {"Corn": 4, "Soybeans": 0, "Wheat": 0},
    "Favor Soybeans": {"Corn": 0, "Soybeans": 4, "Wheat": 0},
    "Favor Wheat": {"Corn": 0, "Soybeans": 0, "Wheat": 4},
}
CROP_TEMPERATURE_WINDOWS = {
    "Corn": (58, 79),
    "Soybeans": (54, 76),
    "Wheat": (48, 68),
}


def build_decision_snapshot(
    context: NormalizedContext,
    adjustments: SimulationAdjustments | dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_adjustments = _normalize_adjustments(adjustments)
    selected_delay = normalized_adjustments["delay_days"]
    crop_scores, crop_breakdowns, crop_raw_risks = score_crops_for_delay(
        context, selected_delay, normalized_adjustments
    )
    ordered_crops = _ranked_crops(crop_scores)
    scenarios, scenario_raw_risks = _build_scenarios(context, normalized_adjustments)
    best_scenario = scenarios[0]
    second_scenario = scenarios[1] if len(scenarios) > 1 else scenarios[0]
    confidence_breakdown = _confidence_breakdown(
        context["data_quality"],
        best_scenario,
        crop_scores,
        scenario_gap=best_scenario.score - second_scenario.score,
    )
    confidence = _overall_confidence(
        confidence_breakdown=confidence_breakdown,
        crop_scores=crop_scores,
        scenario_gap=best_scenario.score - second_scenario.score,
    )

    return {
        "adjustments": normalized_adjustments,
        "crop_scores": crop_scores,
        "crop_breakdowns": crop_breakdowns,
        "crop_raw_risks": crop_raw_risks,
        "ordered_crops": ordered_crops,
        "scenarios": scenarios,
        "scenario_raw_risks": scenario_raw_risks,
        "best_scenario": best_scenario,
        "second_scenario": second_scenario,
        "confidence": confidence,
        "confidence_label": _confidence_label(confidence),
        "confidence_breakdown": confidence_breakdown,
        "signals": _build_signals(
            context=context,
            best_scenario=best_scenario,
            crop_scores=crop_scores,
            raw_risk=scenario_raw_risks[best_scenario.label],
            adjustments=normalized_adjustments,
        ),
        "charts": _build_charts(context["weather"], context["market"]),
    }


def score_crops_for_delay(
    context: NormalizedContext,
    delay_days: int,
    adjustments: SimulationAdjustments | dict[str, Any] | None = None,
) -> tuple[dict[CropName, int], dict[CropName, ScenarioScores], dict[CropName, int]]:
    normalized_adjustments = _normalize_adjustments(adjustments)
    crop_scores: dict[CropName, int] = {}
    crop_breakdowns: dict[CropName, ScenarioScores] = {}
    crop_raw_risks: dict[CropName, int] = {}

    for crop in context["farm"]["crop_options"]:
        total, breakdown, raw_risk = _score_crop_option(
            crop=crop,
            context=context,
            delay_days=delay_days,
            adjustments=normalized_adjustments,
        )
        crop_scores[crop] = total
        crop_breakdowns[crop] = breakdown
        crop_raw_risks[crop] = raw_risk

    return crop_scores, crop_breakdowns, crop_raw_risks


def build_weather_chart_points(weather: WeatherData) -> list[WeatherPoint]:
    return [
        WeatherPoint(
            day=_day_label(point["date"]),
            temp=round((point["temp_max"] + point["temp_min"]) / 2, 1),
            rain=point["precip_probability"],
        )
        for point in weather["daily"]
    ]


def build_price_chart_points(market: MarketData) -> list[PricePoint]:
    return [PricePoint(**point) for point in market["price_trend"]]


def _build_scenarios(
    context: NormalizedContext,
    adjustments: dict[str, Any],
) -> tuple[list[Scenario], dict[str, int]]:
    scenarios_by_label: dict[str, Scenario] = {}
    raw_risks: dict[str, int] = {}
    candidate_delays = _candidate_delays(adjustments["delay_days"])

    now_scores, now_breakdowns, now_raw_risks = score_crops_for_delay(
        context, 0, adjustments
    )
    ranked_now = _ranked_crops(now_scores)
    for crop in ranked_now[: min(2, len(ranked_now))]:
        label = f"Plant {crop.lower()} now"
        scenarios_by_label[label] = Scenario(
            label=label,
            score=now_scores[crop],
            risk_level=_scenario_risk(now_raw_risks[crop]),
            summary=_scenario_summary(
                crop=crop,
                delay_days=0,
                breakdown=now_breakdowns[crop],
                raw_risk=now_raw_risks[crop],
            ),
            crop=crop,
            delay_days=0,
            scores=now_breakdowns[crop],
        )
        raw_risks[label] = now_raw_risks[crop]

    for delay_days in candidate_delays:
        if delay_days == 0:
            continue
        scores, breakdowns, day_raw_risks = score_crops_for_delay(
            context, delay_days, adjustments
        )
        crop = _ranked_crops(scores)[0]
        label = _delay_label(delay_days, crop)
        scenarios_by_label[label] = Scenario(
            label=label,
            score=scores[crop],
            risk_level=_scenario_risk(day_raw_risks[crop]),
            summary=_scenario_summary(
                crop=crop,
                delay_days=delay_days,
                breakdown=breakdowns[crop],
                raw_risk=day_raw_risks[crop],
            ),
            crop=crop,
            delay_days=delay_days,
            scores=breakdowns[crop],
        )
        raw_risks[label] = day_raw_risks[crop]

    scenarios = annotate_scenario_deltas(list(scenarios_by_label.values()))
    return scenarios, raw_risks


def _score_crop_option(
    *,
    crop: CropName,
    context: NormalizedContext,
    delay_days: int,
    adjustments: dict[str, Any],
) -> tuple[int, ScenarioScores, int]:
    farm = context["farm"]
    weather = context["weather"]
    soil = context["soil"]
    market = context["market"]
    ag_context = context["ag_context"]
    profile = RISK_TOLERANCE_PROFILES[adjustments["risk_tolerance"]]
    day_point = _weather_day_point(weather, delay_days)
    current_point = _weather_day_point(weather, 0)
    temp_avg = (day_point["temp_max"] + day_point["temp_min"]) / 2
    rainfall_drop = (
        current_point["precip_probability"] - day_point["precip_probability"]
    )

    weather_component = _clamp(
        BASE_CROP_SCORES[crop]
        + _temperature_fit_bonus(crop, temp_avg)
        + max(0, 5 - round(day_point["precip_probability"] / 14))
        + round(max(rainfall_drop, 0) / 16)
        - max(0, round((day_point["wind_speed_max"] - 18) / 5)),
        7,
        22,
    )
    soil_component = _clamp(
        11
        + round((soil["summary"]["soil_suitability_score"] - 65) * 0.16)
        + SOIL_MOISTURE_EFFECTS[farm["soil_moisture"]][crop]
        - _drainage_penalty(soil, crop),
        7,
        20,
    )
    market_signal_score = (
        market["crop_signals"][crop]["score"]
        + MARKET_OUTLOOK_EFFECTS[adjustments["market_outlook"]][
            market["crop_signals"][crop]["trend"]
        ]
    )
    market_component = _clamp(
        10 + round((market_signal_score - 65) * 0.2),
        7,
        20,
    )
    regional_fit = _clamp(
        8
        + (4 if ag_context["crop_context"][crop]["common_in_region"] else 0)
        + (1 if ag_context["crop_context"][crop].get("latest_yield") else 0)
        + (1 if ag_context["crop_context"][crop].get("latest_acreage") else 0),
        6,
        14,
    )
    timing_component = _clamp(
        12
        + _readiness_timing_adjustment(farm["field_readiness"], delay_days)
        + round(rainfall_drop / 14)
        + profile["wait_bias"]
        - round(delay_days * profile["delay_decay"]),
        5,
        22,
    )
    raw_risk = _raw_risk_points(
        farm=farm,
        weather=weather,
        soil=soil,
        day_point=day_point,
        delay_days=delay_days,
    )
    risk_penalty = -_clamp(round(raw_risk * profile["risk_multiplier"]), 2, 18)
    preference_bonus = PREFERENCE_BONUS[adjustments["crop_preference"]][crop]
    total = _clamp(
        weather_component
        + soil_component
        + market_component
        + regional_fit
        + timing_component
        + risk_penalty
        + preference_bonus,
        42,
        95,
    )

    return (
        total,
        ScenarioScores(
            weather=weather_component,
            soil=soil_component,
            market=market_component,
            regional_fit=regional_fit,
            timing=timing_component,
            risk_penalty=risk_penalty,
            preference_bonus=preference_bonus,
        ),
        raw_risk,
    )


def _build_signals(
    *,
    context: NormalizedContext,
    best_scenario: Scenario,
    crop_scores: dict[CropName, int],
    raw_risk: int,
    adjustments: dict[str, Any],
) -> Signals:
    scenario_scores = _require_scenario_scores(best_scenario)
    market_scores = [
        context["market"]["crop_signals"][crop]["score"]
        for crop in context["farm"]["crop_options"]
    ]
    local_score = _clamp(
        round(
            (scenario_scores.weather + scenario_scores.soil + scenario_scores.timing)
            / 0.62
        ),
        45,
        92,
    )
    market_score = _clamp(
        round(sum(market_scores) / max(len(market_scores), 1))
        + MARKET_OUTLOOK_EFFECTS[adjustments["market_outlook"]]["Flat"],
        55,
        90,
    )
    risk_score = _clamp(22 + raw_risk * 4, 24, 84)

    return Signals(
        local=SignalCard(
            label="Local Conditions",
            status=_local_status(local_score),
            score=local_score,
            summary=_local_signal_summary(
                context["weather"], context["soil"], best_scenario.delay_days
            ),
        ),
        market=SignalCard(
            label="Market Conditions",
            status=context["market"]["market_status"],
            score=market_score,
            summary=_market_signal_summary(context["market"], crop_scores),
        ),
        risk=SignalCard(
            label="Risk Level",
            status=_risk_status(risk_score),
            score=risk_score,
            summary=_risk_signal_summary(
                weather=context["weather"],
                soil=context["soil"],
                acreage=context["farm"]["acreage"],
                delay_days=best_scenario.delay_days,
            ),
        ),
    )


def _build_charts(weather: WeatherData, market: MarketData) -> Charts:
    return Charts(
        price_trend=build_price_chart_points(market),
        weather_forecast=build_weather_chart_points(weather),
    )


def _confidence_breakdown(
    data_quality: DataQuality,
    best_scenario: Scenario,
    crop_scores: dict[CropName, int],
    scenario_gap: int,
) -> ConfidenceBreakdown:
    return compute_confidence_breakdown(
        data_quality=data_quality,
        best_scenario=best_scenario,
        crop_scores=crop_scores,
        scenario_gap=scenario_gap,
    )


def _overall_confidence(
    *,
    confidence_breakdown: ConfidenceBreakdown,
    crop_scores: dict[CropName, int],
    scenario_gap: int,
) -> int:
    return compute_overall_confidence(
        confidence_breakdown=confidence_breakdown,
        crop_scores=crop_scores,
        scenario_gap=scenario_gap,
    )


def _confidence_label(confidence: int) -> str:
    return compute_confidence_label(confidence)


def _market_signal_summary(market: MarketData, crop_scores: dict[CropName, int]) -> str:
    ranked = _ranked_crops(crop_scores)
    leader = ranked[0]
    runner_up = ranked[1]
    gap = crop_scores[leader] - crop_scores[runner_up]
    return f"{leader} keeps the strongest market-weighted setup, leading {runner_up.lower()} by {gap} scoring points in the current crop set."


def _local_status(score: int) -> str:
    if score >= 80:
        return "Favorable"
    if score >= 68:
        return "Balanced"
    return "Mixed"


def _local_signal_summary(
    weather: WeatherData,
    soil: SoilData,
    delay_days: int,
) -> str:
    rain_phrase = (
        "Near-term rain remains the main operating constraint."
        if weather["flags"]["rain_risk_in_next_3_days"]
        else "The near-term weather window remains workable."
    )
    delay_phrase = (
        " The timing profile improves with a short wait."
        if delay_days >= 2
        else " Immediate field access still scores well."
    )
    return (
        f"{rain_phrase} Soil suitability is {soil['summary']['soil_suitability_score']} with "
        f"{soil['summary']['texture_class_proxy'].lower()} texture characteristics.{delay_phrase}"
    )


def _risk_status(score: int) -> str:
    if score <= 40:
        return "Low"
    if score <= 58:
        return "Moderate"
    return "Elevated"


def _risk_signal_summary(
    *,
    weather: WeatherData,
    soil: SoilData,
    acreage: int,
    delay_days: int,
) -> str:
    acreage_phrase = (
        "Larger acreage still raises execution risk if the window slips."
        if acreage >= 250
        else "Operational scale remains manageable."
    )
    timing_phrase = (
        " Waiting longer adds some timing drift."
        if delay_days >= 5
        else " Timing flexibility is still acceptable."
    )
    return (
        f"Drainage reads {soil['summary']['drainage_risk_proxy'].lower()} risk and near-term rain "
        f"{'is' if weather['flags']['rain_risk_in_next_3_days'] else 'is not'} the main constraint. "
        f"{acreage_phrase}{timing_phrase}"
    )


def _raw_risk_points(
    *,
    farm: FarmData,
    weather: WeatherData,
    soil: SoilData,
    day_point: WeatherDailyPoint,
    delay_days: int,
) -> int:
    risk = 1
    precip_probability = day_point["precip_probability"]
    if precip_probability >= 55:
        risk += 6
    elif precip_probability >= 40:
        risk += 4
    elif precip_probability >= 25:
        risk += 2
    if day_point["precipitation_sum"] >= 0.5:
        risk += 2
    if weather["flags"]["severe_weather_risk_proxy"] and delay_days <= 2:
        risk += 4
    risk += {"Low": 1, "Moderate": 3, "High": 5}[soil["summary"]["drainage_risk_proxy"]]
    readiness_risk = {"Not Ready": 5, "Nearly Ready": 2, "Ready": 0}[
        farm["field_readiness"]
    ]
    if delay_days:
        readiness_risk = max(0, readiness_risk - min(delay_days, 3))
    risk += readiness_risk
    if farm["acreage"] >= 250:
        risk += 3
    elif farm["acreage"] >= 150:
        risk += 1
    if delay_days >= 5:
        risk += 1
    return risk


def _scenario_summary(
    *,
    crop: CropName,
    delay_days: int,
    breakdown: ScenarioScores,
    raw_risk: int,
) -> str:
    dominant_factor = max(
        {
            "weather support": breakdown.weather,
            "soil support": breakdown.soil,
            "market support": breakdown.market,
            "timing support": breakdown.timing,
        }.items(),
        key=lambda item: item[1],
    )[0]
    risk_phrase = (
        "risk stays controlled."
        if raw_risk <= 5
        else "risk remains manageable."
        if raw_risk <= 8
        else "risk starts to build."
    )
    if delay_days == 0:
        return f"Immediate action leans on {dominant_factor}, and {risk_phrase}"
    return f"A {delay_days}-day delay improves the timing setup through {dominant_factor}, while {risk_phrase}"


def _temperature_fit_bonus(crop: CropName, temp_avg: float) -> int:
    minimum, maximum = CROP_TEMPERATURE_WINDOWS[crop]
    if minimum <= temp_avg <= maximum:
        return 5
    if minimum - 5 <= temp_avg <= maximum + 5:
        return 2
    return -2


def _drainage_penalty(soil: SoilData, crop: CropName) -> int:
    risk = soil["summary"]["drainage_risk_proxy"]
    penalty = {"Low": 0, "Moderate": 1, "High": 3}[risk]
    if crop == "Corn" and risk == "High":
        penalty += 1
    return penalty


def _readiness_timing_adjustment(
    field_readiness: FieldReadiness,
    delay_days: int,
) -> int:
    if delay_days <= 3:
        return round(
            _interpolate(
                FIELD_READINESS_EFFECTS[field_readiness]["now"],
                FIELD_READINESS_EFFECTS[field_readiness]["wait_3"],
                delay_days / 3 if delay_days else 0,
            )
        )
    return round(
        _interpolate(
            FIELD_READINESS_EFFECTS[field_readiness]["wait_3"],
            FIELD_READINESS_EFFECTS[field_readiness]["wait_7"],
            (delay_days - 3) / 4,
        )
    )


def _normalize_adjustments(
    adjustments: SimulationAdjustments | dict[str, Any] | None,
) -> dict[str, Any]:
    if adjustments is None:
        return SimulationAdjustments().model_dump()
    if isinstance(adjustments, SimulationAdjustments):
        return adjustments.model_dump()
    merged = SimulationAdjustments().model_dump()
    merged.update(adjustments)
    return merged


def _candidate_delays(selected_delay: int) -> list[int]:
    delays = [0]
    for value in (selected_delay, 3, 7):
        if value not in delays:
            delays.append(value)
    return delays


def _weather_day_point(weather: WeatherData, delay_days: int) -> WeatherDailyPoint:
    index = min(delay_days, len(weather["daily"]) - 1)
    return weather["daily"][index]


def _require_scenario_scores(scenario: Scenario) -> ScenarioScores:
    if scenario.scores is None:
        raise ValueError("Scenario scores are required for Phase 2 decision analysis")
    return scenario.scores


def _ranked_crops(crop_scores: dict[CropName, int]) -> list[CropName]:
    return rank_scored_items(crop_scores)


def _scenario_risk(raw_risk: int) -> str:
    if raw_risk <= 5:
        return "Low"
    if raw_risk <= 8:
        return "Medium"
    if raw_risk <= 12:
        return "Medium-High"
    return "High"


def _delay_label(delay_days: int, crop: CropName) -> str:
    unit = "day" if delay_days == 1 else "days"
    return f"Wait {delay_days} {unit}, then plant {crop.lower()}"


def _day_label(date_value: str) -> str:
    try:
        return datetime.fromisoformat(date_value).strftime("%a")
    except ValueError:
        return date_value


def _bounded_ratio(value: int, minimum: int, maximum: int) -> float:
    return max(0.35, min(0.96, (value - minimum) / max(maximum - minimum, 1)))


def _interpolate(start: float, end: float, ratio: float) -> float:
    bounded_ratio = max(0.0, min(1.0, ratio))
    return start + (end - start) * bounded_ratio


def _clamp(value: float, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, int(round(value))))
