"""
ML Forecasting & Budgeting Microservice.
Provides spending predictions, budget recommendations, pattern analysis, and overspending detection.
Port: 7003
"""

import logging
import sys
from pathlib import Path
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import asyncio
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from supabase_service import SupabaseService
from ml.predictor import SpendingPredictor
from ml.budget_generator import BudgetGenerator
from ml.budget_generator_advanced import AdvancedBudgetGenerator
from ml.pattern_detector import PatternDetector
from ml.data_processor import DataProcessor
from ml.forecaster import FinanceForecaster

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="ML Forecasting Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML service components
supabase = SupabaseService()
data_processor = DataProcessor()
predictor = SpendingPredictor()
budget_generator = BudgetGenerator()
advanced_budget_generator = AdvancedBudgetGenerator()
pattern_detector = PatternDetector()
forecaster = FinanceForecaster()

# Prediction cache with 15 minute TTL
prediction_cache = {}
CACHE_TTL = 900

# API request models
class PredictionRequest(BaseModel):
    user_id: str
    timeframe: str = "weekly"
    horizon: Optional[int] = None

class BudgetRequest(BaseModel):
    user_id: str
    month: Optional[str] = None

class PatternRequest(BaseModel):
    user_id: str
    lookback_days: int = 90

class OverspendingRequest(BaseModel):
    user_id: str
    budget_total: Optional[float] = None

# API response models
class PredictionResponse(BaseModel):
    predictions: List[Dict[str, Any]]
    confidence: float
    drivers: List[str]
    timeframe: str
    generated_at: str

class BudgetResponse(BaseModel):
    categories: List[Dict[str, Any]]
    total_budget: float
    period: str
    methodology: Dict[str, Any]

class PatternResponse(BaseModel):
    recurrences: List[Dict[str, Any]]
    spikes: List[Dict[str, Any]]
    volatility: Dict[str, float]
    activity_levels: Dict[str, str]
    insights: List[str]

class OverspendingResponse(BaseModel):
    overspending: bool
    message: str
    predicted_amount: float
    budget_amount: float
    confidence: float

def get_cache_key(user_id: str, operation: str, params: str = "") -> str:
    """Generate unique cache key for user and operation"""
    return f"{user_id}:{operation}:{params}"

def is_cache_valid(cache_entry: Dict) -> bool:
    """Check if cached result is still within TTL window"""
    if not cache_entry:
        return False
    cached_time = datetime.fromisoformat(cache_entry['timestamp'])
    return (datetime.now() - cached_time).seconds < CACHE_TTL

@app.get("/health")
async def health_check():
    """Health check endpoint for service monitoring"""
    return {
        "status": "healthy",
        "service": "ML Forecasting",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_spending(request: PredictionRequest):
    """
    Generate spending predictions based on historical transaction patterns.
    Uses advanced forecaster for daily/weekly predictions with fallback to basic predictor.
    """
    try:
        # Check cache first
        cache_key = get_cache_key(request.user_id, "predict", request.timeframe)
        if cache_key in prediction_cache and is_cache_valid(prediction_cache[cache_key]):
            logger.info(f"Returning cached prediction for user {request.user_id}")
            return prediction_cache[cache_key]['data']

        # Fetch user transaction history
        transactions = await supabase.get_user_transactions(
            request.user_id,
            days_back=120
        )

        if not transactions:
            raise HTTPException(
                status_code=400,
                detail="No transaction history found for predictions"
            )

        # Validate sufficient data for requested timeframe
        if request.timeframe == "monthly" and len(transactions) < 30:
            return PredictionResponse(
                predictions=[],
                confidence=0.3,
                drivers=[],
                timeframe=request.timeframe,
                generated_at=datetime.now().isoformat()
            )
        elif len(transactions) < 14:
            raise HTTPException(
                status_code=400,
                detail="Insufficient transaction history for predictions (need at least 14 days)"
            )

        df = pd.DataFrame(transactions)

        # Try advanced forecaster first for improved accuracy
        use_fallback = False
        try:
            if request.timeframe in ['daily', 'weekly']:
                forecast_output = forecaster.forecast_from_transactions(
                    df,
                    horizon_days=14 if request.timeframe == 'daily' else 28
                )

                if not forecast_output.daily_forecast.empty:
                    # Format daily predictions
                    if request.timeframe == 'daily':
                        predictions = [
                            {
                                'date': row['date'].isoformat(),
                                'predicted_amount': float(row['pred_total']),
                                'lower_bound': float(row['pred_total'] * 0.8),
                                'upper_bound': float(row['pred_total'] * 1.2),
                                'timeframe': 'daily'
                            }
                            for _, row in forecast_output.daily_forecast.head(request.horizon or 7).iterrows()
                        ]
                    else:
                        # Format weekly predictions
                        predictions = [
                            {
                                'week_start': (row['week_end'] - pd.Timedelta(days=6)).isoformat() if pd.notna(row.get('week_end')) else '',
                                'week_end': row['week_end'].isoformat() if pd.notna(row.get('week_end')) else '',
                                'predicted_amount': float(row.get('pred_sum', 0)),
                                'lower_bound': float(row.get('pred_sum', 0) * 0.8),
                                'upper_bound': float(row.get('pred_sum', 0) * 1.2),
                                'timeframe': 'weekly'
                            }
                            for _, row in forecast_output.weekly_report.iterrows()
                        ]

                    response = PredictionResponse(
                        predictions=predictions[:request.horizon or (7 if request.timeframe == 'daily' else 4)],
                        confidence=forecast_output.confidence,
                        drivers=['Total_7day_avg', 'Total_lag1', 'day_of_week'],
                        timeframe=request.timeframe,
                        generated_at=datetime.now().isoformat()
                    )

                    # Cache and store results
                    prediction_cache[cache_key] = {
                        'timestamp': datetime.now().isoformat(),
                        'data': response
                    }

                    await supabase.store_predictions(
                        user_id=request.user_id,
                        predictions=predictions,
                        timeframe=request.timeframe,
                        confidence=forecast_output.confidence
                    )

                    return response
                else:
                    use_fallback = True
            else:
                use_fallback = True
        except Exception as e:
            logger.warning(f"Forecaster failed, using fallback: {str(e)}")
            use_fallback = True

        # Fallback to basic predictor if advanced forecaster fails
        if use_fallback:
            processed_data = data_processor.prepare_features(df)

            # Train model if not exists
            import os
            model_file = os.path.join(predictor.model_path, 'spending_predictor.joblib')
            if not os.path.exists(model_file):
                logger.info(f"No trained model found. Training model for user {request.user_id}...")
                try:
                    predictor.train(processed_data)
                    logger.info("Model trained successfully")
                except Exception as train_error:
                    logger.error(f"Failed to train model: {train_error}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Model training failed: {str(train_error)}"
                    )

            # Generate predictions using basic predictor
            predictions, confidence, drivers = predictor.predict(
                processed_data,
                timeframe=request.timeframe,
                horizon=request.horizon or (7 if request.timeframe == "daily" else 4)
            )

            response = PredictionResponse(
                predictions=predictions,
                confidence=confidence,
                drivers=drivers,
                timeframe=request.timeframe,
                generated_at=datetime.now().isoformat()
            )

            # Cache and store
            prediction_cache[cache_key] = {
                'timestamp': datetime.now().isoformat(),
                'data': response
            }

            await supabase.store_predictions(
                user_id=request.user_id,
                predictions=predictions,
                timeframe=request.timeframe,
                confidence=confidence
            )

            return response

    except Exception as e:
        logger.error(f"Prediction error for user {request.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/budget", response_model=BudgetResponse)
async def recommend_budget(request: BudgetRequest):
    """Generate personalized budget recommendations based on spending history"""
    try:
        # Parse target month
        if request.month:
            target_date = datetime.strptime(request.month, "%Y-%m")
        else:
            target_date = datetime.now()

        # Check cache
        cache_key = get_cache_key(request.user_id, "budget", request.month or "current")
        if cache_key in prediction_cache and is_cache_valid(prediction_cache[cache_key]):
            logger.info(f"Returning cached budget for user {request.user_id}")
            return prediction_cache[cache_key]['data']

        # Fetch transaction history
        transactions = await supabase.get_user_transactions(
            request.user_id,
            days_back=90
        )

        if not transactions:
            # Provide default budget for new users
            default_budget = advanced_budget_generator._get_default_monthly_budget()
            return BudgetResponse(
                categories=default_budget['categories'],
                total_budget=default_budget['total'],
                period=target_date.strftime("%Y-%m"),
                methodology={"type": "default", "reason": "new_user"}
            )

        # Process and analyze transaction data
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)
        patterns = pattern_detector.detect_patterns(processed_data)

        # Generate budget using advanced generator
        if target_date.day == 1:
            budget_data = advanced_budget_generator.generate_monthly_budget(processed_data)
        else:
            budget_data = advanced_budget_generator.generate_weekly_budget(processed_data)

        # Fallback to basic generator if advanced fails
        if 'categories' not in budget_data:
            budget_data = budget_generator.generate_budget(
                processed_data,
                patterns,
                target_month=target_date
            )

        response = BudgetResponse(
            categories=budget_data['categories'],
            total_budget=budget_data.get('total', sum(c.get('amount', 0) for c in budget_data['categories'])),
            period=budget_data.get('period', target_date.strftime("%Y-%m")),
            methodology=budget_data.get('methodology', {})
        )

        # Cache and store
        prediction_cache[cache_key] = {
            'timestamp': datetime.now().isoformat(),
            'data': response
        }

        await supabase.store_budget(
            user_id=request.user_id,
            budget_data=budget_data,
            month=target_date.strftime("%Y-%m")
        )

        return response

    except Exception as e:
        logger.error(f"Budget generation error for user {request.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/patterns", response_model=PatternResponse)
async def analyze_patterns(request: PatternRequest):
    """Identify recurring expenses, spending spikes, and behavior patterns"""
    try:
        # Check cache
        cache_key = get_cache_key(request.user_id, "patterns", str(request.lookback_days))
        if cache_key in prediction_cache and is_cache_valid(prediction_cache[cache_key]):
            logger.info(f"Returning cached patterns for user {request.user_id}")
            return prediction_cache[cache_key]['data']

        # Fetch transaction history
        transactions = await supabase.get_user_transactions(
            request.user_id,
            days_back=request.lookback_days
        )

        if not transactions or len(transactions) < 14:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for pattern analysis (need at least 14 days)"
            )

        # Process and analyze patterns
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)
        patterns = pattern_detector.detect_patterns(processed_data)
        insights = pattern_detector.generate_insights(patterns)

        response = PatternResponse(
            recurrences=patterns.get('recurrences', []),
            spikes=patterns.get('spikes', []),
            volatility=patterns.get('volatility', {}),
            activity_levels=patterns.get('activity_levels', {}),
            insights=insights
        )

        # Cache and store
        prediction_cache[cache_key] = {
            'timestamp': datetime.now().isoformat(),
            'data': response
        }

        await supabase.store_patterns(
            user_id=request.user_id,
            patterns=patterns
        )

        return response

    except Exception as e:
        logger.error(f"Pattern analysis error for user {request.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/overspending", response_model=OverspendingResponse)
async def check_overspending(request: OverspendingRequest):
    """Predict likelihood of exceeding budget based on spending trends"""
    try:
        # Fetch transaction history
        transactions = await supabase.get_user_transactions(
            request.user_id,
            days_back=90
        )

        if not transactions or len(transactions) < 14:
            return OverspendingResponse(
                overspending=False,
                message="Need at least 14 days of transaction history for overspending analysis",
                predicted_amount=0.0,
                budget_amount=0.0,
                confidence=0.3
            )

        # Process and check overspending
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)
        budget_data = {'total': request.budget_total} if request.budget_total else None
        result = predictor.check_overspending(processed_data, budget_data)

        return OverspendingResponse(
            overspending=result['overspending'],
            message=result['message'],
            predicted_amount=result.get('predicted_amount', 0.0),
            budget_amount=result.get('budget_amount', 0.0),
            confidence=result['confidence']
        )

    except Exception as e:
        logger.error(f"Overspending check error for user {request.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
async def train_model(user_id: str):
    """Trigger model retraining with latest transaction data"""
    try:
        # Fetch full transaction history
        transactions = await supabase.get_user_transactions(user_id, days_back=365)

        if not transactions or len(transactions) < 30:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for training (need at least 30 days)"
            )

        # Train predictor model
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)
        metrics = predictor.train(processed_data)

        # Clear user's cache entries
        keys_to_remove = [k for k in prediction_cache.keys() if k.startswith(f"{user_id}:")]
        for key in keys_to_remove:
            del prediction_cache[key]

        # Store training metadata
        await supabase.store_model_metadata(
            user_id=user_id,
            metrics=metrics,
            timestamp=datetime.now().isoformat()
        )

        return {
            "status": "success",
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Training error for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear-cache")
async def clear_cache(user_id: Optional[str] = None):
    """Clear prediction cache for specific user or entire cache"""
    if user_id:
        keys_to_remove = [k for k in prediction_cache.keys() if k.startswith(f"{user_id}:")]
        for key in keys_to_remove:
            del prediction_cache[key]
        return {"status": "success", "cleared": len(keys_to_remove)}
    else:
        count = len(prediction_cache)
        prediction_cache.clear()
        return {"status": "success", "cleared": count}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting ML Forecasting Service on port 7003")
    uvicorn.run(app, host="0.0.0.0", port=7003, reload=True)
