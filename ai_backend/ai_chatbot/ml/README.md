# ML Forecasting & Budgeting Module

## Overview
This module provides ML-powered spending predictions, intelligent budget recommendations, and spending pattern detection for the Finance Tracker app.

## Features

### 1. Spending Predictions
- Daily, weekly, and monthly forecasts
- Random Forest model with 300 estimators
- ~$142 daily MAE, ~$373 weekly MAE
- Confidence intervals and prediction drivers

### 2. Intelligent Budgeting
- Category-specific spending floors (essentials)
- Elasticity factors (ease of cutting spending)
- Activity-based budgeting
- Pattern-adjusted recommendations

### 3. Pattern Detection
- Recurring expense detection (weekly/bi-weekly/monthly)
- Spending spike identification
- Volatility analysis
- Activity level classification

## Setup

### 1. Install Dependencies
```bash
cd ai_backend/ai_chatbot/ml
pip install -r requirements.txt
```

### 2. Create Database Tables
Run the SQL script in Supabase dashboard:
```sql
-- Execute contents of create_ml_tables.sql
```

### 3. Environment Variables
Add to `.env`:
```env
ML_URL=http://127.0.0.1:7003
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### 4. Start the Service
```bash
python app.py
# Service runs on port 7003
```

## API Endpoints

### Predictions
```http
POST /predict
{
    "user_id": "user123",
    "timeframe": "weekly",
    "horizon": 4
}
```

### Budget Recommendations
```http
POST /budget
{
    "user_id": "user123",
    "month": "2024-12"
}
```

### Pattern Analysis
```http
GET /patterns?user_id=user123&lookback_days=90
```

### Model Training
```http
POST /train?user_id=user123
```

## Integration with Gateway

The ML service integrates seamlessly with the chatbot gateway. Users can ask:
- "Will I overspend this week?"
- "Recommend a budget for next month"
- "What are my spending patterns?"

The gateway automatically routes these queries to the ML service.

## Testing

### Run Integration Tests
```bash
python test_ml_integration.py
```

### Quick Test
```bash
python test_ml_integration.py quick
```

## Architecture

```
User Query → Gateway (7000) → ML Service (7003)
                ↓                    ↓
            LLM Decision        ML Processing
                ↓                    ↓
            Tool Selection      Predictions/Budget
                ↓                    ↓
            Response ← ← ← ← Formatted Results
```

## Model Details

### Features Used
- Temporal: day of week, month patterns, cyclical encoding
- Lag features: 1, 2, 3, 7-day lags
- Rolling statistics: 3, 7, 14, 30-day windows
- Behavioral: spending momentum, category diversity
- Pattern-based: spike memory, recurrence indicators

### Categories Tracked
Food, Beverage, Home, Shopping, Transport, Entertainment, Beauty, Sports, Personal, Work, Bills, Travel, Other

### Budget Methodology
1. Historical analysis (mean, median, percentiles)
2. Activity level determination
3. Elasticity application
4. Pattern adjustments
5. Volatility buffering

## Performance

- 15-minute prediction cache
- Async processing for all endpoints
- Batch feature engineering
- Optimized database queries
- Model persistence with joblib

## Troubleshooting

### "Insufficient data" Error
- Need at least 30 days of transaction history
- Check user has expense records in database

### ML Service Unreachable
- Ensure service is running on port 7003
- Check firewall/network settings
- Verify environment variables

### Low Confidence Scores
- More data improves confidence
- 30-60 days: medium confidence
- 90+ days: high confidence

## Future Enhancements

- LSTM/Prophet for time series
- Multi-user model aggregation
- Real-time model updates
- Category-specific models
- Savings goal optimization