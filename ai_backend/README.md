# Financial AI Assistant Backend

A FastAPI-based backend service that integrates the AI proof of concept with the React Native frontend, providing intelligent financial assistance through natural language processing.

## Features

- **Natural Language Processing**: Process financial queries using HuggingFace models
- **RESTful API**: Clean API endpoints for mobile app integration
- **Real-time Communication**: Fast response times for interactive chat
- **Database Integration**: Access to financial data (transactions, budgets, categories)
- **Health Monitoring**: Built-in health checks and system status endpoints
- **Error Handling**: Robust error handling with fallback responses
- **CORS Support**: Configured for mobile app communication

## Architecture

```
ai_backend/
├── main.py                 # FastAPI application entry point
├── api/                    # API layer
│   ├── models.py          # Request/response models
│   └── routes/            # API route handlers
│       ├── ai_routes.py   # AI processing endpoints
│       ├── health_routes.py # Health check endpoints
│       └── database_routes.py # Database access endpoints
├── services/              # Business logic layer
│   └── ai_service_wrapper.py # AI service integration
└── requirements.txt       # Python dependencies
```

## Setup

### Prerequisites

- Python 3.8+
- HuggingFace API key
- AI Proof of Concept dependencies

### Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd ai_backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your HUGGINGFACE_API_KEY
   ```

5. **Start the server:**
   ```bash
   # Development
   python main.py
   
   # Production
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

The server will start on `http://localhost:8000`

## API Endpoints

### Health & Status
- `GET /` - Root endpoint
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health check with component status
- `GET /api/ping` - Simple connectivity test
- `GET /api/version` - API version information

### AI Processing
- `POST /api/ai/query` - Process natural language financial queries
- `GET /api/ai/conversation/{session_id}` - Get conversation history
- `DELETE /api/ai/conversation/{session_id}` - Clear conversation history
- `POST /api/ai/conversation/clear` - Clear all conversations
- `GET /api/ai/system/test` - Run AI system tests
- `GET /api/ai/models/status` - Get AI models status
- `POST /api/ai/models/reload` - Reload AI models
- `GET /api/ai/session/{session_id}/suggestions` - Get query suggestions

### Database Access
- `GET /api/database/stats` - Database statistics
- `GET /api/database/transactions` - Get transactions with filtering
- `GET /api/database/budgets` - Get budget information
- `GET /api/database/categories` - Get categories
- `GET /api/database/spending-summary` - Get spending summary
- `POST /api/database/query` - Execute custom database queries

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HUGGINGFACE_API_KEY` | HuggingFace API key (required) | - |
| `BACKEND_HOST` | Server bind address | `0.0.0.0` |
| `BACKEND_PORT` | Server port | `8000` |
| `DEBUG` | Enable debug mode | `false` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

### CORS Configuration

The backend is configured to allow cross-origin requests from mobile apps. For production, update the CORS settings in `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)
```

## Mobile App Integration

The React Native app uses `AIBackendClient` to communicate with this backend:

```typescript
import { getAIBackendClient } from './services/ai/AIBackendClient';

const client = getAIBackendClient();

// Process a query
const response = await client.processQuery("How much did I spend this month?");

// Check health
const health = await client.checkHealth();
```

### Network Configuration

**Android Emulator:**
- Use `http://10.0.2.2:8000/api` (Android emulator localhost)

**iOS Simulator:**
- Use `http://localhost:8000/api`

**Physical Device:**
- Use your computer's IP address: `http://YOUR_IP:8000/api`

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/
```

### Development Mode

Start with auto-reload:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Logging

The backend uses structured logging. Logs include:
- Request/response information
- AI processing details
- Error traces
- Performance metrics

## Deployment

### Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations

1. **Security**: 
   - Use HTTPS in production
   - Implement proper authentication
   - Restrict CORS origins
   - Add rate limiting

2. **Performance**:
   - Use a production ASGI server (Gunicorn + Uvicorn)
   - Implement caching
   - Monitor resource usage

3. **Monitoring**:
   - Set up health check endpoints
   - Monitor API response times
   - Track error rates

## Troubleshooting

### Common Issues

1. **"HUGGINGFACE_API_KEY not found"**
   - Ensure `.env` file exists with valid API key
   - Check environment variable loading

2. **"AI service not initialized"**
   - Verify HuggingFace API key is valid
   - Check network connectivity
   - Review logs for initialization errors

3. **Mobile app can't connect**
   - Verify server is running on correct host/port
   - Check firewall settings
   - Ensure CORS is properly configured
   - Test with `curl` or Postman first

4. **"Backend connectivity test failed"**
   - Check server logs for errors
   - Verify network connectivity between app and server
   - Test health endpoint manually

### Debug Mode

Enable debug logging:
```bash
DEBUG=true python main.py
```

### Health Checks

Test endpoints manually:
```bash
# Basic health
curl http://localhost:8000/api/health

# Detailed health
curl http://localhost:8000/api/health/detailed

# Process a test query
curl -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How much did I spend this month?"}'
```

## Support

For issues and questions:
1. Check the logs in the backend console
2. Verify all environment variables are set correctly
3. Test API endpoints manually using the Swagger UI
4. Check mobile app network configuration

## License

This project is part of the Financial AI Assistant application.