"""
Spending Pattern Detection Module.
Identifies recurring patterns, spending spikes, volatility, trends, and seasonality in transaction data.
"""

import pandas as pd
import numpy as np
from scipy import signal, stats
from typing import Dict, List, Any, Tuple, Optional
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class PatternDetector:
    """
    Analyzes spending data to detect behavioral patterns.
    Uses statistical methods including autocorrelation, Z-score analysis, and trend detection.
    """

    def __init__(self):
        self.min_data_points = 14
        self.recurrence_threshold = 0.6
        self.spike_threshold = 2.0
        self.categories = [
            'Food', 'Beverage', 'Home', 'Shopping', 'Transport',
            'Entertainment', 'Beauty', 'Sports', 'Personal', 'Work',
            'Other', 'Bills', 'Travel'
        ]

    def detect_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Run comprehensive pattern analysis on spending data.
        Returns dictionary with recurrences, spikes, volatility, trends, and seasonality.
        """
        try:
            patterns = {
                'recurrences': [],
                'spikes': [],
                'volatility': {},
                'activity_levels': {},
                'trends': {},
                'seasonality': {},
                'summary': {}
            }

            if len(df) < self.min_data_points:
                logger.warning(f"Insufficient data for pattern detection: {len(df)} days")
                return patterns

            # Run all pattern detection methods
            patterns['recurrences'] = self._detect_recurrences(df)
            patterns['spikes'] = self._detect_spikes(df)
            patterns['volatility'] = self._calculate_volatility(df)
            patterns['activity_levels'] = self._determine_activity_patterns(df)
            patterns['trends'] = self._detect_trends(df)
            patterns['seasonality'] = self._detect_seasonality(df)
            patterns['summary'] = self._generate_summary(df, patterns)

            return patterns

        except Exception as e:
            logger.error(f"Pattern detection error: {str(e)}")
            return {}

    def _detect_recurrences(self, df: pd.DataFrame) -> List[Dict]:
        """
        Find recurring spending patterns using autocorrelation analysis.
        Checks for weekly (6-8 day), bi-weekly (13-15 day), and monthly (28-31 day) patterns.
        """
        recurrences = []

        # Check total and key categories
        columns_to_check = ['total_daily']
        for cat in ['Food', 'Transport', 'Shopping', 'Bills']:
            if cat in df.columns:
                columns_to_check.append(cat)

        for column in columns_to_check:
            if column not in df.columns:
                continue

            series = df[column].fillna(0)

            # Skip inactive categories
            if (series > 0).mean() < 0.1:
                continue

            # Check each period type
            for pattern_name, period_range in [('weekly', (6, 8)), ('bi-weekly', (13, 15)), ('monthly', (28, 31))]:
                pattern = self._check_periodicity(series, period_range=period_range)
                if pattern['confidence'] > self.recurrence_threshold:
                    recurrences.append({
                        'category': column.replace('total_daily', 'Total'),
                        'pattern': pattern_name,
                        'period': pattern['period'],
                        'confidence': pattern['confidence'],
                        'strength': pattern['strength'],
                        'next_expected': self._predict_next_occurrence(df, pattern['period'])
                    })

        return recurrences

    def _check_periodicity(self, series: pd.Series,
                          period_range: Tuple[int, int]) -> Dict:
        """
        Detect periodic patterns using autocorrelation.
        Compares time series to itself at various lags to find repeating cycles.
        """
        try:
            # Remove linear trend for cleaner periodicity signal
            detrended = signal.detrend(series.values)

            # Compute autocorrelation function
            autocorr = np.correlate(detrended, detrended, mode='full')
            autocorr = autocorr[len(autocorr) // 2:]
            autocorr = autocorr / autocorr[0]

            # Find best period in range
            best_period = 0
            best_confidence = 0
            best_strength = 0

            for period in range(period_range[0], period_range[1] + 1):
                if period < len(autocorr):
                    correlation = autocorr[period]

                    # Check multiple periods for confirmation
                    if 2 * period < len(autocorr):
                        correlation2 = autocorr[2 * period]
                        avg_correlation = (correlation + correlation2) / 2
                    else:
                        avg_correlation = correlation

                    if avg_correlation > best_confidence:
                        best_confidence = avg_correlation
                        best_period = period
                        best_strength = self._calculate_pattern_strength(series, period)

            return {
                'period': best_period,
                'confidence': max(0, min(1, best_confidence)),
                'strength': best_strength
            }

        except Exception as e:
            logger.error(f"Periodicity check error: {str(e)}")
            return {'period': 0, 'confidence': 0, 'strength': 0}

    def _calculate_pattern_strength(self, series: pd.Series, period: int) -> float:
        """
        Measure how consistently values repeat at the detected period.
        Returns ratio of similar values at periodic intervals.
        """
        if period <= 0 or period >= len(series):
            return 0

        matches = 0
        comparisons = 0

        for i in range(len(series) - period):
            if series.iloc[i] > 0 and series.iloc[i + period] > 0:
                # Check if values are similar (within 50%)
                ratio = min(series.iloc[i], series.iloc[i + period]) / max(series.iloc[i], series.iloc[i + period])
                if ratio > 0.5:
                    matches += 1
                comparisons += 1

        if comparisons == 0:
            return 0

        return matches / comparisons

    def _detect_spikes(self, df: pd.DataFrame) -> List[Dict]:
        """
        Identify spending anomalies using Z-score analysis.
        Flags days where spending exceeds normal by multiple standard deviations.
        """
        spikes = []

        if 'total_daily' not in df.columns:
            return spikes

        series = df['total_daily'].fillna(0)

        # Calculate rolling statistics for baseline
        rolling_mean = series.rolling(window=7, min_periods=1).mean()
        rolling_std = series.rolling(window=7, min_periods=2).std()

        # Detect spikes using Z-score threshold
        for idx in range(len(series)):
            if idx < 7:
                continue

            value = series.iloc[idx]
            mean = rolling_mean.iloc[idx - 1]
            std = rolling_std.iloc[idx - 1]

            if std > 0 and mean > 0:
                z_score = (value - mean) / std

                if z_score > self.spike_threshold:
                    spike_categories = self._identify_spike_categories(df, idx)

                    spikes.append({
                        'date': df['date'].iloc[idx].isoformat() if 'date' in df.columns else idx,
                        'amount': float(value),
                        'z_score': float(z_score),
                        'expected': float(mean),
                        'categories': spike_categories,
                        'recent': idx >= len(series) - 7
                    })

        return spikes

    def _identify_spike_categories(self, df: pd.DataFrame, idx: int) -> List[str]:
        """
        Determine which categories contributed to a spending spike.
        Returns categories with unusually high spending on the spike day.
        """
        spike_categories = []

        categories = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Travel']
        for cat in categories:
            if cat not in df.columns:
                continue

            cat_value = df[cat].iloc[idx]
            cat_mean = df[cat].rolling(window=7, min_periods=1).mean().iloc[idx - 1]

            if cat_value > cat_mean * 1.5:
                spike_categories.append(cat)

        return spike_categories

    def _calculate_volatility(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        Compute coefficient of variation (volatility) for each category.
        Higher values indicate more unpredictable spending.
        """
        volatility = {}

        # Calculate for total spending
        if 'total_daily' in df.columns:
            series = df['total_daily'].fillna(0)
            if series.mean() > 0:
                volatility['total'] = float(series.std() / series.mean())
            else:
                volatility['total'] = 0

        # Calculate for active categories
        categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills']
        for cat in categories:
            if cat not in df.columns:
                continue

            series = df[cat].fillna(0)
            if (series > 0).mean() > 0.1:
                if series.mean() > 0:
                    volatility[cat] = float(series.std() / series.mean())
                else:
                    volatility[cat] = 0

        return volatility

    def _determine_activity_patterns(self, df: pd.DataFrame) -> Dict[str, str]:
        """
        Classify spending frequency for each category.
        Returns labels like 'inactive', 'occasional', 'regular', 'frequent', or 'clustered'.
        """
        activity_patterns = {}

        categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Beauty',
                     'Sports', 'Bills', 'Travel', 'Beverage', 'Home']

        for cat in categories:
            if cat not in df.columns:
                activity_patterns[cat] = 'inactive'
                continue

            series = df[cat].fillna(0)
            activity_rate = (series > 0).mean()

            # Classify based on frequency
            if activity_rate < 0.1:
                pattern = 'inactive'
            elif activity_rate < 0.3:
                pattern = 'occasional'
            elif activity_rate < 0.6:
                pattern = 'regular'
            else:
                pattern = 'frequent'

            # Check for bursty/clustered spending
            if pattern in ['occasional', 'regular']:
                clusters = self._detect_clustering(series > 0)
                if clusters > 0.3:
                    pattern = f'{pattern}_clustered'

            activity_patterns[cat] = pattern

        return activity_patterns

    def _detect_clustering(self, binary_series: pd.Series) -> float:
        """
        Measure if spending occurs in bursts rather than evenly distributed.
        Returns clustering score based on variance in run lengths.
        """
        if len(binary_series) < 7:
            return 0

        # Calculate runs (consecutive spending or no-spending days)
        runs = []
        current_run = 1

        for i in range(1, len(binary_series)):
            if binary_series.iloc[i] == binary_series.iloc[i - 1]:
                current_run += 1
            else:
                runs.append(current_run)
                current_run = 1
        runs.append(current_run)

        # Higher variance indicates clustering
        if len(runs) > 1:
            clustering = np.std(runs) / (np.mean(runs) + 1e-6)
            return min(1, clustering)
        else:
            return 0

    def _detect_trends(self, df: pd.DataFrame) -> Dict[str, Dict]:
        """
        Identify spending trends over different time windows using linear regression.
        Returns slope, confidence (R-value), and trend direction.
        """
        trends = {}

        if 'total_daily' not in df.columns or len(df) < 14:
            return trends

        series = df['total_daily'].fillna(0)

        # Analyze trends at multiple timescales
        for window_name, window_size in [('short', 7), ('medium', 14), ('long', 30)]:
            if len(series) >= window_size:
                recent = series.tail(window_size)
                x = np.arange(len(recent))
                y = recent.values

                # Fit linear regression
                slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

                # Normalize slope by mean
                mean_value = y.mean()
                if mean_value > 0:
                    normalized_slope = slope / mean_value
                else:
                    normalized_slope = 0

                # Classify trend direction
                if abs(normalized_slope) < 0.01:
                    trend = 'stable'
                elif normalized_slope > 0.01:
                    trend = 'increasing'
                else:
                    trend = 'decreasing'

                trends[f'{window_name}_term'] = {
                    'trend': trend,
                    'slope': float(normalized_slope),
                    'confidence': abs(float(r_value)),
                    'window_days': window_size
                }

        return trends

    def _detect_seasonality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Find day-of-week and monthly spending patterns.
        Identifies peak spending days and monthly distribution (front-loaded, mid-heavy, end-loaded).
        """
        seasonality = {}

        if len(df) < 28:
            return seasonality

        # Day of week analysis
        if 'day_of_week' in df.columns and 'total_daily' in df.columns:
            dow_spending = df.groupby('day_of_week')['total_daily'].agg(['mean', 'std', 'count'])

            peak_day = dow_spending['mean'].idxmax()
            low_day = dow_spending['mean'].idxmin()

            day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

            seasonality['day_of_week'] = {
                'peak_day': day_names[peak_day],
                'peak_amount': float(dow_spending.loc[peak_day, 'mean']),
                'low_day': day_names[low_day],
                'low_amount': float(dow_spending.loc[low_day, 'mean']),
                'weekend_vs_weekday': self._calculate_weekend_ratio(df)
            }

        # Monthly pattern analysis
        if len(df) >= 60 and 'day_of_month' in df.columns:
            start_month = df[df['day_of_month'] <= 5]['total_daily'].mean()
            mid_month = df[(df['day_of_month'] > 10) & (df['day_of_month'] <= 20)]['total_daily'].mean()
            end_month = df[df['day_of_month'] >= 25]['total_daily'].mean()

            seasonality['monthly'] = {
                'start_month_avg': float(start_month),
                'mid_month_avg': float(mid_month),
                'end_month_avg': float(end_month),
                'pattern': self._classify_monthly_pattern(start_month, mid_month, end_month)
            }

        return seasonality

    def _calculate_weekend_ratio(self, df: pd.DataFrame) -> float:
        """
        Compare weekend vs weekday spending levels.
        Returns ratio (1.0 = equal, >1.0 = higher on weekends).
        """
        if 'is_weekend' not in df.columns or 'total_daily' not in df.columns:
            return 1.0

        weekend_avg = df[df['is_weekend'] == 1]['total_daily'].mean()
        weekday_avg = df[df['is_weekend'] == 0]['total_daily'].mean()

        if weekday_avg > 0:
            return float(weekend_avg / weekday_avg)
        else:
            return 1.0

    def _classify_monthly_pattern(self, start: float, mid: float, end: float) -> str:
        """
        Determine when in the month spending peaks.
        Returns 'front-loaded', 'mid-heavy', or 'end-loaded'.
        """
        values = [start, mid, end]
        max_idx = values.index(max(values))

        if max_idx == 0:
            return 'front-loaded'
        elif max_idx == 1:
            return 'mid-heavy'
        else:
            return 'end-loaded'

    def _predict_next_occurrence(self, df: pd.DataFrame, period: int) -> str:
        """
        Calculate expected date of next occurrence based on detected period.
        Returns ISO format date string.
        """
        if 'date' not in df.columns or len(df) == 0:
            return ""

        last_date = pd.to_datetime(df['date'].max())
        next_date = last_date + timedelta(days=period)
        return next_date.isoformat()

    def _generate_summary(self, df: pd.DataFrame, patterns: Dict) -> Dict:
        """
        Create summary statistics from all detected patterns.
        Aggregates pattern counts, activity levels, and volatility metrics.
        """
        summary = {}

        # Overall spending metrics
        if 'total_daily' in df.columns:
            summary['avg_daily_spend'] = float(df['total_daily'].mean())
            summary['median_daily_spend'] = float(df['total_daily'].median())
            summary['max_daily_spend'] = float(df['total_daily'].max())
            summary['days_analyzed'] = len(df)

        # Pattern counts
        summary['recurrence_count'] = len(patterns.get('recurrences', []))
        summary['spike_count'] = len(patterns.get('spikes', []))
        summary['recent_spikes'] = sum(1 for s in patterns.get('spikes', []) if s.get('recent', False))

        # Activity summary
        activity_levels = patterns.get('activity_levels', {})
        summary['active_categories'] = sum(1 for v in activity_levels.values() if v == 'regular')
        summary['inactive_categories'] = sum(1 for v in activity_levels.values() if v == 'inactive')

        # Volatility summary
        volatility = patterns.get('volatility', {})
        if volatility:
            summary['avg_volatility'] = float(np.mean(list(volatility.values())))
            summary['high_volatility_categories'] = sum(1 for v in volatility.values() if v > 0.5)

        return summary

    def generate_insights(self, patterns: Dict) -> List[str]:
        """
        Convert pattern data into human-readable insights.
        Returns list of key findings about spending behavior.
        """
        insights = []

        # Recurrence insights
        if patterns.get('recurrences'):
            for rec in patterns['recurrences']:
                insights.append(
                    f"{rec['category']} spending occurs {rec['pattern']} "
                    f"(confidence: {rec['confidence']:.0%})"
                )

        # Spike insights
        recent_spikes = [s for s in patterns.get('spikes', []) if s['recent']]
        if recent_spikes:
            insights.append(
                f"Recent spending spike detected: "
                f"${recent_spikes[0]['amount']:.0f} "
                f"({recent_spikes[0]['z_score']:.1f}x normal)"
            )

        # Volatility insights
        if patterns.get('volatility'):
            high_volatility = [k for k, v in patterns['volatility'].items() if v > 0.5]
            if high_volatility:
                insights.append(
                    f"High spending volatility in: {', '.join(high_volatility)}"
                )

        # Trend insights
        if patterns.get('trends'):
            for window, trend_data in patterns['trends'].items():
                if trend_data['confidence'] > 0.7:
                    insights.append(
                        f"Spending is {trend_data['trend']} "
                        f"({window.replace('_term', '')} trend)"
                    )

        # Seasonality insights
        if patterns.get('seasonality'):
            dow = patterns['seasonality'].get('day_of_week', {})
            if dow:
                insights.append(
                    f"Peak spending day: {dow['peak_day']} "
                    f"(${dow['peak_amount']:.0f})"
                )

        return insights[:5]
