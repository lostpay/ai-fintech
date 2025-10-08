"""
Finance Forecaster Module.
Uses Random Forest regression to predict future daily spending based on historical patterns.
"""

from __future__ import annotations
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# Default spending category mappings
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
    """Container for forecast results and accuracy metrics"""
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
    Spending forecaster using Random Forest regression.
    Handles expense-only data and creates lag/rolling features for predictions.
    """

    def __init__(self,
                 category_map: Dict[int,str] = None,
                 n_estimators: int = 100,
                 random_state: int = 42,
                 train_lookback_days: int = 90,
                 min_history_days: int = 14):
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
        Generate spending forecast from raw transaction data.
        Returns daily predictions, accuracy reports, and confidence score.
        """
        try:
            # Transform transactions into daily features
            daily = self._build_daily_features(transactions)

            if len(daily) < self.min_history_days:
                logger.warning(f"Insufficient history: {len(daily)} days < {self.min_history_days}")
                return self._empty_outputs()

            # Use recent data for training
            train = daily.iloc[-self.train_lookback_days:] if len(daily) > self.train_lookback_days else daily

            # Train the model
            self._fit(train)

            # Generate future predictions
            fc = self._roll_forward_forecast(daily, horizon_days)

            # Build accuracy reports
            last14, over, under = self._build_last14_report(daily, fc)
            wk, w_over, w_under = self._build_weekly_report(daily, fc)

            # Calculate confidence based on data availability
            confidence = min(0.95, 0.5 + (len(daily) / 200))

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
        """Return empty outputs when data is insufficient"""
        return ForecastOutputs(
            pd.DataFrame(), pd.DataFrame(), 0, 0,
            pd.DataFrame(), 0, 0, 0.3
        )

    def _build_daily_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform raw transactions into daily feature matrix.
        Filters to expenses only and adds temporal and lag features.
        """
        d = df.copy()

        # Ensure date column exists
        if 'date' in d.columns:
            d['date'] = pd.to_datetime(d['date'])
        elif 'created_at' in d.columns:
            d['date'] = pd.to_datetime(d['created_at'])
        else:
            raise ValueError("No date column found")

        # Filter to expense transactions only
        if 'transaction_type' in d.columns:
            d = d[d['transaction_type'].str.lower() == 'expense']
        elif 'type' in d.columns:
            d = d[d['type'].str.lower() == 'expense']

        # Map category IDs to names
        if 'category_id' in d.columns:
            d['category'] = d['category_id'].map(self.category_map).fillna('Other')
        elif 'category' in d.columns:
            pass
        else:
            d['category'] = 'Other'

        # Ensure amounts are positive
        d['amount'] = d['amount'].abs()

        # Create daily spending by category
        daily = d.groupby(['date', 'category'])['amount'].sum().unstack(fill_value=0).reset_index()

        # Ensure all categories exist as columns
        for name in self.category_map.values():
            if name not in daily.columns:
                daily[name] = 0.0

        # Calculate total daily spending
        category_cols = [c for c in daily.columns if c != 'date']
        daily['Total'] = daily[category_cols].sum(axis=1)

        daily = daily.sort_values('date').reset_index(drop=True)

        # Add temporal features
        daily['day_of_week'] = daily['date'].dt.dayofweek
        daily['week_number'] = daily['date'].dt.isocalendar().week.astype(int)
        daily['is_weekend'] = (daily['day_of_week'] >= 5).astype(int)
        daily['is_end_of_month'] = (daily['date'].dt.day > 25).astype(int)

        # Add lag and rolling features for all categories and total
        for col in category_cols + ['Total']:
            daily[f'{col}_lag1'] = daily[col].shift(1)
            daily[f'{col}_lag2'] = daily[col].shift(2)
            daily[f'{col}_lag3'] = daily[col].shift(3)
            daily[f'{col}_7day_avg'] = daily[col].rolling(7, min_periods=1).mean()

        # Remove rows with NaN values from lags
        daily = daily.dropna().reset_index(drop=True)

        logger.info(f"Built daily features: {len(daily)} days, Total range: {daily['Total'].min():.2f} to {daily['Total'].max():.2f}")

        return daily

    def _fit(self, daily: pd.DataFrame):
        """
        Train Random Forest model on historical spending patterns.
        Uses all features except date and target (Total) for prediction.
        """
        self.feature_cols = [c for c in daily.columns if c not in ['date', 'Total']]

        X = daily[self.feature_cols]
        y = daily['Total']

        logger.info(f"Training with {len(X)} samples, {len(self.feature_cols)} features")

        # Train Random Forest regressor
        self.model = RandomForestRegressor(
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.model.fit(X, y)

        # Log most important features
        importance = dict(zip(self.feature_cols, self.model.feature_importances_))
        top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
        logger.info(f"Top features: {top_features}")

    def _roll_forward_forecast(self, daily: pd.DataFrame, horizon_days: int) -> pd.DataFrame:
        """
        Generate predictions by rolling forward day by day.
        Each prediction updates lag and rolling features for the next prediction.
        """
        state = daily.copy()
        forecasts = []

        for i in range(horizon_days):
            last = state.iloc[-1:].copy()

            # Generate prediction for next day
            pred = float(self.model.predict(last[self.feature_cols])[0])

            # Calculate next date
            next_date = last['date'].iloc[0] + pd.Timedelta(days=1)

            # Create new row with predicted value
            new = last.copy()
            new.loc[:, 'date'] = next_date
            new.loc[:, 'Total'] = pred

            # Update lag features with previous values
            new.loc[:, 'Total_lag3'] = last['Total_lag2'].values
            new.loc[:, 'Total_lag2'] = last['Total_lag1'].values
            new.loc[:, 'Total_lag1'] = last['Total'].values

            # Update 7-day rolling average
            tail = pd.concat([state['Total'].tail(6), pd.Series([pred])])
            new.loc[:, 'Total_7day_avg'] = tail.rolling(7, min_periods=1).mean().iloc[-1]

            # Update temporal features for new date
            new.loc[:, 'day_of_week'] = next_date.dayofweek
            new.loc[:, 'week_number'] = next_date.isocalendar().week
            new.loc[:, 'is_weekend'] = 1 if next_date.dayofweek >= 5 else 0
            new.loc[:, 'is_end_of_month'] = 1 if next_date.day > 25 else 0

            # Add new row to state for next iteration
            state = pd.concat([state, new], ignore_index=True)

            # Store forecast
            forecasts.append({
                'date': next_date,
                'pred_total': pred
            })

        return pd.DataFrame(forecasts)

    def _build_last14_report(self, daily: pd.DataFrame, fc: pd.DataFrame) -> Tuple[pd.DataFrame, int, int]:
        """
        Compare actual vs predicted spending for the last 14 days.
        Returns report dataframe, over-prediction count, and under-prediction count.
        """
        # Get last 14 days of actual data
        if len(daily) >= 14:
            actual = daily[['date', 'Total']].tail(14).copy()
        else:
            actual = daily[['date', 'Total']].copy()

        actual = actual.rename(columns={'Total': 'actual'})

        # Merge with forecasts if available
        if not fc.empty:
            rep = pd.concat([
                actual,
                fc[['date', 'pred_total']].rename(columns={'pred_total': 'predicted'})
            ]).sort_values('date').tail(14)
        else:
            rep = actual
            rep['predicted'] = rep['actual']

        # Calculate delta (positive = overspending)
        if 'predicted' in rep.columns and 'actual' in rep.columns:
            rep['Delta'] = rep['actual'] - rep['predicted']
            over = int((rep['Delta'] > 0).sum())
            under = int((rep['Delta'] <= 0).sum())
        else:
            rep['Delta'] = 0
            over = 0
            under = 14

        return rep, over, under

    def _build_weekly_report(self, daily: pd.DataFrame, fc: pd.DataFrame) -> Tuple[pd.DataFrame, int, int]:
        """
        Aggregate daily data into weekly comparison.
        Returns weekly report, over-prediction count, and under-prediction count.
        """
        # Aggregate actuals to weekly (Sunday to Saturday)
        act = daily.set_index('date')['Total'].resample('W-SUN').sum().reset_index()
        act = act.rename(columns={'date': 'week_end', 'Total': 'act_sum'})

        # Aggregate predictions to weekly
        if not fc.empty:
            pred = fc.set_index('date')['pred_total'].resample('W-SUN').sum().reset_index()
            pred = pred.rename(columns={'date': 'week_end', 'pred_total': 'pred_sum'})

            # Merge actuals and predictions
            wk = act.merge(pred, on='week_end', how='outer').sort_values('week_end')
            wk['delta_sum'] = wk['act_sum'] - wk['pred_sum']

            # Keep last 2 weeks only
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
