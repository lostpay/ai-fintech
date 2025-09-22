"""
Quick script to train the ML model for a user
"""

import httpx
import asyncio

ML_URL = "http://127.0.0.1:7003"
USER_ID = "default-user"

async def train_model():
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            print(f"Training model for user: {USER_ID}")
            response = await client.post(f"{ML_URL}/train", params={"user_id": USER_ID})

            if response.status_code == 200:
                data = response.json()
                print("✅ Model trained successfully!")
                print(f"   MAE: {data['metrics'].get('mae', 'N/A'):.2f}")
                print(f"   R²: {data['metrics'].get('r2', 'N/A'):.3f}")
                print(f"   Samples: {data['metrics'].get('samples_trained', 'N/A')}")
            else:
                print(f"❌ Training failed: HTTP {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(train_model())