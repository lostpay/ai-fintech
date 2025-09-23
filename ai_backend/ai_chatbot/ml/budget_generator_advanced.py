"""
Advanced Budget Generation Module based on Notebook Implementation
Implements weekly and monthly budget recommendations with sophisticated pattern detection
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class AdvancedBudgetGenerator:
    """
    Generate personalized budgets using notebook's advanced algorithms
    """

    def __init__(self):
        # Categories from notebook
        self.categories = [
            'Food', 'Beverage', 'Home', 'Shopping', 'Transport',
            'Entertainment', 'Beauty', 'Sports', 'Personal', 'Work',
            'Other', 'Bills', 'Travel'
        ]

        # Essential categories with weekly floors (NT$ values from notebook)
        self.essentials_weekly = {
            'Food': 800,  # NT$800 weekly minimum
            'Transport': 200,  # NT$200 weekly minimum
            'Bills': 0,
            'Home': 100  # NT$100 weekly minimum
        }

        # Elasticity factors from notebook (higher = easier to cut)
        self.elasticity = defaultdict(lambda: 1.0, {
            'Shopping': 1.5,
            'Entertainment': 1.4,
            'Beauty': 1.3,
            'Beverage': 1.2,
            'Other': 1.2,
            'Travel': 1.2,
            'Food': 0.6,
            'Transport': 0.6,
            'Bills': 0.3,
            'Home': 0.7,
            'Sports': 1.1,
            'Personal': 1.0,
            'Work': 0.8
        })

        # Configuration from notebook
        self.config = {
            'lookback_weeks': 8,
            'alpha_ema': 0.6,
            'volatility_cushion': 0.20,
            'iqr_cap_mult': 1.75,
            'inactive_thresh_mo': 5,
            'spike_memory_days': 3,
            'spike_buffer_pct': 0.15,
            'hazard_days': [6, 7, 13, 14],
            'hazard_boost_pct': 0.20
        }

    def generate_weekly_budget(self, df: pd.DataFrame,
                              target_savings: Optional[float] = None) -> Dict[str, Any]:
        """
        Generate weekly budget using notebook's algorithm
        """
        try:
            # Clean and prepare data
            df = self._prepare_data(df)

            if df.empty:
                return self._get_default_weekly_budget()

            # Weekly aggregation (Monday to Sunday)
            weekly = self._aggregate_weekly(df)

            # Get recent weeks for analysis
            cutoff = weekly['week_end'].max() - pd.Timedelta(weeks=self.config['lookback_weeks']-1)
            wk_recent = weekly[weekly['week_end'] >= cutoff].reset_index(drop=True)

            if wk_recent.empty:
                return self._get_default_weekly_budget()

            # Calculate statistics and activity levels
            cat_stats = self._calculate_category_stats(df, wk_recent)

            # Build raw budget
            raw_budgets = {}
            for category in self.categories:
                if category in cat_stats:
                    raw_budgets[category] = self._calculate_raw_budget(
                        category, cat_stats[category]
                    )
                else:
                    raw_budgets[category] = 0.0

            raw_total = sum(raw_budgets.values())

            # Apply savings adjustment if requested
            if target_savings and target_savings > 0:
                adjusted_budgets = self._apply_savings_adjustment(
                    raw_budgets, raw_total, target_savings
                )
            else:
                adjusted_budgets = raw_budgets

            # Format response
            category_budgets = []
            for category in self.categories:
                stats = cat_stats.get(category, {})
                category_budgets.append({
                    'category': category,
                    'amount': round(adjusted_budgets[category], 2),
                    'raw_amount': round(raw_budgets[category], 2),
                    'activity': stats.get('activity', 'inactive'),
                    'median_active': stats.get('median_active', 0),
                    'ema': stats.get('ema', 0),
                    'volatility': stats.get('cv', 0),
                    'hazard': stats.get('hazard', 0),
                    'spike_memory': stats.get('spike_memory', 0),
                    'since_last': stats.get('since_last', float('inf'))
                })

            # Sort by amount
            category_budgets = sorted(
                category_budgets,
                key=lambda x: x['amount'],
                reverse=True
            )

            return {
                'categories': category_budgets,
                'total': sum(adjusted_budgets.values()),
                'period': 'weekly',
                'lookback_weeks': self.config['lookback_weeks'],
                'methodology': self._get_methodology_info(cat_stats),
                'confidence': self._calculate_confidence(df)
            }

        except Exception as e:
            logger.error(f"Weekly budget generation error: {str(e)}")
            return self._get_default_weekly_budget()

    def generate_monthly_budget(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate monthly budget using notebook's algorithm
        """
        try:
            # Clean and prepare data
            df = self._prepare_data(df)

            if df.empty:
                return self._get_default_monthly_budget()

            # Monthly aggregation
            monthly = self._aggregate_monthly(df)

            if len(monthly) < 2:
                # Not enough history, use weekly budget * 4.3
                weekly_budget = self.generate_weekly_budget(df)
                return self._convert_weekly_to_monthly(weekly_budget)

            # Calculate monthly budget for each category
            category_budgets = []

            for category in self.categories:
                if category not in monthly.columns:
                    continue

                # Calculate statistics
                ema = monthly[category].ewm(span=4, adjust=False).mean().iloc[-1]
                median = monthly[category].rolling(6, min_periods=2).median().iloc[-1]
                q75 = monthly[category].rolling(6, min_periods=2).quantile(0.75).iloc[-1]
                q25 = monthly[category].rolling(6, min_periods=2).quantile(0.25).iloc[-1]
                iqr = (q75 - q25) if not pd.isna(q75 - q25) else 0

                # Activity classification (based on spend days)
                day_col = f'{category}_days'
                if day_col in monthly.columns:
                    recent_days = monthly[day_col].tail(2).sum()
                    if recent_days <= 3:
                        activity = 'inactive'
                    elif recent_days <= 15:
                        activity = 'regular'
                    else:
                        activity = 'active'
                else:
                    activity = 'inactive'

                # Core blend: 70% EMA, 30% Median
                if pd.isna(ema):
                    ema = 0
                if pd.isna(median):
                    median = 0

                raw_budget = 0.7 * ema + 0.3 * median

                # Apply activity multiplier
                if activity == 'inactive':
                    raw_budget *= 0.35
                elif activity == 'active':
                    raw_budget *= 1.15

                # Apply monthly floor (weekly * 4.3)
                monthly_floor = self.essentials_weekly.get(category, 0) * 4.3
                raw_budget = max(raw_budget, monthly_floor)

                # Cap at recent high
                recent_high = monthly[category].tail(6).max()
                if not pd.isna(recent_high):
                    raw_budget = min(raw_budget, recent_high * 1.08)

                category_budgets.append({
                    'category': category,
                    'amount': round(raw_budget, 2),
                    'activity': activity,
                    'ema': round(ema, 2),
                    'median': round(median, 2),
                    'iqr': round(iqr, 2)
                })

            # Sort by amount
            category_budgets = sorted(
                category_budgets,
                key=lambda x: x['amount'],
                reverse=True
            )

            total_budget = sum(b['amount'] for b in category_budgets)

            return {
                'categories': category_budgets,
                'total': round(total_budget, 2),
                'period': 'monthly',
                'methodology': {
                    'approach': 'EMA-Median blend with activity adjustment',
                    'months_analyzed': len(monthly)
                },
                'confidence': self._calculate_confidence(df)
            }

        except Exception as e:
            logger.error(f"Monthly budget generation error: {str(e)}")
            return self._get_default_monthly_budget()

    def _prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare and clean data for budget generation
        """
        df = df.copy()

        # Ensure date column
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
        else:
            return pd.DataFrame()

        df = df.sort_values('date')

        # Ensure category columns exist with proper values
        for category in self.categories:
            if category not in df.columns:
                df[category] = 0.0
            else:
                df[category] = pd.to_numeric(df[category], errors='coerce').fillna(0.0)

        # Calculate total if not present
        if 'Total' not in df.columns:
            df['Total'] = df[self.categories].sum(axis=1)

        return df

    def _aggregate_weekly(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate data to weekly (Monday-Sunday)
        """
        df_copy = df.set_index('date')
        weekly = df_copy.resample('W-SUN')[self.categories + ['Total']].sum()
        weekly = weekly.reset_index().rename(columns={'date': 'week_end'})
        weekly['week_start'] = weekly['week_end'] - pd.Timedelta(days=6)
        return weekly[['week_start', 'week_end'] + self.categories + ['Total']]

    def _aggregate_monthly(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate data to monthly with spend-day counts
        """
        df_copy = df.set_index('date')

        # Sum amounts
        monthly_sum = df_copy.resample('M')[self.categories + ['Total']].sum()

        # Count spend days
        spend_days = df_copy[self.categories].gt(0).astype(int)
        monthly_days = spend_days.resample('M').sum()

        # Rename day columns
        for cat in self.categories:
            monthly_days.rename(columns={cat: f'{cat}_days'}, inplace=True)

        # Merge
        monthly = monthly_sum.merge(monthly_days, left_index=True, right_index=True)
        monthly = monthly.reset_index().rename(columns={'date': 'month_end'})

        return monthly

    def _calculate_category_stats(self, df_daily: pd.DataFrame,
                                 wk_recent: pd.DataFrame) -> Dict[str, Dict]:
        """
        Calculate comprehensive statistics for each category (notebook style)
        """
        stats = {}
        df_recent = df_daily[df_daily['date'] >= wk_recent['week_start'].min()]

        for category in self.categories:
            if category not in wk_recent.columns:
                continue

            # Weekly statistics
            wk_series = wk_recent[category].astype(float)
            median_active = wk_series[wk_series > 0].median() if (wk_series > 0).any() else 0.0
            ema = wk_series.ewm(alpha=self.config['alpha_ema'], adjust=False).mean().iloc[-1] if len(wk_series) else 0.0

            # Volatility (coefficient of variation)
            active = wk_series[wk_series > 0]
            mean_a = active.mean() if len(active) else 0.0
            std_a = active.std(ddof=1) if len(active) > 1 else 0.0
            cv = (std_a / mean_a) if mean_a > 0 else 0.0

            # IQR for capping
            q1 = active.quantile(0.25) if len(active) else 0.0
            q3 = active.quantile(0.75) if len(active) else 0.0
            iqr = max(q3 - q1, 0.0)

            # Days since last spending
            if category in df_recent.columns:
                last_indices = np.where(df_recent[category].values > 0)[0]
                if len(last_indices) == 0:
                    since_last = float('inf')
                else:
                    since_last = (len(df_recent) - 1) - last_indices[-1]
            else:
                since_last = float('inf')

            # Hazard detection (recurrence pattern)
            hazard = 1 if since_last in self.config['hazard_days'] else 0

            # Recent spike memory
            if category in df_recent.columns:
                recent_window = df_recent[category].tail(self.config['spike_memory_days'])
                spike_memory = int(recent_window.sum() > (median_active if median_active > 0 else 200))  # NT$200 threshold
            else:
                spike_memory = 0

            # Activity classification
            if category in df_recent.columns:
                df_recent['month_key'] = df_recent['date'].dt.to_period('M')
                monthly_counts = df_recent.groupby('month_key')[category].apply(lambda s: (s > 0).sum())
                avg_active_days = monthly_counts.mean() if len(monthly_counts) else 0
            else:
                avg_active_days = 0

            if avg_active_days < self.config['inactive_thresh_mo']:
                activity = 'inactive'
            elif avg_active_days < 12:
                activity = 'occasional'
            else:
                activity = 'regular'

            stats[category] = {
                'median_active': float(median_active),
                'ema': float(ema),
                'cv': float(cv),
                'iqr': float(iqr),
                'since_last': float(since_last),
                'hazard': int(hazard),
                'spike_memory': int(spike_memory),
                'activity': activity,
                'avg_active_days': float(avg_active_days)
            }

        return stats

    def _calculate_raw_budget(self, category: str, stats: Dict) -> float:
        """
        Calculate raw budget for a category using notebook algorithm
        """
        # Base: blend EMA and median_active
        base = (self.config['alpha_ema'] * stats['ema'] +
                (1 - self.config['alpha_ema']) * stats['median_active'])

        # Inactivity clamp
        if stats['activity'] == 'inactive':
            base *= 0.25

        # Hazard boost (recurrence)
        if stats['hazard'] == 1:
            base *= (1 + self.config['hazard_boost_pct'])

        # Recent spike buffer
        if stats['spike_memory'] == 1:
            base *= (1 + self.config['spike_buffer_pct'])

        # Volatility cushion
        base *= (1 + self.config['volatility_cushion'] * stats['cv'])

        # Apply cap using IQR above median_active
        cap = stats['median_active'] + self.config['iqr_cap_mult'] * stats['iqr']
        if stats['median_active'] > 0:
            base = min(base, cap)

        # Essentials floor
        floor = self.essentials_weekly.get(category, 0.0)
        return max(base, floor)

    def _apply_savings_adjustment(self, raw_budgets: Dict[str, float],
                                 raw_total: float, target_savings: float) -> Dict[str, float]:
        """
        Adjust budgets to meet savings goal using elasticity
        """
        target_total = max(0.0, raw_total - target_savings)

        # Calculate adjustable headroom above floors
        floors = {c: self.essentials_weekly.get(c, 0.0) for c in self.categories}
        headroom = {c: max(raw_budgets[c] - floors[c], 0.0) for c in self.categories}
        total_headroom = sum(headroom.values())

        adjusted = raw_budgets.copy()

        if total_headroom > 0 and target_total < raw_total:
            need_cut = raw_total - target_total

            # Distribute cuts weighted by elasticity * headroom
            weights = {c: self.elasticity[c] * headroom[c] for c in self.categories}
            wsum = sum(weights.values()) or 1.0

            for category in self.categories:
                cut_amount = need_cut * (weights[category] / wsum)
                adjusted[category] = max(floors[category], raw_budgets[category] - cut_amount)

        return adjusted

    def _calculate_confidence(self, df: pd.DataFrame) -> float:
        """
        Calculate budget confidence based on data quality
        """
        days = len(df)

        if days < 30:
            return 0.5
        elif days < 60:
            return 0.7
        elif days < 90:
            return 0.85
        else:
            return 0.95

    def _get_methodology_info(self, cat_stats: Dict) -> Dict:
        """
        Generate methodology explanation
        """
        return {
            'approach': 'Advanced ML budgeting from notebook',
            'features': {
                'ema_weight': self.config['alpha_ema'],
                'lookback_weeks': self.config['lookback_weeks'],
                'volatility_cushion': self.config['volatility_cushion'],
                'iqr_cap': self.config['iqr_cap_mult']
            },
            'adjustments': {
                'hazard_boost': self.config['hazard_boost_pct'],
                'spike_buffer': self.config['spike_buffer_pct']
            },
            'categories_analyzed': len(cat_stats)
        }

    def _get_default_weekly_budget(self) -> Dict:
        """
        Default weekly budget for new users
        """
        return {
            'categories': [
                {'category': 'Food', 'amount': 1200, 'activity': 'default'},
                {'category': 'Transport', 'amount': 400, 'activity': 'default'},
                {'category': 'Shopping', 'amount': 500, 'activity': 'default'},
                {'category': 'Entertainment', 'amount': 300, 'activity': 'default'},
                {'category': 'Other', 'amount': 200, 'activity': 'default'}
            ],
            'total': 2600,
            'period': 'weekly',
            'confidence': 0.3
        }

    def _get_default_monthly_budget(self) -> Dict:
        """
        Default monthly budget for new users
        """
        weekly = self._get_default_weekly_budget()
        return self._convert_weekly_to_monthly(weekly)

    def _convert_weekly_to_monthly(self, weekly_budget: Dict) -> Dict:
        """
        Convert weekly budget to monthly (4.3 weeks per month)
        """
        monthly_categories = []
        for cat in weekly_budget['categories']:
            monthly_cat = cat.copy()
            monthly_cat['amount'] = round(cat['amount'] * 4.3, 2)
            monthly_categories.append(monthly_cat)

        return {
            'categories': monthly_categories,
            'total': round(weekly_budget['total'] * 4.3, 2),
            'period': 'monthly',
            'confidence': weekly_budget.get('confidence', 0.5)
        }