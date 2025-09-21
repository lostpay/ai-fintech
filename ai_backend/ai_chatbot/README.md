# AI Chatbot for Personal Finance App

A multi-service AI chatbot system that provides natural language interaction for expense tracking and financial management.

## Architecture

The system consists of three microservices:

1. **Gateway Service** (Port 7000) - Main orchestrator that handles chat requests
2. **Text2SQL Service** (Port 7001) - Converts natural language to SQL queries
3. **RAG Service** (Port 7002) - Document retrieval for FAQs and help

## Features

- 🌐 **Bilingual Support**: Chinese and English
- 💰 **Expense Queries**: Natural language queries about spending data
- 📚 **Documentation Search**: RAG-based FAQ and help system
- 🔒 **SQL Safety**: Validated and sanitized SQL generation
- 📊 **Rich Responses**: Structured data with visualizations

## Prerequisites

- Python 3.11+
- Node.js 18+
- Ollama (for LLM inference)
- 8GB VRAM / 16GB RAM minimum

## Installation

### 1. Install Python Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies for each service
cd gateway && pip install -r requirements.txt
cd ../text2sql && pip install -r requirements.txt
cd ../rag && pip install -r requirements.txt
```

### 2. Install Ollama and Models

```bash
# Install Ollama (https://ollama.ai)
# Pull required model
ollama pull qwen2.5:7b
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# - Set HUGGINGFACE_API_KEY if using HF models
# - Adjust database path if needed
```

## Running the Services

### Windows
```bash
# Run all services
start_services.bat
```

### Linux/Mac
```bash
# Make script executable
chmod +x start_services.sh

# Run all services
./start_services.sh
```

### Manual Start (Development)

```bash
# Terminal 1: Text2SQL Service
cd text2sql
python app.py

# Terminal 2: RAG Service
cd rag
python app.py

# Terminal 3: Gateway Service
cd gateway
python main.py
```

## API Endpoints

### Gateway Service (http://localhost:7000)

#### POST /chat
Main chat endpoint for the React Native app.

```json
{
  "user_id": "user123",
  "message": "我上个月花了多少钱？",
  "lang": "zh",
  "session_id": "session_123"
}
```

Response:
```json
{
  "type": "final",
  "text": "您上个月总共花费了 ¥5,234.50",
  "data": {...},
  "sources": [...],
  "confidence": 0.95
}
```

### Text2SQL Service (http://localhost:7001)

#### POST /generate
Generate and execute SQL from natural language.

```json
{
  "query": "Show my dining expenses",
  "user_id": "user123",
  "lang": "en"
}
```

### RAG Service (http://localhost:7002)

#### POST /search
Search documentation and FAQs.

```json
{
  "query": "如何设置预算",
  "lang": "zh",
  "top_k": 3
}
```

## React Native Integration

### 1. Configure API URL

In your React Native app's `.env`:
```
EXPO_PUBLIC_CHATBOT_API_URL=http://YOUR_PC_IP:7000
```

### 2. Import Chat Service

```typescript
import chatbotService from './services/chatbotService';

// Send message
const response = await chatbotService.sendMessage("我的预算还剩多少？");

// Set language
await chatbotService.setLanguage('zh');
```

### 3. Use Chat Component

```tsx
import ChatScreen from './components/ChatScreen';

// In your app
<ChatScreen />
```

## Database Schema

The system uses your existing Supabase database with the following schema:

```sql
-- Transactions table (amounts stored in cents)
CREATE TABLE transactions (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    amount INTEGER NOT NULL,  -- Stored in cents
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    transaction_type TEXT CHECK (transaction_type IN ('income', 'expense')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets table (amounts stored in cents)
CREATE TABLE budgets (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    amount INTEGER NOT NULL,  -- Stored in cents
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    user_id TEXT,  -- NULL for global categories
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table (amounts stored in cents)
CREATE TABLE goals (
    id BIGINT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_amount INTEGER NOT NULL,  -- Stored in cents
    current_amount INTEGER DEFAULT 0,  -- Stored in cents
    target_date DATE,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Sample Queries

### Chinese
- "我上个月花了多少钱？"
- "显示我的餐饮支出"
- "我的预算还剩多少？"
- "如何添加新的支出记录？"
- "最近的交易记录"

### English
- "How much did I spend last month?"
- "Show my dining expenses"
- "What's my budget status?"
- "How to add a new expense?"
- "Recent transactions"

## Testing

### 1. Test Individual Services

```bash
# Test Gateway health
curl http://localhost:7000/health

# Test Text2SQL
curl -X POST http://localhost:7001/generate \
  -H "Content-Type: application/json" \
  -d '{"query": "total spending", "user_id": "test"}'

# Test RAG
curl -X POST http://localhost:7002/search \
  -H "Content-Type: application/json" \
  -d '{"query": "how to add expense", "lang": "en"}'
```

### 2. Test Full Chat Flow

```bash
curl -X POST http://localhost:7000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "message": "Show my spending this month",
    "lang": "en"
  }'
```

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check model is installed: `ollama list`
- Verify URL in .env file

### Database Errors
- Check database path in .env
- Ensure database has correct schema
- Verify user permissions

### Port Conflicts
- Change ports in .env if needed
- Check no other services using 7000-7002

### Memory Issues
- Reduce batch size for embeddings
- Use smaller models (e.g., qwen2:4b)
- Enable GPU acceleration if available

## Performance Optimization

1. **Model Selection**
   - Use quantized models (INT4) for faster inference
   - Consider smaller models for simple queries

2. **Caching**
   - RAG service caches embeddings
   - Consider Redis for session management

3. **Database**
   - Add indexes on frequently queried columns
   - Use connection pooling for production

## Security Considerations

1. **SQL Injection Prevention**
   - All SQL is validated and sanitized
   - User input is parameterized
   - Read-only database access recommended

2. **API Security**
   - Add authentication middleware
   - Rate limiting for production
   - HTTPS for external access

3. **Data Privacy**
   - User data isolation
   - Session management
   - Audit logging

## Future Enhancements

- [ ] Streaming responses
- [ ] Voice input/output
- [ ] Multi-turn conversations
- [ ] Personalized insights
- [ ] Export functionality
- [ ] Budget alerts
- [ ] Spending predictions

## Contributing

Please follow the existing code style and add tests for new features.

## License

MIT