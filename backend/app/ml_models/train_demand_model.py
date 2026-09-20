import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import lightgbm as lgb
import joblib

# Set seed for reproducibility
np.random.seed(42)
N_SAMPLES = 5000

# 1. Generate Synthetic Data matching your potential inputs
data = {
    # Historical Tasks / Spatial context
    "hist_tasks_7d": np.random.poisson(lam=15, size=N_SAMPLES),
    "hist_tasks_30d": np.random.poisson(lam=60, size=N_SAMPLES),
    
    # Disaster / Event information
    "disaster_severity_score": np.random.uniform(0.0, 10.0, size=N_SAMPLES), # 0 (None) to 10 (Severe)
    "event_radius_km": np.random.exponential(scale=15.0, size=N_SAMPLES),
    
    # Population & Vulnerability
    "population_density_sqkm": np.random.uniform(500, 25000, size=N_SAMPLES),
    "vulnerability_index": np.random.uniform(0.1, 1.0, size=N_SAMPLES), # Socioeconomic/Access risk
    
    # Previous Service Gaps
    "unfulfilled_task_ratio_30d": np.random.uniform(0.0, 0.5, size=N_SAMPLES),
    
    # Time / Temporal features
    "month": np.random.randint(1, 13, size=N_SAMPLES),
    "is_weekend": np.random.choice([0, 1], size=N_SAMPLES, p=[0.7, 0.3])
}

df = pd.DataFrame(data)

# Cyclical encoding for month
df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

# 2. Synthetic Target Variable Calculation (Volunteer Demand)
# Base demand correlates with historical activity, severity, vulnerability, and gaps
target = (
    df["hist_tasks_7d"] * 0.8 +
    df["disaster_severity_score"] * 12.5 +
    (df["population_density_sqkm"] / 1000) * 1.5 +
    df["vulnerability_index"] * 25.0 +
    df["unfulfilled_task_ratio_30d"] * 40.0 +
    np.random.normal(0, 3, size=N_SAMPLES) # Noise
)

df["target_volunteer_demand"] = np.maximum(0, np.round(target))

# 3. Features and Target Split
feature_cols = [
    "hist_tasks_7d",
    "hist_tasks_30d",
    "disaster_severity_score",
    "event_radius_km",
    "population_density_sqkm",
    "vulnerability_index",
    "unfulfilled_task_ratio_30d",
    "is_weekend",
    "month_sin",
    "month_cos"
]

X = df[feature_cols]
y = df["target_volunteer_demand"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Train LightGBM Model
model = lgb.LGBMRegressor(
    n_estimators=150,
    learning_rate=0.05,
    max_depth=6,
    random_state=42
)

model.fit(X_train, y_train)

# 5. Evaluate Model
preds = model.predict(X_test)
print(f"Mean Absolute Error (MAE): {mean_absolute_error(y_test, preds):.2f}")
print(f"R2 Score: {r2_score(y_test, preds):.2f}")

# 6. Save Model Artifact
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "demand_model.joblib"
joblib.dump(model, MODEL_PATH)

print(f"Model saved to: {MODEL_PATH}")cle