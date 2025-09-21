"""
Test specific expense queries to debug tool calling
"""
import requests
import json

def test_expense_query_debug():
    """Test expense queries with detailed debugging"""
    print("Testing expense queries with debugging...")

    test_queries = [
        {
            "message": "我这个月花了多少钱？",
            "lang": "zh",
            "description": "Monthly spending in Chinese"
        },
        {
            "message": "What's my total spending?",
            "lang": "en",
            "description": "Total spending in English"
        },
        {
            "message": "show my expenses",
            "lang": "en",
            "description": "Simple expense request"
        }
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n--- Test {i}: {query['description']} ---")
        print(f"Query: '{query['message']}'")

        payload = {
            "user_id": "default-user",
            "message": query["message"],
            "lang": query["lang"]
        }

        try:
            response = requests.post(
                "http://localhost:7000/chat",
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()

                print(f"✓ Response received")
                print(f"  Type: {result.get('type', 'unknown')}")
                print(f"  Confidence: {result.get('confidence', 0)}")
                print(f"  Text length: {len(result.get('text', ''))}")

                # Check if data was returned
                if result.get('data'):
                    print(f"  ✅ HAS DATA: {type(result['data'])} with {len(result['data']) if isinstance(result['data'], list) else 'N/A'} items")
                    if isinstance(result['data'], list) and len(result['data']) > 0:
                        print(f"    Sample: {result['data'][0]}")
                else:
                    print(f"  ❌ NO DATA returned")

                # Check for sources
                if result.get('sources'):
                    print(f"  ✅ HAS SOURCES: {len(result['sources'])} documents")
                else:
                    print(f"  - No sources")

                # Show partial response text
                text = result.get('text', '')
                if '错误' in text or 'error' in text.lower():
                    print(f"  ❌ ERROR in response: {text[:200]}...")
                else:
                    print(f"  Response preview: {text[:150]}...")

            else:
                print(f"❌ HTTP Error: {response.status_code}")
                print(f"   Response: {response.text}")

        except Exception as e:
            print(f"❌ Request failed: {e}")

        print("-" * 50)

def test_direct_text2sql():
    """Test Text2SQL service directly for comparison"""
    print("\n" + "=" * 60)
    print("Testing Text2SQL directly for comparison...")

    test_queries = [
        {"query": "我这个月花了多少钱", "user_id": "default-user", "lang": "zh"},
        {"query": "total spending", "user_id": "default-user", "lang": "en"}
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\nDirect Text2SQL Test {i}: {query['query']}")

        try:
            response = requests.post(
                "http://localhost:7001/generate",
                json=query,
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                print(f"✓ Success: {result.get('success', False)}")
                print(f"  Row count: {result.get('row_count', 0)}")
                print(f"  SQL: {result.get('sql', '')}")
                if result.get('data'):
                    print(f"  Data sample: {result['data'][:2] if isinstance(result['data'], list) else result['data']}")
            else:
                print(f"❌ Failed: {response.status_code}")

        except Exception as e:
            print(f"❌ Error: {e}")

def main():
    print("=" * 60)
    print("Expense Query Debug Tool")
    print("=" * 60)

    test_expense_query_debug()
    test_direct_text2sql()

    print("\n" + "=" * 60)
    print("Analysis:")
    print("- If Text2SQL works directly but Gateway fails:")
    print("  → The LLM isn't calling the tools properly")
    print("- If both fail:")
    print("  → Issue with Supabase queries")
    print("- Look for 'HAS DATA' vs 'NO DATA' differences")
    print("=" * 60)

if __name__ == "__main__":
    main()