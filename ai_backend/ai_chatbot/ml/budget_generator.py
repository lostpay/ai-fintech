"""
Intelligent Budget Generation Module
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class BudgetGenerator:
    """
    Generate personalized budgets with category floors and elasticity
    """

    def __init__(self):
        # Category spending floors (minimum recommended amounts)
        self.category_floors = {
            'Food': 800,
            'Transport': 200,
            'Home': 100,
            'Personal': 50,
            'Bills': 0,  # Bills are fixed
            'Beverage': 100,
            'Shopping': 0,  # Discretionary
            'Entertainment': 0,  # Discretionary
            'Beauty': 0,  # Discretionary
            'Sports': 0,  # Discretionary
            'Work': 50,
            'Other': 50,
            'Travel': 0  # Discretionary
        }

        # Elasticity factors (how easy to cut spending)
        # <1: harder to cut (essential), >1: easier to cut (discretionary)
        self.elasticity_factors = {
            'Food': 0.6,  # Essential, hard to cut
            'Transport': 0.7,  # Essential for commute
            'Home': 0.8,  # Somewhat essential
            'Bills': 0.0,  # Fixed, cannot cut
            'Personal': 0.9,
            'Work': 0.8,
            'Beverage': 1.1,  # Somewhat discretionary
            'Shopping': 1.5,  # Very discretionary
            'Entertainment': 1.4,  # Discretionary
            'Beauty': 1.3,  # Discretionary
            'Sports': 1.2,  # Discretionary
            'Other': 1.0,  # Neutral
            'Travel': 1.6  # Most discretionary
        }

        # Activity thresholds
        self.activity_thresholds = {
            'inactive': 0.1,  # <10% of days have spending
            'occasional': 0.3,  # 10-30% of days
            'regular': 1.0  # >30% of days
        }

    def generate_budget(self, df: pd.DataFrame, patterns: Dict,
                       target_month: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Generate personalized budget recommendations
        """
        try:
            if target_month is None:
                target_month = datetime.now()

            # Calculate historical spending statistics
            spending_stats = self._calculate_spending_stats(df)

            # Determine activity levels for each category
            activity_levels = self._determine_activity_levels(df)

            # Get pattern-based adjustments
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

            # Sort categories by budget amount
            category_budgets = sorted(
                category_budgets,
                key=lambda x: x['amount'],
                reverse=True
            )

            # Generate methodology explanation
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
        Calculate spending statistics for each category
        """
        stats = {}

        # Get category columns
        categories = [col for col in df.columns if col in self.category_floors.keys()]

        for category in categories:
            if category not in df.columns:
                continue

            cat_data = df[category].dropna()

            # Calculate statistics
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
        Determine activity level for each category
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
        Get budget adjustments based on detected patterns
        """
        adjustments = {}

        # Adjust for recurrence patterns
        if 'recurrences' in patterns:
            for recurrence in patterns['recurrences']:
                category = recurrence.get('category', 'total')
                frequency = recurrence.get('frequency', 1.0)

                # Increase budget for frequent recurring expenses
                if frequency > 0.7:  # >70% chance of recurrence
                    adjustments[category] = 1.1  # 10% buffer

        # Adjust for volatility
        if 'volatility' in patterns:
            for category, volatility in patterns['volatility'].items():
                if volatility > 0.5:  # High volatility
                    # Add buffer for volatile categories
                    current_adj = adjustments.get(category, 1.0)
                    adjustments[category] = current_adj * 1.15

        # Adjust for spikes
        if 'spikes' in patterns:
            for spike in patterns['spikes']:
                category = spike.get('category', 'total')
                if spike.get('recent', False):  # Recent spike
                    # Temporary increase for recent spikes
                    current_adj = adjustments.get(category, 1.0)
                    adjustments[category] = current_adj * 1.2

        return adjustments

    def _calculate_category_budget(self, category: str, stats: Dict,
                                  activity_level: str, pattern_adjustment: float) -> Dict:
        """
        Calculate budget for a specific category
        """
        # Start with base amount based on activity level
        if activity_level == 'inactive':
            base_amount = 0
        elif activity_level == 'occasional':
            # Use median for occasional spending
            base_amount = stats['median'] * 30  # Monthly projection
        else:
            # Use weighted average of mean and 75th percentile for regular spending
            base_amount = (0.7 * stats['mean'] + 0.3 * stats['percentile_75']) * 30

        # Apply floor constraint
        floor = self.category_floors.get(category, 0)
        base_amount = max(base_amount, floor)

        # Apply elasticity-based adjustment
        elasticity = self.elasticity_factors.get(category, 1.0)

        # If spending is above historical average, apply elasticity to suggest cuts
        if base_amount > stats['mean'] * 30 and elasticity > 1:
            reduction_factor = 1 - (0.1 * (elasticity - 1))  # Up to 10% reduction for elastic categories
            base_amount *= reduction_factor

        # Apply pattern-based adjustments
        base_amount *= pattern_adjustment

        # Apply trend adjustment
        trend = stats.get('recent_trend', 0)
        if trend > 0:  # Increasing trend
            base_amount *= (1 + min(trend, 0.1))  # Cap at 10% increase

        # Add volatility buffer
        if stats['std'] > stats['mean'] * 0.5:  # High volatility
            volatility_buffer = stats['std'] * 2  # 2 standard deviations
            base_amount += volatility_buffer * 0.1  # Add 10% of volatility as buffer

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
        Calculate recent trend in spending
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
        Calculate overall budget confidence
        """
        # Base confidence on data availability
        days_of_data = len(df)

        if days_of_data < 30:
            confidence = 0.5  # Low confidence
        elif days_of_data < 60:
            confidence = 0.7  # Medium confidence
        elif days_of_data < 90:
            confidence = 0.85  # Good confidence
        else:
            confidence = 0.95  # High confidence

        return confidence

    def _calculate_category_confidence(self, stats: Dict, activity_level: str) -> float:
        """
        Calculate confidence for category budget
        """
        # Base confidence on activity level and consistency
        if activity_level == 'inactive':
            return 0.9  # High confidence it will remain low/zero
        elif activity_level == 'occasional':
            # Lower confidence for sporadic spending
            return 0.6
        else:
            # Calculate based on coefficient of variation
            if stats['mean'] > 0:
                cv = stats['std'] / stats['mean']
                # Higher CV = lower confidence
                confidence = max(0.5, 1 - (cv * 0.3))
            else:
                confidence = 0.7

            return min(confidence, 0.95)

    def _generate_methodology(self, stats: Dict, activity_levels: Dict,
                             adjustments: Dict) -> Dict[str, Any]:
        """
        Generate explanation of budget methodology
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
        Get default budget recommendations for new users
        """
        default_budgets = []

        # Basic monthly budget allocation
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
        Adjust budget to meet savings goal
        """
        categories = current_budget['categories'].copy()
        total = current_budget['total']

        if savings_goal <= 0:
            return current_budget

        # Calculate required reduction
        required_reduction = savings_goal

        # Sort categories by elasticity (most elastic first)
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
                # Calculate maximum possible reduction
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