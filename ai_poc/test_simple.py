"""
Simple test script for database connection
"""
import sys
import os
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def test_database():
    print("Testing database connection...")
    
    try:
        from config.database_config import get_database_config
        config = get_database_config()
        
        print(f"Database path: {config['database_path']}")
        print(f"Database exists: {config['database_exists']}")
        
        if not config['database_exists']:
            print("Database file not found. This is expected if React Native app hasn't been run yet.")
            return False
        
        # Test SQLite connection
        from services.sqlite_database import SQLiteDatabaseService
        db = SQLiteDatabaseService(config['database_path'])
        db.connect()
        
        health = db.check_database_health()
        print(f"Database health: {health['status']}")
        
        if health['status'] == 'healthy':
            stats = health.get('stats', {})
            print(f"Categories: {stats.get('categories_count', 0)}")
            print(f"Transactions: {stats.get('transactions_count', 0)}")
            print(f"Budgets: {stats.get('budgets_count', 0)}")
        
        db.disconnect()
        print("Database test completed successfully!")
        return True
        
    except Exception as e:
        print(f"Database test failed: {e}")
        return False

def test_ai_service():
    print("\nTesting AI service...")
    
    try:
        # Set dummy API key if not present
        if not os.getenv("HUGGINGFACE_API_KEY"):
            os.environ["HUGGINGFACE_API_KEY"] = "dummy_key_for_testing"
        
        from services.ai_service import AIService
        ai = AIService(os.getenv("HUGGINGFACE_API_KEY"))
        
        health = ai.get_database_health()
        print(f"AI service database health: {health.get('status', 'unknown')}")
        
        ai.cleanup()
        print("AI service test completed!")
        return True
        
    except Exception as e:
        print(f"AI service test failed: {e}")
        return False

if __name__ == "__main__":
    print("=== Database Connection Test ===")
    
    db_ok = test_database()
    ai_ok = test_ai_service()
    
    print("\n=== RESULTS ===")
    print(f"Database: {'PASS' if db_ok else 'FAIL'}")
    print(f"AI Service: {'PASS' if ai_ok else 'FAIL'}")
    
    if db_ok and ai_ok:
        print("\nSUCCESS: Database connection is working!")
    else:
        print("\nNEEDS WORK: Some tests failed")
        if not db_ok:
            print("- Run the React Native app first to create the database")
        if not ai_ok:
            print("- Check Python dependencies and imports")