"""
Test script for OpenAI GPT OSS 20B model integration
"""
import asyncio
import os
import logging
from dotenv import load_dotenv
from services.huggingface_manager import HuggingFaceManager
from models.data_types import QueryType

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_gpt_oss_integration():
    """Test the GPT OSS model integration"""
    print("🧪 Testing OpenAI GPT OSS 20B Model Integration")
    print("=" * 60)
    
    # Load environment
    load_dotenv()
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    
    if not api_key:
        print("❌ HUGGINGFACE_API_KEY not found in environment")
        return False
    
    # Initialize manager
    try:
        hf_manager = HuggingFaceManager(api_key)
        print("✅ HuggingFace Manager initialized")
    except Exception as e:
        print(f"❌ Failed to initialize manager: {e}")
        return False
    
    # Test model availability
    print("\n🔧 Testing model availability...")
    test_results = hf_manager.test_models()
    
    for model_type, status in test_results.items():
        status_icon = "✅" if status else "❌"
        print(f"   {status_icon} {model_type}: {hf_manager.models[model_type]}")
    
    if not (test_results.get("conversational") or test_results.get("general")):
        print("❌ GPT OSS models not accessible")
        return False
    
    # Test financial response generation
    print("\n💰 Testing financial response generation...")
    
    test_scenarios = [
        {
            "query": "How much did I spend on groceries this month?",
            "financial_data": {
                "total_amount": 450.75,
                "category_breakdown": {
                    "Groceries": 180.50,
                    "Dining": 120.25,
                    "Transportation": 150.00
                },
                "transactions": [
                    {"amount": 45.30, "description": "Safeway groceries", "category": "Groceries"},
                    {"amount": 23.50, "description": "Starbucks coffee", "category": "Dining"}
                ]
            },
            "query_type": QueryType.SPENDING_SUMMARY
        },
        {
            "query": "What's my budget status?",
            "financial_data": {
                "budgets": [
                    {"category": "Groceries", "budgeted": 200.00, "spent": 180.50, "percentage_used": 90.25},
                    {"category": "Dining", "budgeted": 100.00, "spent": 120.25, "percentage_used": 120.25}
                ]
            },
            "query_type": QueryType.BUDGET_STATUS
        },
        {
            "query": "Can you help me understand my spending patterns?",
            "financial_data": {
                "total_amount": 1250.00,
                "category_breakdown": {
                    "Housing": 800.00,
                    "Food": 200.00,
                    "Transportation": 150.00,
                    "Entertainment": 100.00
                }
            },
            "query_type": QueryType.UNKNOWN
        }
    ]
    
    success_count = 0
    total_tests = len(test_scenarios)
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n📝 Test {i}/{total_tests}: '{scenario['query']}'")
        
        try:
            response = hf_manager.generate_financial_response(
                scenario["query"],
                scenario["financial_data"],
                scenario["query_type"]
            )
            
            if response and len(response) > 10:  # Basic validation
                print(f"   ✅ Response generated ({len(response)} chars)")
                print(f"   💬 Preview: {response[:100]}{'...' if len(response) > 100 else ''}")
                success_count += 1
            else:
                print(f"   ⚠️ Response too short or empty: '{response}'")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Summary
    print(f"\n📊 Test Results:")
    print(f"   • Successful responses: {success_count}/{total_tests}")
    print(f"   • Success rate: {(success_count/total_tests)*100:.1f}%")
    
    if success_count >= total_tests * 0.7:  # 70% success rate
        print("🎉 GPT OSS integration test PASSED!")
        return True
    else:
        print("❌ GPT OSS integration test FAILED")
        return False

async def main():
    """Main test runner"""
    try:
        success = await test_gpt_oss_integration()
        if success:
            print("\n✅ All tests completed successfully!")
            print("🚀 GPT OSS 20B model is ready to use in the POC!")
        else:
            print("\n❌ Tests failed. Check your API key and model availability.")
    except Exception as e:
        logger.error(f"Test suite failed: {e}")
        print(f"❌ Test suite error: {e}")

if __name__ == "__main__":
    asyncio.run(main())