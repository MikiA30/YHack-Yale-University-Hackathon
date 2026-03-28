"""A.U.R.A. — Adaptive Uncertainty & Risk Agent API"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from predictor import calculate_predictions, get_inventory_view, build_explanation_summary, generate_explanation
from schemas import PredictionResponse, InventoryResponse, ExplanationResponse

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
