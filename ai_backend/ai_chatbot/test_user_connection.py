"""
Quick test to check if the backend can connect and query data for a specific user
"""
import sys
from pathlib import Path
import asyncio

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from supabase_service import SupabaseService

async def test_user(user_id: str):
    """Test if we can query data for a user"""
    print(f"\n{'='*60}")
    print(f"Testing user_id: {user_id}")
    print(f"{'='*60}\n")

    try:
        # Test 1: Initialize Supabase service
        print("1. Initializing SupabaseService...")
        service = SupabaseService(user_id=user_id)
        print("   ✓ Service initialized successfully")

        # Test 2: Check database health
        print("\n2. Checking database health...")
        health = service.get_database_health()
        print(f"   Status: {health.get('status')}")
        print(f"   Connection: {health.get('connection_status')}")
        if health.get('status') != 'healthy':
            print(f"   ⚠ Warning: {health}")
            return
        print("   ✓ Database connection healthy")

        # Test 3: Get transactions
        print("\n3. Fetching user transactions...")
        transactions = await service.get_user_transactions(user_id, days_back=90)
        print(f"   Found {len(transactions)} transactions")
        if len(transactions) == 0:
            print("   ⚠ Warning: No transaction data found for this user")
            print("   This will cause the chatbot to fail when querying expenses")
        else:
            print("   ✓ Transaction data exists")
            print(f"   Sample transaction: {transactions[0]}")

        # Test 4: Get categories
        print("\n4. Fetching categories...")
        categories = service.get_categories()
        print(f"   Found {len(categories)} categories")
        if len(categories) == 0:
            print("   ⚠ Warning: No categories found")
        else:
            print("   ✓ Categories exist")

        # Test 5: Get budgets
        print("\n5. Fetching budgets...")
        budgets = service.get_budgets_with_details()
        print(f"   Found {len(budgets)} budgets")

        print(f"\n{'='*60}")
        print("Test Summary:")
        print(f"{'='*60}")
        print(f"User ID: {user_id}")
        print(f"Database: Connected")
        print(f"Transactions: {len(transactions)}")
        print(f"Categories: {len(categories)}")
        print(f"Budgets: {len(budgets)}")

        if len(transactions) == 0:
            print("\n⚠ ISSUE FOUND:")
            print("  The user has no transaction data in the database.")
            print("  This will cause the chatbot to fail when trying to answer")
            print("  questions about expenses, budgets, or spending patterns.")
            print("\n  Solutions:")
            print("  1. Add some test transactions for this user in Supabase")
            print("  2. Or test with a different user_id that has data")
        else:
            print("\n✓ All checks passed! User data looks good.")

    except ValueError as e:
        print(f"\n✗ ValueError: {e}")
        print("   This usually means the user_id format is invalid or Supabase credentials are missing")
    except Exception as e:
        print(f"\n✗ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Test with the user_id from the logs
    user_id = "fd04d3ff-7219-48ec-aeb1-13a7c9f20c7c"

    print("Starting user connection test...")
    asyncio.run(test_user(user_id))
