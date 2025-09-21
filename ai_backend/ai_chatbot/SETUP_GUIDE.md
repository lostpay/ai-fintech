# Complete Setup Guide for AI Chatbot

## Prerequisites Check

Before starting, ensure you have:
- ✅ Python 3.11 or higher
- ✅ Node.js 18 or higher
- ✅ Git (for cloning repositories)
- ✅ At least 8GB RAM (16GB recommended)
- ✅ 10GB free disk space

## Step 1: Install Python (if not installed)

### Windows:
1. Download Python from https://www.python.org/downloads/
2. Run installer and CHECK "Add Python to PATH"
3. Verify installation:
```cmd
python --version
```

### Mac/Linux:
```bash
# Mac with Homebrew
brew install python@3.11

# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip

# Verify
python3 --version
```

## Step 2: Set Up Python Virtual Environment

### Windows (Command Prompt):
```cmd
cd C:\Users\PF3AD\Downloads\app\app\ai_backend\ai_chatbot

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# You should see (venv) in your terminal
```

### Windows (PowerShell):
```powershell
cd C:\Users\PF3AD\Downloads\app\app\ai_backend\ai_chatbot

# Create virtual environment
python -m venv venv

# If you get execution policy error, run this first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

### Mac/Linux:
```bash
cd ~/Downloads/app/app/ai_backend/ai_chatbot

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# You should see (venv) in your terminal
```

## Step 3: Install Python Dependencies

With virtual environment activated:

```bash
# Install gateway dependencies
cd gateway
pip install -r requirements.txt
cd ..

# Install text2sql dependencies
cd text2sql
pip install -r requirements.txt
cd ..

# Install RAG dependencies
cd rag
pip install -r requirements.txt
cd ..
```

If you encounter errors, install one by one:
```bash
pip install fastapi==0.110.0
pip install uvicorn[standard]==0.29.0
pip install httpx==0.26.0
pip install python-dotenv==1.0.0
pip install sentence-transformers==2.2.2
pip install faiss-cpu==1.7.4
```

## Step 4: Install Ollama (for AI Model)

### Windows:
1. Go to https://ollama.ai/download/windows
2. Download and run OllamaSetup.exe
3. After installation, open Command Prompt and run:
```cmd
# Start Ollama service (runs in background)
ollama serve

# In a new terminal, pull the model (this will take time, ~4GB download)
ollama pull qwen2.5:7b

# Or use smaller model if you have less RAM:
ollama pull qwen2.5:4b
```

### Mac:
```bash
# Install with Homebrew
brew install ollama

# Start Ollama service
ollama serve

# In new terminal, pull model
ollama pull qwen2.5:7b
```

### Linux:
```bash
# Download and install
curl -fsSL https://ollama.ai/install.sh | sh

# Start service
ollama serve

# In new terminal, pull model
ollama pull qwen2.5:7b
```

## Step 5: Configure Environment Variables

```bash
cd C:\Users\PF3AD\Downloads\app\app\ai_backend\ai_chatbot

# Copy the example environment file
# Windows:
copy .env.example .env

# Mac/Linux:
cp .env.example .env
```

Edit the `.env` file with notepad or any text editor:
```env
# Gateway Configuration
OLLAMA_URL=http://localhost:11434
TEXT2SQL_URL=http://localhost:7001
RAG_URL=http://localhost:7002
LLM_MODEL=qwen2.5:7b  # Or qwen2.5:4b for smaller model

# Text2SQL Configuration
DATABASE_PATH=expenses.db  # Will be created automatically
MAX_SQL_ROWS=100

# RAG Configuration
EMBEDDING_MODEL=all-MiniLM-L6-v2  # Start with smaller model

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=7000
DEBUG=false
```

## Step 6: Configure Supabase Connection

Instead of creating a local database, the chatbot will use your existing Supabase database:

1. **Get Supabase credentials from your existing app:**
   - Look in `C:\Users\PF3AD\Downloads\app\app\ai_backend\.env`
   - Copy the `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

2. **Update the chatbot `.env` file:**
   ```env
   # Copy from your existing app's .env file:
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key-here
   ```

3. **Verify your Supabase database has data:**
   - The chatbot will work with your existing transactions, budgets, and categories
   - No additional setup needed if you already have data in your React Native app

## Step 7: Start the Services

### Method 1: Using Startup Script (Recommended)

#### Windows:
```cmd
# Make sure you're in the ai_chatbot directory
cd C:\Users\PF3AD\Downloads\app\app\ai_backend\ai_chatbot

# Run the batch file
start_services.bat
```

#### Mac/Linux:
```bash
# Make script executable
chmod +x start_services.sh

# Run the script
./start_services.sh
```

### Method 2: Manual Start (for debugging)

Open 4 separate terminals:

**Terminal 1 - Ollama:**
```bash
ollama serve
```

**Terminal 2 - Text2SQL Service:**
```bash
cd C:\Users\PF3AD\Downloads\app\app\ai_backend\ai_chatbot
venv\Scripts\activate  # or source venv/bin/activate on Mac/Linux
cd text2sql
python app.py
```

**Terminal 3 - RAG Service:**
```bash
cd C:\Users\PF3AD\Downloads\app\app\ai_backend\ai_chatbot
venv\Scripts\activate  # or source venv/bin/activate on Mac/Linux
cd rag
python app.py
```

**Terminal 4 - Gateway Service:**
```bash
cd C:\Users\PF3AD\Downloads\app\app\ai_backend\ai_chatbot
venv\Scripts\activate  # or source venv/bin/activate on Mac/Linux
cd gateway
python main.py
```

## Step 8: Verify Services Are Running

Open a web browser and check:
- Gateway: http://localhost:7000/health
- Text2SQL: http://localhost:7001/health
- RAG: http://localhost:7002/health

All should return JSON with `"status": "healthy"`

## Step 9: Test the Chatbot

### Using Command Line (curl):
```bash
# Windows (use Git Bash or WSL)
curl -X POST http://localhost:7000/chat \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"test_user\", \"message\": \"我上个月花了多少钱？\", \"lang\": \"zh\"}"

# Or for English:
curl -X POST http://localhost:7000/chat \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"test_user\", \"message\": \"How much did I spend last month?\", \"lang\": \"en\"}"
```

### Using Python:
```python
import requests

response = requests.post('http://localhost:7000/chat', json={
    'user_id': 'test_user',
    'message': '我的餐饮支出是多少？',
    'lang': 'zh'
})

print(response.json())
```

## Step 10: Connect React Native App

### Find Your Computer's IP Address:

**Windows:**
```cmd
ipconfig
# Look for IPv4 Address under Wi-Fi or Ethernet
```

**Mac/Linux:**
```bash
ifconfig
# Look for inet address under en0 (Mac) or wlan0/eth0 (Linux)
```

### Configure React Native App:

1. In your React Native app, create/edit `.env`:
```env
EXPO_PUBLIC_CHATBOT_API_URL=http://YOUR_COMPUTER_IP:7000
# Example: http://192.168.1.100:7000
```

2. Make sure your phone/emulator is on the same network as your computer

3. Run the React Native app:
```bash
cd C:\Users\PF3AD\Downloads\app\app
npm start
# or
expo start
```

## Common Issues and Solutions

### Issue 1: "Module not found" errors
```bash
# Make sure virtual environment is activated
# You should see (venv) in terminal

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Issue 2: Ollama not responding
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
# Windows: Close terminal and run 'ollama serve' again
# Mac/Linux:
pkill ollama
ollama serve
```

### Issue 3: Port already in use
```bash
# Find and kill process using port (example for port 7000)
# Windows:
netstat -ano | findstr :7000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux:
lsof -i :7000
kill -9 <PID_NUMBER>
```

### Issue 4: Database not found
```bash
# Make sure you're in the right directory
cd C:\Users\PF3AD\Downloads\app\app\ai_backend\ai_chatbot

# Create database
python init_database.py
```

### Issue 5: Model too slow or out of memory
Edit `.env` and change to smaller model:
```env
LLM_MODEL=qwen2.5:4b  # Instead of 7b
```

Then pull the smaller model:
```bash
ollama pull qwen2.5:4b
```

## Testing Sample Queries

Once everything is running, try these queries:

**Chinese:**
- "我这个月花了多少钱？"
- "显示我的餐饮支出"
- "我的预算还剩多少？"
- "最近的交易记录"
- "如何添加新的支出？"

**English:**
- "What's my total spending?"
- "Show my transport expenses"
- "How much budget left?"
- "Recent transactions"
- "How to set a budget?"

## Next Steps

1. **Production Deployment:**
   - Use environment variables for sensitive data
   - Set up HTTPS with certificates
   - Add authentication middleware
   - Use production database (PostgreSQL)

2. **Performance Optimization:**
   - Use GPU for model inference if available
   - Implement caching for frequent queries
   - Use connection pooling for database

3. **Monitoring:**
   - Add logging to file
   - Set up error tracking (Sentry)
   - Monitor response times

## Support

If you encounter issues:
1. Check all services are running (health endpoints)
2. Check logs in each terminal
3. Verify network connectivity
4. Ensure models are downloaded
5. Check database has data

For the React Native app, also check:
- Phone/emulator is on same network
- Firewall isn't blocking connections
- IP address is correct in .env