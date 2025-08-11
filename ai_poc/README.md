# Financial AI Assistant - Proof of Concept

A Python-based proof of concept for the AI financial assistant that will be integrated into the React Native FinanceFlow app.

## 🎯 Purpose

This PoC validates the AI functionality independently before frontend integration:

- ✅ Test HuggingFace model integration
- ✅ Validate financial query processing
- ✅ Debug conversation flows
- ✅ Generate sample responses for frontend integration
- ✅ Test different model combinations quickly

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Up Environment
Copy your HuggingFace API key to the `.env` file:
```
HUGGINGFACE_API_KEY=your_key_here
```

### 3. Run Interactive Demo
```bash
python main.py
```

### 4. Test GPT OSS Integration
```bash
python test_gpt_oss.py
```

## 🧪 Features Tested

### Query Types Supported
- **Spending Summary**: "How much did I spend on groceries this month?"
- **Budget Status**: "What's my budget status?"
- **Transaction Search**: "Show me recent dining transactions"
- **Balance Inquiry**: "How much money do I have left?"

### 🤖 AI Models Used
- **Classification**: facebook/bart-large-mnli (query intent detection)
- **Conversational**: **openai/gpt-oss-20b** - 🆕 Advanced GPT OSS 20B model (21B parameters)
- **Financial**: cardiffnlp/twitter-roberta-base-sentiment-latest (financial analysis)  
- **General**: **openai/gpt-oss-20b** - 🆕 GPT OSS for general queries

#### 🔥 NEW: OpenAI GPT OSS 20B Integration
- **21B parameters** (3.6B active) for superior reasoning
- **Apache 2.0 license** - Commercial use allowed
- **Chat completion API** support for natural conversations
- **Financial domain optimization** with contextual understanding
- **Multiple fallback strategies** for maximum reliability

See [GPT_OSS_INTEGRATION.md](GPT_OSS_INTEGRATION.md) for complete integration details.

### Sample Financial Data
The PoC includes realistic mock data:
- 150+ sample transactions over 90 days
- 8 expense categories (Groceries, Dining, Transportation, etc.)
- Monthly budgets with realistic spending patterns
- Embedded component data for rich responses

## 🎮 Interactive Commands

- **Normal queries**: Ask about finances naturally
- **`test`**: Run comprehensive system tests
- **`history`**: View conversation history
- **`clear`**: Clear conversation history
- **`quit`**: Exit the demo

## 📊 Sample Interactions

```
💬 You: How much did I spend on groceries this month?
🤖 AI Assistant: You've spent $247.83 on groceries this month. That's within your $400.00 budget with $152.17 remaining.

📊 Spending by Category (CategoryBreakdownChart):
   • Groceries: $247.83
   📊 Total: $247.83

💡 You might also ask:
   1. Would you like to see a breakdown by category?
   2. Do you want to compare this to your budget?
   3. Should I show you the specific transactions?
```

## 🏗️ Architecture

### Core Components

1. **AIService**: Main orchestrator
2. **HuggingFaceManager**: Model management and API calls
3. **QueryProcessor**: Natural language parsing
4. **MockDatabaseService**: Sample financial data
5. **Data Models**: Pydantic models for type safety

### Integration Points

The PoC mirrors the React Native app structure:
- Same query types and processing logic
- Equivalent embedded component data
- Compatible response formats
- Identical conversation flow patterns

## 🔧 System Tests

Run `test` command to verify:
- ✅ Database connectivity and sample data
- ✅ All HuggingFace model accessibility
- ✅ Query parsing accuracy
- ✅ End-to-end query processing

## 📈 Performance Metrics

The demo tracks:
- Response time per query
- Model confidence scores
- Query classification accuracy
- Conversation context retention

## 🔄 Frontend Integration

Use this PoC to:

1. **Validate Responses**: Test query types and refine AI responses
2. **Debug Models**: Identify which models work best for different queries
3. **Generate Sample Data**: Create realistic response examples for frontend mocking
4. **Test Edge Cases**: Handle unusual queries and error conditions
5. **Performance Baseline**: Establish response time expectations

## 🚨 Error Handling

The PoC includes robust fallbacks:
- Model failures → Template responses
- API timeouts → Local processing
- Invalid queries → Helpful suggestions
- Network issues → Graceful degradation

## 📝 Logs

All operations are logged with different levels:
- **INFO**: Normal operations and successful responses
- **WARNING**: Model fallbacks and minor issues
- **ERROR**: Failures and exceptions

## 🔮 Next Steps

After validating with this PoC:

1. **Copy successful patterns** to React Native TypeScript code
2. **Use tested model configurations** in the mobile app
3. **Implement proven fallback strategies**
4. **Apply optimized query processing logic**
5. **Integrate tested conversation flows**

This PoC ensures the AI functionality works perfectly before complex mobile integration!