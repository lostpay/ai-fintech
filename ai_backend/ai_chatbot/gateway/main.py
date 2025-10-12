"""
Gateway Service - Main orchestrator for the AI chatbot.
Handles chat requests and routes to appropriate backend services (LLM, Text2SQL, RAG, ML).
"""
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleFormatter:
    """Lightweight formatter for ML service responses"""

    def format_budget(self, data: Dict, lang: str = "en") -> str:
        """Convert budget data into readable text format"""
        categories = data.get('categories', [])
        total = data.get('total_budget', 0)

        if not categories:
            return json.dumps(data, ensure_ascii=False)

        sorted_cats = sorted(categories, key=lambda x: x.get('amount', 0), reverse=True)
        top_cats = sorted_cats[:5]

        # Check for data quality warning in methodology
        methodology = data.get('methodology', {})
        warning = methodology.get('warning', '')

        if lang == "zh":
            response = f"您的个性化预算建议（每月）：\n\n"
            if warning:
                response += f"⚠️ 注意: {warning}\n\n"
            response += f"总预算: ${total:.0f}\n\n"
            response += "主要类别：\n"
            for cat in top_cats:
                # Show actual spending if available
                actual = cat.get('actual_spending')
                if actual is not None:
                    response += f"- {cat['category']}: ${cat['amount']:.0f} (实际支出: ${actual:.2f})\n"
                else:
                    response += f"- {cat['category']}: ${cat['amount']:.0f}\n"
        else:
            response = f"Your Personalized Monthly Budget:\n\n"
            if warning:
                response += f"⚠️ Warning: {warning}\n\n"
            response += f"Total: ${total:.0f}\n\n"
            response += "Key Categories:\n"
            for cat in top_cats:
                # Show actual spending if available
                actual = cat.get('actual_spending')
                if actual is not None:
                    response += f"- {cat['category']}: ${cat['amount']:.0f} (actual spending: ${actual:.2f})\n"
                else:
                    response += f"- {cat['category']}: ${cat['amount']:.0f}\n"

        return response

    def format_predictions(self, data: Dict, lang: str = "en") -> str:
        """Convert prediction data into readable text format"""
        predictions = data.get('predictions', [])
        confidence = data.get('confidence', 0)

        if not predictions:
            return json.dumps(data, ensure_ascii=False)

        if lang == "zh":
            response = f"支出预测（置信度 {confidence:.0%}）：\n\n"
            for i, pred in enumerate(predictions[:2], 1):
                amount = pred.get('predicted_amount', 0)
                response += f"第{i}周: ${amount:.0f}\n"
        else:
            response = f"Spending Forecast (confidence: {confidence:.0%}):\n\n"
            for i, pred in enumerate(predictions[:2], 1):
                amount = pred.get('predicted_amount', 0)
                response += f"Week {i}: ${amount:.0f}\n"

        return response

    def format_sql_result(self, data: Dict, lang: str = "en") -> str:
        """Convert SQL query results into natural language"""
        if data.get('error'):
            return json.dumps(data, ensure_ascii=False)

        result_data = data.get('data', [])
        row_count = data.get('row_count', 0)

        if row_count == 0:
            if lang == "zh":
                return "没有找到相关记录。"
            return "No records found."

        # Handle single-value results like totals or aggregations
        if row_count == 1 and isinstance(result_data, list) and len(result_data) == 1:
            row = result_data[0]
            if isinstance(row, dict):
                if 'total' in row or 'sum' in row or 'amount' in row:
                    for key, value in row.items():
                        if isinstance(value, (int, float)):
                            # Convert from cents to dollars
                            return f"${value / 100:.2f}"
                        return str(value)

                # Format as key-value pairs
                formatted_items = []
                for key, value in row.items():
                    if isinstance(value, (int, float)) and ('amount' in key.lower() or 'total' in key.lower()):
                        # Convert from cents to dollars
                        formatted_items.append(f"{key}: ${value / 100:.2f}")
                    else:
                        formatted_items.append(f"{key}: {value}")
                return "\n".join(formatted_items)
            else:
                return str(row)

        # Handle multiple rows
        if isinstance(result_data, list) and len(result_data) > 0:
            formatted_rows = []
            for i, row in enumerate(result_data[:5], 1):
                if isinstance(row, dict):
                    desc = row.get('description', '')
                    amount = row.get('amount', 0)
                    date = row.get('date', '')
                    # Convert from cents to dollars
                    formatted_rows.append(f"{i}. {desc}: ${amount / 100:.2f} ({date})")
                else:
                    formatted_rows.append(f"{i}. {row}")

            result = "\n".join(formatted_rows)
            if len(result_data) > 5:
                result += f"\n... and {len(result_data) - 5} more"
            return result

        return json.dumps(data.get('data', {}), ensure_ascii=False)

formatter = SimpleFormatter()

def clean_response_text(text: str) -> str:
    """
    Remove SQL queries, JSON structures, and technical data from LLM responses.
    Only keeps natural language text for user-friendly display.
    """
    import re

    # Remove SQL queries (SELECT, INSERT, UPDATE, DELETE, etc.)
    text = re.sub(r'(?i)\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b.*?;', '', text, flags=re.DOTALL)

    # Remove code blocks (```sql, ```json, etc.)
    text = re.sub(r'```[\w]*\n.*?\n```', '', text, flags=re.DOTALL)

    # Remove standalone JSON objects that look like raw data dumps
    # Pattern: { followed by multiple "key": value pairs with technical keys
    json_pattern = r'\{[^}]*(?:"(?:categories|amount|floor|elasticity|activity_level|adjustment_factor|confidence|predicted_amount|lower_bound|upper_bound|columns|rows|data)"\s*:)[^}]*\}'
    text = re.sub(json_pattern, '', text, flags=re.DOTALL)

    # Remove large JSON arrays with multiple objects
    text = re.sub(r'\[\s*\{.*?\}\s*(?:,\s*\{.*?\}\s*)*\]', '', text, flags=re.DOTALL)

    # Remove SQL-style result tables (rows of pipe-separated values)
    text = re.sub(r'(?:\|[^\n]+\|[\n\r])+', '', text)

    # Remove lines that look like JSON key-value pairs
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        # Skip lines that are mostly JSON-like (multiple quotes and colons)
        if line.count('"') > 3 and line.count(':') > 2:
            continue
        # Skip lines with technical field names
        if any(field in line for field in ['elasticity', 'adjustment_factor', 'activity_level', 'lower_bound', 'upper_bound']):
            continue
        cleaned_lines.append(line)

    text = '\n'.join(cleaned_lines)

    # Clean up extra whitespace and newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()

    return text

# Service URLs from environment variables
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://192.168.1.103:11434/v1")
TEXT2SQL_URL = os.getenv("TEXT2SQL_URL", "http://192.168.1.103:7001")
RAG_URL = os.getenv("RAG_URL", "http://192.168.1.103:7002")
ML_URL = os.getenv("ML_URL", "http://192.168.1.103:7003")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b")

app = FastAPI(
    title="AI Chatbot Gateway",
    description="Gateway service for expense tracking chatbot",
    version="1.0.0"
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request and response data models
class ChatRequest(BaseModel):
    user_id: str
    message: str
    lang: str = "zh"
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    type: str = "final"
    text: str
    data: Optional[Any] = None
    sources: Optional[List[Dict[str, Any]]] = None
    confidence: float = 1.0

class ToolCall(BaseModel):
    tool: str
    params: Dict[str, Any]

# Tool definitions for LLM function calling
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_expenses",
            "description": "Query user's expense data using SQL",
            "parameters": {
                "type": "object",
                "properties": {
                    "natural_query": {
                        "type": "string",
                        "description": "Natural language query about expenses"
                    }
                },
                "required": ["natural_query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_docs",
            "description": "Search documentation and FAQs",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for documentation"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "ml_analysis",
            "description": "Get spending predictions, budgets, and pattern insights using ML",
            "parameters": {
                "type": "object",
                "properties": {
                    "analysis_type": {
                        "type": "string",
                        "enum": ["predict", "budget", "patterns", "overspending"],
                        "description": "Type of ML analysis to perform"
                    },
                    "timeframe": {
                        "type": "string",
                        "enum": ["daily", "weekly", "monthly"],
                        "description": "Timeframe for predictions (only for predict type)"
                    },
                    "horizon": {
                        "type": "integer",
                        "description": "Number of periods to predict (optional)"
                    }
                },
                "required": ["analysis_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_data",
            "description": "Create new transactions, budgets, goals, or categories in the database",
            "parameters": {
                "type": "object",
                "properties": {
                    "data_type": {
                        "type": "string",
                        "enum": ["transaction", "budget", "goal", "category"],
                        "description": "Type of data to create"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Amount in dollars (for transaction, budget, goal)"
                    },
                    "description": {
                        "type": "string",
                        "description": "Description or name (for transactions: what was purchased/paid for, e.g. 'coffee', 'lunch', 'gas')"
                    },
                    "category": {
                        "type": "string",
                        "description": "Category name (for transaction) or new category name (for category creation)"
                    },
                    "transaction_type": {
                        "type": "string",
                        "enum": ["expense", "income"],
                        "description": "Type of transaction (only for transaction creation)"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (optional, defaults to today)"
                    },
                    "period_start": {
                        "type": "string",
                        "description": "Budget start date in YYYY-MM-DD format (for budget creation)"
                    },
                    "period_end": {
                        "type": "string",
                        "description": "Budget end date in YYYY-MM-DD format (for budget creation)"
                    },
                    "target_date": {
                        "type": "string",
                        "description": "Goal target date in YYYY-MM-DD format (for goal creation, optional)"
                    },
                    "color": {
                        "type": "string",
                        "description": "Category color (for category creation, optional)"
                    },
                    "icon": {
                        "type": "string",
                        "description": "Category icon (for category creation, optional)"
                    }
                },
                "required": ["data_type", "description"]
            }
        }
    }
]

def get_system_prompt(lang: str) -> str:
    """
    Generate system prompt for LLM based on language.
    Instructs the LLM when to use each available tool.
    """
    if lang == "zh":
        return """你是专业的个人财务助理。
- 只要用户的问题涉及【金额/上月/本月/分类/趋势/是否超支/合计】→ 必须调用函数 query_expenses。
- 如果用户询问【预测/预报/明天/下週/下周/本月/会不会花/花多少/预算/建议预算/分配/优化/节省/节约/支出模式/规律】→ 必须调用函数 ml_analysis。
- 如果用户要求【添加/记录/创建/新建/保存】【交易/支出/收入/预算/目标/类别】→ 必须调用函数 create_data。
- 如果是使用说明/常见问题 → 调用函数 search_docs。
- 除非明确是纯解释问题，否则不要直接回答，优先触发工具。
请用中文回答。"""
    else:
        return """You are a professional personal finance assistant.
- If the user asks about amounts/month/category/trends/overspending/totals → you MUST call function query_expenses.
- If the user asks about predictions/forecasts/tomorrow/next week/this month/budgets/budget recommendations/allocation/optimization/savings/spending patterns/will I overspend → you MUST call function ml_analysis.
- If the user wants to add/record/create/save transactions/expenses/income/budgets/goals/categories → you MUST call function create_data.
- For how-to/FAQ → call search_docs.
- Prefer tools first; don't answer directly unless it's a pure explanation."""

async def call_ollama(prompt: str, system: str, tools: List[Dict] = None) -> Dict:
    """
    Call Ollama's OpenAI-compatible API for LLM inference.
    Supports tool/function calling when tools are provided.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        payload = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "stream": False
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        r = await client.post(f"{OLLAMA_URL}/chat/completions", json=payload)
        r.raise_for_status()
        return r.json()

async def call_text2sql(query: str, user_id: str) -> Dict:
    """Send natural language query to Text2SQL service for SQL generation and execution"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{TEXT2SQL_URL}/generate", json={"query": query, "user_id": user_id})
            if resp.status_code == 200:
                result = resp.json()
                logger.info(f"Text2SQL success: {result.get('success', False)}, rows: {result.get('row_count', 0)}")
                return result
            else:
                logger.error(f"Text2SQL HTTP error: {resp.status_code}")
                return {"error": f"Text2SQL HTTP {resp.status_code}"}
        except Exception as e:
            logger.error(f"Text2SQL error: {e}")
            return {"error": f"Text2SQL service error: {str(e)}"}

async def call_rag(query: str, lang: str) -> Dict:
    """Query RAG service to search documentation and return relevant answers"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        for path in ("/search", "/answer"):
            try:
                resp = await client.post(f"{RAG_URL}{path}", json={"query": query, "lang": lang, "top_k": 3})
                if resp.status_code == 200:
                    return resp.json()
            except httpx.HTTPError:
                pass
        return {"error": "RAG service unreachable"}

async def call_data_creation_service(data_type: str, user_id: str, **kwargs) -> Dict:
    """
    Create new database records (transactions, budgets, goals, categories).
    Imports Supabase service dynamically to handle database operations.
    """
    try:
        logger.info(f"Creating {data_type} with parameters: {kwargs}")

        import sys
        from pathlib import Path
        current_dir = Path(__file__).parent.parent
        sys.path.insert(0, str(current_dir))
        from supabase_service import SupabaseService

        service = SupabaseService(user_id=user_id)

        if data_type == "transaction":
            amount = kwargs.get("amount", 0)
            description = kwargs.get("description", "")
            category_name = kwargs.get("category", "")
            transaction_type = kwargs.get("transaction_type", "expense")
            date_str = kwargs.get("date")

            # Provide default description if empty
            if not description or description.strip() == "":
                description = f"{transaction_type} - {category_name}" if category_name else f"{transaction_type} transaction"

            # Ensure category exists
            category_id = service.find_category_by_name(category_name)
            if not category_id:
                category_id = service.create_category(category_name)
                if not category_id:
                    return {"error": "Failed to create category"}

            transaction_id = service.create_transaction(
                amount=amount,
                description=description,
                category_id=category_id,
                transaction_type=transaction_type,
                date_str=date_str
            )

            if transaction_id:
                return {
                    "success": True,
                    "type": "transaction",
                    "id": transaction_id,
                    "message": f"Created {transaction_type} of ${amount:.2f} for {description}"
                }
            else:
                return {"error": "Failed to create transaction"}

        elif data_type == "budget":
            category_name = kwargs.get("category", "")
            amount = kwargs.get("amount", 0)
            period_start = kwargs.get("period_start")
            period_end = kwargs.get("period_end")

            if not period_start or not period_end:
                return {"error": "Budget requires period_start and period_end dates"}

            category_id = service.find_category_by_name(category_name)
            if not category_id:
                category_id = service.create_category(category_name)
                if not category_id:
                    return {"error": "Failed to create category"}

            budget_id = service.create_budget(
                category_id=category_id,
                amount=amount,
                period_start=period_start,
                period_end=period_end
            )

            if budget_id:
                return {
                    "success": True,
                    "type": "budget",
                    "id": budget_id,
                    "message": f"Created budget of ${amount:.2f} for {category_name}"
                }
            else:
                return {"error": "Failed to create budget"}

        elif data_type == "goal":
            name = kwargs.get("description", "")
            target_amount = kwargs.get("amount", 0)
            description = kwargs.get("description", "")
            target_date = kwargs.get("target_date")

            goal_id = service.create_goal(
                name=name,
                target_amount=target_amount,
                description=description,
                target_date=target_date
            )

            if goal_id:
                return {
                    "success": True,
                    "type": "goal",
                    "id": goal_id,
                    "message": f"Created goal '{name}' with target ${target_amount:.2f}"
                }
            else:
                return {"error": "Failed to create goal"}

        elif data_type == "category":
            name = kwargs.get("category", kwargs.get("description", ""))
            color = kwargs.get("color", "#4CAF50")
            icon = kwargs.get("icon", "help-outline")

            category_id = service.create_category(
                name=name,
                color=color,
                icon=icon
            )

            if category_id:
                return {
                    "success": True,
                    "type": "category",
                    "id": category_id,
                    "message": f"Created category '{name}'"
                }
            else:
                return {"error": "Failed to create category"}
        else:
            return {"error": f"Unknown data type: {data_type}"}

    except Exception as e:
        logger.error(f"Data creation error: {e}")
        return {"error": f"Data creation service error: {str(e)}"}

async def call_ml_service(analysis_type: str, user_id: str, timeframe: str = None, horizon: int = None) -> Dict:
    """Call ML service for predictions, budgets, patterns, or overspending analysis"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            logger.info(f"Calling ML service '{analysis_type}' for user_id: '{user_id}'")
            if analysis_type == "predict":
                payload = {"user_id": user_id, "timeframe": timeframe or "weekly", "horizon": horizon}
                resp = await client.post(f"{ML_URL}/predict", json=payload)
            elif analysis_type == "budget":
                payload = {"user_id": user_id}
                resp = await client.post(f"{ML_URL}/budget", json=payload)
            elif analysis_type == "patterns":
                payload = {"user_id": user_id, "lookback_days": 90}
                resp = await client.post(f"{ML_URL}/patterns", json=payload)
            elif analysis_type == "overspending":
                payload = {"user_id": user_id}
                resp = await client.post(f"{ML_URL}/overspending", json=payload)
            else:
                return {"error": f"Unknown analysis type: {analysis_type}"}

            if resp.status_code == 200:
                result = resp.json()
                logger.info(f"ML service success for {analysis_type}")
                return result
            else:
                logger.error(f"ML service HTTP error: {resp.status_code}")
                return {"error": f"ML service HTTP {resp.status_code}"}
        except Exception as e:
            logger.error(f"ML service error: {e}")
            return {"error": f"ML service error: {str(e)}"}

def parse_tool_calls(llm_response: Dict) -> List[ToolCall]:
    """Extract tool/function calls from LLM response"""
    tool_calls: List[ToolCall] = []
    try:
        msg = llm_response["choices"][0]["message"]
    except Exception:
        return tool_calls

    for call in msg.get("tool_calls", []):
        fn = call.get("function", {})
        name = fn.get("name")
        args_str = fn.get("arguments", "{}")
        try:
            args = json.loads(args_str) if isinstance(args_str, str) else (args_str or {})
        except Exception:
            args = {}
        if name:
            tool_calls.append(ToolCall(tool=name, params=args))
    return tool_calls

async def execute_tool(tool_call: ToolCall, user_id: str, lang: str) -> Dict:
    """Route tool call to appropriate backend service"""
    if tool_call.tool == "query_expenses":
        result = await call_text2sql(
            tool_call.params.get("natural_query", ""),
            user_id
        )
        return {
            "tool": "query_expenses",
            "result": result
        }
    elif tool_call.tool == "search_docs":
        result = await call_rag(
            tool_call.params.get("query", ""),
            lang
        )
        return {
            "tool": "search_docs",
            "result": result
        }
    elif tool_call.tool == "ml_analysis":
        result = await call_ml_service(
            tool_call.params.get("analysis_type"),
            user_id,
            tool_call.params.get("timeframe"),
            tool_call.params.get("horizon")
        )
        return {
            "tool": "ml_analysis",
            "result": result
        }
    elif tool_call.tool == "create_data":
        params = tool_call.params.copy()
        data_type = params.pop("data_type", "")

        result = await call_data_creation_service(
            data_type,
            user_id,
            **params
        )
        return {
            "tool": "create_data",
            "result": result
        }
    else:
        return {"error": f"Unknown tool: {tool_call.tool}"}

@app.get("/health")
async def health_check():
    """Health check endpoint for service monitoring"""
    return {
        "status": "healthy",
        "service": "gateway",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint. Orchestrates the following flow:
    1. Send user message to LLM with tool definitions
    2. Parse and execute any tool calls from LLM response
    3. Send tool results back to LLM for final answer synthesis
    4. Return formatted response to user
    """
    try:
        logger.info(f"Chat request from user '{request.user_id}' (lang: {request.lang}): {request.message}")

        system_prompt = get_system_prompt(request.lang)

        # First LLM call to determine which tools to use
        llm_response = await call_ollama(
            request.message,
            system_prompt,
            TOOLS
        )

        tool_calls = parse_tool_calls(llm_response)

        if tool_calls:
            # Execute all requested tools
            tool_results = []
            for tool_call in tool_calls:
                result = await execute_tool(tool_call, request.user_id, request.lang)
                tool_results.append(result)

            # Format tool results for LLM
            formatted_results = []
            for r in tool_results:
                try:
                    # Format SQL results using the formatter (convert to natural language)
                    if r['tool'] == 'query_expenses' and 'result' in r:
                        sql_result = r['result']
                        if not sql_result.get('error'):
                            formatted = formatter.format_sql_result(sql_result, request.lang)
                            formatted_results.append(f"Tool: {r['tool']}\nResult: {formatted}")
                        else:
                            formatted_results.append(f"Tool: {r['tool']}\nResult: Error retrieving data")
                    # Format ML results using the formatter
                    elif r['tool'] == 'ml_analysis' and 'result' in r and not r.get('result', {}).get('error'):
                        ml_result = r['result']
                        if 'categories' in ml_result and 'total_budget' in ml_result:
                            formatted = formatter.format_budget(ml_result, request.lang)
                            formatted_results.append(f"Tool: {r['tool']}\nResult: {formatted}")
                        elif 'predictions' in ml_result:
                            formatted = formatter.format_predictions(ml_result, request.lang)
                            formatted_results.append(f"Tool: {r['tool']}\nResult: {formatted}")
                        else:
                            formatted_results.append(f"Tool: {r['tool']}\nResult: {json.dumps(r['result'], ensure_ascii=False)}")
                    else:
                        formatted_results.append(f"Tool: {r['tool']}\nResult: {json.dumps(r['result'], ensure_ascii=False)}")
                except Exception as e:
                    logger.debug(f"Formatting error: {e}")
                    formatted_results.append(f"Tool: {r['tool']}\nResult: {json.dumps(r.get('result', {}), ensure_ascii=False)}")

            tool_context = "\n".join(formatted_results)

            # Second LLM call to synthesize final answer
            final_prompt = f"""User question: {request.message}

Tool results:
{tool_context}

IMPORTANT: Provide a natural answer using EXACTLY the data from the tool results.
- Do NOT change, interpret, or "improve" transaction descriptions, names, or labels
- Do NOT guess what abbreviations might mean - use them exactly as provided
- Do NOT add technical details like 'elasticity factors' or 'adjustment factors'
- Use the exact amounts, dates, and descriptions from the results"""

            final_response = await call_ollama(
                final_prompt,
                system_prompt
            )

            response_text = final_response["choices"][0]["message"].get("content", "")

            # Clean response to remove SQL/JSON output
            response_text = clean_response_text(response_text)

            # Prepare embedded data for response (excluding SQL results and create_data)
            embedded_data = None
            sources = None

            for result in tool_results:
                if result["tool"] == "query_expenses":
                    # Don't send SQL data to frontend
                    continue
                elif result["tool"] == "create_data":
                    # Don't send create_data JSON to frontend - natural language response is sufficient
                    continue
                elif result["tool"] == "search_docs" and "sources" in result.get("result", {}):
                    sources = result["result"]["sources"]
                elif result["tool"] == "ml_analysis" and "result" in result:
                    ml_result = result["result"]
                    # Only send predictions and patterns as embedded data
                    # Budget data is already formatted as text, so don't send raw JSON
                    if "predictions" in ml_result or "recurrences" in ml_result:
                        embedded_data = ml_result
                    # Skip categories (budgets) - they're already formatted as natural language

            return ChatResponse(
                text=response_text,
                data=embedded_data,
                sources=sources,
                confidence=0.9
            )
        else:
            # Direct response without tools
            response_text = llm_response["choices"][0]["message"].get("content", "")

            # Clean response to remove SQL/JSON output
            response_text = clean_response_text(response_text)

            return ChatResponse(
                text=response_text,
                confidence=0.95
            )

    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        error_msg = "抱歉，处理您的请求时出现错误。" if request.lang == "zh" else "Sorry, an error occurred while processing your request."
        return ChatResponse(
            text=error_msg,
            confidence=0.0
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7000, reload=True)
