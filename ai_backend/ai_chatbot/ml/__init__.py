"""
ML Forecasting and Budgeting Module.
Provides spending prediction, budget generation, pattern detection,
and feature engineering for financial analysis.
"""

from .predictor import SpendingPredictor
from .budget_generator import BudgetGenerator
from .pattern_detector import PatternDetector
from .data_processor import DataProcessor

__all__ = [
    'SpendingPredictor',
    'BudgetGenerator',
    'PatternDetector',
    'DataProcessor'
]

__version__ = '1.0.0'