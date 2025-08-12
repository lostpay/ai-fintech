"""
Simple test to verify backend can start and serve API
"""
import os
import sys
import asyncio
from pathlib import Path

# Set up paths manually
app_dir = Path(__file__).parent
ai_poc_dir = app_dir / "ai_poc"
ai_backend_dir = app_dir / "ai_backend"

# Set environment variables
os.environ["PYTHONPATH"] = f"{ai_poc_dir};{ai_backend_dir}"
if not os.getenv("HUGGINGFACE_API_KEY"):
    os.environ["HUGGINGFACE_API_KEY"] = "dummy_key_for_testing"

# Add paths
sys.path.insert(0, str(ai_poc_dir))
sys.path.insert(0, str(ai_backend_dir))

async def test_backend_startup():
    """Test backend can start without errors"""
    print("Testing backend startup...")
    
    try:
        # Import backend modules
        from ai_backend.services.ai_service_wrapper import AIServiceWrapper
        print("[PASS] Backend modules imported successfully")
        
        # Initialize AI service
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        wrapper = AIServiceWrapper(api_key)
        print("[PASS] AI Service Wrapper initialized")
        
        # Test database health
        health = wrapper.get_database_health()
        print(f"[PASS] Database health: {health.get('status')}")
        
        # Test database stats
        stats = wrapper.get_database_stats()
        print(f"[PASS] Database stats: {stats.get('total_transactions')} transactions")
        
        # Test a simple query
        response = await wrapper.process_query("How much did I spend?")
        print(f"[PASS] Query processed: {response.message[:50]}...")
        
        # Cleanup
        wrapper.cleanup()
        print("[PASS] Cleanup successful")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] Backend test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("=== BACKEND CONNECTION TEST ===")
    print(f"App directory: {app_dir}")
    print(f"AI POC directory: {ai_poc_dir}")
    print(f"AI Backend directory: {ai_backend_dir}")
    print()
    
    success = await test_backend_startup()
    
    print("\n=== RESULTS ===")
    if success:
        print("SUCCESS: Backend can connect to database and process queries!")
        print("\nNext steps:")
        print("1. Start backend server: cd ai_backend && python main.py")
        print("2. Test API endpoints")
        print("3. Connect React Native frontend")
    else:
        print("FAILED: Backend connection issues")

if __name__ == "__main__":
    asyncio.run(main())