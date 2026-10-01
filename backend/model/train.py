"""
Real Estate Price Prediction — ML Training Pipeline
Dataset: Bengaluru House Price Dataset (Kaggle)
Run: python model/train.py   (from backend/)
Outputs: model.pkl, columns.json

Stack: polars (data) + lightgbm (model) + numpy (arrays)
No scikit-learn — all have pre-built cp314-win_amd64 wheels.
"""

import os
import json
import warnings
import random
import math
import numpy as np
import polars as pl
import joblib
import lightgbm as lgb

warnings.filterwarnings("ignore")

DATASET_PATH = os.path.join(os.path.dirname(__file__), "Bengaluru_House_Data.csv")
MODEL_PATH   = os.path.join(os.path.dirname(__file__), "model.pkl")
COLUMNS_PATH = os.path.join(os.path.dirname(__file__), "columns.json")

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# ─────────────────────────────────────────────
# 1. Load & Clean  (polars)
# ─────────────────────────────────────────────
def load_data(path: str) -> pl.DataFrame:
    df = pl.read_csv(path, infer_schema_length=10000)
    print(f"[load]  shape={df.shape}  columns={df.columns}")
    return df


def parse_sqft(val: str) -> float | None:
    try:
        parts = str(val).split("-")
        if len(parts) == 2:
            return (float(parts[0]) + float(parts[1])) / 2
        return float(val)
    except Exception:
        return None


def clean_bengaluru(df: pl.DataFrame) -> pl.DataFrame:
    # Keep relevant columns, drop nulls
    df = df.select(["location", "size", "total_sqft", "bath", "price"]).drop_nulls()

    # Parse BHK from "2 BHK" → 2
    df = df.with_columns(
        pl.col("size")
          .map_elements(
              lambda x: int(x.split()[0]) if x.split()[0].isdigit() else None,
              return_dtype=pl.Int32
          )
          .alias("bhk")
    ).drop_nulls(subset=["bhk"])

    # Parse total_sqft (handles ranges)
    df = df.with_columns(
        pl.col("total_sqft")
          .map_elements(parse_sqft, return_dtype=pl.Float64)
          .alias("total_sqft")
    ).drop_nulls(subset=["total_sqft"])

    # Clean numeric columns
    df = df.with_columns([
        pl.col("bath").cast(pl.Float64, strict=False).alias("bath"),
        pl.col("price").cast(pl.Float64, strict=False).alias("price"),
    ]).drop_nulls(subset=["bath", "price"])

    df = df.with_columns([
        pl.col("bath").cast(pl.Int32),
        pl.col("bhk").cast(pl.Int32),
    ])

    # price_per_sqft for outlier removal
    df = df.with_columns(
        (pl.col("price") * 100_000 / pl.col("total_sqft")).alias("price_per_sqft")
    )

    # Spatial filter: >= 300 sqft per BHK
    df = df.filter(pl.col("total_sqft") / pl.col("bhk") >= 300)

    # Remove price_per_sqft outliers per location (mean ± 1 std)
    stats = df.group_by("location").agg([
        pl.col("price_per_sqft").mean().alias("pps_mean"),
        pl.col("price_per_sqft").std().alias("pps_std"),
    ])
    df = df.join(stats, on="location").filter(
        (pl.col("price_per_sqft") > pl.col("pps_mean") - pl.col("pps_std")) &
        (pl.col("price_per_sqft") < pl.col("pps_mean") + pl.col("pps_std"))
    ).drop(["pps_mean", "pps_std"])

    # Bath anomaly filter
    df = df.filter(pl.col("bath") < pl.col("bhk") + 2)

    # Consolidate rare locations (< 10 listings) → "other"
    loc_counts = df.group_by("location").agg(pl.len().alias("cnt"))
    rare = set(loc_counts.filter(pl.col("cnt") < 10)["location"].to_list())
    df = df.with_columns(
        pl.col("location").map_elements(
            lambda x: "other" if x in rare else x.strip(),
            return_dtype=pl.String
        )
    )

    df = df.drop(["size", "price_per_sqft"])
    print(f"[clean] shape after cleaning={df.shape}")
    return df


# ─────────────────────────────────────────────
# 2. Feature Engineering — one-hot encode location
# ─────────────────────────────────────────────
def build_features(df: pl.DataFrame):
    locations = sorted(df["location"].unique().to_list())
    # one-hot columns
    ohe_cols = [
        (pl.col("location") == loc).cast(pl.Int8).alias(loc)
        for loc in locations
    ]
    df = df.with_columns(ohe_cols)
    feature_cols = ["total_sqft", "bath", "bhk"] + locations
    X = df.select(feature_cols).to_numpy().astype(np.float64)
    y = df["price"].to_numpy().astype(np.float64)
    return X, y, feature_cols


# ─────────────────────────────────────────────
# 3. Train / test split (pure numpy)
# ─────────────────────────────────────────────
def train_test_split(X, y, test_size=0.2):
    n = len(y)
    idx = np.random.permutation(n)
    cut = int(n * (1 - test_size))
    tr, te = idx[:cut], idx[cut:]
    return X[tr], X[te], y[tr], y[te]


# ─────────────────────────────────────────────
# 4. Metrics (pure numpy)
# ─────────────────────────────────────────────
def rmse(y_true, y_pred):
    return math.sqrt(np.mean((y_true - y_pred) ** 2))

def r2(y_true, y_pred):
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    return 1 - ss_res / ss_tot


# ─────────────────────────────────────────────
# 5. Train LightGBM with 5-fold CV (native API — no scikit-learn)
# ─────────────────────────────────────────────
def train_and_evaluate(X, y):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    params = {
        "objective":        "regression",
        "metric":           "rmse",
        "learning_rate":    0.05,
        "num_leaves":       63,
        "max_depth":        -1,
        "min_data_in_leaf": 20,
        "bagging_fraction": 0.8,
        "bagging_freq":     1,
        "feature_fraction": 0.8,
        "seed":             RANDOM_SEED,
        "num_threads":      -1,
        "verbosity":        -1,
    }
    NUM_ROUNDS = 500

    # 5-fold CV on train set
    n = len(y_train)
    fold_size = n // 5
    cv_r2 = []
    print("\n[benchmark] LightGBM 5-Fold CV R² scores:")
    for fold in range(5):
        val_start = fold * fold_size
        val_end   = val_start + fold_size if fold < 4 else n
        val_idx   = np.arange(val_start, val_end)
        tr_idx    = np.concatenate([np.arange(0, val_start), np.arange(val_end, n)])
        dtrain  = lgb.Dataset(X_train[tr_idx], label=y_train[tr_idx])
        dval    = lgb.Dataset(X_train[val_idx], label=y_train[val_idx], reference=dtrain)
        booster = lgb.train(params, dtrain, num_boost_round=NUM_ROUNDS,
                            valid_sets=[dval], callbacks=[lgb.log_evaluation(period=-1)])
        score = r2(y_train[val_idx], booster.predict(X_train[val_idx]))
        cv_r2.append(score)
        print(f"  Fold {fold+1}  R²={score:.4f}")

    mean_r2 = np.mean(cv_r2)
    print(f"\n[benchmark] Mean CV R²={mean_r2:.4f}  (±{np.std(cv_r2):.4f})")

    # Final model on full train set
    dtrain_full = lgb.Dataset(X_train, label=y_train)
    final_model = lgb.train(params, dtrain_full, num_boost_round=NUM_ROUNDS,
                            callbacks=[lgb.log_evaluation(period=-1)])

    y_pred    = final_model.predict(X_test)
    test_rmse = rmse(y_test, y_pred)
    test_r2   = r2(y_test, y_pred)
    print(f"\n[eval]  Test RMSE = {test_rmse:.2f} Lakhs  |  Test R² = {test_r2:.4f}")

    return final_model


# ─────────────────────────────────────────────
# 6. Persist Artifacts
# ─────────────────────────────────────────────
def save_artifacts(model, columns: list):
    joblib.dump(model, MODEL_PATH)
    print(f"[save]  model -> {MODEL_PATH}")

    col_data = {"data_columns": [c.lower() for c in columns]}
    with open(COLUMNS_PATH, "w") as f:
        json.dump(col_data, f, indent=2)
    print(f"[save]  columns -> {COLUMNS_PATH}  ({len(columns)} features)")


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    df_raw     = load_data(DATASET_PATH)
    df_clean   = clean_bengaluru(df_raw)
    X, y, cols = build_features(df_clean)
    model      = train_and_evaluate(X, y)
    save_artifacts(model, cols)
    print("\nDone. Training complete. Artifacts saved.")
