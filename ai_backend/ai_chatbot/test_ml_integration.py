"""
Test script for ML integration with Gateway
Tests predictions, budgets, and patterns through the gateway
"""

import asyncio
import httpx
import json
from datetime import datetime
from typing import Dict, Any

# Configuration
GATEWAY_URL = "http://127.0.0.1:7000"
ML_URL = "http://127.0.0.1:7003"
TEST_USER_ID = "default-user"

# Test messages for different ML features
TEST_MESSAGES = {
    "predict_weekly": {
        "zh": "我下周会花多少钱？",
        "en": "How much will I spend next week?"
    },
    "predict_monthly": {
        "zh": "预测我下个月的支出",
        "en": "Predict my spending for next month"
    },
    "budget": {
        "zh": "给我推荐一个预算",
        "en": "Recommend a budget for me"
    },
    "patterns": {
        "zh": "我的支出有什么规律吗？",
        "en": "What patterns are there in my spending?"
    },
    "combined": {
        "zh": "分析我的支出模式并预测未来一周的花费",
        "en": "Analyze my spending patterns and predict next week's expenses"
    }
}

async def test_ml_health():
    """Test ML service health"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ML_URL}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ ML Service Health: {data['status']}")
                return True
            else:
                print(f"❌ ML Service unhealthy: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ ML Service unreachable: {e}")
            return False

async def test_gateway_health():
    """Test Gateway service health"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{GATEWAY_URL}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Gateway Service Health: {data['status']}")
                return True
            else:
                print(f"❌ Gateway unhealthy: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Gateway unreachable: {e}")
            return False

async def test_direct_ml_prediction():
    """Test direct ML prediction endpoint"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            payload = {
                "user_id": TEST_USER_ID,
                "timeframe": "weekly",
                "horizon": 2
            }
            response = await client.post(f"{ML_URL}/predict", json=payload)

            if response.status_code == 200:
                data = response.json()
                print(f"✅ Direct ML Prediction Success:")
                print(f"  - Timeframe: {data.get('timeframe')}")
                print(f"  - Confidence: {data.get('confidence', 0):.1%}")
                print(f"  - Predictions: {len(data.get('predictions', []))} periods")
                if data.get('predictions'):
                    first_pred = data['predictions'][0]
                    print(f"  - First prediction: ${first_pred.get('predicted_amount', 0):.2f}")
                return True
            elif response.status_code == 400:
                error = response.json()
                print(f"⚠️  ML Prediction failed: {error.get('detail', 'Unknown error')}")
                print("  Note: Need at least 30 days of transaction data")
                return False
            else:
                print(f"❌ ML Prediction failed: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Direct ML call error: {e}")
            return False

async def test_gateway_ml_integration(message_key: str, lang: str = "en"):
    """Test ML integration through gateway"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            message = TEST_MESSAGES[message_key][lang]
            print(f"\n📝 Testing: {message}")

            payload = {
                "user_id": TEST_USER_ID,
                "message": message,
                "lang": lang
            }

            response = await client.post(f"{GATEWAY_URL}/chat", json=payload)

            if response.status_code == 200:
                data = response.json()
                print(f"✅ Gateway processed ML request successfully")
                print(f"  Response: {data.get('text', '')[:200]}...")

                # Check if ML data was embedded
                if data.get('data'):
                    ml_data = data['data']
                    if 'predictions' in ml_data:
                        print(f"  ✅ Predictions embedded: {len(ml_data['predictions'])} periods")
                    elif 'categories' in ml_data:
                        print(f"  ✅ Budget embedded: {len(ml_data['categories'])} categories")
                        print(f"     Total budget: ${ml_data.get('total_budget', 0):.2f}")
                    elif 'recurrences' in ml_data:
                        print(f"  ✅ Patterns embedded: {len(ml_data.get('recurrences', []))} recurrences")
                else:
                    print("  ⚠️  No ML data embedded in response")

                return True
            else:
                print(f"❌ Gateway ML request failed: HTTP {response.status_code}")
                return False

        except Exception as e:
            print(f"❌ Gateway ML integration error: {e}")
            return False

async def test_ml_budget():
    """Test budget generation"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            payload = {"user_id": TEST_USER_ID}
            response = await client.post(f"{ML_URL}/budget", json=payload)

            if response.status_code == 200:
                data = response.json()
                print(f"✅ Budget Generation Success:")
                print(f"  - Total budget: ${data.get('total_budget', 0):.2f}")
                print(f"  - Categories: {len(data.get('categories', []))}")
                if data.get('categories'):
                    top_3 = sorted(data['categories'], key=lambda x: x['amount'], reverse=True)[:3]
                    print("  - Top 3 categories:")
                    for cat in top_3:
                        print(f"    • {cat['category']}: ${cat['amount']:.2f}")
                return True
            else:
                print(f"❌ Budget generation failed: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Budget generation error: {e}")
            return False

async def test_ml_patterns():
    """Test pattern detection"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            payload = {"user_id": TEST_USER_ID, "lookback_days": 90}
            response = await client.post(f"{ML_URL}/patterns", json=payload)

            if response.status_code == 200:
                data = response.json()
                print(f"✅ Pattern Detection Success:")
                print(f"  - Recurrences: {len(data.get('recurrences', []))}")
                print(f"  - Spikes: {len(data.get('spikes', []))}")
                print(f"  - Activity levels: {len(data.get('activity_levels', {}))}")
                print(f"  - Insights: {len(data.get('insights', []))}")

                if data.get('insights'):
                    print("  - Sample insights:")
                    for insight in data['insights'][:2]:
                        print(f"    • {insight}")
                return True
            elif response.status_code == 400:
                error = response.json()
                print(f"⚠️  Pattern detection failed: {error.get('detail', 'Unknown error')}")
                return False
            else:
                print(f"❌ Pattern detection failed: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Pattern detection error: {e}")
            return False

async def run_all_tests():
    """Run all ML integration tests"""
    print("=" * 60)
    print("ML INTEGRATION TEST SUITE")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Test User: {TEST_USER_ID}")
    print()

    # Test service health
    print("1️⃣  SERVICE HEALTH CHECKS")
    print("-" * 40)
    ml_healthy = await test_ml_health()
    gateway_healthy = await test_gateway_health()

    if not ml_healthy:
        print("\n⚠️  ML Service is not running. Start it with:")
        print("   cd ai_backend/ai_chatbot/ml && python app.py")
        return

    if not gateway_healthy:
        print("\n⚠️  Gateway Service is not running. Start it with:")
        print("   cd ai_backend/ai_chatbot/gateway && python main.py")
        return

    # Test direct ML endpoints
    print("\n2️⃣  DIRECT ML SERVICE TESTS")
    print("-" * 40)
    await test_direct_ml_prediction()
    await test_ml_budget()
    await test_ml_patterns()

    # Test gateway integration
    print("\n3️⃣  GATEWAY INTEGRATION TESTS")
    print("-" * 40)

    # Test different ML queries through gateway
    for message_key in ["predict_weekly", "budget", "patterns"]:
        await test_gateway_ml_integration(message_key, "en")
        await asyncio.sleep(1)  # Small delay between requests

    # Test Chinese language
    print("\n4️⃣  CHINESE LANGUAGE TEST")
    print("-" * 40)
    await test_gateway_ml_integration("predict_weekly", "zh")

    print("\n" + "=" * 60)
    print("TEST SUITE COMPLETED")
    print("=" * 60)

async def quick_test():
    """Quick test of basic ML functionality"""
    print("\n🚀 QUICK ML TEST")
    print("-" * 40)

    # Check if services are running
    ml_healthy = await test_ml_health()
    gateway_healthy = await test_gateway_health()

    if ml_healthy and gateway_healthy:
        # Test a simple prediction through gateway
        await test_gateway_ml_integration("predict_weekly", "en")
    else:
        print("⚠️  Services not ready. Please start ML and Gateway services.")

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        asyncio.run(quick_test())
    else:
        asyncio.run(run_all_tests())