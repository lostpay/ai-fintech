"""
ML Forecasting & Budgeting Microservice
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="ML Forecasting Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
supabase = SupabaseService()
data_processor = DataProcessor()
predictor = SpendingPredictor()
budget_generator = BudgetGenerator()  # Keep old one for compatibility
advanced_budget_generator = AdvancedBudgetGenerator()  # New notebook-based generator
pattern_detector = PatternDetector()

# Cache for predictions (15 minutes TTL)
prediction_cache = {}
CACHE_TTL = 900  # 15 minutes in seconds

# Request/Response models
class PredictionRequest(BaseModel):
    user_id: str
    timeframe: str = "weekly"  # daily, weekly, monthly
    horizon: Optional[int] = None  # number of periods to predict

class BudgetRequest(BaseModel):
    user_id: str
    month: Optional[str] = None  # YYYY-MM format

class PatternRequest(BaseModel):
    user_id: str
    lookback_days: int = 90

class OverspendingRequest(BaseModel):
    user_id: str
    budget_total: Optional[float] = None

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
    """Generate cache key"""
    return f"{user_id}:{operation}:{params}"

def is_cache_valid(cache_entry: Dict) -> bool:
    """Check if cache entry is still valid"""
    if not cache_entry:
        return False
    cached_time = datetime.fromisoformat(cache_entry['timestamp'])
    return (datetime.now() - cached_time).seconds < CACHE_TTL

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ML Forecasting",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_spending(request: PredictionRequest):
    """
    Predict future spending based on historical patterns
    """
    try:
        # Check cache
        cache_key = get_cache_key(request.user_id, "predict", request.timeframe)
        if cache_key in prediction_cache and is_cache_valid(prediction_cache[cache_key]):
            logger.info(f"Returning cached prediction for user {request.user_id}")
            return prediction_cache[cache_key]['data']

        # Get user's transaction history
        transactions = await supabase.get_user_transactions(
            request.user_id,
            days_back=120  # Get 4 months of data for training
        )

        if not transactions:
            raise HTTPException(
                status_code=400,
                detail="No transaction history found for predictions"
            )

        # Check data requirements based on timeframe
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

        # Process data
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)

        # Train model if it doesn't exist
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

        # Generate predictions
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

        # Cache the response
        prediction_cache[cache_key] = {
            'timestamp': datetime.now().isoformat(),
            'data': response
        }

        # Store predictions in database
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
    """
    Generate personalized budget recommendations
    """
    try:
        # Determine target month
        if request.month:
            target_date = datetime.strptime(request.month, "%Y-%m")
        else:
            target_date = datetime.now()

        # Check cache
        cache_key = get_cache_key(request.user_id, "budget", request.month or "current")
        if cache_key in prediction_cache and is_cache_valid(prediction_cache[cache_key]):
            logger.info(f"Returning cached budget for user {request.user_id}")
            return prediction_cache[cache_key]['data']

        # Get user's transaction history
        transactions = await supabase.get_user_transactions(
            request.user_id,
            days_back=90
        )

        if not transactions:
            # Return default budget for new users using advanced generator
            default_budget = advanced_budget_generator._get_default_monthly_budget()
            return BudgetResponse(
                categories=default_budget['categories'],
                total_budget=default_budget['total'],
                period=target_date.strftime("%Y-%m"),
                methodology={"type": "default", "reason": "new_user"}
            )

        # Process data
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)

        # Detect patterns for budget adjustment
        patterns = pattern_detector.detect_patterns(processed_data)

        # Generate budget recommendations using advanced generator
        # Determine if weekly or monthly budget
        if target_date.day == 1:  # Start of month - generate monthly
            budget_data = advanced_budget_generator.generate_monthly_budget(processed_data)
        else:  # Generate weekly by default
            budget_data = advanced_budget_generator.generate_weekly_budget(processed_data)

        # Ensure compatibility with expected format
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

        # Cache the response
        prediction_cache[cache_key] = {
            'timestamp': datetime.now().isoformat(),
            'data': response
        }

        # Store budget in database
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
    """
    Analyze spending patterns and behaviors
    """
    try:
        # Check cache
        cache_key = get_cache_key(request.user_id, "patterns", str(request.lookback_days))
        if cache_key in prediction_cache and is_cache_valid(prediction_cache[cache_key]):
            logger.info(f"Returning cached patterns for user {request.user_id}")
            return prediction_cache[cache_key]['data']

        # Get transaction history
        transactions = await supabase.get_user_transactions(
            request.user_id,
            days_back=request.lookback_days
        )

        if not transactions or len(transactions) < 14:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for pattern analysis (need at least 14 days)"
            )

        # Process data
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)

        # Detect patterns
        patterns = pattern_detector.detect_patterns(processed_data)

        # Generate insights
        insights = pattern_detector.generate_insights(patterns)

        response = PatternResponse(
            recurrences=patterns.get('recurrences', []),
            spikes=patterns.get('spikes', []),
            volatility=patterns.get('volatility', {}),
            activity_levels=patterns.get('activity_levels', {}),
            insights=insights
        )

        # Cache the response
        prediction_cache[cache_key] = {
            'timestamp': datetime.now().isoformat(),
            'data': response
        }

        # Store patterns in database
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
    """
    Check if user is likely to overspend based on predictions and budget
    """
    try:
        # Get user's transaction history
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

        # Process data
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)

        # Get budget data if provided
        budget_data = {'total': request.budget_total} if request.budget_total else None

        # Check overspending
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
    """
    Trigger model retraining for a specific user
    """
    try:
        # Get all available transaction data
        transactions = await supabase.get_user_transactions(user_id, days_back=365)

        if not transactions or len(transactions) < 30:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for training (need at least 30 days)"
            )

        # Process and train
        df = pd.DataFrame(transactions)
        processed_data = data_processor.prepare_features(df)

        # Train predictor
        metrics = predictor.train(processed_data)

        # Clear cache for this user
        keys_to_remove = [k for k in prediction_cache.keys() if k.startswith(f"{user_id}:")]
        for key in keys_to_remove:
            del prediction_cache[key]

        # Store model metadata
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
    """
    Clear prediction cache
    """
    if user_id:
        # Clear cache for specific user
        keys_to_remove = [k for k in prediction_cache.keys() if k.startswith(f"{user_id}:")]
        for key in keys_to_remove:
            del prediction_cache[key]
        return {"status": "success", "cleared": len(keys_to_remove)}
    else:
        # Clear all cache
        count = len(prediction_cache)
        prediction_cache.clear()
        return {"status": "success", "cleared": count}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting ML Forecasting Service on port 7003")
    uvicorn.run(app, host="0.0.0.0", port=7003, reload=True)