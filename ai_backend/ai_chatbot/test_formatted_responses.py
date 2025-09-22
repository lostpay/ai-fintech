"""
Test formatted AI responses
Verifies that responses are natural and conversational
"""

import asyncio
import httpx
import json

GATEWAY_URL = "http://127.0.0.1:7000"
USER_ID = "default-user"

TEST_QUERIES = {
    "budget": {
        "en": "Recommend a budget for me",
        "zh": "给我推荐一个预算"
    },
    "prediction": {
        "en": "How much will I spend next week?",
        "zh": "我下周会花多少钱？"
    },
    "patterns": {
        "en": "What are my spending patterns?",
        "zh": "我的消费模式是什么？"
    },
    "sql_query": {
        "en": "How much did I spend on food last month?",
        "zh": "我上个月在食物上花了多少钱？"
    }
}

async def test_response(query_type: str, lang: str = "en"):
    """Test a specific query type and language"""

    query = TEST_QUERIES[query_type][lang]
    print(f"\n{'='*60}")
    print(f"Testing: {query_type} ({lang})")
    print(f"Query: {query}")
    print("-"*60)

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{GATEWAY_URL}/chat",
                json={
                    "user_id": USER_ID,
                    "message": query,
                    "lang": lang
                }
            )

            if response.status_code == 200:
                data = response.json()
                text = data.get('text', '')

                print("Response:")
                print(text[:500])  # Show first 500 chars

                # Check for unwanted technical terms
                technical_terms = [
                    'elasticity', 'adjustment factor', 'confidence score',
                    'lower_bound', 'upper_bound', 'methodology'
                ]

                found_terms = [term for term in technical_terms if term in text.lower()]

                if found_terms:
                    print(f"\n⚠️  Found technical terms: {', '.join(found_terms)}")
                    print("   Response needs more natural formatting")
                else:
                    print("\n✅ Response appears natural and conversational")

                # Check for good formatting elements
                good_elements = ['📊', '💡', '💰', '🍔', '🚗', '📈']
                has_formatting = any(elem in text for elem in good_elements)

                if has_formatting:
                    print("✅ Has visual formatting (emojis/structure)")
                else:
                    print("⚠️  Could use more visual formatting")

                return True
            else:
                print(f"❌ Request failed: HTTP {response.status_code}")
                return False

        except Exception as e:
            print(f"❌ Error: {e}")
            return False

async def run_all_tests():
    """Run all formatting tests"""

    print("="*60)
    print("AI RESPONSE FORMATTING TEST")
    print("="*60)
    print("\nTesting natural language formatting...")

    # Test each query type in English
    print("\n🇬🇧 ENGLISH TESTS")
    for query_type in TEST_QUERIES.keys():
        await test_response(query_type, "en")
        await asyncio.sleep(2)  # Small delay between requests

    # Test budget in Chinese
    print("\n🇨🇳 CHINESE TEST")
    await test_response("budget", "zh")

    print("\n" + "="*60)
    print("FORMATTING TEST COMPLETE")
    print("="*60)
    print("\nKey improvements:")
    print("✅ Natural language instead of technical terms")
    print("✅ Emojis and visual structure")
    print("✅ Conversational tone")
    print("✅ Actionable insights and tips")

async def quick_test():
    """Quick test of budget formatting"""
    await test_response("budget", "en")

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        asyncio.run(quick_test())
    else:
        asyncio.run(run_all_tests())