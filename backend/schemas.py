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
    price: float
    aisle: str = ""
    aisle_name: str = ""
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


class Alert(BaseModel):
    item: str
    level: str
    message: str


class AlertsResponse(BaseModel):
    alerts: list[Alert]


class SimulateRequest(BaseModel):
    item: str
    restock_qty: int


class SimulateResponse(BaseModel):
    item: str
    current_stock: int
    restock_qty: int
    new_stock: int
    predicted_demand: int
    price: float
    stockout_risk: str
    stockout_pct: int
    waste_risk: str
    surplus: int
    revenue_gain: float
    profit_gain: float
    lost_revenue: float
    lost_profit: float


class UpdateRequest(BaseModel):
    item: str
    action: str  # "sold", "restock", "correct"
    amount: int


class UpdateResponse(BaseModel):
    item: str
    current_stock: int
    previous_stock: int


class ScanNotification(BaseModel):
    barcode: str
    product_name: str
    brands: str = ""


class NotificationOut(BaseModel):
    id: int
    barcode: str
    product_name: str
    brands: str
    status: str


class NotificationsResponse(BaseModel):
    notifications: list[NotificationOut]


class DismissRequest(BaseModel):
    id: int


class AddProductRequest(BaseModel):
    name: str
    current_stock: int
    base_weekly_demand: int
    unit_cost: float
    price: float
    reorder_threshold: int = 10
    category: str = "general"


class AddProductResponse(BaseModel):
    item: str
    current_stock: int
    factors: dict
    reasoning: str
    factor_source: str


class RemoveProductRequest(BaseModel):
    name: str


class RemoveProductResponse(BaseModel):
    item: str
    removed: bool


class ChatRequest(BaseModel):
    message: str
    model: str | None = None


class ChatResponse(BaseModel):
    response: str
    model: str
    action: str | None = None
    action_data: dict | None = None


class SetLocationRequest(BaseModel):
    zip_code: str


class LocationResponse(BaseModel):
    zip: str
    label: str
    lat: float
    lon: float


class ProductSales(BaseModel):
    item: str
    units_sold: int
    revenue: float
    profit: float
    margin_pct: float


class FinancialsResponse(BaseModel):
    date: str
    total_revenue: float
    total_profit: float
    margin_pct: float
    by_product: list[ProductSales]


class StockoutLoss(BaseModel):
    item: str
    current_stock: int
    predicted_demand: int
    shortfall: int
    lost_revenue: float
    lost_profit: float
    margin_pct: float


class StockoutLossesResponse(BaseModel):
    losses: list[StockoutLoss]
    total_lost_revenue: float
    total_lost_profit: float


class RestockAction(BaseModel):
    item: str
    current_stock: int
    restock_qty: int
    revenue_gain: float
    profit_gain: float
    priority: str


class EodSummaryResponse(BaseModel):
    date: str
    total_revenue: float
    total_profit: float
    margin_pct: float
    best_seller: dict | None
    highest_margin_item: dict | None
    biggest_stockout_risk: dict | None
    total_projected_lost_revenue: float
    total_projected_lost_profit: float
    restock_actions: list[RestockAction]


class ReportSummary(BaseModel):
    total_items: int
    total_alerts: int
    today_revenue: float
    today_profit: float
    today_margin_pct: float
    projected_lost_revenue: float
    projected_lost_profit: float


class ReportResponse(BaseModel):
    generated_at: str
    store: dict
    summary: ReportSummary
    forecast: list
    revenue_data: list
    top_sellers: list
    stockout_risks: list
    recommendations: list
    alerts: list
    live_signals: dict


class LiveSignalDetail(BaseModel):
    score: float
    summary: str


class LiveSignalsResponse(BaseModel):
    weather: dict
    economic: dict
    event: dict
