"""
Gateway Service - Main orchestrator for the AI chatbot
Handles chat requests and routes to appropriate services (LLM, Text2SQL, RAG)
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

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/v1")
TEXT2SQL_URL = os.getenv("TEXT2SQL_URL", "http://127.0.0.1:7001")
RAG_URL = os.getenv("RAG_URL", "http://127.0.0.1:7002")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b")

app = FastAPI(
    title="AI Chatbot Gateway",
    description="Gateway service for expense tracking chatbot",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    user_id: str
    message: str
    lang: str = "zh"
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    type: str = "final"
    text: str
    data: Optional[Any] = None  # Allow both Dict and List data
    sources: Optional[List[Dict[str, Any]]] = None
    confidence: float = 1.0

class ToolCall(BaseModel):
    tool: str
    params: Dict[str, Any]

# Tool schemas for LLM
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
    }
]


#def get_system_prompt(lang: str) -> str:
#    """Get system prompt based on language"""
#    if lang == "zh":
#        return """你是一个专业的个人财务助理。你可以：
#1. 查询用户的支出数据（使用 query_expenses 工具）
#2. 解答使用问题和FAQ（使用 search_docs 工具）
#3. 提供财务建议和分析

#请用中文回答，保持专业和友好。对于数据查询，使用提供的工具。"""
#    else:
#        return """You are a professional personal finance assistant. You can:
#1. Query user's expense data (use query_expenses tool)
#2. Answer usage questions and FAQs (use search_docs tool)
#3. Provide financial advice and analysis

#Please be professional and friendly. Use the provided tools for data queries."""

def get_system_prompt(lang: str) -> str:
    if lang == "zh":
        return """你是专业的个人财务助理。
- 只要用户的问题涉及【金额/上月/本月/分类/趋势/是否超支/合计】→ 必须调用函数 query_expenses。
- 如果是使用说明/常见问题 → 调用函数 search_docs。
- 除非明确是纯解释问题，否则不要直接回答，优先触发工具。
请用中文回答。"""
    else:
        return """You are a professional personal finance assistant.
- If the user asks about amounts/month/category/trends/overspending/totals → you MUST call function query_expenses.
- For how-to/FAQ → call search_docs.
- Prefer tools first; don't answer directly unless it's a pure explanation."""


async def call_ollama(prompt: str, system: str, tools: List[Dict] = None) -> Dict:
    """Call Ollama OpenAI-compatible API for LLM inference"""
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
        # Optional but helpful: enforce JSON-only for normal answers
        # payload["response_format"] = {"type":"json_object"}

        r = await client.post(f"{OLLAMA_URL}/chat/completions", json=payload)
        r.raise_for_status()
        return r.json()

async def call_text2sql(query: str, user_id: str) -> Dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Only try the /generate endpoint that we know exists
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
    async with httpx.AsyncClient(timeout=30.0) as client:
        for path in ("/search", "/answer"):
            try:
                resp = await client.post(f"{RAG_URL}{path}", json={"query": query, "lang": lang, "top_k": 3})
                if resp.status_code == 200:
                    return resp.json()
            except httpx.HTTPError:
                pass
        return {"error": "RAG service unreachable"}

def parse_tool_calls(llm_response: Dict) -> List[ToolCall]:
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
    """Execute a tool call"""
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
    else:
        return {"error": f"Unknown tool: {tool_call.tool}"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "gateway",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint"""
    try:
        logger.info(f"Chat request from user {request.user_id}: {request.message}")

        # Get system prompt
        system_prompt = get_system_prompt(request.lang)

        # First LLM call with tools
        llm_response = await call_ollama(
            request.message,
            system_prompt,
            TOOLS
        )

        # Check for tool calls
        tool_calls = parse_tool_calls(llm_response)

        if tool_calls:
            # Execute tools
            tool_results = []
            for tool_call in tool_calls:
                result = await execute_tool(tool_call, request.user_id, request.lang)
                tool_results.append(result)

            # Format tool results for second LLM call
            tool_context = "\n".join([
                f"Tool: {r['tool']}\nResult: {json.dumps(r['result'], ensure_ascii=False)}"
                for r in tool_results
            ])

            # Second LLM call with tool results
            final_prompt = f"""User question: {request.message}

Tool results:
{tool_context}

Please provide a comprehensive answer based on the tool results."""

            final_response = await call_ollama(
                final_prompt,
                system_prompt
            )

            # Extract response text
            response_text = final_response["choices"][0]["message"].get("content", "")

            # Prepare embedded data if SQL was executed
            embedded_data = None
            sources = None

            for result in tool_results:
                if result["tool"] == "query_expenses" and "data" in result.get("result", {}):
                    embedded_data = result["result"]["data"]
                elif result["tool"] == "search_docs" and "sources" in result.get("result", {}):
                    sources = result["result"]["sources"]

            return ChatResponse(
                text=response_text,
                data=embedded_data,
                sources=sources,
                confidence=0.9
            )
        else:
            # Direct response without tools
            response_text = llm_response["choices"][0]["message"].get("content", "")
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