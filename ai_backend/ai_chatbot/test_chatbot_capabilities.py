"""
Comprehensive Test Suite for AI Chatbot with ML Model and Database
Tests the full range of chatbot capabilities including predictions, budgets, patterns, and SQL queries
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
from colorama import init, Fore, Style
import time

# Initialize colorama for colored output
init()

# Configuration
GATEWAY_URL = "http://localhost:7000"
ML_URL = "http://localhost:7003"
TEXT2SQL_URL = "http://localhost:7001"
RAG_URL = "http://localhost:7002"

# Update this with your actual user ID from database
USER_ID = "default-user"  # CHANGE THIS TO YOUR USER ID

class ChatbotTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0

    def print_header(self, text: str):
        """Print a section header"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{text}")
        print(f"{'='*60}{Style.RESET_ALL}\n")

    def print_test(self, test_name: str):
        """Print test name"""
        print(f"{Fore.YELLOW}Testing: {test_name}{Style.RESET_ALL}")

    def print_success(self, message: str):
        """Print success message"""
        print(f"{Fore.GREEN}✅ {message}{Style.RESET_ALL}")

    def print_error(self, message: str):
        """Print error message"""
        print(f"{Fore.RED}❌ {message}{Style.RESET_ALL}")

    def print_response(self, response: Dict):
        """Print formatted response"""
        print(f"{Fore.WHITE}Response:{Style.RESET_ALL}")
        if isinstance(response, dict):
            for key, value in response.items():
                if key == 'text' and value:
                    print(f"  {Fore.CYAN}Message:{Style.RESET_ALL} {value[:200]}...")
                elif key == 'data' and value:
                    print(f"  {Fore.MAGENTA}Data:{Style.RESET_ALL} {json.dumps(value, indent=2)[:300]}...")
                elif key == 'confidence' and value:
                    print(f"  {Fore.BLUE}Confidence:{Style.RESET_ALL} {value:.2%}")
        else:
            print(f"  {response}")

    async def test_service_health(self):
        """Test if all services are running"""
        self.print_header("SERVICE HEALTH CHECK")

        services = [
            ("Gateway", f"{GATEWAY_URL}/health"),
            ("ML Service", f"{ML_URL}/health"),
            ("Text2SQL", f"{TEXT2SQL_URL}/health"),
            ("RAG Service", f"{RAG_URL}/health")
        ]

        async with httpx.AsyncClient(timeout=10.0) as client:
            for name, url in services:
                self.print_test(f"{name} Health")
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        self.print_success(f"{name} is running")
                        self.passed_tests += 1
                    else:
                        self.print_error(f"{name} returned {response.status_code}")
                        self.failed_tests += 1
                except Exception as e:
                    self.print_error(f"{name} is not reachable: {e}")
                    self.failed_tests += 1
                self.total_tests += 1

    async def test_ml_predictions(self):
        """Test ML prediction capabilities"""
        self.print_header("ML PREDICTION TESTS")

        prediction_queries = [
            {
                "name": "Daily spending prediction",
                "message": "How much will I spend tomorrow?",
                "lang": "en"
            },
            {
                "name": "Weekly spending forecast",
                "message": "What's my spending forecast for next week?",
                "lang": "en"
            },
            {
                "name": "Monthly prediction",
                "message": "Predict my spending for next month",
                "lang": "en"
            },
            {
                "name": "Overspending check",
                "message": "Will I overspend this week?",
                "lang": "en"
            },
            {
                "name": "Chinese prediction query",
                "message": "我下周会花多少钱？",
                "lang": "zh"
            }
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in prediction_queries:
                self.print_test(query["name"])
                self.total_tests += 1

                try:
                    response = await client.post(
                        f"{GATEWAY_URL}/chat",
                        json={
                            "user_id": USER_ID,
                            "message": query["message"],
                            "lang": query["lang"],
                            "session_id": f"test_{datetime.now().timestamp()}"
                        }
                    )

                    if response.status_code == 200:
                        data = response.json()
                        self.print_response(data)

                        # Check if response contains prediction data
                        if 'data' in data or 'text' in data:
                            self.print_success(f"{query['name']} completed")
                            self.passed_tests += 1
                        else:
                            self.print_error("No prediction data in response")
                            self.failed_tests += 1
                    else:
                        self.print_error(f"HTTP {response.status_code}: {response.text}")
                        self.failed_tests += 1

                except Exception as e:
                    self.print_error(f"Error: {e}")
                    self.failed_tests += 1

                await asyncio.sleep(1)  # Rate limiting

    async def test_budget_recommendations(self):
        """Test budget recommendation capabilities"""
        self.print_header("BUDGET RECOMMENDATION TESTS")

        budget_queries = [
            {
                "name": "Monthly budget recommendation",
                "message": "Recommend a budget for next month",
                "lang": "en"
            },
            {
                "name": "Category-specific budget",
                "message": "What should my food budget be?",
                "lang": "en"
            },
            {
                "name": "Budget optimization",
                "message": "How can I optimize my spending budget?",
                "lang": "en"
            },
            {
                "name": "Chinese budget query",
                "message": "给我推荐下个月的预算",
                "lang": "zh"
            }
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in budget_queries:
                self.print_test(query["name"])
                self.total_tests += 1

                try:
                    response = await client.post(
                        f"{GATEWAY_URL}/chat",
                        json={
                            "user_id": USER_ID,
                            "message": query["message"],
                            "lang": query["lang"],
                            "session_id": f"test_{datetime.now().timestamp()}"
                        }
                    )

                    if response.status_code == 200:
                        data = response.json()
                        self.print_response(data)
                        self.print_success(f"{query['name']} completed")
                        self.passed_tests += 1
                    else:
                        self.print_error(f"HTTP {response.status_code}")
                        self.failed_tests += 1

                except Exception as e:
                    self.print_error(f"Error: {e}")
                    self.failed_tests += 1

                await asyncio.sleep(1)

    async def test_pattern_analysis(self):
        """Test spending pattern detection"""
        self.print_header("PATTERN ANALYSIS TESTS")

        pattern_queries = [
            {
                "name": "Spending patterns",
                "message": "What are my spending patterns?",
                "lang": "en"
            },
            {
                "name": "Recurring expenses",
                "message": "Show me my recurring expenses",
                "lang": "en"
            },
            {
                "name": "Spending spikes",
                "message": "When do I tend to spend the most?",
                "lang": "en"
            },
            {
                "name": "Category patterns",
                "message": "What categories do I spend most on?",
                "lang": "en"
            }
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in pattern_queries:
                self.print_test(query["name"])
                self.total_tests += 1

                try:
                    response = await client.post(
                        f"{GATEWAY_URL}/chat",
                        json={
                            "user_id": USER_ID,
                            "message": query["message"],
                            "lang": query["lang"],
                            "session_id": f"test_{datetime.now().timestamp()}"
                        }
                    )

                    if response.status_code == 200:
                        data = response.json()
                        self.print_response(data)
                        self.print_success(f"{query['name']} completed")
                        self.passed_tests += 1
                    else:
                        self.print_error(f"HTTP {response.status_code}")
                        self.failed_tests += 1

                except Exception as e:
                    self.print_error(f"Error: {e}")
                    self.failed_tests += 1

                await asyncio.sleep(1)

    async def test_sql_queries(self):
        """Test natural language to SQL capabilities"""
        self.print_header("SQL QUERY TESTS")

        sql_queries = [
            {
                "name": "Total spending",
                "message": "How much have I spent in total?",
                "lang": "en"
            },
            {
                "name": "Monthly spending",
                "message": "Show my spending for this month",
                "lang": "en"
            },
            {
                "name": "Category spending",
                "message": "How much did I spend on food?",
                "lang": "en"
            },
            {
                "name": "Recent transactions",
                "message": "Show my last 10 transactions",
                "lang": "en"
            },
            {
                "name": "Date range query",
                "message": "What did I spend between January and March?",
                "lang": "en"
            },
            {
                "name": "Chinese SQL query",
                "message": "显示我的餐饮支出",
                "lang": "zh"
            }
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in sql_queries:
                self.print_test(query["name"])
                self.total_tests += 1

                try:
                    response = await client.post(
                        f"{GATEWAY_URL}/chat",
                        json={
                            "user_id": USER_ID,
                            "message": query["message"],
                            "lang": query["lang"],
                            "session_id": f"test_{datetime.now().timestamp()}"
                        }
                    )

                    if response.status_code == 200:
                        data = response.json()
                        self.print_response(data)
                        self.print_success(f"{query['name']} completed")
                        self.passed_tests += 1
                    else:
                        self.print_error(f"HTTP {response.status_code}")
                        self.failed_tests += 1

                except Exception as e:
                    self.print_error(f"Error: {e}")
                    self.failed_tests += 1

                await asyncio.sleep(1)

    async def test_edge_cases(self):
        """Test edge cases and error handling"""
        self.print_header("EDGE CASE TESTS")

        edge_cases = [
            {
                "name": "Ambiguous query",
                "message": "money stuff",
                "lang": "en"
            },
            {
                "name": "Complex multi-part query",
                "message": "Show me my spending last month, predict next month, and recommend a budget",
                "lang": "en"
            },
            {
                "name": "Time-sensitive query",
                "message": "What did I spend yesterday at 3pm?",
                "lang": "en"
            },
            {
                "name": "Comparison query",
                "message": "Compare my spending this month vs last month",
                "lang": "en"
            },
            {
                "name": "Goal-related query",
                "message": "Am I on track for my savings goal?",
                "lang": "en"
            }
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in edge_cases:
                self.print_test(query["name"])
                self.total_tests += 1

                try:
                    response = await client.post(
                        f"{GATEWAY_URL}/chat",
                        json={
                            "user_id": USER_ID,
                            "message": query["message"],
                            "lang": query["lang"],
                            "session_id": f"test_{datetime.now().timestamp()}"
                        }
                    )

                    if response.status_code == 200:
                        data = response.json()
                        self.print_response(data)
                        self.print_success(f"{query['name']} handled")
                        self.passed_tests += 1
                    else:
                        self.print_error(f"HTTP {response.status_code}")
                        self.failed_tests += 1

                except Exception as e:
                    self.print_error(f"Error: {e}")
                    self.failed_tests += 1

                await asyncio.sleep(1)

    async def test_direct_ml_endpoints(self):
        """Test ML service endpoints directly"""
        self.print_header("DIRECT ML SERVICE TESTS")

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test prediction endpoint
            self.print_test("Direct prediction endpoint")
            self.total_tests += 1
            try:
                response = await client.post(
                    f"{ML_URL}/predict",
                    json={
                        "user_id": USER_ID,
                        "timeframe": "weekly",
                        "horizon": 4
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    self.print_success(f"Got {len(data.get('predictions', []))} predictions")
                    self.passed_tests += 1
                else:
                    self.print_error(f"HTTP {response.status_code}")
                    self.failed_tests += 1
            except Exception as e:
                self.print_error(f"Error: {e}")
                self.failed_tests += 1

            # Test budget endpoint
            self.print_test("Direct budget endpoint")
            self.total_tests += 1
            try:
                response = await client.post(
                    f"{ML_URL}/budget",
                    json={
                        "user_id": USER_ID,
                        "month": datetime.now().strftime("%Y-%m")
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    self.print_success(f"Got budget for {len(data.get('categories', []))} categories")
                    self.passed_tests += 1
                else:
                    self.print_error(f"HTTP {response.status_code}")
                    self.failed_tests += 1
            except Exception as e:
                self.print_error(f"Error: {e}")
                self.failed_tests += 1

            # Test patterns endpoint
            self.print_test("Direct patterns endpoint")
            self.total_tests += 1
            try:
                response = await client.post(
                    f"{ML_URL}/patterns",
                    json={
                        "user_id": USER_ID,
                        "lookback_days": 90
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    self.print_success("Got pattern analysis")
                    self.passed_tests += 1
                else:
                    self.print_error(f"HTTP {response.status_code}")
                    self.failed_tests += 1
            except Exception as e:
                self.print_error(f"Error: {e}")
                self.failed_tests += 1

    def print_summary(self):
        """Print test summary"""
        self.print_header("TEST SUMMARY")

        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0

        print(f"{Fore.CYAN}Total Tests:{Style.RESET_ALL} {self.total_tests}")
        print(f"{Fore.GREEN}Passed:{Style.RESET_ALL} {self.passed_tests}")
        print(f"{Fore.RED}Failed:{Style.RESET_ALL} {self.failed_tests}")
        print(f"{Fore.YELLOW}Success Rate:{Style.RESET_ALL} {success_rate:.1f}%")

        if success_rate >= 80:
            print(f"\n{Fore.GREEN}✅ EXCELLENT! The chatbot is working well with your trained model.{Style.RESET_ALL}")
        elif success_rate >= 60:
            print(f"\n{Fore.YELLOW}⚠️ GOOD! Most features are working, but some issues need attention.{Style.RESET_ALL}")
        else:
            print(f"\n{Fore.RED}❌ NEEDS WORK! Several features are not functioning properly.{Style.RESET_ALL}")

    async def run_all_tests(self):
        """Run all test suites"""
        print(f"{Fore.MAGENTA}{'='*60}")
        print("AI CHATBOT COMPREHENSIVE TEST SUITE")
        print(f"Testing with User ID: {USER_ID}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}{Style.RESET_ALL}")

        # Run all test suites
        await self.test_service_health()
        await self.test_ml_predictions()
        await self.test_budget_recommendations()
        await self.test_pattern_analysis()
        await self.test_sql_queries()
        await self.test_edge_cases()
        await self.test_direct_ml_endpoints()

        # Print summary
        self.print_summary()


async def main():
    """Main test runner"""
    tester = ChatbotTester()

    print(f"{Fore.YELLOW}⚠️  IMPORTANT: Make sure all services are running before testing!{Style.RESET_ALL}")
    print("Required services:")
    print("1. Gateway Service (port 7000): cd gateway && python main.py")
    print("2. ML Service (port 7003): cd ml && python app.py")
    print("3. Text2SQL Service (port 7001): cd text2sql && python app.py")
    print("4. RAG Service (port 7002): cd rag && python app.py")
    print()

    input("Press Enter to start testing...")

    await tester.run_all_tests()


if __name__ == "__main__":
    # Install required package if not available
    try:
        import colorama
    except ImportError:
        print("Installing colorama for colored output...")
        import subprocess
        subprocess.check_call(["pip", "install", "colorama"])
        import colorama

    asyncio.run(main())