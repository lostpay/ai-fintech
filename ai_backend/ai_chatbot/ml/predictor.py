"""
Spending Prediction Module using Random Forest
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from typing import Tuple, List, Dict, Any, Optional
import joblib
import logging
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)

class SpendingPredictor:
    """
    Random Forest-based spending predictor
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.feature_importance = {}
        self.model_path = model_path or "ml_models/"
        self.metrics = {}
        self.feature_columns = []

        # Ensure model directory exists
        os.makedirs(self.model_path, exist_ok=True)

    def train(self, df: pd.DataFrame, target_col: str = 'total_daily') -> Dict[str, float]:
        """
        Train the Random Forest model
        """
        try:
            # Prepare features and target
            X, y, feature_cols = self._prepare_training_data(df, target_col)

            if len(X) < 30:
                raise ValueError("Insufficient data for training (need at least 30 samples)")

            self.feature_columns = feature_cols

            # Initialize model with parameters from notebook
            self.model = RandomForestRegressor(
                n_estimators=300,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )

            # Time series cross-validation
            tscv = TimeSeriesSplit(n_splits=5)
            cv_scores = []

            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

                # Fit model
                self.model.fit(X_train, y_train)

                # Validate
                y_pred = self.model.predict(X_val)
                mae = mean_absolute_error(y_val, y_pred)
                cv_scores.append(mae)

            # Final training on all data
            self.model.fit(X, y)

            # Calculate feature importance
            self.feature_importance = dict(zip(
                feature_cols,
                self.model.feature_importances_
            ))

            # Sort features by importance
            self.feature_importance = dict(sorted(
                self.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            ))

            # Calculate final metrics
            y_pred = self.model.predict(X)
            self.metrics = {
                'mae': mean_absolute_error(y, y_pred),
                'rmse': np.sqrt(mean_squared_error(y, y_pred)),
                'r2': r2_score(y, y_pred),
                'cv_mae': np.mean(cv_scores),
                'cv_std': np.std(cv_scores),
                'samples_trained': len(X)
            }

            logger.info(f"Model trained successfully. MAE: {self.metrics['mae']:.2f}")

            # Save model
            self._save_model()

            return self.metrics

        except Exception as e:
            logger.error(f"Training error: {str(e)}")
            raise

    def predict(self, df: pd.DataFrame, timeframe: str = 'daily',
                horizon: int = 7) -> Tuple[List[Dict], float, List[str]]:
        """
        Generate spending predictions
        """
        try:
            # Load model if not in memory
            if self.model is None:
                self._load_model()

            predictions = []

            if timeframe == 'daily':
                predictions = self._predict_daily(df, horizon)
            elif timeframe == 'weekly':
                predictions = self._predict_weekly(df, horizon)
            elif timeframe == 'monthly':
                predictions = self._predict_monthly(df, horizon)
            else:
                raise ValueError(f"Invalid timeframe: {timeframe}")

            # Calculate confidence based on recent prediction accuracy
            confidence = self._calculate_confidence(df)

            # Get top feature drivers
            drivers = self._get_prediction_drivers()

            return predictions, confidence, drivers

        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise

    def _prepare_training_data(self, df: pd.DataFrame, target_col: str) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
        """
        Prepare features and target for training
        """
        # Define feature columns to use
        feature_cols = [
            'day_of_week', 'is_weekend', 'is_month_start', 'is_month_end',
            'dow_sin', 'dow_cos', 'dom_sin', 'dom_cos',
            'total_lag_1', 'total_lag_2', 'total_lag_3', 'total_lag_7',
            'total_rolling_mean_3', 'total_rolling_mean_7', 'total_rolling_mean_14',
            'total_rolling_std_7', 'total_rolling_max_7',
            'days_since_spike', 'spending_momentum', 'category_diversity',
            'spending_consistency'
        ]

        # Add category-specific features if available
        for category in ['Food', 'Transport', 'Shopping']:
            if f'{category}_lag_1' in df.columns:
                feature_cols.extend([
                    f'{category}_lag_1',
                    f'{category}_lag_7',
                    f'{category}_rolling_mean_7'
                ])

        # Filter available features
        available_features = [col for col in feature_cols if col in df.columns]

        # Log feature availability
        missing_features = [col for col in feature_cols if col not in df.columns]
        if missing_features:
            logger.warning(f"Missing features: {missing_features[:5]}...")  # Show first 5

        logger.info(f"Using {len(available_features)} features for training")

        # Remove rows with NaN in features or target
        clean_df = df[available_features + [target_col]].dropna()

        # Validate data quality
        if len(clean_df) == 0:
            raise ValueError("No valid data rows after cleaning")

        # Check for feature variance (avoid constant features)
        X = clean_df[available_features]
        y = clean_df[target_col]

        # Log data shape
        logger.info(f"Training data shape: {X.shape}, target range: {y.min():.2f} to {y.max():.2f}")

        return X, y, available_features

    def _predict_daily(self, df: pd.DataFrame, horizon: int) -> List[Dict]:
        """
        Predict daily spending
        """
        predictions = []
        last_date = df['date'].max()

        # Create future dates
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=horizon,
            freq='D'
        )

        for date in future_dates:
            # Prepare features for prediction
            features = self._create_future_features(df, date)

            # Predict
            pred_amount = self.model.predict(features)[0]

            # Calculate prediction interval
            # Using ensemble variance for uncertainty
            tree_predictions = np.array([
                tree.predict(features)[0] for tree in self.model.estimators_
            ])
            lower_bound = np.percentile(tree_predictions, 25)
            upper_bound = np.percentile(tree_predictions, 75)

            predictions.append({
                'date': date.isoformat(),
                'predicted_amount': float(pred_amount),
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound),
                'timeframe': 'daily'
            })

            # Update DataFrame with prediction for next iteration
            new_row = pd.DataFrame({
                'date': [date],
                'total_daily': [pred_amount]
            })
            df = pd.concat([df, new_row], ignore_index=True)

        return predictions

    def check_overspending(self, df: pd.DataFrame, budget_data: Dict = None) -> Dict:
        """
        Check if user is likely to overspend based on predictions and budget
        """
        try:
            # Get weekly prediction
            predictions, confidence, drivers = self.predict(df, timeframe='weekly', horizon=1)

            if not predictions:
                return {
                    'overspending': False,
                    'message': 'Unable to make prediction with current data.',
                    'confidence': 0.3
                }

            predicted_weekly = predictions[0]['predicted_amount']

            # If no budget provided, use simple heuristic
            if not budget_data or budget_data.get('total', 0) <= 0:
                # Compare to historical average
                avg_weekly = df['total_daily'].mean() * 7 if 'total_daily' in df.columns else 0
                overspending = predicted_weekly > avg_weekly * 1.2  # 20% above average

                return {
                    'overspending': overspending,
                    'message': f'Predicted: NT${predicted_weekly:.0f} vs average NT${avg_weekly:.0f}/week',
                    'predicted_amount': predicted_weekly,
                    'budget_amount': avg_weekly,
                    'confidence': confidence
                }
            else:
                # Use actual budget
                weekly_budget = budget_data.get('total', 0) / 4.3  # Convert monthly to weekly
                overspending = predicted_weekly > weekly_budget

                return {
                    'overspending': overspending,
                    'message': f'Predicted: NT${predicted_weekly:.0f} vs budget NT${weekly_budget:.0f}/week',
                    'predicted_amount': predicted_weekly,
                    'budget_amount': weekly_budget,
                    'confidence': confidence
                }

        except Exception as e:
            logger.error(f'Overspending check error: {str(e)}')
            return {
                'overspending': False,
                'message': 'Unable to check overspending at this time.',
                'confidence': 0.3
            }

    def _predict_weekly(self, df: pd.DataFrame, horizon: int) -> List[Dict]:
        """
        Predict weekly spending
        """
        # Get daily predictions for the next weeks
        daily_predictions = self._predict_daily(df, horizon * 7)

        # Aggregate to weekly
        weekly_predictions = []
        for week in range(horizon):
            week_start = week * 7
            week_end = min((week + 1) * 7, len(daily_predictions))
            week_data = daily_predictions[week_start:week_end]

            weekly_sum = sum(p['predicted_amount'] for p in week_data)
            weekly_lower = sum(p['lower_bound'] for p in week_data)
            weekly_upper = sum(p['upper_bound'] for p in week_data)

            start_date = datetime.fromisoformat(week_data[0]['date'])
            end_date = datetime.fromisoformat(week_data[-1]['date'])

            weekly_predictions.append({
                'week_start': start_date.isoformat(),
                'week_end': end_date.isoformat(),
                'predicted_amount': float(weekly_sum),
                'lower_bound': float(weekly_lower),
                'upper_bound': float(weekly_upper),
                'timeframe': 'weekly'
            })

        return weekly_predictions

    def _predict_monthly(self, df: pd.DataFrame, horizon: int) -> List[Dict]:
        """
        Predict monthly spending
        """
        monthly_predictions = []
        last_date = df['date'].max()

        for month in range(horizon):
            # Get the target month
            target_month = last_date + pd.DateOffset(months=month+1)
            days_in_month = pd.Period(target_month, freq='M').days_in_month

            # Predict daily for the month
            daily_preds = self._predict_daily(df, days_in_month)

            # Aggregate to monthly
            monthly_sum = sum(p['predicted_amount'] for p in daily_preds)
            monthly_lower = sum(p['lower_bound'] for p in daily_preds)
            monthly_upper = sum(p['upper_bound'] for p in daily_preds)

            monthly_predictions.append({
                'month': target_month.strftime('%Y-%m'),
                'predicted_amount': float(monthly_sum),
                'lower_bound': float(monthly_lower),
                'upper_bound': float(monthly_upper),
                'days': days_in_month,
                'timeframe': 'monthly'
            })

            # Update df for next month
            df = pd.concat([
                df,
                pd.DataFrame({
                    'date': pd.date_range(
                        start=last_date + timedelta(days=1),
                        periods=days_in_month,
                        freq='D'
                    ),
                    'total_daily': [monthly_sum / days_in_month] * days_in_month
                })
            ], ignore_index=True)
            last_date = df['date'].max()

        return monthly_predictions

    def _create_future_features(self, df: pd.DataFrame, target_date: pd.Timestamp) -> pd.DataFrame:
        """
        Create features for future prediction
        """
        # Get the most recent data
        recent_data = df.tail(30).copy()

        # Create feature vector
        features = pd.DataFrame(index=[0])

        # Temporal features
        features['day_of_week'] = target_date.dayofweek
        features['is_weekend'] = int(target_date.dayofweek >= 5)
        features['is_month_start'] = int(target_date.day <= 3)
        features['is_month_end'] = int(target_date.day >= 28)

        # Cyclical encoding
        features['dow_sin'] = np.sin(2 * np.pi * target_date.dayofweek / 7)
        features['dow_cos'] = np.cos(2 * np.pi * target_date.dayofweek / 7)
        features['dom_sin'] = np.sin(2 * np.pi * target_date.day / 31)
        features['dom_cos'] = np.cos(2 * np.pi * target_date.day / 31)

        # Lag features (from recent data)
        if 'total_daily' in recent_data.columns:
            features['total_lag_1'] = recent_data['total_daily'].iloc[-1]
            features['total_lag_2'] = recent_data['total_daily'].iloc[-2] if len(recent_data) > 1 else 0
            features['total_lag_3'] = recent_data['total_daily'].iloc[-3] if len(recent_data) > 2 else 0
            features['total_lag_7'] = recent_data['total_daily'].iloc[-7] if len(recent_data) > 6 else 0
        else:
            features[['total_lag_1', 'total_lag_2', 'total_lag_3', 'total_lag_7']] = 0

        # Rolling features
        if 'total_daily' in recent_data.columns:
            features['total_rolling_mean_3'] = recent_data['total_daily'].tail(3).mean()
            features['total_rolling_mean_7'] = recent_data['total_daily'].tail(7).mean()
            features['total_rolling_mean_14'] = recent_data['total_daily'].tail(14).mean()
            features['total_rolling_std_7'] = recent_data['total_daily'].tail(7).std()
            features['total_rolling_max_7'] = recent_data['total_daily'].tail(7).max()
        else:
            features[['total_rolling_mean_3', 'total_rolling_mean_7', 'total_rolling_mean_14',
                     'total_rolling_std_7', 'total_rolling_max_7']] = 0

        # Behavioral features
        if 'days_since_spike' in recent_data.columns:
            features['days_since_spike'] = recent_data['days_since_spike'].iloc[-1] + 1
        else:
            features['days_since_spike'] = 7

        if 'spending_momentum' in recent_data.columns:
            features['spending_momentum'] = recent_data['spending_momentum'].mean()
        else:
            features['spending_momentum'] = 0

        if 'category_diversity' in recent_data.columns:
            features['category_diversity'] = recent_data['category_diversity'].mean()
        else:
            features['category_diversity'] = 3

        if 'spending_consistency' in recent_data.columns:
            features['spending_consistency'] = recent_data['spending_consistency'].mean()
        else:
            features['spending_consistency'] = 0.5

        # Add category-specific features
        for category in ['Food', 'Transport', 'Shopping']:
            for suffix in ['_lag_1', '_lag_7', '_rolling_mean_7']:
                col_name = f'{category}{suffix}'
                if col_name in self.feature_columns:
                    if col_name in recent_data.columns:
                        if 'lag' in col_name:
                            features[col_name] = recent_data[category].iloc[-1] if category in recent_data.columns else 0
                        else:
                            features[col_name] = recent_data[category].tail(7).mean() if category in recent_data.columns else 0
                    else:
                        features[col_name] = 0

        # Ensure all required features are present
        for col in self.feature_columns:
            if col not in features.columns:
                features[col] = 0

        return features[self.feature_columns]

    def _calculate_confidence(self, df: pd.DataFrame) -> float:
        """
        Calculate prediction confidence based on recent accuracy
        """
        if self.metrics and 'mae' in self.metrics:
            # Base confidence on inverse of normalized MAE
            avg_spending = df['total_daily'].mean() if 'total_daily' in df.columns else 100
            normalized_mae = self.metrics['mae'] / (avg_spending + 1e-6)
            confidence = max(0.5, min(0.95, 1 - normalized_mae))
        else:
            confidence = 0.7  # Default confidence

        return float(confidence)

    def _get_prediction_drivers(self, top_n: int = 5) -> List[str]:
        """
        Get top feature drivers for predictions
        """
        if not self.feature_importance:
            return []

        # Convert feature names to human-readable
        feature_mapping = {
            'total_lag_1': 'Yesterday\'s spending',
            'total_lag_7': 'Last week\'s spending',
            'total_rolling_mean_7': '7-day average',
            'day_of_week': 'Day of week pattern',
            'is_weekend': 'Weekend effect',
            'spending_momentum': 'Recent trend',
            'category_diversity': 'Spending categories',
            'Food_rolling_mean_7': 'Food spending trend',
            'Transport_rolling_mean_7': 'Transport trend'
        }

        drivers = []
        for feature, importance in list(self.feature_importance.items())[:top_n]:
            readable_name = feature_mapping.get(feature, feature)
            drivers.append(f"{readable_name} ({importance:.2%})")

        return drivers

    def _save_model(self):
        """
        Save trained model to disk
        """
        if self.model:
            model_file = os.path.join(self.model_path, 'spending_predictor.joblib')
            joblib.dump({
                'model': self.model,
                'feature_columns': self.feature_columns,
                'feature_importance': self.feature_importance,
                'metrics': self.metrics,
                'timestamp': datetime.now().isoformat()
            }, model_file)
            logger.info(f"Model saved to {model_file}")

    def _load_model(self):
        """
        Load model from disk
        """
        model_file = os.path.join(self.model_path, 'spending_predictor.joblib')
        if os.path.exists(model_file):
            model_data = joblib.load(model_file)
            self.model = model_data['model']
            self.feature_columns = model_data['feature_columns']
            self.feature_importance = model_data.get('feature_importance', {})
            self.metrics = model_data.get('metrics', {})
            logger.info(f"Model loaded from {model_file}")
        else:
            raise FileNotFoundError(f"No model found at {model_file}")