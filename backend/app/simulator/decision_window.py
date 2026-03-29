from app.schemas import DecisionWindowPoint, SimulationAdjustments
from app.scoring import score_crops_for_delay
from app.types import NormalizedContext


def compute_decision_window_for_context(
    context: NormalizedContext,
    adjustments: SimulationAdjustments,
) -> list[DecisionWindowPoint]:
    points: list[DecisionWindowPoint] = []
    for day in range(0, 8):
        crop_scores, _, raw_risks = score_crops_for_delay(context, day, adjustments)
        top_crop = max(crop_scores, key=lambda crop: crop_scores[crop])
        points.append(
            DecisionWindowPoint(
                day=day,
                label="Now"
                if day == 0
                else f"{day} day"
                if day == 1
                else f"{day} days",
                score=crop_scores[top_crop],
                risk=_risk_level(raw_risks[top_crop]),
                crop=top_crop,
            )
        )
    return points


def _risk_level(raw_risk: int) -> str:
    if raw_risk <= 5:
        return "low"
    if raw_risk <= 8:
        return "medium"
    if raw_risk <= 11:
        return "medium-high"
    return "high"
