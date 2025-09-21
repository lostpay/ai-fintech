"""
Test gateway tool execution step by step
"""
import requests
import json
import httpx
import asyncio

async def test_call_text2sql():
    """Test the exact call_text2sql function from gateway"""
    print("Testing call_text2sql function...")

    TEXT2SQL_URL = "http://localhost:7001"

    async def call_text2sql(query: str, user_id: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for path in ("/generate", "/text2sql"):
                try:
                    print(f"  Trying {TEXT2SQL_URL}{path}...")
                    resp = await client.post(f"{TEXT2SQL_URL}{path}", json={"query": query, "user_id": user_id})
                    print(f"    Status: {resp.status_code}")
                    if resp.status_code == 200:
                        result = resp.json()
                        print(f"    ✓ Success: {result.get('success', False)}")
                        return result
                    else:
                        print(f"    ❌ Failed: {resp.text}")
                except httpx.HTTPError as e:
                    print(f"    ❌ HTTPError: {e}")
                    pass
            return {"error": "Text2SQL service unreachable"}

    # Test with the same query from our successful direct test
    query = "What is my total spending?"
    user_id = "default-user"

    print(f"Query: '{query}'")
    print(f"User: '{user_id}'")

    result = await call_text2sql(query, user_id)

    print(f"\nResult: {json.dumps(result, indent=2)}")

    if "error" in result:
        print("❌ call_text2sql failed")
    elif result.get("success"):
        print("✅ call_text2sql succeeded")
        print(f"  Data: {result.get('data', 'No data')}")
    else:
        print("⚠️ call_text2sql returned but success=False")

async def test_full_gateway_flow():
    """Test the full gateway flow manually"""
    print("\n" + "=" * 50)
    print("Testing full gateway flow manually...")

    # Simulate the tool call that should happen
    tool_call_simulation = {
        "tool": "query_expenses",
        "params": {"natural_query": "What is my total spending?"}
    }

    print(f"Simulated tool call: {tool_call_simulation}")

    # Test call_text2sql
    result = await call_text2sql(
        tool_call_simulation["params"]["natural_query"],
        "default-user"
    )

    print(f"Tool execution result: {json.dumps(result, indent=2)}")

    # Simulate what should happen next in gateway
    if "error" not in result:
        tool_result = {
            "tool": "query_expenses",
            "result": result
        }
        print(f"Tool result format: {json.dumps(tool_result, indent=2)}")

        # Check if data exists
        if result.get("data") and result.get("success"):
            print("✅ Data should be passed to LLM for final response")
        else:
            print("❌ No data to pass to LLM")
    else:
        print("❌ Tool execution failed completely")

async def call_text2sql(query: str, user_id: str) -> dict:
    """Copy of the gateway function for testing"""
    TEXT2SQL_URL = "http://localhost:7001"
    async with httpx.AsyncClient(timeout=30.0) as client:
        for path in ("/generate", "/text2sql"):
            try:
                resp = await client.post(f"{TEXT2SQL_URL}{path}", json={"query": query, "user_id": user_id})
                if resp.status_code == 200:
                    return resp.json()
            except httpx.HTTPError:
                pass
        return {"error": "Text2SQL service unreachable"}

async def main():
    print("=" * 60)
    print("Gateway Tool Execution Debug")
    print("=" * 60)

    await test_call_text2sql()
    await test_full_gateway_flow()

    print("\n" + "=" * 60)
    print("Next steps based on results:")
    print("- If call_text2sql fails → Fix the endpoint/format")
    print("- If call_text2sql succeeds → Check response handling in gateway")
    print("- Look for where the data gets lost between tool and final response")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())