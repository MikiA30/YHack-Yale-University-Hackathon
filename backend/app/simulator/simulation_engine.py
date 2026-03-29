from copy import deepcopy
from typing import Any, cast

from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    DataSources,
    ResolvedLocation,
    SimulationAdjustments,
    SimulationMetadata,
    SimulationResponse,
)
from app.scoring import build_decision_snapshot
from app.simulator.context_builder import build_simulation_context, coerce_base_context
from app.simulator.decision_window import compute_decision_window_for_context
from app.simulator.explanation import (
    build_key_risks,
    build_recommendation_copy,
    build_top_reasons,
)
from app.simulator.sensitivity import generate_recommendation_flip_conditions
from app.types import NormalizedContext


def build_analysis_response(context: NormalizedContext) -> AnalysisResponse:
    adjustments = SimulationAdjustments()
    snapshot = build_decision_snapshot(context, adjustments)
    decision_window = compute_decision_window_for_context(context, adjustments)
    recommendation = build_recommendation_copy(context, snapshot, decision_window)
    return AnalysisResponse(
        resolved_location=_resolved_location(context),
        data_sources=DataSources(**context["data_quality"]),
        recommendation=recommendation,
        confidence=snapshot["confidence"],
        confidence_label=snapshot["confidence_label"],
        confidence_breakdown=snapshot["confidence_breakdown"],
        signals=snapshot["signals"],
        top_reasons=build_top_reasons(context, snapshot, decision_window),
        key_risks=build_key_risks(context, snapshot),
        scenarios=snapshot["scenarios"],
        decision_window=decision_window,
        what_would_change=generate_recommendation_flip_conditions(
            context,
            recommendation,
            snapshot["scenarios"],
            adjustments,
        ),
        charts=snapshot["charts"],
        base_context=cast(dict[str, Any], deepcopy(context)),
    )


def simulate_decision(
    base_context: dict[str, Any] | NormalizedContext,
    adjustments: SimulationAdjustments | dict[str, Any],
    user_inputs: AnalysisRequest,
) -> SimulationResponse:
    normalized_adjustments = (
        adjustments
        if isinstance(adjustments, SimulationAdjustments)
        else SimulationAdjustments.model_validate(adjustments)
    )
    canonical_base_context = coerce_base_context(base_context)
    simulated_context = build_simulation_context(
        canonical_base_context,
        normalized_adjustments,
        user_inputs,
    )
    snapshot = build_decision_snapshot(simulated_context, normalized_adjustments)
    decision_window = compute_decision_window_for_context(
        simulated_context,
        normalized_adjustments,
    )
    recommendation = build_recommendation_copy(
        simulated_context,
        snapshot,
        decision_window,
    )
    return SimulationResponse(
        resolved_location=_resolved_location(simulated_context),
        data_sources=DataSources(**simulated_context["data_quality"]),
        recommendation=recommendation,
        confidence=snapshot["confidence"],
        confidence_label=snapshot["confidence_label"],
        confidence_breakdown=snapshot["confidence_breakdown"],
        signals=snapshot["signals"],
        top_reasons=build_top_reasons(simulated_context, snapshot, decision_window),
        key_risks=build_key_risks(simulated_context, snapshot),
        scenarios=snapshot["scenarios"],
        decision_window=decision_window,
        what_would_change=generate_recommendation_flip_conditions(
            simulated_context,
            recommendation,
            snapshot["scenarios"],
            normalized_adjustments,
        ),
        charts=snapshot["charts"],
        base_context=cast(dict[str, Any], deepcopy(canonical_base_context)),
        simulation_metadata=SimulationMetadata(
            delay_days=normalized_adjustments.delay_days,
            rain_adjustment_pct=normalized_adjustments.rain_adjustment_pct,
            risk_tolerance=normalized_adjustments.risk_tolerance,
            market_outlook=normalized_adjustments.market_outlook,
            field_readiness_override=normalized_adjustments.field_readiness_override,
            crop_preference=normalized_adjustments.crop_preference,
        ),
    )


def _resolved_location(context: NormalizedContext) -> ResolvedLocation:
    location = context["location"]
    return ResolvedLocation(
        display_name=location["resolved_name"],
        latitude=location["latitude"],
        longitude=location["longitude"],
        state=location.get("state"),
        country=location.get("country"),
        timezone=location.get("timezone"),
    )
