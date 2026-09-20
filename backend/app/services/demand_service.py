import os
from datetime import datetime, timedelta

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Task, Community


MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "../ml_models/demand_model.joblib",
)


def get_historical_task_metrics(db: Session, region: str):
    """
    Get historical task metrics for a region.

    The Task model does not contain a location_region column.
    Tasks are linked to communities through community_id, so
    the region is matched against Community.city.
    """

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # Tasks from communities whose city matches the requested region.
    region_filter = Task.community.has(
        Community.city == region
    )

    # Tasks created during the last 7 days.
    hist_tasks_7d = (
        db.query(func.count(Task.id))
        .filter(
            region_filter,
            Task.created_at >= seven_days_ago,
        )
        .scalar()
        or 0
    )

    # Tasks created during the last 30 days.
    hist_tasks_30d = (
        db.query(func.count(Task.id))
        .filter(
            region_filter,
            Task.created_at >= thirty_days_ago,
        )
        .scalar()
        or 0
    )

    # Tasks that are still open/unassigned.
    if hist_tasks_30d > 0:
        unfulfilled_30d = (
            db.query(func.count(Task.id))
            .filter(
                region_filter,
                Task.created_at >= thirty_days_ago,
                Task.status.in_(["UNASSIGNED", "OPEN", "open"]),
            )
            .scalar()
            or 0
        )

        unfulfilled_ratio = (
            unfulfilled_30d / float(hist_tasks_30d)
        )
    else:
        unfulfilled_ratio = 0.0

    return {
        "hist_tasks_7d": hist_tasks_7d,
        "hist_tasks_30d": hist_tasks_30d,
        "unfulfilled_task_ratio_30d": round(
            unfulfilled_ratio,
            4,
        ),
    }


class DemandPredictionService:
    def __init__(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
        else:
            self.model = None

    def preprocess_inputs(self, raw_input: dict) -> pd.DataFrame:
        month = raw_input.get(
            "month",
            datetime.utcnow().month,
        )

        month_sin = np.sin(
            2 * np.pi * month / 12
        )

        month_cos = np.cos(
            2 * np.pi * month / 12
        )

        features = {
            "hist_tasks_7d": [
                raw_input.get("hist_tasks_7d", 0)
            ],
            "hist_tasks_30d": [
                raw_input.get("hist_tasks_30d", 0)
            ],
            "disaster_severity_score": [
                raw_input.get(
                    "disaster_severity_score",
                    0.0,
                )
            ],
            "event_radius_km": [
                raw_input.get(
                    "event_radius_km",
                    0.0,
                )
            ],
            "population_density_sqkm": [
                raw_input.get(
                    "population_density_sqkm",
                    1000.0,
                )
            ],
            "vulnerability_index": [
                raw_input.get(
                    "vulnerability_index",
                    0.5,
                )
            ],
            "unfulfilled_task_ratio_30d": [
                raw_input.get(
                    "unfulfilled_task_ratio_30d",
                    0.0,
                )
            ],
            "is_weekend": [
                1
                if raw_input.get(
                    "is_weekend",
                    False,
                )
                else 0
            ],
            "month_sin": [month_sin],
            "month_cos": [month_cos],
        }

        return pd.DataFrame(features)

    def predict_for_region(
        self,
        db: Session,
        region: str,
        external_data: dict,
    ) -> dict:

        if self.model is None:
            return {
                "error": (
                    "Model artifact not found. "
                    "Run train_demand_model.py first."
                )
            }

        # Get historical task information from the database.
        db_metrics = get_historical_task_metrics(
            db,
            region,
        )

        now = datetime.utcnow()

        # Combine historical database information
        # with external/contextual information.
        combined_inputs = {
            **db_metrics,

            "disaster_severity_score": external_data.get(
                "disaster_severity_score",
                0.0,
            ),

            "event_radius_km": external_data.get(
                "event_radius_km",
                0.0,
            ),

            "population_density_sqkm": external_data.get(
                "population_density_sqkm",
                5000.0,
            ),

            "vulnerability_index": external_data.get(
                "vulnerability_index",
                0.5,
            ),

            "month": now.month,

            "is_weekend": now.weekday() >= 5,
        }

        # Prepare model input.
        df = self.preprocess_inputs(
            combined_inputs
        )

        # Generate prediction.
        predicted_volunteers = int(
            np.round(
                self.model.predict(df)[0]
            )
        )

        predicted_volunteers = max(
            0,
            predicted_volunteers,
        )

        # Determine demand level.
        if predicted_volunteers > 60:
            demand_level = "CRITICAL"
        elif predicted_volunteers > 30:
            demand_level = "HIGH"
        elif predicted_volunteers > 10:
            demand_level = "MODERATE"
        else:
            demand_level = "LOW"

        return {
            "region": region,
            "predicted_volunteer_demand": predicted_volunteers,
            "demand_level": demand_level,
            "historical_context": db_metrics,
        }


# Single service instance used by the API.
demand_prediction_service = DemandPredictionService()