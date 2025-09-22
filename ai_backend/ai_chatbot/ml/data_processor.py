"""
Data Processing and Feature Engineering Module
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    """
    Process transaction data and engineer features for ML models
    """

    def __init__(self):
        self.categories = [
            'Food', 'Beverage', 'Home', 'Shopping', 'Transport',
            'Entertainment', 'Beauty', 'Sports', 'Personal', 'Work',
            'Other', 'Bills', 'Travel'
        ]

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare features from raw transaction data
        """
        try:
            # Convert to datetime and ensure proper format
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
            elif 'created_at' in df.columns:
                df['date'] = pd.to_datetime(df['created_at'])
            else:
                raise ValueError("No date column found in transactions")

            # Sort by date
            df = df.sort_values('date')

            # Create daily aggregates
            daily_df = self._create_daily_aggregates(df)

            # Add temporal features
            daily_df = self._add_temporal_features(daily_df)

            # Add lag features
            daily_df = self._add_lag_features(daily_df)

            # Add rolling features
            daily_df = self._add_rolling_features(daily_df)

            # Add behavioral features
            daily_df = self._add_behavioral_features(daily_df)

            # Fill missing values
            daily_df = self._handle_missing_values(daily_df)

            return daily_df

        except Exception as e:
            logger.error(f"Error in feature preparation: {str(e)}")
            raise

    def _create_daily_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create daily spending aggregates by category
        """
        # Filter only expenses (negative amounts or type='expense')
        if 'type' in df.columns:
            expense_df = df[df['type'] == 'expense'].copy()
        else:
            expense_df = df[df['amount'] < 0].copy()
            expense_df['amount'] = expense_df['amount'].abs()

        # Create date index
        expense_df['date'] = expense_df['date'].dt.date

        # Initialize daily dataframe with all dates
        date_range = pd.date_range(
            start=expense_df['date'].min(),
            end=expense_df['date'].max(),
            freq='D'
        )

        daily_df = pd.DataFrame(index=date_range)
        daily_df.index.name = 'date'

        # Aggregate by category
        for category in self.categories:
            cat_data = expense_df[expense_df['category'] == category]
            if not cat_data.empty:
                cat_daily = cat_data.groupby('date')['amount'].sum()
                daily_df[category] = cat_daily
            else:
                daily_df[category] = 0

        # Fill NaN with 0 for categories
        daily_df[self.categories] = daily_df[self.categories].fillna(0)

        # Add total daily spending
        daily_df['total_daily'] = daily_df[self.categories].sum(axis=1)

        # Reset index to have date as column
        daily_df = daily_df.reset_index()
        daily_df['date'] = pd.to_datetime(daily_df['date'])

        return daily_df

    def _add_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add temporal features (day of week, month, etc.)
        """
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['week_of_month'] = (df['date'].dt.day - 1) // 7 + 1
        df['month'] = df['date'].dt.month
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_month_start'] = (df['day_of_month'] <= 3).astype(int)
        df['is_month_end'] = (df['day_of_month'] >= 28).astype(int)

        # Add cyclical encoding for day of week
        df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)

        # Add cyclical encoding for day of month
        df['dom_sin'] = np.sin(2 * np.pi * df['day_of_month'] / 31)
        df['dom_cos'] = np.cos(2 * np.pi * df['day_of_month'] / 31)

        return df

    def _add_lag_features(self, df: pd.DataFrame, lags: List[int] = [1, 2, 3, 7]) -> pd.DataFrame:
        """
        Add lagged features for time series prediction
        """
        for lag in lags:
            # Lag total spending
            df[f'total_lag_{lag}'] = df['total_daily'].shift(lag)

            # Lag key categories
            for category in ['Food', 'Transport', 'Shopping']:
                if category in df.columns:
                    df[f'{category}_lag_{lag}'] = df[category].shift(lag)

        return df

    def _add_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add rolling window features
        """
        windows = [3, 7, 14, 30]

        for window in windows:
            # Rolling mean
            df[f'total_rolling_mean_{window}'] = (
                df['total_daily'].rolling(window=window, min_periods=1).mean()
            )

            # Rolling std (volatility)
            df[f'total_rolling_std_{window}'] = (
                df['total_daily'].rolling(window=window, min_periods=2).std()
            )

            # Rolling max (recent spikes)
            df[f'total_rolling_max_{window}'] = (
                df['total_daily'].rolling(window=window, min_periods=1).max()
            )

        # Category-specific rolling features for important categories
        for category in ['Food', 'Transport']:
            if category in df.columns:
                df[f'{category}_rolling_mean_7'] = (
                    df[category].rolling(window=7, min_periods=1).mean()
                )

        return df

    def _add_behavioral_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add behavioral pattern features
        """
        # Days since last large expense (>2x daily average)
        avg_daily = df['total_daily'].mean()
        df['is_spike'] = (df['total_daily'] > 2 * avg_daily).astype(int)

        # Calculate days since last spike
        df['days_since_spike'] = 0
        last_spike_idx = -999

        for idx in df.index:
            if df.loc[idx, 'is_spike'] == 1:
                last_spike_idx = idx
                df.loc[idx, 'days_since_spike'] = 0
            else:
                df.loc[idx, 'days_since_spike'] = idx - last_spike_idx

        # Spending momentum (3-day trend)
        df['spending_momentum'] = (
            df['total_daily'].rolling(window=3).mean() -
            df['total_daily'].rolling(window=3).mean().shift(3)
        )

        # Category diversity (number of categories with spending)
        category_cols = [c for c in self.categories if c in df.columns]
        df['category_diversity'] = (df[category_cols] > 0).sum(axis=1)

        # Spending consistency (coefficient of variation over 7 days)
        rolling_mean = df['total_daily'].rolling(window=7, min_periods=1).mean()
        rolling_std = df['total_daily'].rolling(window=7, min_periods=2).std()
        df['spending_consistency'] = rolling_std / (rolling_mean + 1e-6)

        return df

    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values in the dataset
        """
        # Forward fill for lag features
        lag_columns = [col for col in df.columns if 'lag' in col]
        if lag_columns:
            df[lag_columns] = df[lag_columns].ffill().fillna(0)

        # Fill rolling features with expanding window values
        rolling_columns = [col for col in df.columns if 'rolling' in col]
        for col in rolling_columns:
            df[col] = df[col].fillna(df['total_daily'].expanding().mean())

        # Fill other numeric columns with 0
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        df[numeric_columns] = df[numeric_columns].fillna(0)

        # Replace inf values with large number
        df = df.replace([np.inf, -np.inf], 999999)

        return df

    def prepare_category_features(self, df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
        """
        Prepare features for each category separately
        """
        category_features = {}

        for category in self.categories:
            if category not in df.columns:
                continue

            cat_df = pd.DataFrame()
            cat_df['date'] = df['date']
            cat_df['amount'] = df[category]

            # Add temporal features
            cat_df['day_of_week'] = df['day_of_week']
            cat_df['is_weekend'] = df['is_weekend']

            # Add specific lags
            for lag in [1, 2, 3, 7]:
                cat_df[f'lag_{lag}'] = cat_df['amount'].shift(lag)

            # Add rolling features
            cat_df['rolling_mean_7'] = cat_df['amount'].rolling(window=7, min_periods=1).mean()
            cat_df['rolling_std_7'] = cat_df['amount'].rolling(window=7, min_periods=2).std()

            # Fill missing values
            cat_df = cat_df.fillna(0)

            category_features[category] = cat_df

        return category_features

    def create_weekly_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create weekly aggregates from daily data
        """
        # Set date as index
        df_copy = df.set_index('date')

        # Resample to weekly
        weekly_df = pd.DataFrame()

        # Sum spending categories
        for category in self.categories:
            if category in df_copy.columns:
                weekly_df[category] = df_copy[category].resample('W').sum()

        # Sum total
        weekly_df['total_weekly'] = df_copy['total_daily'].resample('W').sum()

        # Average of temporal features
        weekly_df['avg_weekend_ratio'] = df_copy['is_weekend'].resample('W').mean()

        # Max and mean for volatility
        weekly_df['max_daily_spending'] = df_copy['total_daily'].resample('W').max()
        weekly_df['avg_daily_spending'] = df_copy['total_daily'].resample('W').mean()
        weekly_df['spending_volatility'] = df_copy['total_daily'].resample('W').std()

        # Reset index
        weekly_df = weekly_df.reset_index()

        return weekly_df

    def create_monthly_aggregates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create monthly aggregates from daily data
        """
        # Set date as index
        df_copy = df.set_index('date')

        # Resample to monthly
        monthly_df = pd.DataFrame()

        # Sum spending categories
        for category in self.categories:
            if category in df_copy.columns:
                monthly_df[category] = df_copy[category].resample('M').sum()

        # Sum total
        monthly_df['total_monthly'] = df_copy['total_daily'].resample('M').sum()

        # Count active days
        monthly_df['active_days'] = (df_copy['total_daily'] > 0).resample('M').sum()

        # Average daily spending
        monthly_df['avg_daily_spending'] = df_copy['total_daily'].resample('M').mean()

        # Spending volatility
        monthly_df['spending_volatility'] = df_copy['total_daily'].resample('M').std()

        # Category diversity
        monthly_df['avg_category_diversity'] = df_copy['category_diversity'].resample('M').mean()

        # Reset index
        monthly_df = monthly_df.reset_index()

        return monthly_df