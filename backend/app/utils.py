"""
Helper utilities: model loading, inference vector construction.
"""

import os
import json
import numpy as np
import joblib
from functools import lru_cache

BASE_DIR     = os.path.dirname(os.path.dirname(__file__))  # backend/
MODEL_PATH   = os.path.join(BASE_DIR, "model", "model.pkl")
COLUMNS_PATH = os.path.join(BASE_DIR, "model", "columns.json")


# ── Cached loaders ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_model():
    """Load and cache the trained ML model from disk."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model artifact not found at {MODEL_PATH}. "
            "Run `python model/train.py` first."
        )
    return joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def get_columns() -> list[str]:
    """Load and cache the ordered feature column list."""
    if not os.path.exists(COLUMNS_PATH):
        raise FileNotFoundError(
            f"columns.json not found at {COLUMNS_PATH}. "
            "Run `python model/train.py` first."
        )
    with open(COLUMNS_PATH) as f:
        data = json.load(f)
    return data["data_columns"]


# ── Feature vector construction ───────────────────────────────────────────────

def get_location_names() -> list[str]:
    """Return all known location names (excluding numeric features)."""
    cols = get_columns()
    # First 3 entries are numeric: total_sqft, bath, bhk
    return sorted([c for c in cols[3:]])


def build_input_vector(location: str, total_sqft: float, bhk: int, bathrooms: int) -> np.ndarray:
    """
    Construct a 1×N numpy array matching the training feature order.
    Unknown locations are silently mapped to the 'other' bucket if present,
    otherwise treated as all-zeros (effectively 'other').
    """
    columns = get_columns()
    x = np.zeros(len(columns))

    # Numeric features (positions 0, 1, 2)
    x[0] = total_sqft
    x[1] = bathrooms
    x[2] = bhk

    # One-hot location
    loc_key = location.lower().strip()
    if loc_key in columns:
        x[columns.index(loc_key)] = 1
    elif "other" in columns:
        x[columns.index("other")] = 1
    # else: leave zeros — model will extrapolate

    return x.reshape(1, -1)


def run_inference(location: str, total_sqft: float, bhk: int, bathrooms: int) -> float:
    """Return predicted price in Lakhs."""
    model = get_model()
    vec   = build_input_vector(location, total_sqft, bhk, bathrooms)
    price = float(model.predict(vec)[0])
    return round(max(price, 1.0), 2)   # guard against sub-zero predictions
