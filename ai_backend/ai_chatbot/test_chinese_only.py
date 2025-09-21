"""
Test only the Chinese query that's still failing
"""
import requests

def test_chinese_query():
    """Test the specific Chinese query that fails"""
    print("Testing Chinese monthly spending query...")

    payload = {
        "user_id": "default-user",
        "message": "我这个月花了多少钱？",
        "lang": "zh"
    }

    try:
        response = requests.post(
            "http://localhost:7000/chat",
            json=payload,
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()

            print(f"✓ Response received")
            print(f"  Type: {result.get('type', 'unknown')}")
            print(f"  Confidence: {result.get('confidence', 0)}")
            print(f"  Text: '{result.get('text', '')}'")
            print(f"  Data: {result.get('data', 'None')}")
            print(f"  Sources: {result.get('sources', 'None')}")

        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_chinese_query()