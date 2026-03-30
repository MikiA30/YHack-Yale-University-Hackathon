"""A.U.R.A. — Adaptive Uncertainty & Risk Agent API"""

from ai_profiler import generate_product_profile
from live_factors import get_live_factors, get_store_location, set_store_location, geocode_zip
from report import generate_report
from chatbot import chat as ai_chat
from chatbot import explain_store as ai_explain_store
from finance import record_sale, get_daily_financials, get_stockout_losses, get_eod_summary
from data import (
    add_notification,
    add_product,
    dismiss_notification,
    get_item,
    get_notifications,
    remove_product,
    update_stock,
)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from predictor import (
    build_explanation_summary,
    calculate_predictions,
    generate_explanation,
    get_alerts,
    get_inventory_view,
    simulate,
)
from schemas import (
    AddProductRequest,
    AddProductResponse,
    AlertsResponse,
    ChatRequest,
    ChatResponse,
    DismissRequest,
    EodSummaryResponse,
    ReportResponse,
    ExplanationResponse,
    FinancialsResponse,
    InventoryResponse,
    LiveSignalsResponse,
    LocationResponse,
    NotificationsResponse,
    SetLocationRequest,
    PredictionResponse,
    RemoveProductRequest,
    RemoveProductResponse,
    ScanNotification,
    SimulateRequest,
    SimulateResponse,
    StockoutLossesResponse,
    UpdateRequest,
    UpdateResponse,
)

app = FastAPI(title="A.U.R.A.", description="Adaptive Uncertainty & Risk Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/report", response_model=ReportResponse)
def report():
    return generate_report()


@app.get("/live_signals", response_model=LiveSignalsResponse)
def live_signals():
    return get_live_factors()


@app.get("/location", response_model=LocationResponse)
def get_location():
    return get_store_location()


@app.post("/set_location", response_model=LocationResponse)
def set_location(req: SetLocationRequest):
    zip_code = req.zip_code.strip()
    if not zip_code.isdigit() or len(zip_code) != 5:
        raise HTTPException(status_code=400, detail="Please enter a valid 5-digit US zip code.")
    try:
        geo = geocode_zip(zip_code)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoding failed: {str(e)}")
    set_store_location(geo["lat"], geo["lon"], zip_code, geo["label"])
    return get_store_location()


@app.get("/predict", response_model=PredictionResponse)
def predict():
    return {"predictions": calculate_predictions()}


@app.get("/inventory", response_model=InventoryResponse)
def inventory():
    return {"inventory": get_inventory_view()}


@app.get("/explain", response_model=ExplanationResponse)
def explain():
    summary = build_explanation_summary()
    ai_text = ai_explain_store(summary)
    explanation = ai_text if ai_text else generate_explanation(summary)
    return {"explanation": explanation}


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
        record_sale(req.item, req.amount)
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


@app.get("/financials", response_model=FinancialsResponse)
def financials():
    return get_daily_financials()


@app.get("/stockout_losses", response_model=StockoutLossesResponse)
def stockout_losses():
    losses = get_stockout_losses()
    return {
        "losses": losses,
        "total_lost_revenue": round(sum(l["lost_revenue"] for l in losses), 2),
        "total_lost_profit":  round(sum(l["lost_profit"]  for l in losses), 2),
    }


@app.get("/eod_summary", response_model=EodSummaryResponse)
def eod_summary():
    return get_eod_summary()


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


@app.post("/add_product", response_model=AddProductResponse)
def add_product_endpoint(req: AddProductRequest):
    if get_item(req.name):
        raise HTTPException(status_code=400, detail=f"'{req.name}' already exists")

    profile = generate_product_profile(req.name, req.category)

    factors = {
        "weather_factor": profile["weather_factor"],
        "traffic_factor": profile["traffic_factor"],
        "gas_price_factor": profile["gas_price_factor"],
        "trend_factor": profile["trend_factor"],
    }

    add_product(
        name=req.name,
        current_stock=req.current_stock,
        base_weekly_demand=req.base_weekly_demand,
        unit_cost=req.unit_cost,
        price=req.price,
        reorder_threshold=req.reorder_threshold,
        category=req.category,
        factors=factors,
    )

    return {
        "item": req.name,
        "current_stock": req.current_stock,
        "factors": factors,
        "reasoning": profile.get("reasoning", ""),
        "factor_source": profile.get("factor_source", "default"),
    }


@app.post("/remove_product", response_model=RemoveProductResponse)
def remove_product_endpoint(req: RemoveProductRequest):
    result = remove_product(req.name)
    if not result:
        raise HTTPException(status_code=404, detail=f"'{req.name}' not found")
    return {"item": req.name, "removed": True}


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    result = ai_chat(req.message, model=req.model)
    return result