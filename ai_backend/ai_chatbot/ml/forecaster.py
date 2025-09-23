"""
Finance Forecaster Module - Fixed Implementation
Based on the notebook approach with proper data handling
"""

from __future__ import annotations
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# Category mapping from database
DEFAULT_CATEGORIES = {
    1: "Food",
    2: "Beverage",
    3: "Home",
    4: "Shopping",
    5: "Transport",
    6: "Entertainment",
    7: "Beauty",
    8: "Sports",
    9: "Personal",
    10: "Work",
    11: "Other",
    12: "Bills",
    13: "Travel"
}

@dataclass
class ForecastOutputs:
    """Container for all forecast outputs"""
    daily_forecast: pd.DataFrame
    last14_report: pd.DataFrame
    last14_over_count: int
    last14_under_on_count: int
    weekly_report: pd.DataFrame
    weeks_over_count: int
    weeks_under_on_count: int
    confidence: float

class FinanceForecaster:
    """
    Fixed forecaster that properly handles expense-only data
    and creates correct features matching the notebook
    """

    def __init__(self,
                 category_map: Dict[int,str] = None,
                 n_estimators: int = 100,  # Notebook uses 100, not 300
                 random_state: int = 42,
                 train_lookback_days: int = 90,
                 min_history_days: int = 14):  # Reduced minimum for testing
        self.category_map = category_map or DEFAULT_CATEGORIES
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.train_lookback_days = train_lookback_days
        self.min_history_days = min_history_days
        self.model: Optional[RandomForestRegressor] = None
        self.feature_cols: List[str] = []

    def forecast_from_transactions(self,
                                  transactions: pd.DataFrame,
                                  horizon_days: int = 14) -> ForecastOutputs:
        """
        Main entry point for forecasting
        """
        try:
            # Build daily features from transactions
            daily = self._build_daily_features(transactions)

            if len(daily) < self.min_history_days:
                logger.warning(f"Insufficient history: {len(daily)} days < {self.min_history_days}")
                return self._empty_outputs()

            # Use lookback window for training
            train = daily.iloc[-self.train_lookback_days:] if len(daily) > self.train_lookback_days else daily

            # Fit the model
            self._fit(train)

            # Generate forecast
            fc = self._roll_forward_forecast(daily, horizon_days)

            # Build reports
            last14, over, under = self._build_last14_report(daily, fc)
            wk, w_over, w_under = self._build_weekly_report(daily, fc)

            # Calculate confidence based on data availability
            confidence = min(0.95, 0.5 + (len(daily) / 200))  # Scale from 0.5 to 0.95

            return ForecastOutputs(
                daily_forecast=fc,
                last14_report=last14,
                last14_over_count=over,
                last14_under_on_count=under,
                weekly_report=wk,
                weeks_over_count=w_over,
                weeks_under_on_count=w_under,
                confidence=confidence
            )

        except Exception as e:
            logger.error(f"Forecast error: {str(e)}")
            return self._empty_outputs()

    def _empty_outputs(self) -> ForecastOutputs:
        """Return empty outputs when insufficient data"""
        return ForecastOutputs(
            pd.DataFrame(), pd.DataFrame(), 0, 0,
            pd.DataFrame(), 0, 0, 0.3
        )

    def _build_daily_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Build daily features from raw transactions
        CRITICAL: Only use expenses, not income
        """
        d = df.copy()

        # Ensure date column
        if 'date' in d.columns:
            d['date'] = pd.to_datetime(d['date'])
        elif 'created_at' in d.columns:
            d['date'] = pd.to_datetime(d['created_at'])
        else:
            raise ValueError("No date column found")

        # CRITICAL FIX: Filter to expenses only
        if 'transaction_type' in d.columns:
            d = d[d['transaction_type'].str.lower() == 'expense']
        elif 'type' in d.columns:
            d = d[d['type'].str.lower() == 'expense']

        # Map categories
        if 'category_id' in d.columns:
            d['category'] = d['category_id'].map(self.category_map).fillna('Other')
        elif 'category' in d.columns:
            # Already has category names
            pass
        else:
            d['category'] = 'Other'

        # Ensure amount is positive (expenses)
        d['amount'] = d['amount'].abs()

        # Create daily pivot table
        daily = d.groupby(['date', 'category'])['amount'].sum().unstack(fill_value=0).reset_index()

        # Ensure all categories exist
        for name in self.category_map.values():
            if name not in daily.columns:
                daily[name] = 0.0

        # Calculate total
        category_cols = [c for c in daily.columns if c != 'date']
        daily['Total'] = daily[category_cols].sum(axis=1)

        # Sort by date
        daily = daily.sort_values('date').reset_index(drop=True)

        # Add temporal features (from notebook)
        daily['day_of_week'] = daily['date'].dt.dayofweek
        daily['week_number'] = daily['date'].dt.isocalendar().week.astype(int)
        daily['is_weekend'] = (daily['day_of_week'] >= 5).astype(int)
        daily['is_end_of_month'] = (daily['date'].dt.day > 25).astype(int)

        # Add lag features (notebook approach)
        for col in category_cols + ['Total']:
            daily[f'{col}_lag1'] = daily[col].shift(1)
            daily[f'{col}_lag2'] = daily[col].shift(2)
            daily[f'{col}_lag3'] = daily[col].shift(3)
            daily[f'{col}_7day_avg'] = daily[col].rolling(7, min_periods=1).mean()

        # Drop NaN rows (crucial to avoid feature leakage)
        daily = daily.dropna().reset_index(drop=True)

        logger.info(f"Built daily features: {len(daily)} days, Total range: {daily['Total'].min():.2f} to {daily['Total'].max():.2f}")

        return daily

    def _fit(self, daily: pd.DataFrame):
        """
        Fit the Random Forest model
        """
        # Define feature columns (everything except date and Total)
        self.feature_cols = [c for c in daily.columns if c not in ['date', 'Total']]

        X = daily[self.feature_cols]
        y = daily['Total']

        logger.info(f"Training with {len(X)} samples, {len(self.feature_cols)} features")

        # Initialize and fit model
        self.model = RandomForestRegressor(
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.model.fit(X, y)

        # Log feature importance (top 5)
        importance = dict(zip(self.feature_cols, self.model.feature_importances_))
        top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
        logger.info(f"Top features: {top_features}")

    def _roll_forward_forecast(self, daily: pd.DataFrame, horizon_days: int) -> pd.DataFrame:
        """
        Roll forward forecast for horizon_days
        """
        state = daily.copy()
        forecasts = []

        for i in range(horizon_days):
            # Get last row
            last = state.iloc[-1:].copy()

            # Predict
            pred = float(self.model.predict(last[self.feature_cols])[0])

            # Next date
            next_date = last['date'].iloc[0] + pd.Timedelta(days=1)

            # Create new row
            new = last.copy()
            new.loc[:, 'date'] = next_date
            new.loc[:, 'Total'] = pred

            # Update lag features
            new.loc[:, 'Total_lag3'] = last['Total_lag2'].values
            new.loc[:, 'Total_lag2'] = last['Total_lag1'].values
            new.loc[:, 'Total_lag1'] = last['Total'].values

            # Update rolling average
            tail = pd.concat([state['Total'].tail(6), pd.Series([pred])])
            new.loc[:, 'Total_7day_avg'] = tail.rolling(7, min_periods=1).mean().iloc[-1]

            # Update temporal features
            new.loc[:, 'day_of_week'] = next_date.dayofweek
            new.loc[:, 'week_number'] = next_date.isocalendar().week
            new.loc[:, 'is_weekend'] = 1 if next_date.dayofweek >= 5 else 0
            new.loc[:, 'is_end_of_month'] = 1 if next_date.day > 25 else 0

            # Append to state
            state = pd.concat([state, new], ignore_index=True)

            # Save forecast
            forecasts.append({
                'date': next_date,
                'pred_total': pred
            })

        return pd.DataFrame(forecasts)

    def _build_last14_report(self, daily: pd.DataFrame, fc: pd.DataFrame) -> Tuple[pd.DataFrame, int, int]:
        """
        Build the last 14 days report (actual vs predicted)
        """
        # Get last 14 days of actuals
        if len(daily) >= 14:
            actual = daily[['date', 'Total']].tail(14).copy()
        else:
            actual = daily[['date', 'Total']].copy()

        actual = actual.rename(columns={'Total': 'actual'})

        # If we have forecasts, merge them
        if not fc.empty:
            # For future dates
            rep = pd.concat([
                actual,
                fc[['date', 'pred_total']].rename(columns={'pred_total': 'predicted'})
            ]).sort_values('date').tail(14)
        else:
            rep = actual
            rep['predicted'] = rep['actual']  # Use actual as prediction fallback

        # Calculate delta
        if 'predicted' in rep.columns and 'actual' in rep.columns:
            rep['Delta'] = rep['actual'] - rep['predicted']  # Actual - Predicted (positive = overspend)
            over = int((rep['Delta'] > 0).sum())
            under = int((rep['Delta'] <= 0).sum())
        else:
            rep['Delta'] = 0
            over = 0
            under = 14

        return rep, over, under

    def _build_weekly_report(self, daily: pd.DataFrame, fc: pd.DataFrame) -> Tuple[pd.DataFrame, int, int]:
        """
        Build weekly aggregation report
        """
        # Aggregate actuals to weekly
        act = daily.set_index('date')['Total'].resample('W-SUN').sum().reset_index()
        act = act.rename(columns={'date': 'week_end', 'Total': 'act_sum'})

        # Aggregate predictions to weekly
        if not fc.empty:
            pred = fc.set_index('date')['pred_total'].resample('W-SUN').sum().reset_index()
            pred = pred.rename(columns={'date': 'week_end', 'pred_total': 'pred_sum'})

            # Merge
            wk = act.merge(pred, on='week_end', how='outer').sort_values('week_end')
            wk['delta_sum'] = wk['act_sum'] - wk['pred_sum']  # Actual - Predicted

            # Last 2 weeks
            wk = wk.tail(2)

            over = int((wk['delta_sum'] > 0).sum())
            under = int((wk['delta_sum'] <= 0).sum())
        else:
            wk = act.tail(2)
            wk['pred_sum'] = wk['act_sum']
            wk['delta_sum'] = 0
            over = 0
            under = 2

        return wk, over, under