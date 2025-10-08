"""
Data Processing and Feature Engineering Module.
Transforms raw transaction data into ML-ready features for spending predictions.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    """
    Processes transaction data and engineers features for ML models.
    Handles daily aggregation, temporal features, lag features, and behavioral patterns.
    """

    def __init__(self):
        self.categories = [
            'Food', 'Beverage', 'Home', 'Shopping', 'Transport',
            'Entertainment', 'Beauty', 'Sports', 'Personal', 'Work',
            'Other', 'Bills', 'Travel'
        ]

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Main feature engineering pipeline.
        Converts raw transactions into daily aggregates with comprehensive features.
        """
        try:
            # Ensure date column exists and is properly formatted
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
            elif 'created_at' in df.columns:
                df['date'] = pd.to_datetime(df['created_at'])
            else:
                raise ValueError("No date column found in transactions")

            df = df.sort_values('date')

            # Build feature pipeline
            daily_df = self._create_daily_aggregates(df)
            daily_df = self._add_temporal_features(daily_df)

            # Add week-based features
            daily_df['week_number'] = daily_df['date'].dt.isocalendar().week
            daily_df['is_end_of_month'] = (daily_df['date'].dt.day > 25).astype(int)

            daily_df = self._add_lag_features(daily_df)
            daily_df = self._add_rolling_features(daily_df)
            daily_df = self._add_behavioral_features(daily_df)
            daily_df = self._handle_missing_values(daily_df)

            return daily_df

        except Exception as e:
            logger.error(f"Error in feature preparation: {str(e)}")
            raise

    def _create_daily_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate transactions by day and category.
        Filters to expenses only (excludes income) for accurate spending analysis.
        """
        # Filter to expense transactions only
        if 'transaction_type' in df.columns:
            expense_df = df[df['transaction_type'].str.lower() == 'expense'].copy()
        elif 'type' in df.columns:
            expense_df = df[df['type'].str.lower() == 'expense'].copy()
        else:
            expense_df = df[df['amount'] > 0].copy()

        expense_df['amount'] = expense_df['amount'].abs()
        logger.info(f"Filtered to expenses: {len(expense_df)} from {len(df)} total transactions")

        expense_df['date'] = expense_df['date'].dt.date

        # Create continuous date range
        date_range = pd.date_range(
            start=expense_df['date'].min(),
            end=expense_df['date'].max(),
            freq='D'
        )

        daily_df = pd.DataFrame(index=date_range)
        daily_df.index.name = 'date'

        # Aggregate spending by category
        for category in self.categories:
            cat_data = expense_df[expense_df['category'] == category]
            if not cat_data.empty:
                cat_daily = cat_data.groupby('date')['amount'].sum()
                daily_df[category] = cat_daily
            else:
                daily_df[category] = 0

        daily_df[self.categories] = daily_df[self.categories].fillna(0)
        daily_df['total_daily'] = daily_df[self.categories].sum(axis=1)

        daily_df = daily_df.reset_index()
        daily_df['date'] = pd.to_datetime(daily_df['date'])

        return daily_df

    def _add_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add time-based features including cyclical encodings"""
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['week_of_month'] = (df['date'].dt.day - 1) // 7 + 1
        df['month'] = df['date'].dt.month
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_month_start'] = (df['day_of_month'] <= 3).astype(int)
        df['is_month_end'] = (df['day_of_month'] >= 28).astype(int)

        # Cyclical encoding for day of week (sine/cosine transformation)
        df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)

        # Cyclical encoding for day of month
        df['dom_sin'] = np.sin(2 * np.pi * df['day_of_month'] / 31)
        df['dom_cos'] = np.cos(2 * np.pi * df['day_of_month'] / 31)

        return df

    def _add_lag_features(self, df: pd.DataFrame, lags: List[int] = None) -> pd.DataFrame:
        """
        Create lagged features to capture historical spending patterns.
        Uses extensive lags (1-30 days) for improved monthly pattern detection.
        """
        if lags is None:
            primary_lags = [1, 2, 3, 7, 14]
            extended_lags = list(range(1, 31))
            lags = sorted(list(set(primary_lags + extended_lags)))

        for lag in lags:
            df[f'total_lag_{lag}'] = df['total_daily'].shift(lag)

            # Lag key categories for category-specific patterns
            for category in self.categories:
                if category in df.columns:
                    df[f'{category}_lag_{lag}'] = df[category].shift(lag)

        return df

    def _add_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add rolling window statistics for trend analysis.
        Includes moving averages, volatility, and peak spending detection.
        """
        windows = [3, 7, 14, 30]

        for window in windows:
            # Rolling mean for trend
            df[f'total_rolling_mean_{window}'] = (
                df['total_daily'].rolling(window=window, min_periods=1).mean()
            )

            # Special 7-day average used by forecaster
            if window == 7:
                df['Total_7day_avg'] = df[f'total_rolling_mean_{window}']

            # Rolling standard deviation for volatility
            df[f'total_rolling_std_{window}'] = (
                df['total_daily'].rolling(window=window, min_periods=2).std()
            )

            # Rolling max for spike detection
            df[f'total_rolling_max_{window}'] = (
                df['total_daily'].rolling(window=window, min_periods=1).max()
            )

        # Category-specific rolling features
        for category in self.categories:
            if category in df.columns:
                df[f'{category}_7day_avg'] = (
                    df[category].rolling(window=7, min_periods=1).mean()
                )
                df[f'{category}_rolling_mean_7'] = df[f'{category}_7day_avg']

        return df

    def _add_behavioral_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add features capturing spending behavior patterns.
        Includes spike detection, momentum, and category diversity.
        """
        # Identify spending spikes (more than 2x average)
        avg_daily = df['total_daily'].mean()
        df['is_spike'] = (df['total_daily'] > 2 * avg_daily).astype(int)

        # Track days since last spending spike
        df['days_since_spike'] = 0
        last_spike_idx = -999

        for idx in df.index:
            if df.loc[idx, 'is_spike'] == 1:
                last_spike_idx = idx
                df.loc[idx, 'days_since_spike'] = 0
            else:
                df.loc[idx, 'days_since_spike'] = idx - last_spike_idx

        # Spending momentum (change in 3-day trend)
        df['spending_momentum'] = (
            df['total_daily'].rolling(window=3).mean() -
            df['total_daily'].rolling(window=3).mean().shift(3)
        )

        # Number of active spending categories per day
        category_cols = [c for c in self.categories if c in df.columns]
        df['category_diversity'] = (df[category_cols] > 0).sum(axis=1)

        # Spending consistency (coefficient of variation)
        rolling_mean = df['total_daily'].rolling(window=7, min_periods=1).mean()
        rolling_std = df['total_daily'].rolling(window=7, min_periods=2).std()
        df['spending_consistency'] = rolling_std / (rolling_mean + 1e-6)

        df = self._add_recurrence_features(df)
        df = self._add_spike_memory_features(df)
        df = self._add_activity_features(df)

        return df

    def _add_recurrence_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Detect recurring spending patterns (weekly, bi-weekly patterns).
        Focuses on categories with irregular patterns.
        """
        target_categories = ['Shopping', 'Beauty', 'Home']

        for cat in target_categories:
            if cat not in df.columns:
                continue

            days_since_last = []
            last_spend_idx = None

            for idx in df.index:
                if df.loc[idx, cat] > 0:
                    if last_spend_idx is not None:
                        days_gap = idx - last_spend_idx
                        days_since_last.append(days_gap)
                    else:
                        days_since_last.append(np.nan)
                    last_spend_idx = idx
                else:
                    if last_spend_idx is None:
                        days_since_last.append(np.nan)
                    else:
                        days_since_last.append(idx - last_spend_idx)

            df[f'{cat}_since_last'] = days_since_last

            # Flag weekly (6-8 days) and bi-weekly (13-15 days) patterns
            df[f'{cat}_recurrence'] = df[f'{cat}_since_last'].apply(
                lambda x: 1 if x in [6, 7, 8, 13, 14, 15] else 0 if not pd.isna(x) else 0
            )

        return df

    def _add_spike_memory_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Track recent spending spikes using 3-day rolling sums.
        Helps predict post-spike spending patterns.
        """
        spike_thresholds = {
            'Shopping': 100,
            'Beauty': 100,
            'Home': 100
        }

        for cat, threshold in spike_thresholds.items():
            if cat not in df.columns:
                continue

            df[f'{cat}_3day_sum'] = df[cat].rolling(window=3, min_periods=1).sum()
            df[f'{cat}_spike_memory'] = (df[f'{cat}_3day_sum'] > threshold).astype(int)

        return df

    def _add_activity_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate category activity levels based on spending frequency.
        Classifies categories as inactive, occasional, or regular.
        """
        for cat in self.categories:
            if cat not in df.columns:
                continue

            # Rolling activity rate over 30 days
            df[f'{cat}_activity_rate'] = (
                (df[cat] > 0).rolling(window=30, min_periods=1).mean()
            )

            # Classify activity level
            df[f'{cat}_activity_level'] = pd.cut(
                df[f'{cat}_activity_rate'],
                bins=[0, 0.1, 0.3, 1.0],
                labels=['inactive', 'occasional', 'regular']
            )

        return df

    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Fill missing values with appropriate defaults.
        Uses forward fill for lags, expanding mean for rolling features.
        """
        # Forward fill lag features
        lag_columns = [col for col in df.columns if 'lag' in col]
        if lag_columns:
            df[lag_columns] = df[lag_columns].ffill().fillna(0)

        # Fill rolling features with expanding window mean
        rolling_columns = [col for col in df.columns if 'rolling' in col]
        for col in rolling_columns:
            df[col] = df[col].fillna(df['total_daily'].expanding().mean())

        # Fill remaining numeric columns with 0
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        df[numeric_columns] = df[numeric_columns].fillna(0)

        # Replace infinite values
        df = df.replace([np.inf, -np.inf], 999999)

        return df

    def prepare_category_features(self, df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
        """
        Prepare separate feature sets for each spending category.
        Useful for category-specific models.
        """
        category_features = {}

        for category in self.categories:
            if category not in df.columns:
                continue

            cat_df = pd.DataFrame()
            cat_df['date'] = df['date']
            cat_df['amount'] = df[category]
            cat_df['day_of_week'] = df['day_of_week']
            cat_df['is_weekend'] = df['is_weekend']

            # Add category-specific lags
            for lag in [1, 2, 3, 7]:
                cat_df[f'lag_{lag}'] = cat_df['amount'].shift(lag)

            # Add category-specific rolling features
            cat_df['rolling_mean_7'] = cat_df['amount'].rolling(window=7, min_periods=1).mean()
            cat_df['rolling_std_7'] = cat_df['amount'].rolling(window=7, min_periods=2).std()

            cat_df = cat_df.fillna(0)
            category_features[category] = cat_df

        return category_features

    def create_weekly_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate daily data into weekly summaries.
        Used for weekly budget and prediction reports.
        """
        df_copy = df.set_index('date')
        weekly_df = pd.DataFrame()

        # Sum spending categories
        for category in self.categories:
            if category in df_copy.columns:
                weekly_df[category] = df_copy[category].resample('W').sum()

        weekly_df['total_weekly'] = df_copy['total_daily'].resample('W').sum()
        weekly_df['avg_weekend_ratio'] = df_copy['is_weekend'].resample('W').mean()
        weekly_df['max_daily_spending'] = df_copy['total_daily'].resample('W').max()
        weekly_df['avg_daily_spending'] = df_copy['total_daily'].resample('W').mean()
        weekly_df['spending_volatility'] = df_copy['total_daily'].resample('W').std()

        return weekly_df.reset_index()

    def create_monthly_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate daily data into monthly summaries.
        Includes spending totals, volatility, and category diversity metrics.
        """
        df_copy = df.set_index('date')
        monthly_df = pd.DataFrame()

        # Sum spending categories
        for category in self.categories:
            if category in df_copy.columns:
                monthly_df[category] = df_copy[category].resample('M').sum()

        monthly_df['total_monthly'] = df_copy['total_daily'].resample('M').sum()
        monthly_df['active_days'] = (df_copy['total_daily'] > 0).resample('M').sum()
        monthly_df['avg_daily_spending'] = df_copy['total_daily'].resample('M').mean()
        monthly_df['spending_volatility'] = df_copy['total_daily'].resample('M').std()
        monthly_df['avg_category_diversity'] = df_copy['category_diversity'].resample('M').mean()

        return monthly_df.reset_index()
