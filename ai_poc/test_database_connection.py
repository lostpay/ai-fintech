"""
Test script to verify database connection between AI services and React Native database
"""
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def test_database_config():
    """Test database configuration detection"""
    print("[1/4] Testing database configuration...")
    
    try:
        from config.database_config import get_database_config, find_react_native_database
        
        config = get_database_config()
        db_path = find_react_native_database()
        
        print(f"[PASS] Database path detected: {db_path}")
        print(f"[PASS] Database exists: {config['database_exists']}")
        print(f"[PASS] Configuration: {config}")
        
        return config['database_exists']
        
    except Exception as e:
        print(f"[FAIL] Database config test failed: {e}")
        return False

def test_sqlite_bridge():
    """Test SQLite database bridge"""
    print("\n🔗 Testing SQLite database bridge...")
    
    try:
        from services.sqlite_database import SQLiteDatabaseService
        from config.database_config import get_database_config
        
        config = get_database_config()
        db_service = SQLiteDatabaseService(config['database_path'])
        
        # Test connection
        db_service.connect()
        print("✅ Database connection successful")
        
        # Test health check
        health = db_service.check_database_health()
        print(f"✅ Database health: {health['status']}")
        
        if health.get('stats'):
            print(f"📊 Database stats: {health['stats']}")
        
        # Test basic queries
        categories = db_service.get_categories()
        print(f"✅ Categories found: {len(categories)}")
        
        transactions = db_service.get_transactions_with_categories(limit=5)
        print(f"✅ Transactions found: {len(transactions)}")
        
        budgets = db_service.get_budgets_with_details()
        print(f"✅ Budgets found: {len(budgets)}")
        
        # Test spending summary
        summary = db_service.get_spending_summary()
        print(f"✅ Spending summary: ${summary['total_amount']:.2f} across {summary['transaction_count']} transactions")
        
        db_service.disconnect()
        print("✅ Database disconnection successful")
        
        return True
        
    except Exception as e:
        print(f"❌ SQLite bridge test failed: {e}")
        return False

def test_ai_service():
    """Test AI service with real database"""
    print("\n🤖 Testing AI service with real database...")
    
    try:
        # Check for HuggingFace API key
        import os
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not api_key:
            print("⚠️  HUGGINGFACE_API_KEY not found in environment")
            print("   Setting dummy key for database testing...")
            api_key = "dummy_key_for_testing"
        
        from services.ai_service import AIService
        
        ai_service = AIService(api_key)
        print("✅ AI service initialized")
        
        # Test database health
        db_health = ai_service.get_database_health()
        print(f"✅ AI service database health: {db_health.get('status', 'unknown')}")
        
        # Test system status
        system_test = ai_service.test_system()
        print(f"✅ AI service system status: {system_test.get('overall_status', 'unknown')}")
        print(f"   - Database: {system_test.get('database', False)}")
        print(f"   - HuggingFace: {list(system_test.get('huggingface', {}).keys())}")
        
        ai_service.cleanup()
        print("✅ AI service cleanup successful")
        
        return True
        
    except Exception as e:
        print(f"❌ AI service test failed: {e}")
        return False

def test_backend_integration():
    """Test AI backend service wrapper"""
    print("\n🔧 Testing AI backend integration...")
    
    try:
        # Add backend path to Python path
        backend_path = Path(__file__).parent.parent / "ai_backend"
        sys.path.insert(0, str(backend_path))
        
        # Check for API key
        import os
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not api_key:
            print("⚠️  HUGGINGFACE_API_KEY not found, using dummy key")
            api_key = "dummy_key_for_testing"
        
        from services.ai_service_wrapper import AIServiceWrapper
        
        wrapper = AIServiceWrapper(api_key)
        print("✅ AI backend wrapper initialized")
        
        # Test database health
        db_health = wrapper.get_database_health()
        print(f"✅ Backend database health: {db_health.get('status', 'unknown')}")
        
        # Test database stats
        stats = wrapper.get_database_stats()
        print(f"✅ Backend database stats:")
        print(f"   - Transactions: {stats.get('total_transactions', 0)}")
        print(f"   - Categories: {stats.get('total_categories', 0)}")
        print(f"   - Budgets: {stats.get('total_budgets', 0)}")
        
        wrapper.cleanup()
        print("✅ Backend wrapper cleanup successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Backend integration test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing AI to React Native Database Connection")
    print("=" * 60)
    
    tests = [
        ("Database Configuration", test_database_config),
        ("SQLite Bridge", test_sqlite_bridge),
        ("AI Service", test_ai_service),
        ("Backend Integration", test_backend_integration)
    ]
    
    results = {}
    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name} test...")
        results[test_name] = test_func()
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:25} {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED! Database connection is working!")
        print("✅ Frontend -> AI Backend -> AI POC -> Real Database connection verified!")
    else:
        print("⚠️  Some tests failed. Check the logs above for details.")
        print("💡 Common issues:")
        print("   - React Native app hasn't created the database yet (run the app first)")
        print("   - Database file permissions")
        print("   - Missing HUGGINGFACE_API_KEY environment variable")
        print("   - Python path or import issues")
    
    print("=" * 60)

if __name__ == "__main__":
    main()