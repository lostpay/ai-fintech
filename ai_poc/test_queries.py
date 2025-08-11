"""
Test script to validate AI responses with various financial queries
"""
import asyncio
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

from services.ai_service import AIService

# Setup logging
logging.basicConfig(level=logging.WARNING)  # Reduce noise for testing

class AIQueryTester:
    """Test various financial queries and validate responses"""
    
    def __init__(self):
        load_dotenv()
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        self.ai_service = AIService(api_key)
        
    async def run_comprehensive_tests(self):
        """Run comprehensive query tests"""
        print("🧪 AI Financial Assistant - Comprehensive Testing")
        print("=" * 60)
        
        test_categories = [
            ("💰 Spending Queries", self.spending_queries),
            ("📊 Budget Queries", self.budget_queries),  
            ("🔍 Transaction Queries", self.transaction_queries),
            ("💳 Balance Queries", self.balance_queries),
            ("❓ Edge Cases", self.edge_case_queries),
            ("🗣️ Conversational Queries", self.conversational_queries)
        ]
        
        all_results = []
        
        for category_name, test_function in test_categories:
            print(f"\n{category_name}")
            print("-" * 40)
            
            results = await test_function()
            all_results.extend(results)
            
            # Show summary for this category
            successful = sum(1 for r in results if r['success'])
            total = len(results)
            print(f"✅ {successful}/{total} queries successful ({successful/total*100:.1f}%)")
        
        # Overall summary
        print(f"\n📈 OVERALL RESULTS")
        print("=" * 60)
        
        total_queries = len(all_results)
        successful_queries = sum(1 for r in all_results if r['success'])
        avg_confidence = sum(r['confidence'] for r in all_results) / total_queries
        avg_response_time = sum(r['response_time'] for r in all_results) / total_queries
        
        print(f"Total Queries Tested: {total_queries}")
        print(f"Successful Responses: {successful_queries} ({successful_queries/total_queries*100:.1f}%)")
        print(f"Average Confidence: {avg_confidence:.1%}")
        print(f"Average Response Time: {avg_response_time:.2f}s")
        
        # Query type breakdown
        query_types = {}
        for result in all_results:
            query_type = result['query_type']
            if query_type not in query_types:
                query_types[query_type] = {'count': 0, 'success': 0}
            query_types[query_type]['count'] += 1
            if result['success']:
                query_types[query_type]['success'] += 1
        
        print(f"\n📊 Query Type Performance:")
        for query_type, stats in query_types.items():
            success_rate = stats['success'] / stats['count'] * 100
            print(f"  {query_type}: {stats['success']}/{stats['count']} ({success_rate:.1f}%)")
        
        return all_results
    
    async def spending_queries(self):
        """Test spending-related queries"""
        queries = [
            "How much did I spend on groceries this month?",
            "What did I spend on dining last week?",
            "How much have I spent on transportation?", 
            "Show me my spending on entertainment this year",
            "What's my total spending for groceries and dining?",
            "How much did I spend yesterday?",
            "What was my spending last month vs this month?",
            "Which category did I spend the most on?",
            "How much did I spend on shopping in the last 30 days?",
            "What's my average weekly spending on food?"
        ]
        
        return await self.test_queries(queries)
    
    async def budget_queries(self):
        """Test budget-related queries"""
        queries = [
            "What's my budget status?",
            "Am I over budget for dining?",
            "How much budget do I have left for groceries?",
            "Which budgets am I closest to exceeding?",
            "Are any of my budgets over the limit?",
            "What's my remaining budget for this month?",
            "How much of my entertainment budget have I used?",
            "Show me my budget performance",
            "Which category has the most budget left?",
            "Am I on track with my spending goals?"
        ]
        
        return await self.test_queries(queries)
    
    async def transaction_queries(self):
        """Test transaction search queries"""
        queries = [
            "Show me recent transactions",
            "What transactions did I have yesterday?",
            "Find my dining transactions from last week",
            "Show me all grocery purchases",
            "What did I buy at the supermarket?",
            "Find transactions over $100",
            "Show me my last 10 purchases",
            "What entertainment expenses do I have?",
            "Find my travel transactions",
            "Show me transactions from this morning"
        ]
        
        return await self.test_queries(queries)
    
    async def balance_queries(self):
        """Test balance and overview queries"""
        queries = [
            "How much money do I have left?",
            "What's my financial situation?",
            "Give me a spending overview",
            "How am I doing financially?",
            "What's my account balance?",
            "How much can I still spend this month?",
            "What's my remaining budget?",
            "Am I spending too much?",
            "How much money have I saved?",
            "What's my spending vs budget ratio?"
        ]
        
        return await self.test_queries(queries)
    
    async def edge_case_queries(self):
        """Test edge cases and unusual queries"""
        queries = [
            "",  # Empty query
            "asdfghjkl",  # Random text
            "What's the weather?",  # Non-financial
            "How much did I spend on $#@%?",  # Invalid category
            "Show me transactions from the year 3000",  # Invalid date
            "I spent negative $50",  # Unusual amount
            "Find my transactions with aliens",  # Nonsense
            "Budget status for imaginary category",  # Non-existent category
            "Help me time travel to spend money",  # Absurd request
            "Calculate the meaning of life financially"  # Philosophical
        ]
        
        return await self.test_queries(queries, expect_success=False)
    
    async def conversational_queries(self):
        """Test conversational and follow-up queries"""
        queries = [
            "Hi, can you help me with my finances?",
            "Thanks for the help!",
            "What else can you tell me?",
            "Can you explain that better?",
            "Show me more details",
            "That's interesting, tell me more",
            "What do you recommend?",
            "How can I improve my spending?",
            "What should I do about my budget?",
            "Any tips for saving money?"
        ]
        
        return await self.test_queries(queries)
    
    async def test_queries(self, queries, expect_success=True):
        """Test a list of queries and return results"""
        results = []
        
        for i, query in enumerate(queries, 1):
            try:
                print(f"  {i:2}. Testing: '{query}'")
                
                start_time = datetime.now()
                response = await self.ai_service.process_query(query)
                response_time = (datetime.now() - start_time).total_seconds()
                
                # Determine if successful
                success = (
                    response.confidence > 0.0 and
                    response.message and
                    len(response.message.strip()) > 10 and
                    "error" not in response.message.lower()
                )
                
                # For edge cases, we expect them to fail gracefully
                if not expect_success:
                    success = response.query_type.value == "unknown" or "help" in response.message.lower()
                
                status = "✅" if success else "❌"
                print(f"      {status} {response.query_type.value} | {response.confidence:.1%} | {response_time:.2f}s")
                
                if response.embedded_data:
                    print(f"         📊 {response.embedded_data.component_type}")
                
                if not success and expect_success:
                    print(f"         💬 {response.message[:100]}...")
                
                results.append({
                    'query': query,
                    'success': success,
                    'query_type': response.query_type.value,
                    'confidence': response.confidence,
                    'response_time': response_time,
                    'message_length': len(response.message),
                    'has_embedded_data': response.embedded_data is not None,
                    'response': response
                })
                
            except Exception as e:
                print(f"      ❌ EXCEPTION: {str(e)[:50]}...")
                results.append({
                    'query': query,
                    'success': False,
                    'query_type': 'error',
                    'confidence': 0.0,
                    'response_time': 0.0,
                    'message_length': 0,
                    'has_embedded_data': False,
                    'error': str(e)
                })
        
        return results

async def main():
    """Run the comprehensive test suite"""
    tester = AIQueryTester()
    await tester.run_comprehensive_tests()

if __name__ == "__main__":
    asyncio.run(main())