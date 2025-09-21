"""
Test script for the AI Chatbot system
Run this after starting all services to verify everything works
"""
import requests
import json
import time
import sys

# Configuration
GATEWAY_URL = "http://localhost:7000"
TEXT2SQL_URL = "http://localhost:7001"
RAG_URL = "http://localhost:7002"

def test_service_health():
    """Test if all services are running"""
    print("Testing service health...")

    services = [
        ("Gateway", f"{GATEWAY_URL}/health"),
        ("Text2SQL", f"{TEXT2SQL_URL}/health"),
        ("RAG", f"{RAG_URL}/health")
    ]

    all_healthy = True
    for name, url in services:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✓ {name} service: HEALTHY")
            else:
                print(f"✗ {name} service: UNHEALTHY (HTTP {response.status_code})")
                all_healthy = False
        except Exception as e:
            print(f"✗ {name} service: CONNECTION FAILED ({e})")
            all_healthy = False

    return all_healthy

def test_text2sql():
    """Test Text2SQL service directly"""
    print("\nTesting Text2SQL service...")

    test_queries = [
        {"query": "我上个月花了多少钱", "user_id": "default-user", "lang": "zh"},
        {"query": "show my dining expenses", "user_id": "default-user", "lang": "en"},
        {"query": "total spending", "user_id": "default-user", "lang": "en"}
    ]

    for i, test_data in enumerate(test_queries, 1):
        try:
            response = requests.post(f"{TEXT2SQL_URL}/generate", json=test_data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Test {i}: Query processed successfully")
                print(f"  Generated SQL: {result.get('sql', '')[:80]}...")
                print(f"  Success: {result.get('success', False)}")
                print(f"  Row count: {result.get('row_count', 0)}")
            else:
                print(f"✗ Test {i}: Failed with HTTP {response.status_code}")
        except Exception as e:
            print(f"✗ Test {i}: Error - {e}")

def test_rag():
    """Test RAG service directly"""
    print("\nTesting RAG service...")

    test_queries = [
        {"query": "如何添加支出", "lang": "zh", "top_k": 3},
        {"query": "how to set budget", "lang": "en", "top_k": 3},
        {"query": "支出类别", "lang": "zh", "top_k": 2}
    ]

    for i, test_data in enumerate(test_queries, 1):
        try:
            response = requests.post(f"{RAG_URL}/search", json=test_data, timeout=10)
            if response.status_code == 200:
                results = response.json()
                print(f"✓ Test {i}: Found {len(results)} documents")
                if results:
                    print(f"  Top result: {results[0].get('title', '')}")
                    print(f"  Score: {results[0].get('score', 0):.3f}")
            else:
                print(f"✗ Test {i}: Failed with HTTP {response.status_code}")
        except Exception as e:
            print(f"✗ Test {i}: Error - {e}")

def test_full_chat():
    """Test full chat flow through gateway"""
    print("\nTesting full chat flow...")

    test_conversations = [
        {
            "user_id": "default-user",
            "message": "我这个月花了多少钱？",
            "lang": "zh",
            "expected_type": "expense_query"
        },
        {
            "user_id": "default-user",
            "message": "显示我的餐饮支出",
            "lang": "zh",
            "expected_type": "expense_query"
        },
        {
            "user_id": "default-user",
            "message": "如何设置预算？",
            "lang": "zh",
            "expected_type": "help_query"
        },
        {
            "user_id": "default-user",
            "message": "What's my total spending?",
            "lang": "en",
            "expected_type": "expense_query"
        },
        {
            "user_id": "default-user",
            "message": "How to add expense?",
            "lang": "en",
            "expected_type": "help_query"
        }
    ]

    for i, chat_data in enumerate(test_conversations, 1):
        try:
            print(f"\nTest {i}: {chat_data['message']}")
            response = requests.post(f"{GATEWAY_URL}/chat", json=chat_data, timeout=30)

            if response.status_code == 200:
                result = response.json()
                print(f"✓ Response received")
                print(f"  Type: {result.get('type', 'unknown')}")
                print(f"  Confidence: {result.get('confidence', 0):.2f}")
                print(f"  Response: {result.get('text', '')[:100]}...")

                # Check for data
                if result.get('data'):
                    print(f"  ✓ Contains data (expense query)")
                elif result.get('sources'):
                    print(f"  ✓ Contains sources ({len(result['sources'])} docs)")
                else:
                    print(f"  - No structured data")

            else:
                print(f"✗ Failed with HTTP {response.status_code}")
                print(f"  Response: {response.text}")

        except Exception as e:
            print(f"✗ Error - {e}")

        # Small delay between requests
        time.sleep(1)

def check_supabase_connection():
    """Check if Supabase connection works"""
    print("\nChecking Supabase connection...")

    try:
        import sys
        from pathlib import Path

        # Add current directory to path to import supabase service
        current_dir = Path(__file__).parent
        sys.path.insert(0, str(current_dir))

        from supabase_service import SupabaseService

        # Test connection
        service = SupabaseService(user_id="default-user")
        health = service.get_database_health()

        if health["status"] == "healthy":
            print(f"✓ Supabase connection: HEALTHY")
            print(f"  Database type: {health.get('database_type', 'unknown')}")
            print(f"  Categories count: {health.get('categories_count', 'unknown')}")

            # Test data access
            transactions = service.get_transactions_with_categories(limit=5)
            budgets = service.get_budgets_with_details()
            categories = service.get_categories()

            print(f"  Sample data available:")
            print(f"    Transactions: {len(transactions)}")
            print(f"    Budgets: {len(budgets)}")
            print(f"    Categories: {len(categories)}")

            return True
        else:
            print(f"✗ Supabase connection: UNHEALTHY")
            print(f"  Error: {health.get('error', 'Unknown error')}")
            return False

    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")
        print("  Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("AI Chatbot System Test")
    print("=" * 60)

    # Check Supabase connection first
    if not check_supabase_connection():
        print("\n⚠️  Supabase connection issues detected. Some tests may fail.")
        print("Make sure your .env file has correct SUPABASE_URL and SUPABASE_SERVICE_KEY")

    # Test service health
    if not test_service_health():
        print("\n❌ Some services are not healthy. Please check:")
        print("1. All services are started")
        print("2. Ports 7000, 7001, 7002 are not blocked")
        print("3. Virtual environment is activated")
        print("4. All dependencies are installed")
        return

    # Test individual services
    test_text2sql()
    test_rag()

    # Test full chat flow
    test_full_chat()

    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)
    print("\nIf all tests passed, your chatbot is ready to use!")
    print("\nTo test from React Native:")
    print("1. Find your computer's IP address")
    print("2. Update EXPO_PUBLIC_CHATBOT_API_URL in your .env")
    print("3. Make sure phone/emulator is on same network")

if __name__ == "__main__":
    main()