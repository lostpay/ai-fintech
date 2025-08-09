# 🤖 AI Features Setup Guide

This guide explains how to configure AI features for your expense tracking app.

## 🔑 Required API Keys

### HuggingFace API Key (Primary)
- **Cost**: FREE tier available (1,000 requests/month)
- **Where to get**: https://huggingface.co/settings/tokens
- **What it enables**: 
  - Smart query understanding
  - Natural language responses
  - Financial sentiment analysis

## ⚙️ Configuration

### 1. Get Your HuggingFace API Key
1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: `expense-app-ai`
4. Type: "Read"
5. Copy the token (starts with `hf_`)

### 2. Add to Environment File
Edit the `.env` file in your app directory:

```bash
# AI Service Configuration
HUGGINGFACE_API_KEY=hf_your_token_here

# Optional: Customize AI models (defaults provided)
HF_CLASSIFICATION_MODEL=facebook/bart-large-mnli
HF_CONVERSATIONAL_MODEL=microsoft/DialoGPT-medium
HF_FINANCIAL_MODEL=ProsusAI/finbert
HF_GENERAL_MODEL=google/flan-t5-base

# Optional: Customize AI behavior
AI_SERVICE_TIMEOUT=30000
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
```

### 3. Restart Your App
```bash
npm start
# or
expo start
```

## 🚀 What You Get

### With API Key (Full AI)
- ✅ Smart query understanding ("How much did I spend on food this month?")
- ✅ Natural language responses
- ✅ Context-aware conversations
- ✅ Financial sentiment analysis

### Without API Key (Fallback Mode)
- ✅ Basic pattern matching for common queries
- ✅ Template-based responses
- ✅ All core app functionality still works
- ⚠️ Limited conversational ability

## 💰 Cost Estimates

### HuggingFace Free Tier
- **Cost**: FREE
- **Limit**: 1,000 requests/month
- **Perfect for**: Personal use, testing

### HuggingFace Pro ($9/month)
- **Cost**: $9/month
- **Limit**: 100,000 requests/month
- **Perfect for**: Heavy usage, production apps

## 🔒 Security

- API keys are loaded from environment variables (not stored in code)
- Keys are not logged or exposed in the app
- Fallback mode works without any API keys

## 🛠️ Troubleshooting

### "No API key found" Warning
- Check your `.env` file has `HUGGINGFACE_API_KEY=your_key_here`
- Restart the Expo server after adding the key
- Verify the key starts with `hf_`

### API Rate Limits
- Free tier: 1,000 requests/month
- App automatically falls back to template responses when limits hit
- Consider upgrading to Pro tier for heavy usage

### Models Not Working
- All models have fallback implementations
- Check HuggingFace status: https://status.huggingface.co/
- Verify model names in `.env` are correct

## 🎯 Next Steps

Once configured, try asking your AI assistant:
- "How much did I spend this month?"
- "What's my dining budget status?"
- "Show me my recent transactions"
- "Am I staying within my budget?"

The AI will understand your questions and provide helpful financial insights!