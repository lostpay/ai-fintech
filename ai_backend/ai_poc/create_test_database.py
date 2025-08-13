"""
Create a test database with sample data for testing the AI connection
"""
import sqlite3
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def create_test_database():
    """Create a test database with sample data"""
    
    # Database path
    db_path = Path(__file__).parent.parent / "budget_tracker.db"
    print(f"Creating test database at: {db_path}")
    
    # Remove existing database
    if db_path.exists():
        db_path.unlink()
        print("Removed existing database")
    
    # Connect to database
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Create tables (from React Native schema)
    print("Creating tables...")
    
    # Categories table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL,
            icon TEXT NOT NULL,
            is_default BOOLEAN NOT NULL DEFAULT 0,
            is_hidden BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            CHECK (length(name) > 0 AND length(name) <= 50),
            CHECK (color LIKE '#%' AND length(color) = 7),
            CHECK (length(icon) > 0 AND length(icon) <= 30)
        )
    """)
    
    # Transactions table (amounts in cents to match React Native)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount INTEGER NOT NULL,
            description TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income')),
            date DATE NOT NULL DEFAULT (date('now')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
            
            CHECK (amount > 0),
            CHECK (length(description) > 0 AND length(description) <= 200)
        )
    """)
    
    # Budgets table (amounts in cents)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
            UNIQUE (category_id, period_start, period_end),
            
            CHECK (amount > 0),
            CHECK (period_end > period_start)
        )
    """)
    
    # AI Conversations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            messages TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)
    
    # AI Query Context table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_query_context (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            last_query_type TEXT,
            relevant_timeframe TEXT,
            focus_categories TEXT,
            budget_context TEXT,
            langchain_memory TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
        )
    """)
    
    # Goals table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            target_amount INTEGER NOT NULL,
            current_amount INTEGER NOT NULL DEFAULT 0,
            target_date DATE,
            description TEXT NOT NULL,
            is_completed BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            CHECK (length(name) > 0 AND length(name) <= 100),
            CHECK (target_amount > 0),
            CHECK (current_amount >= 0),
            CHECK (length(description) <= 500)
        )
    """)
    
    # Create indexes
    print("Creating indexes...")
    indexes = [
        'CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(transaction_type, date)',
        'CREATE INDEX IF NOT EXISTS idx_budgets_category_period ON budgets(category_id, period_start, period_end)',
        'CREATE INDEX IF NOT EXISTS idx_categories_visibility ON categories(is_default, is_hidden)',
        'CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_active ON ai_conversations(user_id, is_active)',
    ]
    
    for index_sql in indexes:
        cursor.execute(index_sql)
    
    # Insert sample categories
    print("Inserting sample categories...")
    categories = [
        ('Groceries', '#4CAF50', 'shopping-cart', 1),
        ('Dining', '#FF9800', 'restaurant', 1),
        ('Transportation', '#2196F3', 'directions-car', 1),
        ('Entertainment', '#9C27B0', 'movie', 1),
        ('Healthcare', '#00BCD4', 'local-hospital', 1),
        ('Utilities', '#607D8B', 'flash-on', 1),
        ('Shopping', '#F44336', 'shopping-bag', 1),
        ('Income', '#8BC34A', 'attach-money', 1),
    ]
    
    for name, color, icon, is_default in categories:
        cursor.execute(
            "INSERT INTO categories (name, color, icon, is_default) VALUES (?, ?, ?, ?)",
            (name, color, icon, is_default)
        )
    
    # Get category IDs
    cursor.execute("SELECT id, name FROM categories")
    category_map = {name: id for id, name in cursor.fetchall()}
    
    # Insert sample transactions (amounts in cents)
    print("Inserting sample transactions...")
    current_date = datetime.now()
    
    # Generate 100 transactions over the last 90 days
    for i in range(100):
        days_ago = random.randint(0, 90)
        transaction_date = (current_date - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        
        # Pick random category (excluding Income for expenses)
        expense_categories = [cat for cat in category_map.keys() if cat != 'Income']
        category_name = random.choice(expense_categories)
        category_id = category_map[category_name]
        
        # Generate realistic amounts based on category (in cents)
        amount_ranges = {
            'Groceries': (2500, 15000),    # $25-150
            'Dining': (1500, 8000),        # $15-80
            'Transportation': (1000, 20000), # $10-200
            'Entertainment': (1200, 6000), # $12-60
            'Healthcare': (3000, 50000),   # $30-500
            'Utilities': (5000, 25000),    # $50-250
            'Shopping': (2000, 30000),     # $20-300
        }
        
        min_amount, max_amount = amount_ranges.get(category_name, (1000, 10000))
        amount_cents = random.randint(min_amount, max_amount)
        
        # Generate description
        descriptions = {
            'Groceries': ['Supermarket', 'Grocery Store', 'Whole Foods', 'Target Groceries'],
            'Dining': ['Restaurant Meal', 'Fast Food', 'Coffee Shop', 'Pizza Place'],
            'Transportation': ['Gas Station', 'Uber Ride', 'Public Transit', 'Parking Fee'],
            'Entertainment': ['Movie Theater', 'Concert', 'Streaming Service', 'Games'],
            'Healthcare': ['Doctor Visit', 'Pharmacy', 'Dental Checkup', 'Medical Supplies'],
            'Utilities': ['Electric Bill', 'Water Bill', 'Internet', 'Phone Bill'],
            'Shopping': ['Clothing', 'Electronics', 'Home Goods', 'Online Purchase'],
        }
        
        description = random.choice(descriptions.get(category_name, ['Purchase']))
        
        cursor.execute(
            "INSERT INTO transactions (amount, description, category_id, transaction_type, date) VALUES (?, ?, ?, ?, ?)",
            (amount_cents, description, category_id, 'expense', transaction_date)
        )
    
    # Add some income transactions
    income_id = category_map['Income']
    for i in range(6):  # 6 months of income
        months_ago = i
        income_date = (current_date.replace(day=1) - timedelta(days=months_ago * 30)).strftime('%Y-%m-%d')
        amount_cents = random.randint(300000, 500000)  # $3000-5000
        
        cursor.execute(
            "INSERT INTO transactions (amount, description, category_id, transaction_type, date) VALUES (?, ?, ?, ?, ?)",
            (amount_cents, 'Monthly Salary', income_id, 'income', income_date)
        )
    
    # Insert sample budgets for current month
    print("Inserting sample budgets...")
    current_month_start = current_date.replace(day=1).strftime('%Y-%m-%d')
    next_month = current_date.replace(month=current_date.month % 12 + 1, day=1)
    next_month_start = next_month.strftime('%Y-%m-%d')
    
    budget_amounts = {
        'Groceries': 40000,    # $400
        'Dining': 20000,       # $200
        'Transportation': 30000, # $300
        'Entertainment': 15000, # $150
        'Healthcare': 10000,    # $100
        'Utilities': 20000,     # $200
        'Shopping': 25000,      # $250
    }
    
    for category_name, budget_amount in budget_amounts.items():
        category_id = category_map[category_name]
        cursor.execute(
            "INSERT INTO budgets (category_id, amount, period_start, period_end) VALUES (?, ?, ?, ?)",
            (category_id, budget_amount, current_month_start, next_month_start)
        )
    
    # Commit changes
    conn.commit()
    conn.close()
    
    print(f"Test database created successfully at: {db_path}")
    print("Database contains:")
    print(f"- {len(categories)} categories")
    print("- 106 transactions (100 expenses + 6 income)")
    print(f"- {len(budget_amounts)} budgets")
    
    return str(db_path)

if __name__ == "__main__":
    create_test_database()