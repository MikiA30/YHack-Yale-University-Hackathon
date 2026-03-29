from collections.abc import Mapping, Sequence
from typing import TypeVar

from app.schemas import Scenario

T = TypeVar("T")


def rank_scored_items(scores: Mapping[T, int]) -> list[T]:
    return sorted(scores, key=lambda item: scores[item], reverse=True)


def annotate_scenario_deltas(scenarios: Sequence[Scenario]) -> list[Scenario]:
    ranked = sorted(scenarios, key=lambda item: item.score, reverse=True)
    if not ranked:
        raise ValueError("At least one scenario is required")

    best_score = ranked[0].score
    for scenario in ranked:
        scenario.delta_from_best = best_score - scenario.score
    return ranked
