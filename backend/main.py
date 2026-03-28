"""A.U.R.A. — Adaptive Uncertainty & Risk Agent API"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from data import get_item, update_stock, add_notification, get_notifications, dismiss_notification
from predictor import (
    calculate_predictions, get_inventory_view, get_alerts,
    simulate, build_explanation_summary, generate_explanation,
)
from schemas import (
    PredictionResponse, InventoryResponse, ExplanationResponse,
    AlertsResponse, SimulateRequest, SimulateResponse,
    UpdateRequest, UpdateResponse,
    ScanNotification, NotificationsResponse, DismissRequest,
)

app = FastAPI(title="A.U.R.A.", description="Adaptive Uncertainty & Risk Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/predict", response_model=PredictionResponse)
def predict():
    return {"predictions": calculate_predictions()}


@app.get("/inventory", response_model=InventoryResponse)
def inventory():
    return {"inventory": get_inventory_view()}


@app.get("/explain", response_model=ExplanationResponse)
def explain():
    summary = build_explanation_summary()
    return {"explanation": generate_explanation(summary)}


@app.get("/alerts", response_model=AlertsResponse)
def alerts():
    return {"alerts": get_alerts()}


@app.post("/simulate", response_model=SimulateResponse)
def simulate_endpoint(req: SimulateRequest):
    result = simulate(req.item, req.restock_qty)
    if not result:
        raise HTTPException(status_code=404, detail=f"Item '{req.item}' not found")
    return result


@app.post("/update_inventory", response_model=UpdateResponse)
def update_inventory(req: UpdateRequest):
    item = get_item(req.item)
    if not item:
        raise HTTPException(status_code=404, detail=f"Item '{req.item}' not found")

    previous = item["current_stock"]

    if req.action == "sold":
        new_stock = previous - req.amount
    elif req.action == "restock":
        new_stock = previous + req.amount
    elif req.action == "correct":
        new_stock = req.amount
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action '{req.action}'")

    update_stock(req.item, new_stock)

    return {
        "item": req.item,
        "current_stock": max(0, new_stock),
        "previous_stock": previous,
    }


@app.post("/notify_scan")
def notify_scan(notif: ScanNotification):
    result = add_notification(notif.barcode, notif.product_name, notif.brands)
    return result


@app.get("/notifications", response_model=NotificationsResponse)
def notifications():
    return {"notifications": get_notifications()}


@app.post("/dismiss_notification")
def dismiss(req: DismissRequest):
    result = dismiss_notification(req.id)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return result
