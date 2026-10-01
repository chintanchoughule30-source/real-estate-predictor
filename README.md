# EstateIQ — Real Estate Price Predictor

A full-stack Machine Learning web application that estimates Bengaluru residential property valuations using property features: area (sq. ft.), location, BHK, and bathrooms.

---

## Architecture

```
Browser (React + Tailwind + Framer Motion)
        │  HTTP POST /predict
        ▼
FastAPI Backend  ──►  Scikit-Learn / GradientBoosting Model
```

---

## Directory Structure

```
real-estate-predictor/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes
│   │   ├── schema.py        # Pydantic models
│   │   └── utils.py         # Inference helpers
│   ├── model/
│   │   ├── train.py         # ML training pipeline
│   │   ├── dataset.csv      # Bengaluru House Price dataset
│   │   ├── model.pkl        # Trained model artifact (generated)
│   │   └── columns.json     # Feature column map (generated)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Form.jsx
│   │   │   └── Result.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

---

## Quick Start

### 1. Dataset

Download the **Bengaluru House Data** from Kaggle:  
https://www.kaggle.com/datasets/amitabhajoy/bengaluru-house-price-data

Place the CSV as:
```
backend/model/dataset.csv
```

---

### 2. Backend — Train the Model

```bash
cd real-estate-predictor/backend

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Train the model (creates model.pkl and columns.json)
python model/train.py
```

Expected output:
```
[benchmark] 5-Fold CV R² scores:
  LinearRegression          R²=0.82xx
  Lasso                     R²=0.82xx
  GradientBoosting          R²=0.87xx  ← selected
  RandomForest              R²=0.86xx

[eval]  Test RMSE = xx.xx Lakhs  |  Test R² = 0.87xx
✅  Training complete. Artifacts saved.
```

---

### 3. Backend — Start the API Server

```bash
# From backend/ directory (with venv active)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at:  
- Swagger UI: http://localhost:8000/docs  
- ReDoc:      http://localhost:8000/redoc

---

### 4. Frontend — Install & Run

```bash
cd real-estate-predictor/frontend

npm install
npm run dev
```

Open: http://localhost:5173

---

## API Reference

### `GET /locations`
Returns all known location names for the dropdown.

```json
{ "locations": ["1st block jayanagar", "1st phase jp nagar", ...] }
```

---

### `POST /predict`

**Request body:**
```json
{
  "location":   "whitefield",
  "total_sqft": 1500,
  "bhk":        3,
  "bathrooms":  2
}
```

**Response:**
```json
{
  "estimated_price": 95.42,
  "price_low":       85.88,
  "price_high":     104.96,
  "location":       "whitefield",
  "total_sqft":     1500,
  "bhk":            3,
  "bathrooms":      2
}
```

> All prices in **Indian Rupees Lakhs (L)**. 100 L = 1 Crore.

---

### `GET /health`
Liveness probe — returns `{ "status": "ok" }`.

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | React 18, Vite, Framer Motion     |
| Styling      | Tailwind CSS (glassmorphism dark) |
| Backend      | Python FastAPI + Uvicorn          |
| Validation   | Pydantic v2                       |
| ML           | Scikit-learn, XGBoost, Pandas     |
| Persistence  | Joblib                            |

---

## Environment Variables

| File                    | Variable       | Default                    |
|-------------------------|----------------|----------------------------|
| `frontend/.env`         | `VITE_API_URL` | `http://localhost:8000`    |

---

## Production Notes

- Restrict `allow_origins` in `backend/app/main.py` to your actual domain.
- Set `VITE_API_URL` in CI/CD environment to the deployed API URL before `npm run build`.
- The Vite dev server proxies `/api/*` → `http://localhost:8000/*` — no CORS issues during development.
