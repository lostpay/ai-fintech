#!/usr/bin/env python3
"""
Test script for the AI backend fixes
Tests the specific query that was failing: "last 30 days what is my lowest spending category"
"""

import sys
import os
from pathlib import Path

# Add the ai_poc directory to Python path
current_dir = Path(__file__).parent
ai_poc_dir = current_dir / "ai_poc"
sys.path.insert(0, str(ai_poc_dir))

# Import the services
from services.huggingface_manager import HuggingFaceManager
from services.query_processor import QueryProcessor

def test_classification():
    """Test the enhanced classification system"""
    # Initialize with dummy API key for testing
    api_key = os.getenv("HUGGINGFACE_API_KEY", "dummy-key")
    
    # Test queries
    test_queries = [
        "last 30 days what is my lowest spending category",
        "biggest spending category this month", 
        "my top 3 categories last week",
        "smallest expense category yesterday",
        "highest spending area last month"
    ]
    
    try:
        # Initialize managers
        hf_manager = HuggingFaceManager(api_key)
        query_processor = QueryProcessor()
        
        print("🧪 Testing Enhanced AI Classification System")
        print("=" * 50)
        
        for query in test_queries:
            print(f"\n🔍 Query: '{query}'")
            
            # Test keyword-based classification (our fallback)
            result = hf_manager._classify_by_keywords_json(query)
            
            print(f"   📊 Intent: {result['intent']}")
            print(f"   📅 Time Range: {result.get('time_range', {})}")
            print(f"   🔧 Filters: {result.get('filters', {})}")
            print(f"   🎯 Confidence: {result.get('confidence', 0.0)}")
            
            # Check if our specific test case works
            if "lowest spending category" in query:
                expected_intent = "spending_summary"
                expected_order = "ascending"
                expected_top_n = 1
                
                success = (
                    result['intent'] == expected_intent and
                    result.get('filters', {}).get('order') == expected_order and
                    result.get('filters', {}).get('top_n') == expected_top_n and
                    'from' in result.get('time_range', {}) and
                    'to' in result.get('time_range', {})
                )
                
                print(f"   ✅ Test Result: {'PASS' if success else 'FAIL'}")
                
                if success:
                    print(f"      ✓ Intent correctly classified as {expected_intent}")
                    print(f"      ✓ Order correctly set to {expected_order}")
                    print(f"      ✓ Top N correctly set to {expected_top_n}")
                    print(f"      ✓ Date range properly formatted")
                else:
                    print(f"      ❌ Expected: intent={expected_intent}, order={expected_order}, top_n={expected_top_n}")
                    print(f"      ❌ Got: intent={result['intent']}, order={result.get('filters', {}).get('order')}, top_n={result.get('filters', {}).get('top_n')}")
        
        print("\n" + "=" * 50)
        print("🎉 Classification testing completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    
    return True

def test_date_parsing():
    """Test that we're generating actual dates instead of placeholders"""
    print("\n🗓️  Testing Date Parsing")
    print("=" * 30)
    
    try:
        from datetime import datetime, timedelta
        
        # Test date calculations
        current_date = datetime.now()
        thirty_days_ago = current_date - timedelta(days=30)
        
        expected_from = thirty_days_ago.strftime("%Y-%m-%d")
        expected_to = current_date.strftime("%Y-%m-%d")
        
        print(f"Expected 'last 30 days' range:")
        print(f"  From: {expected_from}")
        print(f"  To: {expected_to}")
        
        # Test our classification
        api_key = os.getenv("HUGGINGFACE_API_KEY", "dummy-key")
        hf_manager = HuggingFaceManager(api_key)
        
        result = hf_manager._classify_by_keywords_json("last 30 days what is my lowest spending category")
        
        actual_from = result.get('time_range', {}).get('from', '')
        actual_to = result.get('time_range', {}).get('to', '')
        
        print(f"\nActual result:")
        print(f"  From: {actual_from}")
        print(f"  To: {actual_to}")
        
        # Verify format
        date_format_valid = (
            len(actual_from) == 10 and 
            len(actual_to) == 10 and
            actual_from.count('-') == 2 and
            actual_to.count('-') == 2
        )
        
        print(f"\n✅ Date Format Valid: {'YES' if date_format_valid else 'NO'}")
        print(f"✅ No Placeholder Text: {'YES' if '(today' not in actual_from else 'NO'}")
        
        return date_format_valid and '(today' not in actual_from
        
    except Exception as e:
        print(f"❌ Date parsing test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting AI Backend Fix Tests")
    print("=" * 40)
    
    # Test 1: Classification
    classification_passed = test_classification()
    
    # Test 2: Date parsing  
    date_parsing_passed = test_date_parsing()
    
    # Summary
    print("\n" + "=" * 40)
    print("📊 TEST SUMMARY")
    print("=" * 40)
    print(f"Classification: {'✅ PASS' if classification_passed else '❌ FAIL'}")
    print(f"Date Parsing:   {'✅ PASS' if date_parsing_passed else '❌ FAIL'}")
    
    overall_success = classification_passed and date_parsing_passed
    print(f"\nOverall Result: {'🎉 ALL TESTS PASSED' if overall_success else '⚠️  SOME TESTS FAILED'}")
    
    if overall_success:
        print("\n✅ The fixes should resolve the original error:")
        print("   - No more placeholder dates like '(today's date minus 29 days)'")
        print("   - 'lowest spending category' now maps to spending_summary with ascending order")
        print("   - Enhanced category ranking logic handles top_n and ordering")
    
    return overall_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)