"""
Interactive Financial AI Assistant - Proof of Concept
"""
import asyncio
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

from services.ai_service import AIService
from models.data_types import QueryType

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FinancialAIDemo:
    """Interactive demo of the Financial AI Assistant"""
    
    def __init__(self):
        load_dotenv()
        
        # Get API key
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not api_key:
            raise ValueError("HUGGINGFACE_API_KEY not found in environment variables")
        
        # Initialize AI service
        self.ai_service = AIService(api_key)
        self.session_active = True
        
        logger.info("Financial AI Demo initialized")
    
    async def run_interactive_demo(self):
        """Run interactive chat demo"""
        print("\n" + "="*60)
        print("🤖 Financial AI Assistant - Proof of Concept")
        print("="*60)
        print("Ask me about your finances! Try questions like:")
        print("• 'How much did I spend on groceries this month?'")
        print("• 'What's my budget status?'")
        print("• 'Show me recent dining transactions'")
        print("• 'How much money do I have left?'")
        print("\nType 'quit' to exit, 'test' to run system tests, 'history' to see conversation")
        print("-"*60)
        
        while self.session_active:
            try:
                user_input = input("\n💬 You: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    print("\n👋 Thanks for using the Financial AI Assistant!")
                    break
                
                elif user_input.lower() == 'test':
                    await self.run_system_test()
                    continue
                
                elif user_input.lower() == 'history':
                    self.show_conversation_history()
                    continue
                
                elif user_input.lower() == 'clear':
                    self.ai_service.clear_conversation_history()
                    print("🗑️ Conversation history cleared")
                    continue
                
                # Process the query
                print("🤔 Thinking...")
                start_time = datetime.now()
                
                response = await self.ai_service.process_query(user_input)
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                # Display response
                self.display_response(response, processing_time)
                
            except KeyboardInterrupt:
                print("\n\n👋 Goodbye!")
                break
            except Exception as e:
                logger.error(f"Error in demo: {e}")
                print(f"❌ Sorry, I encountered an error: {e}")
    
    def display_response(self, response, processing_time: float):
        """Display AI response in a formatted way"""
        print(f"\n🤖 AI Assistant ({response.processing_type.value}):")
        print(f"   {response.message}")
        
        # Show embedded data if available
        if response.embedded_data:
            print(f"\n📊 {response.embedded_data.title} ({response.embedded_data.component_type}):")
            self.display_embedded_data(response.embedded_data)
        
        # Show suggested follow-ups
        if response.suggested_actions:
            print("\n💡 You might also ask:")
            for i, suggestion in enumerate(response.suggested_actions, 1):
                print(f"   {i}. {suggestion}")
        
        # Show metadata
        print(f"\n📈 Query Type: {response.query_type.value} | Confidence: {response.confidence:.1%} | Time: {processing_time:.2f}s")
    
    def display_embedded_data(self, embedded_data):
        """Display embedded component data"""
        data = embedded_data.data
        
        if embedded_data.component_type == "CategoryBreakdownChart":
            print("   Category Breakdown:")
            if "categories" in data:
                for category, amount in data["categories"].items():
                    print(f"   • {category}: ${amount:.2f}")
                if "total" in data:
                    print(f"   📊 Total: ${data['total']:.2f}")
        
        elif embedded_data.component_type == "BudgetCard":
            print("   Budget Overview:")
            category = data.get("category", "Budget")
            budgeted = data.get("budgeted", 0)
            spent = data.get("spent", 0)
            percentage = data.get("percentage", 0)
            
            print(f"   • Category: {category}")
            print(f"   • Budgeted: ${budgeted:.2f}")
            print(f"   • Spent: ${spent:.2f}")
            print(f"   • Usage: {percentage:.1f}%")
            
            # Visual progress bar
            bar_length = 20
            filled_length = int(bar_length * min(percentage, 100) / 100)
            bar = "█" * filled_length + "░" * (bar_length - filled_length)
            status = "🔴" if percentage > 100 else "🟡" if percentage > 80 else "🟢"
            print(f"   {status} [{bar}] {percentage:.1f}%")
        
        elif embedded_data.component_type == "TransactionList":
            print("   Recent Transactions:")
            transactions = data.get("transactions", [])
            for i, transaction in enumerate(transactions[:5], 1):
                if hasattr(transaction, 'description'):
                    print(f"   {i}. ${transaction.amount:.2f} - {transaction.description} ({transaction.category_name})")
                else:
                    print(f"   {i}. ${transaction.get('amount', 0):.2f} - {transaction.get('description', 'Transaction')}")
            
            if len(transactions) > 5:
                print(f"   ... and {len(transactions) - 5} more transactions")
    
    async def run_system_test(self):
        """Run comprehensive system tests"""
        print("\n🔧 Running System Tests...")
        print("-" * 40)
        
        # Test system components
        test_results = self.ai_service.test_system()
        
        print(f"📁 Database: {'✅' if test_results['database'] else '❌'}")
        
        print("🤖 HuggingFace Models:")
        for model_type, status in test_results['huggingface'].items():
            print(f"   • {model_type}: {'✅' if status else '❌'}")
        
        print(f"🔍 Query Processor: {'✅' if test_results['query_processor'] else '❌'}")
        
        print(f"\n📊 Overall Status: {test_results['overall_status'].upper()}")
        
        # Test with sample queries
        print("\n🧪 Testing Sample Queries...")
        
        test_queries = [
            "How much did I spend on groceries this month?",
            "What's my budget status?", 
            "Show me recent transactions",
            "How much money do I have left?"
        ]
        
        for query in test_queries:
            print(f"\n📝 Testing: '{query}'")
            try:
                response = await self.ai_service.process_query(query)
                print(f"   ✅ {response.query_type.value} (confidence: {response.confidence:.1%})")
            except Exception as e:
                print(f"   ❌ Failed: {e}")
        
        print("\n🎉 System test complete!")
    
    def show_conversation_history(self):
        """Show conversation history"""
        history = self.ai_service.get_conversation_history()
        
        if not history:
            print("📝 No conversation history yet")
            return
        
        print(f"\n📚 Conversation History ({len(history)} exchanges):")
        print("-" * 50)
        
        for i, exchange in enumerate(history[-10:], 1):  # Show last 10
            timestamp = exchange["timestamp"].strftime("%H:%M:%S")
            query = exchange["query"]
            response = exchange["response"]
            
            print(f"{i}. [{timestamp}] You: {query}")
            print(f"   🤖 AI: {response.message[:100]}{'...' if len(response.message) > 100 else ''}")
            print(f"   📊 Type: {response.query_type.value} | Confidence: {response.confidence:.1%}")
            print()

async def main():
    """Main entry point"""
    try:
        demo = FinancialAIDemo()
        await demo.run_interactive_demo()
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        print(f"❌ Failed to start demo: {e}")
        print("\n💡 Make sure you have:")
        print("1. Set HUGGINGFACE_API_KEY in your .env file")
        print("2. Installed all dependencies: pip install -r requirements.txt")

if __name__ == "__main__":
    asyncio.run(main())