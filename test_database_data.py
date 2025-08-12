#!/usr/bin/env python3
"""
Quick test to verify we have real financial data in the database
"""
import sqlite3
import sys
from pathlib import Path

def check_database_data():
    db_path = Path(__file__).parent / "budget_tracker.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check transactions
        cursor.execute("SELECT COUNT(*) FROM transactions")
        transaction_count = cursor.fetchone()[0]
        print(f"📝 Transactions in database: {transaction_count}")
        
        if transaction_count > 0:
            cursor.execute("SELECT amount, description, category FROM transactions ORDER BY id DESC LIMIT 5")
            recent_transactions = cursor.fetchall()
            print("📋 Recent transactions:")
            for amount, desc, category in recent_transactions:
                print(f"  - ${amount:.2f} - {desc} ({category})")
        
        # Check categories
        cursor.execute("SELECT COUNT(*) FROM categories")
        category_count = cursor.fetchone()[0]
        print(f"📊 Categories in database: {category_count}")
        
        if category_count > 0:
            cursor.execute("SELECT name FROM categories LIMIT 5")
            categories = cursor.fetchall()
            print(f"🏷️  Sample categories: {', '.join([cat[0] for cat in categories])}")
        
        # Check budgets
        cursor.execute("SELECT COUNT(*) FROM budgets")
        budget_count = cursor.fetchone()[0]
        print(f"💰 Budgets in database: {budget_count}")
        
        if budget_count > 0:
            cursor.execute("SELECT amount, category_id FROM budgets LIMIT 5")
            budgets = cursor.fetchall()
            print(f"💵 Sample budget amounts: {', '.join([f'${b[0]:.2f}' for b in budgets])}")
        
        # Calculate total spending
        cursor.execute("SELECT SUM(amount) FROM transactions")
        total_spending = cursor.fetchone()[0] or 0
        print(f"💳 Total spending: ${total_spending:.2f}")
        
        conn.close()
        
        has_data = transaction_count > 0 or budget_count > 0
        if has_data:
            print("✅ Database contains real financial data!")
        else:
            print("⚠️ Database exists but contains no financial data")
        
        return has_data
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False

if __name__ == "__main__":
    check_database_data()