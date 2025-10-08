"""
Budget Generation Module.
Creates personalized monthly budgets based on spending history and behavioral patterns.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class BudgetGenerator:
    """
    Generates adaptive budgets using historical spending data, activity levels,
    and spending elasticity to create realistic recommendations.
    """

    def __init__(self):
        # Minimum recommended spending per category (daily amounts)
        self.category_floors = {
            'Food': 800,
            'Transport': 200,
            'Home': 100,
            'Personal': 50,
            'Bills': 0,
            'Beverage': 100,
            'Shopping': 0,
            'Entertainment': 0,
            'Beauty': 0,
            'Sports': 0,
            'Work': 50,
            'Other': 50,
            'Travel': 0
        }

        # Elasticity factors (ease of reducing spending)
        # < 1: essential (hard to cut), > 1: discretionary (easy to cut)
        self.elasticity_factors = {
            'Food': 0.6,
            'Transport': 0.7,
            'Home': 0.8,
            'Bills': 0.0,
            'Personal': 0.9,
            'Work': 0.8,
            'Beverage': 1.1,
            'Shopping': 1.5,
            'Entertainment': 1.4,
            'Beauty': 1.3,
            'Sports': 1.2,
            'Other': 1.0,
            'Travel': 1.6
        }

        # Activity level thresholds (percentage of days with spending)
        self.activity_thresholds = {
            'inactive': 0.1,
            'occasional': 0.3,
            'regular': 1.0
        }

    def generate_budget(self, df: pd.DataFrame, patterns: Dict,
                       target_month: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Generate comprehensive budget with category breakdowns.
        Uses historical statistics, activity levels, and detected patterns.
        """
        try:
            if target_month is None:
                target_month = datetime.now()

            # Analyze historical spending
            spending_stats = self._calculate_spending_stats(df)
            activity_levels = self._determine_activity_levels(df)
            pattern_adjustments = self._get_pattern_adjustments(patterns)

            # Generate budget for each category
            category_budgets = []
            total_budget = 0

            for category in spending_stats.keys():
                budget_info = self._calculate_category_budget(
                    category,
                    spending_stats[category],
                    activity_levels.get(category, 'inactive'),
                    pattern_adjustments.get(category, 1.0)
                )
                category_budgets.append(budget_info)
                total_budget += budget_info['amount']

            # Sort by budget amount descending
            category_budgets = sorted(
                category_budgets,
                key=lambda x: x['amount'],
                reverse=True
            )

            methodology = self._generate_methodology(
                spending_stats,
                activity_levels,
                pattern_adjustments
            )

            return {
                'categories': category_budgets,
                'total': total_budget,
                'month': target_month.strftime('%Y-%m'),
                'methodology': methodology,
                'confidence': self._calculate_confidence(df)
            }

        except Exception as e:
            logger.error(f"Budget generation error: {str(e)}")
            raise

    def _calculate_spending_stats(self, df: pd.DataFrame) -> Dict[str, Dict]:
        """
        Compute statistical measures for each spending category.
        Returns mean, median, volatility, trends, and activity metrics.
        """
        stats = {}
        categories = [col for col in df.columns if col in self.category_floors.keys()]

        for category in categories:
            if category not in df.columns:
                continue

            cat_data = df[category].dropna()

            stats[category] = {
                'mean': cat_data.mean(),
                'median': cat_data.median(),
                'std': cat_data.std(),
                'max': cat_data.max(),
                'min': cat_data[cat_data > 0].min() if (cat_data > 0).any() else 0,
                'percentile_75': cat_data.quantile(0.75),
                'percentile_90': cat_data.quantile(0.90),
                'active_days': (cat_data > 0).sum(),
                'total_days': len(cat_data),
                'activity_rate': (cat_data > 0).mean(),
                'total_spent': cat_data.sum(),
                'recent_trend': self._calculate_trend(cat_data)
            }

        return stats

    def _determine_activity_levels(self, df: pd.DataFrame) -> Dict[str, str]:
        """
        Classify spending frequency for each category.
        Returns 'inactive', 'occasional', or 'regular' based on activity rate.
        """
        activity_levels = {}
        categories = [col for col in df.columns if col in self.category_floors.keys()]

        for category in categories:
            if category not in df.columns:
                activity_levels[category] = 'inactive'
                continue

            activity_rate = (df[category] > 0).mean()

            if activity_rate < self.activity_thresholds['inactive']:
                activity_levels[category] = 'inactive'
            elif activity_rate < self.activity_thresholds['occasional']:
                activity_levels[category] = 'occasional'
            else:
                activity_levels[category] = 'regular'

        return activity_levels

    def _get_pattern_adjustments(self, patterns: Dict) -> Dict[str, float]:
        """
        Calculate budget multipliers based on spending patterns.
        Increases budget for volatile or recurring expenses.
        """
        adjustments = {}

        # Adjust for recurring expenses
        if 'recurrences' in patterns:
            for recurrence in patterns['recurrences']:
                category = recurrence.get('category', 'total')
                frequency = recurrence.get('frequency', 1.0)

                if frequency > 0.7:
                    adjustments[category] = 1.1

        # Add buffer for high volatility
        if 'volatility' in patterns:
            for category, volatility in patterns['volatility'].items():
                if volatility > 0.5:
                    current_adj = adjustments.get(category, 1.0)
                    adjustments[category] = current_adj * 1.15

        # Increase for recent spending spikes
        if 'spikes' in patterns:
            for spike in patterns['spikes']:
                category = spike.get('category', 'total')
                if spike.get('recent', False):
                    current_adj = adjustments.get(category, 1.0)
                    adjustments[category] = current_adj * 1.2

        return adjustments

    def _calculate_category_budget(self, category: str, stats: Dict,
                                  activity_level: str, pattern_adjustment: float) -> Dict:
        """
        Compute recommended budget for a single category.
        Applies activity-based baseline, elasticity adjustments, and pattern buffers.
        """
        # Set baseline based on activity level
        if activity_level == 'inactive':
            base_amount = 0
        elif activity_level == 'occasional':
            base_amount = stats['median'] * 30
        else:
            base_amount = (0.7 * stats['mean'] + 0.3 * stats['percentile_75']) * 30

        # Apply minimum floor
        floor = self.category_floors.get(category, 0)
        base_amount = max(base_amount, floor)

        # Apply elasticity for overspending categories
        elasticity = self.elasticity_factors.get(category, 1.0)
        if base_amount > stats['mean'] * 30 and elasticity > 1:
            reduction_factor = 1 - (0.1 * (elasticity - 1))
            base_amount *= reduction_factor

        # Apply pattern-based adjustments
        base_amount *= pattern_adjustment

        # Apply trend adjustment
        trend = stats.get('recent_trend', 0)
        if trend > 0:
            base_amount *= (1 + min(trend, 0.1))

        # Add volatility buffer
        if stats['std'] > stats['mean'] * 0.5:
            volatility_buffer = stats['std'] * 2
            base_amount += volatility_buffer * 0.1

        # Round to nearest 10
        final_amount = round(base_amount / 10) * 10

        return {
            'category': category,
            'amount': final_amount,
            'floor': floor,
            'elasticity': elasticity,
            'activity_level': activity_level,
            'adjustment_factor': pattern_adjustment,
            'confidence': self._calculate_category_confidence(stats, activity_level)
        }

    def _calculate_trend(self, series: pd.Series, window: int = 14) -> float:
        """
        Calculate percentage change in recent vs previous spending.
        Compares last window days to previous window days.
        """
        if len(series) < window:
            return 0

        recent = series.tail(window).mean()
        previous = series.tail(window * 2).head(window).mean()

        if previous == 0:
            return 0

        return (recent - previous) / previous

    def _calculate_confidence(self, df: pd.DataFrame) -> float:
        """
        Estimate confidence level based on data availability.
        More days of history yields higher confidence.
        """
        days_of_data = len(df)

        if days_of_data < 30:
            confidence = 0.5
        elif days_of_data < 60:
            confidence = 0.7
        elif days_of_data < 90:
            confidence = 0.85
        else:
            confidence = 0.95

        return confidence

    def _calculate_category_confidence(self, stats: Dict, activity_level: str) -> float:
        """
        Estimate confidence for individual category budget.
        Based on activity level and spending consistency (coefficient of variation).
        """
        if activity_level == 'inactive':
            return 0.9
        elif activity_level == 'occasional':
            return 0.6
        else:
            if stats['mean'] > 0:
                cv = stats['std'] / stats['mean']
                confidence = max(0.5, 1 - (cv * 0.3))
            else:
                confidence = 0.7

            return min(confidence, 0.95)

    def _generate_methodology(self, stats: Dict, activity_levels: Dict,
                             adjustments: Dict) -> Dict[str, Any]:
        """
        Create explanation of how budget was calculated.
        Documents factors considered and constraints applied.
        """
        return {
            'approach': 'Adaptive ML-based budgeting',
            'factors_considered': [
                'Historical spending patterns',
                'Category activity levels',
                'Spending volatility',
                'Recent trends',
                'Detected patterns (recurrence, spikes)',
                'Category elasticity'
            ],
            'key_insights': {
                'active_categories': sum(1 for level in activity_levels.values() if level == 'regular'),
                'total_categories': len(activity_levels),
                'pattern_adjustments': len(adjustments),
                'data_points': sum(s['total_days'] for s in stats.values())
            },
            'constraints': {
                'floors_applied': list(self.category_floors.keys()),
                'elasticity_applied': True
            }
        }

    def get_default_budgets(self) -> List[Dict]:
        """
        Provide default budget recommendations for new users with no history.
        Returns typical monthly allocations across all categories.
        """
        default_amounts = {
            'Food': 5000,
            'Transport': 1500,
            'Home': 1000,
            'Shopping': 2000,
            'Entertainment': 1000,
            'Personal': 500,
            'Bills': 2000,
            'Beverage': 800,
            'Other': 500,
            'Beauty': 300,
            'Sports': 300,
            'Work': 200,
            'Travel': 0
        }

        default_budgets = []
        for category, amount in default_amounts.items():
            default_budgets.append({
                'category': category,
                'amount': amount,
                'floor': self.category_floors.get(category, 0),
                'elasticity': self.elasticity_factors.get(category, 1.0),
                'activity_level': 'default',
                'adjustment_factor': 1.0,
                'confidence': 0.5
            })

        return sorted(default_budgets, key=lambda x: x['amount'], reverse=True)

    def adjust_budget_for_goal(self, current_budget: Dict,
                               savings_goal: float) -> Dict[str, Any]:
        """
        Reduce spending to meet a savings target.
        Prioritizes cuts in elastic (discretionary) categories first.
        """
        categories = current_budget['categories'].copy()
        total = current_budget['total']

        if savings_goal <= 0:
            return current_budget

        required_reduction = savings_goal

        # Sort by elasticity (most elastic first for easier cuts)
        elastic_categories = sorted(
            categories,
            key=lambda x: self.elasticity_factors.get(x['category'], 1.0),
            reverse=True
        )

        adjusted_categories = []
        total_reduced = 0

        for cat in elastic_categories:
            elasticity = self.elasticity_factors.get(cat['category'], 1.0)
            floor = self.category_floors.get(cat['category'], 0)

            if elasticity > 0 and cat['amount'] > floor:
                # Calculate maximum possible reduction without going below floor
                max_reduction = cat['amount'] - floor

                # Apply elasticity-weighted reduction
                reduction = min(
                    max_reduction,
                    required_reduction * (elasticity / 2)
                )

                new_amount = cat['amount'] - reduction
                total_reduced += reduction

                adjusted_cat = cat.copy()
                adjusted_cat['amount'] = new_amount
                adjusted_cat['adjusted'] = True
                adjusted_categories.append(adjusted_cat)

                required_reduction -= reduction
                if required_reduction <= 0:
                    break
            else:
                adjusted_categories.append(cat)

        return {
            'categories': adjusted_categories,
            'total': total - total_reduced,
            'savings_achieved': total_reduced,
            'savings_goal': savings_goal,
            'adjustment_successful': required_reduction <= 0
        }
