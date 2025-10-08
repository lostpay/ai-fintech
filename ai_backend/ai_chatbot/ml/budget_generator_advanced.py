"""
Advanced Budget Generation Module.
Implements sophisticated weekly and monthly budget recommendations using EMA-based algorithms,
activity detection, and pattern-aware adjustments (hazards, spikes, volatility).
Based on proven notebook implementation with enhanced features.
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
    Generates personalized budgets using advanced algorithms.
    Uses exponential moving average (EMA), activity classification,
    recurrence pattern detection (hazards), and volatility-aware adjustments.
    Supports both weekly and monthly budget generation with savings goal optimization.
    """

    def __init__(self):
        # All supported spending categories
        self.categories = [
            'Food', 'Beverage', 'Home', 'Shopping', 'Transport',
            'Entertainment', 'Beauty', 'Sports', 'Personal', 'Work',
            'Other', 'Bills', 'Travel'
        ]

        # Minimum weekly spending thresholds for essential categories (NT$)
        # These floors prevent unrealistic budget cuts in necessities
        self.essentials_weekly = {
            'Food': 800,  # NT$800 weekly minimum for food
            'Transport': 200,  # NT$200 weekly minimum for transport
            'Bills': 0,  # No floor for bills (can vary widely)
            'Home': 100  # NT$100 weekly minimum for home expenses
        }

        # Elasticity factors: how easily spending can be reduced
        # <1 = essential/rigid, >1 = discretionary/flexible
        self.elasticity = defaultdict(lambda: 1.0, {
            'Shopping': 1.5,  # Most elastic (easiest to cut)
            'Entertainment': 1.4,
            'Beauty': 1.3,
            'Beverage': 1.2,
            'Other': 1.2,
            'Travel': 1.2,
            'Food': 0.6,  # Less elastic (harder to cut)
            'Transport': 0.6,
            'Bills': 0.3,  # Least elastic (fixed expenses)
            'Home': 0.7,
            'Sports': 1.1,
            'Personal': 1.0,
            'Work': 0.8
        })

        # Algorithm configuration parameters
        self.config = {
            'lookback_weeks': 8,  # Number of weeks to analyze
            'alpha_ema': 0.6,  # EMA smoothing factor (higher = more weight on recent data)
            'volatility_cushion': 0.20,  # 20% buffer for volatile categories
            'iqr_cap_mult': 1.75,  # IQR multiplier for outlier capping
            'inactive_thresh_mo': 5,  # Days per month threshold for inactivity
            'spike_memory_days': 3,  # Days to look back for spending spikes
            'spike_buffer_pct': 0.15,  # 15% budget boost if recent spike detected
            'hazard_days': [6, 7, 13, 14],  # Days since last spend indicating recurrence pattern
            'hazard_boost_pct': 0.20  # 20% budget boost for detected recurrence
        }

    def generate_weekly_budget(self, df: pd.DataFrame,
                              target_savings: Optional[float] = None) -> Dict[str, Any]:
        """
        Generate weekly budget recommendations using advanced EMA-based algorithm.
        Combines historical spending patterns with activity detection, hazard patterns,
        and volatility analysis. Optionally applies elasticity-based savings adjustments.

        Args:
            df: Daily spending DataFrame with date and category columns
            target_savings: Optional weekly savings goal to achieve through budget cuts

        Returns:
            Dictionary with category budgets, total, methodology, and confidence score
        """
        try:
            # Clean and validate input data
            df = self._prepare_data(df)

            # Return defaults if no valid data available
            if df.empty:
                return self._get_default_weekly_budget()

            # Aggregate daily data into weekly periods (Monday-Sunday)
            weekly = self._aggregate_weekly(df)

            # Select recent weeks for analysis (8 weeks by default)
            cutoff = weekly['week_end'].max() - pd.Timedelta(weeks=self.config['lookback_weeks']-1)
            wk_recent = weekly[weekly['week_end'] >= cutoff].reset_index(drop=True)

            if wk_recent.empty:
                return self._get_default_weekly_budget()

            # Calculate comprehensive statistics for each category
            # Includes EMA, volatility, activity level, hazard detection
            cat_stats = self._calculate_category_stats(df, wk_recent)

            # Calculate initial budget for each category
            raw_budgets = {}
            for category in self.categories:
                if category in cat_stats:
                    # Apply EMA, hazards, spikes, volatility cushion
                    raw_budgets[category] = self._calculate_raw_budget(
                        category, cat_stats[category]
                    )
                else:
                    raw_budgets[category] = 0.0

            raw_total = sum(raw_budgets.values())

            # Apply savings optimization if user has a savings goal
            if target_savings and target_savings > 0:
                # Use elasticity to prioritize cuts in discretionary categories
                adjusted_budgets = self._apply_savings_adjustment(
                    raw_budgets, raw_total, target_savings
                )
            else:
                adjusted_budgets = raw_budgets

            # Format detailed response with all relevant statistics
            category_budgets = []
            for category in self.categories:
                stats = cat_stats.get(category, {})
                category_budgets.append({
                    'category': category,
                    'amount': round(adjusted_budgets[category], 2),
                    'raw_amount': round(raw_budgets[category], 2),  # Before savings adjustment
                    'activity': stats.get('activity', 'inactive'),  # inactive/occasional/regular
                    'median_active': stats.get('median_active', 0),  # Median weekly spending
                    'ema': stats.get('ema', 0),  # Exponential moving average
                    'volatility': stats.get('cv', 0),  # Coefficient of variation
                    'hazard': stats.get('hazard', 0),  # Recurrence pattern detected
                    'spike_memory': stats.get('spike_memory', 0),  # Recent spending spike
                    'since_last': stats.get('since_last', float('inf'))  # Days since last spend
                })

            # Sort categories by budget amount (highest first)
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
        Generate monthly budget recommendations using EMA-Median blend.
        Combines exponential moving average with rolling median for stability.
        Applies activity-based multipliers and caps outliers.

        Args:
            df: Daily spending DataFrame with date and category columns

        Returns:
            Dictionary with monthly category budgets, total, and methodology
        """
        try:
            # Clean and validate input data
            df = self._prepare_data(df)

            if df.empty:
                return self._get_default_monthly_budget()

            # Aggregate daily spending into monthly totals
            monthly = self._aggregate_monthly(df)

            # Need at least 2 months of data for statistical calculations
            if len(monthly) < 2:
                # Fallback: convert weekly budget to monthly (multiply by 4.3)
                weekly_budget = self.generate_weekly_budget(df)
                return self._convert_weekly_to_monthly(weekly_budget)

            # Calculate budget for each category
            category_budgets = []

            for category in self.categories:
                if category not in monthly.columns:
                    continue

                # Calculate key statistics over recent months
                ema = monthly[category].ewm(span=4, adjust=False).mean().iloc[-1]  # 4-month EMA
                median = monthly[category].rolling(6, min_periods=2).median().iloc[-1]  # 6-month median
                q75 = monthly[category].rolling(6, min_periods=2).quantile(0.75).iloc[-1]
                q25 = monthly[category].rolling(6, min_periods=2).quantile(0.25).iloc[-1]
                iqr = (q75 - q25) if not pd.isna(q75 - q25) else 0  # Interquartile range

                # Classify activity level based on spending frequency
                day_col = f'{category}_days'
                if day_col in monthly.columns:
                    recent_days = monthly[day_col].tail(2).sum()  # Sum last 2 months
                    if recent_days <= 3:
                        activity = 'inactive'  # Rarely used
                    elif recent_days <= 15:
                        activity = 'regular'  # Moderate usage
                    else:
                        activity = 'active'  # Frequent usage
                else:
                    activity = 'inactive'

                # Weighted blend: 70% recent trend (EMA), 30% stable baseline (median)
                if pd.isna(ema):
                    ema = 0
                if pd.isna(median):
                    median = 0

                raw_budget = 0.7 * ema + 0.3 * median

                # Adjust based on activity level
                if activity == 'inactive':
                    raw_budget *= 0.35  # Reduce inactive categories significantly
                elif activity == 'active':
                    raw_budget *= 1.15  # Boost active categories

                # Apply monthly floor (convert weekly minimum to monthly)
                monthly_floor = self.essentials_weekly.get(category, 0) * 4.3
                raw_budget = max(raw_budget, monthly_floor)

                # Cap at recent high with 8% buffer to prevent over-budgeting
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
        Prepare and validate DataFrame for budget generation.
        Ensures date column exists, category columns are numeric,
        and total spending is calculated.
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
        Aggregate daily spending data into weekly periods.
        Weeks run Monday-Sunday (W-SUN resampling).
        Returns DataFrame with week_start, week_end, and category totals.
        """
        df_copy = df.set_index('date')
        weekly = df_copy.resample('W-SUN')[self.categories + ['Total']].sum()
        weekly = weekly.reset_index().rename(columns={'date': 'week_end'})
        weekly['week_start'] = weekly['week_end'] - pd.Timedelta(days=6)
        return weekly[['week_start', 'week_end'] + self.categories + ['Total']]

    def _aggregate_monthly(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate daily spending data into monthly totals.
        Also calculates spend-day counts (number of days with spending in each category).
        Returns DataFrame with monthly sums and {category}_days columns.
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
        Calculate comprehensive statistics for each category.
        Computes EMA, median, volatility (CV), IQR, days since last spend,
        hazard detection (recurrence), spike memory, and activity classification.

        Args:
            df_daily: Daily spending DataFrame
            wk_recent: Recent weeks DataFrame (filtered to lookback period)

        Returns:
            Dictionary mapping category names to their statistical profiles
        """
        stats = {}
        # Filter daily data to match weekly analysis window
        df_recent = df_daily[df_daily['date'] >= wk_recent['week_start'].min()]

        for category in self.categories:
            if category not in wk_recent.columns:
                continue

            # Calculate weekly spending statistics
            wk_series = wk_recent[category].astype(float)
            # Median of active weeks (excludes zero-spend weeks)
            median_active = wk_series[wk_series > 0].median() if (wk_series > 0).any() else 0.0
            # Exponential moving average (gives more weight to recent weeks)
            ema = wk_series.ewm(alpha=self.config['alpha_ema'], adjust=False).mean().iloc[-1] if len(wk_series) else 0.0

            # Calculate volatility using coefficient of variation (CV = std/mean)
            active = wk_series[wk_series > 0]
            mean_a = active.mean() if len(active) else 0.0
            std_a = active.std(ddof=1) if len(active) > 1 else 0.0
            cv = (std_a / mean_a) if mean_a > 0 else 0.0  # Higher CV = more volatile

            # Calculate IQR for outlier capping
            q1 = active.quantile(0.25) if len(active) else 0.0
            q3 = active.quantile(0.75) if len(active) else 0.0
            iqr = max(q3 - q1, 0.0)  # Interquartile range

            # Calculate days since last spending event
            if category in df_recent.columns:
                last_indices = np.where(df_recent[category].values > 0)[0]
                if len(last_indices) == 0:
                    since_last = float('inf')  # Never spent in this category
                else:
                    since_last = (len(df_recent) - 1) - last_indices[-1]
            else:
                since_last = float('inf')

            # Hazard detection: check if gap matches recurrence pattern
            # Days 6-7 = weekly pattern, 13-14 = bi-weekly pattern
            hazard = 1 if since_last in self.config['hazard_days'] else 0

            # Recent spike memory: check if last N days had unusual spending
            if category in df_recent.columns:
                recent_window = df_recent[category].tail(self.config['spike_memory_days'])
                # Flag spike if recent sum exceeds median or NT$200 threshold
                spike_memory = int(recent_window.sum() > (median_active if median_active > 0 else 200))
            else:
                spike_memory = 0

            # Classify activity level based on average active days per month
            if category in df_recent.columns:
                df_recent['month_key'] = df_recent['date'].dt.to_period('M')
                monthly_counts = df_recent.groupby('month_key')[category].apply(lambda s: (s > 0).sum())
                avg_active_days = monthly_counts.mean() if len(monthly_counts) else 0
            else:
                avg_active_days = 0

            # Categorize based on spending frequency
            if avg_active_days < self.config['inactive_thresh_mo']:
                activity = 'inactive'  # Less than 5 days/month
            elif avg_active_days < 12:
                activity = 'occasional'  # 5-11 days/month
            else:
                activity = 'regular'  # 12+ days/month

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
        Calculate raw weekly budget for a category using advanced algorithm.
        Blends EMA and median, applies activity/hazard/spike adjustments,
        adds volatility cushion, and enforces floor/cap constraints.

        Args:
            category: Category name
            stats: Statistical profile from _calculate_category_stats

        Returns:
            Raw weekly budget amount (before savings adjustment)
        """
        # Start with weighted blend of EMA and median
        # 60% EMA (recent trend) + 40% median (stable baseline)
        base = (self.config['alpha_ema'] * stats['ema'] +
                (1 - self.config['alpha_ema']) * stats['median_active'])

        # Significantly reduce budget for inactive categories
        if stats['activity'] == 'inactive':
            base *= 0.25  # Cut to 25% for rarely-used categories

        # Boost budget if recurrence pattern detected (hazard)
        if stats['hazard'] == 1:
            base *= (1 + self.config['hazard_boost_pct'])  # +20% for weekly/bi-weekly patterns

        # Boost budget if recent spending spike detected
        if stats['spike_memory'] == 1:
            base *= (1 + self.config['spike_buffer_pct'])  # +15% buffer for recent spikes

        # Add volatility cushion proportional to spending variability
        base *= (1 + self.config['volatility_cushion'] * stats['cv'])  # Higher CV = larger buffer

        # Cap budget at median + 1.75*IQR to prevent extreme outliers
        cap = stats['median_active'] + self.config['iqr_cap_mult'] * stats['iqr']
        if stats['median_active'] > 0:
            base = min(base, cap)

        # Apply minimum floor for essential categories
        floor = self.essentials_weekly.get(category, 0.0)
        return max(base, floor)

    def _apply_savings_adjustment(self, raw_budgets: Dict[str, float],
                                 raw_total: float, target_savings: float) -> Dict[str, float]:
        """
        Adjust category budgets to achieve savings goal.
        Uses elasticity factors to prioritize cuts in discretionary categories
        while protecting essential spending (floors).

        Args:
            raw_budgets: Initial budget amounts by category
            raw_total: Sum of raw budgets
            target_savings: Amount to save per week

        Returns:
            Adjusted budget dictionary respecting floor constraints
        """
        target_total = max(0.0, raw_total - target_savings)

        # Calculate adjustable amount above minimum floors for each category
        floors = {c: self.essentials_weekly.get(c, 0.0) for c in self.categories}
        headroom = {c: max(raw_budgets[c] - floors[c], 0.0) for c in self.categories}
        total_headroom = sum(headroom.values())

        adjusted = raw_budgets.copy()

        # Only apply cuts if headroom exists and savings are needed
        if total_headroom > 0 and target_total < raw_total:
            need_cut = raw_total - target_total

            # Weight cuts by elasticity and available headroom
            # Higher elasticity = easier to cut = takes more of the reduction
            weights = {c: self.elasticity[c] * headroom[c] for c in self.categories}
            wsum = sum(weights.values()) or 1.0

            for category in self.categories:
                # Distribute cuts proportionally
                cut_amount = need_cut * (weights[category] / wsum)
                # Ensure we don't go below the floor
                adjusted[category] = max(floors[category], raw_budgets[category] - cut_amount)

        return adjusted

    def _calculate_confidence(self, df: pd.DataFrame) -> float:
        """
        Calculate confidence score based on data availability.
        More historical data yields higher confidence in predictions.

        Returns:
            Float between 0.5 and 0.95 representing confidence level
        """
        days = len(df)

        # Confidence increases with data volume
        if days < 30:
            return 0.5  # Low confidence (less than 1 month)
        elif days < 60:
            return 0.7  # Medium confidence (1-2 months)
        elif days < 90:
            return 0.85  # Good confidence (2-3 months)
        else:
            return 0.95  # High confidence (3+ months)

    def _get_methodology_info(self, cat_stats: Dict) -> Dict:
        """
        Generate methodology documentation for transparency.
        Explains algorithm parameters and adjustments applied.
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
        Return default weekly budget for new users without spending history.
        Provides reasonable baseline allocations across common categories.
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
        Return default monthly budget for new users.
        Converts default weekly budget to monthly using 4.3 multiplier.
        """
        weekly = self._get_default_weekly_budget()
        return self._convert_weekly_to_monthly(weekly)

    def _convert_weekly_to_monthly(self, weekly_budget: Dict) -> Dict:
        """
        Convert weekly budget to monthly budget.
        Uses 4.3 weeks/month multiplier (52 weeks / 12 months).
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