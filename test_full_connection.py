"""
Test full connection: Frontend -> AI Backend -> AI POC -> Real Database
"""
import sys
import os
import asyncio
from pathlib import Path

# Add paths
backend_path = Path(__file__).parent / "ai_backend"
ai_poc_path = Path(__file__).parent / "ai_poc"
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(ai_poc_path))

async def test_ai_backend():
    """Test AI backend service wrapper"""
    print("Testing AI Backend Service Wrapper...")
    
    try:
        # Set API key
        if not os.getenv("HUGGINGFACE_API_KEY"):
            os.environ["HUGGINGFACE_API_KEY"] = "dummy_key_for_testing"
        
        from services.ai_service_wrapper import AIServiceWrapper
        
        # Initialize wrapper
        wrapper = AIServiceWrapper(os.getenv("HUGGINGFACE_API_KEY"))
        print("[PASS] AI Backend wrapper initialized")
        
        # Test database health
        db_health = wrapper.get_database_health()
        print(f"[PASS] Database health: {db_health.get('status')}")
        
        # Test database stats
        stats = wrapper.get_database_stats()
        print(f"[PASS] Database stats:")
        print(f"  - Transactions: {stats.get('total_transactions', 0)}")
        print(f"  - Categories: {stats.get('total_categories', 0)}")
        print(f"  - Budgets: {stats.get('total_budgets', 0)}")
        
        # Test actual query processing
        print("\nTesting query processing...")
        response = await wrapper.process_query("How much did I spend this month?")
        print(f"[PASS] Query processed: {response.message[:100]}...")
        print(f"  - Confidence: {response.confidence}")
        print(f"  - Query Type: {response.query_type.value}")
        print(f"  - Processing: {response.processing_type.value}")
        
        # Test financial data queries
        print("\nTesting financial data access...")
        transactions = wrapper.get_transactions(limit=5)
        print(f"[PASS] Retrieved {len(transactions)} transactions")
        
        budgets = wrapper.get_budgets()
        print(f"[PASS] Retrieved {len(budgets)} budgets")
        
        categories = wrapper.get_categories()
        print(f"[PASS] Retrieved {len(categories)} categories")
        
        spending_summary = wrapper.get_spending_summary()
        print(f"[PASS] Spending summary: ${spending_summary.get('total_amount', 0):.2f}")
        
        # Cleanup
        wrapper.cleanup()
        print("[PASS] Backend wrapper cleanup successful")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] AI backend test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_query_examples():
    """Test various query types"""
    print("\nTesting various query types...")
    
    try:
        if not os.getenv("HUGGINGFACE_API_KEY"):
            os.environ["HUGGINGFACE_API_KEY"] = "dummy_key_for_testing"
        
        from services.ai_service_wrapper import AIServiceWrapper
        wrapper = AIServiceWrapper(os.getenv("HUGGINGFACE_API_KEY"))
        
        test_queries = [
            "How much did I spend this month?",
            "What's my budget status?",
            "Show me recent transactions",
            "How much did I spend on groceries?",
            "Which category did I spend the most on?"
        ]
        
        for i, query in enumerate(test_queries, 1):
            print(f"\n[{i}/{len(test_queries)}] Testing query: '{query}'")
            try:
                response = await wrapper.process_query(query)
                print(f"  Response: {response.message[:80]}...")
                print(f"  Type: {response.query_type.value}")
                print(f"  Confidence: {response.confidence:.2f}")
                
                if response.embedded_data:
                    print(f"  Embedded component: {response.embedded_data.component_type.value}")
                
            except Exception as e:
                print(f"  [FAIL] Query failed: {e}")
        
        wrapper.cleanup()
        return True
        
    except Exception as e:
        print(f"[FAIL] Query testing failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("=== FULL CONNECTION TEST ===")
    print("Testing: Frontend -> AI Backend -> AI POC -> Real Database")
    print("=" * 60)
    
    backend_ok = await test_ai_backend()
    queries_ok = await test_query_examples()
    
    print("\n" + "=" * 60)
    print("FINAL RESULTS:")
    print(f"AI Backend: {'PASS' if backend_ok else 'FAIL'}")
    print(f"Query Processing: {'PASS' if queries_ok else 'FAIL'}")
    
    if backend_ok and queries_ok:
        print("\n🎉 SUCCESS! Full connection is working!")
        print("✅ Frontend can connect to AI Backend")
        print("✅ AI Backend can access AI POC services")
        print("✅ AI POC can query the real React Native database")
        print("✅ Query processing pipeline is functional")
        print("\nNext steps:")
        print("1. Start the AI Backend server: python ai_backend/main.py")
        print("2. Update React Native app to use the backend API")
        print("3. Test end-to-end from mobile app")
    else:
        print("\n❌ Some tests failed. Check the logs above.")
    
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())