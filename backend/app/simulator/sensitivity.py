from collections.abc import Callable
from copy import deepcopy
from typing import TypeAlias

from app.schemas import Recommendation, Scenario, SimulationAdjustments
from app.scoring import build_decision_snapshot
from app.types import NormalizedContext

ProbeMessage: TypeAlias = Callable[[Scenario], str]


def generate_recommendation_flip_conditions(
    base_context: NormalizedContext,
    recommendation: Recommendation,
    scenarios: list[Scenario],
    adjustments: SimulationAdjustments,
) -> list[str]:
    messages: list[str] = []
    probes = _probe_adjustments(base_context, recommendation, adjustments)

    for next_adjustments, message in probes:
        snapshot = build_decision_snapshot(base_context, next_adjustments)
        next_recommendation = snapshot["best_scenario"]
        if (
            next_recommendation.crop != recommendation.crop
            or next_recommendation.delay_days != scenarios[0].delay_days
        ):
            messages.append(message(next_recommendation))

    if (
        not messages
        and len(scenarios) > 1
        and scenarios[0].score - scenarios[1].score <= 6
    ):
        messages.append(
            f"A modest 3 to 5 point move in timing, rain, or market conditions would make {scenarios[1].label.lower()} competitive."
        )

    deduped: list[str] = []
    for item in messages:
        if item not in deduped:
            deduped.append(item)
    return deduped[:3]


def _probe_adjustments(
    context: NormalizedContext,
    recommendation: Recommendation,
    adjustments: SimulationAdjustments,
) -> list[tuple[SimulationAdjustments, ProbeMessage]]:
    del recommendation

    probes: list[tuple[SimulationAdjustments, ProbeMessage]] = []
    if context["farm"]["field_readiness"] != "Ready":
        readiness_probe = deepcopy(adjustments)
        readiness_probe.field_readiness_override = "Ready"
        probes.append(
            (
                readiness_probe,
                lambda scenario: (
                    f"If field readiness improves to Ready, {scenario.label.lower()} becomes the preferred path."
                ),
            )
        )

    rain_probe = deepcopy(adjustments)
    rain_probe.rain_adjustment_pct = max(-30, adjustments.rain_adjustment_pct - 15)
    probes.append(
        (
            rain_probe,
            lambda scenario: (
                f"If rainfall risk eases by about 15%, {scenario.label.lower()} moves ahead."
            ),
        )
    )

    if adjustments.market_outlook != "bearish":
        market_probe = deepcopy(adjustments)
        market_probe.market_outlook = "bearish"
        probes.append(
            (
                market_probe,
                lambda scenario: (
                    f"If market sentiment turns bearish, {scenario.label.lower()} becomes the recommended move."
                ),
            )
        )

    next_risk = (
        "conservative" if adjustments.risk_tolerance != "conservative" else "aggressive"
    )
    risk_probe = deepcopy(adjustments)
    risk_probe.risk_tolerance = next_risk
    probes.append(
        (
            risk_probe,
            lambda scenario: (
                f"If you switch to a {next_risk} risk profile, {scenario.label.lower()} becomes the better fit."
            ),
        )
    )

    return probes
