"""
Prompts and few-shot examples for the chatbot
"""

# Few-shot examples for Text2SQL
SQL_EXAMPLES = [
    {
        "zh": {
            "query": "我上个月花了多少钱？",
            "sql": "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND date >= date('now', '-1 month')",
            "explanation": "查询上个月的总支出"
        },
        "en": {
            "query": "How much did I spend last month?",
            "sql": "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND date >= date('now', '-1 month')",
            "explanation": "Query total spending for last month"
        }
    },
    {
        "zh": {
            "query": "显示我在餐饮上的支出",
            "sql": "SELECT date, amount, merchant FROM transactions WHERE user_id = ? AND category = '餐饮' ORDER BY date DESC",
            "explanation": "查询餐饮类别的所有交易"
        },
        "en": {
            "query": "Show my dining expenses",
            "sql": "SELECT date, amount, merchant FROM transactions WHERE user_id = ? AND category = 'Dining' ORDER BY date DESC",
            "explanation": "Query all dining transactions"
        }
    },
    {
        "zh": {
            "query": "我的预算还剩多少？",
            "sql": """
                SELECT
                    b.category,
                    b.monthly_limit,
                    COALESCE(SUM(t.amount), 0) as spent,
                    b.monthly_limit - COALESCE(SUM(t.amount), 0) as remaining
                FROM budgets b
                LEFT JOIN transactions t ON b.category = t.category
                    AND t.user_id = b.user_id
                    AND t.date >= date('now', 'start of month')
                WHERE b.user_id = ?
                GROUP BY b.category, b.monthly_limit
            """,
            "explanation": "查询每个类别的预算剩余"
        },
        "en": {
            "query": "How much budget do I have left?",
            "sql": """
                SELECT
                    b.category,
                    b.monthly_limit,
                    COALESCE(SUM(t.amount), 0) as spent,
                    b.monthly_limit - COALESCE(SUM(t.amount), 0) as remaining
                FROM budgets b
                LEFT JOIN transactions t ON b.category = t.category
                    AND t.user_id = b.user_id
                    AND t.date >= date('now', 'start of month')
                WHERE b.user_id = ?
                GROUP BY b.category, b.monthly_limit
            """,
            "explanation": "Query budget remaining for each category"
        }
    }
]

# System prompts for different contexts
SYSTEM_PROMPTS = {
    "zh": {
        "main": """你是一个专业的个人财务助理 AI。你的职责是：

1. 准确理解用户的财务查询需求
2. 使用合适的工具查询数据或文档
3. 以清晰、专业的方式回答用户问题
4. 提供有用的财务建议和见解

规则：
- 始终保持专业和友好
- 数字和金额要准确
- 如果不确定，请要求澄清
- 保护用户隐私，不泄露敏感信息""",

        "sql_context": """基于以下数据库schema生成SQL查询：
- transactions(id, user_id, date, amount, category, merchant, note)
- budgets(id, user_id, category, monthly_limit)
- balances(user_id, account, amount)

注意：
- 日期格式为 YYYY-MM-DD
- 金额为正数
- 始终包含 user_id 条件""",

        "rag_context": """搜索相关文档以回答用户问题。
重点关注：
- 操作指南
- 常见问题
- 功能说明
- 最佳实践"""
    },
    "en": {
        "main": """You are a professional personal finance AI assistant. Your responsibilities are:

1. Accurately understand user's financial query needs
2. Use appropriate tools to query data or documents
3. Answer user questions in a clear, professional manner
4. Provide useful financial advice and insights

Rules:
- Always remain professional and friendly
- Be accurate with numbers and amounts
- Ask for clarification if unsure
- Protect user privacy, don't leak sensitive information""",

        "sql_context": """Generate SQL queries based on this database schema:
- transactions(id, user_id, date, amount, category, merchant, note)
- budgets(id, user_id, category, monthly_limit)
- balances(user_id, account, amount)

Note:
- Date format is YYYY-MM-DD
- Amounts are positive numbers
- Always include user_id condition""",

        "rag_context": """Search relevant documents to answer user questions.
Focus on:
- How-to guides
- FAQs
- Feature explanations
- Best practices"""
    }
}

def get_few_shot_examples(lang: str = "zh", max_examples: int = 3):
    """Get few-shot examples for the specified language"""
    examples = []
    for example in SQL_EXAMPLES[:max_examples]:
        if lang in example:
            examples.append(example[lang])
    return examples

def format_sql_prompt(query: str, lang: str = "zh") -> str:
    """Format prompt for SQL generation with few-shot examples"""
    examples = get_few_shot_examples(lang)
    prompt = SYSTEM_PROMPTS[lang]["sql_context"] + "\n\n"

    if examples:
        prompt += "Examples:\n"
        for ex in examples:
            prompt += f"Q: {ex['query']}\n"
            prompt += f"SQL: {ex['sql']}\n\n"

    prompt += f"Q: {query}\nSQL:"
    return prompt