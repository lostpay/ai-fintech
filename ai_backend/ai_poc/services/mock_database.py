"""
Mock database service for AI proof of concept
Simulates the financial data that would come from the React Native app's SQLite database
"""
from typing import List, Optional
from datetime import datetime, timedelta
import random
from models.data_types import Transaction, Budget, Category

class MockDatabaseService:
    """Mock database service with sample financial data"""
    
    def __init__(self):
        self.categories = self._create_sample_categories()
        self.transactions = self._create_sample_transactions()
        self.budgets = self._create_sample_budgets()
    
    def _create_sample_categories(self) -> List[Category]:
        """Create sample expense categories"""
        return [
            Category(id=1, name="Groceries", color="#FF5722", icon="shopping-cart"),
            Category(id=2, name="Dining", color="#FF9800", icon="restaurant"),
            Category(id=3, name="Transportation", color="#2196F3", icon="car"),
            Category(id=4, name="Entertainment", color="#9C27B0", icon="movie"),
            Category(id=5, name="Utilities", color="#607D8B", icon="lightbulb"),
            Category(id=6, name="Healthcare", color="#E91E63", icon="medical"),
            Category(id=7, name="Shopping", color="#00BCD4", icon="shopping-bag"),
            Category(id=8, name="Travel", color="#4CAF50", icon="airplane"),
        ]
    
    def _create_sample_transactions(self) -> List[Transaction]:
        """Create sample transactions for the last 3 months"""
        transactions = []
        current_date = datetime.now()
        
        # Generate transactions for the last 90 days
        for i in range(150):  # 150 transactions over 90 days
            days_ago = random.randint(0, 90)
            transaction_date = current_date - timedelta(days=days_ago)
            category = random.choice(self.categories)
            
            # Create realistic amounts based on category
            amount_ranges = {
                "Groceries": (25.00, 150.00),
                "Dining": (15.00, 80.00),
                "Transportation": (10.00, 200.00),
                "Entertainment": (12.00, 60.00),
                "Utilities": (50.00, 250.00),
                "Healthcare": (30.00, 500.00),
                "Shopping": (20.00, 300.00),
                "Travel": (100.00, 1000.00),
            }
            
            min_amount, max_amount = amount_ranges.get(category.name, (10.00, 100.00))
            amount = round(random.uniform(min_amount, max_amount), 2)
            
            # Generate realistic descriptions
            descriptions = {
                "Groceries": ["Supermarket", "Grocery Store", "Farmer's Market", "Whole Foods", "Target"],
                "Dining": ["Restaurant", "Fast Food", "Coffee Shop", "Pizza Place", "Takeout"],
                "Transportation": ["Gas Station", "Uber", "Public Transit", "Parking", "Car Maintenance"],
                "Entertainment": ["Movie Theater", "Concert", "Streaming Service", "Games", "Books"],
                "Utilities": ["Electric Bill", "Water Bill", "Internet", "Phone Bill", "Heating"],
                "Healthcare": ["Doctor Visit", "Pharmacy", "Dental", "Insurance", "Medical Supplies"],
                "Shopping": ["Clothing", "Electronics", "Home Goods", "Online Purchase", "Department Store"],
                "Travel": ["Flight", "Hotel", "Car Rental", "Vacation", "Business Trip"],
            }
            
            description = random.choice(descriptions.get(category.name, ["Purchase"]))
            
            transaction = Transaction(
                id=i + 1,
                amount=amount,
                description=description,
                category_id=category.id,
                category_name=category.name,
                category_color=category.color,
                transaction_type="expense",
                date=transaction_date,
                created_at=transaction_date
            )
            transactions.append(transaction)
        
        # Sort by date (newest first)
        transactions.sort(key=lambda t: t.date, reverse=True)
        return transactions
    
    def _create_sample_budgets(self) -> List[Budget]:
        """Create sample budgets with realistic spending"""
        budgets = []
        current_date = datetime.now()
        month_start = current_date.replace(day=1)
        next_month = month_start.replace(month=month_start.month % 12 + 1)
        
        # Budget amounts by category (monthly)
        budget_amounts = {
            "Groceries": 400.00,
            "Dining": 200.00,
            "Transportation": 300.00,
            "Entertainment": 150.00,
            "Utilities": 200.00,
            "Healthcare": 100.00,
            "Shopping": 250.00,
            "Travel": 500.00,
        }
        
        for category in self.categories:
            if category.name in budget_amounts:
                budget_amount = budget_amounts[category.name]
                
                # Calculate spent amount from current month transactions
                spent_amount = sum(
                    t.amount for t in self.transactions 
                    if t.category_id == category.id and t.date >= month_start
                )
                
                remaining_amount = max(0, budget_amount - spent_amount)
                percentage_used = min(100, (spent_amount / budget_amount) * 100)
                
                budget = Budget(
                    id=len(budgets) + 1,
                    category_id=category.id,
                    category_name=category.name,
                    category_color=category.color,
                    amount=budget_amount,
                    spent_amount=spent_amount,
                    remaining_amount=remaining_amount,
                    percentage_used=percentage_used,
                    period_start=month_start,
                    period_end=next_month
                )
                budgets.append(budget)
        
        return budgets
    
    def get_transactions_with_categories(self, 
                                       category_id: Optional[int] = None,
                                       transaction_type: Optional[str] = None,
                                       start_date: Optional[datetime] = None,
                                       end_date: Optional[datetime] = None,
                                       limit: Optional[int] = None) -> List[Transaction]:
        """Get transactions with filtering options"""
        filtered_transactions = self.transactions
        
        if category_id:
            filtered_transactions = [t for t in filtered_transactions if t.category_id == category_id]
        
        if transaction_type:
            filtered_transactions = [t for t in filtered_transactions if t.transaction_type == transaction_type]
        
        if start_date:
            filtered_transactions = [t for t in filtered_transactions if t.date >= start_date]
        
        if end_date:
            filtered_transactions = [t for t in filtered_transactions if t.date <= end_date]
        
        if limit:
            filtered_transactions = filtered_transactions[:limit]
        
        return filtered_transactions
    
    def get_budgets_with_details(self) -> List[Budget]:
        """Get all budgets with calculated details"""
        return self.budgets
    
    def get_categories(self) -> List[Category]:
        """Get all categories"""
        return self.categories
    
    def get_spending_summary(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> dict:
        """Get spending summary for a date range"""
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)  # Last 30 days
        if not end_date:
            end_date = datetime.now()
        
        filtered_transactions = self.get_transactions_with_categories(
            transaction_type="expense",
            start_date=start_date,
            end_date=end_date
        )
        
        total_amount = sum(t.amount for t in filtered_transactions)
        
        # Group by category
        category_spending = {}
        for transaction in filtered_transactions:
            category_name = transaction.category_name
            if category_name not in category_spending:
                category_spending[category_name] = 0
            category_spending[category_name] += transaction.amount
        
        return {
            "total_amount": total_amount,
            "transactions": filtered_transactions,
            "category_breakdown": category_spending,
            "transaction_count": len(filtered_transactions),
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }