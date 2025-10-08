"""
Clear ML Prediction Cache Utility.
Sends request to ML service to clear cached predictions.
Run this after changing transaction data to ensure fresh predictions.
"""

import httpx
import asyncio

async def clear_cache():
    """
    Clear the ML service prediction cache via HTTP request.
    Sends POST to /clear-cache endpoint for default user.
    """
    async with httpx.AsyncClient() as client:
        try:
            # Send cache clear request to ML service
            response = await client.post(
                "http://127.0.0.1:7003/clear-cache",
                params={"user_id": "default-user"}
            )

            if response.status_code == 200:
                result = response.json()
                print(f"Cache cleared successfully!")
                print(f"Cleared {result.get('cleared', 0)} cached entries")
            else:
                print(f"Failed to clear cache: HTTP {response.status_code}")

        except Exception as e:
            print(f"Error: {e}")
            print("Make sure the ML service is running on port 7003")

if __name__ == "__main__":
    print("Clearing ML prediction cache...")
    asyncio.run(clear_cache())
    print("\nYou can now run tests with fresh predictions!")