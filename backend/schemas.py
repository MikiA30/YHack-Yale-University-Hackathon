"""Pydantic response schemas."""

from pydantic import BaseModel


class PredictionCard(BaseModel):
    item: str
    demand_change_pct: float
    probability: float
    predicted_demand: int
    recommendation: str


class InventoryRow(BaseModel):
    item: str
    current_stock: int
    unit_cost: float
    predicted_demand: int
    demand_change_pct: float
    recommended_change: int
    recommendation: str


class PredictionResponse(BaseModel):
    predictions: list[PredictionCard]


class InventoryResponse(BaseModel):
    inventory: list[InventoryRow]


class ExplanationResponse(BaseModel):
    explanation: str
