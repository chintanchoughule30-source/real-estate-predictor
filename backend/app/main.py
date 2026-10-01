"""
FastAPI application — Real Estate Price Prediction API
Endpoints:
  GET  /locations  → list of all known location names
  POST /predict    → price inference
  GET  /health     → liveness probe
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schema import PredictRequest, PredictResponse, LocationsResponse
from app.utils  import get_location_names, run_inference

# ─────────────────────────────────────────────
# Application
# ─────────────────────────────────────────────
app = FastAPI(
    title="Real Estate Price Prediction API",
    description="Predict Bengaluru residential property prices using ML.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/locations", response_model=LocationsResponse, tags=["Data"])
def locations():
    """
    Returns the sorted list of all location names that were present in the
    training dataset and are therefore encoded in the model feature space.
    """
    try:
        locs = get_location_names()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return LocationsResponse(locations=locs)


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
def predict(body: PredictRequest):
    """
    Accepts property features and returns an estimated price in Lakhs (INR).
    A ±10% confidence band is also returned.
    """
    try:
        price = run_inference(
            location   = body.location,
            total_sqft = body.total_sqft,
            bhk        = body.bhk,
            bathrooms  = body.bathrooms,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")

    return PredictResponse(
        estimated_price = price,
        price_low       = round(price * 0.90, 2),
        price_high      = round(price * 1.10, 2),
        location        = body.location,
        total_sqft      = body.total_sqft,
        bhk             = body.bhk,
        bathrooms       = body.bathrooms,
    )
