# OpenAI GPT OSS 20B Integration

This document describes the integration of OpenAI's GPT OSS 20B model into the financial AI assistant POC.

## Overview

The OpenAI GPT OSS 20B model has been integrated as the primary conversational AI model, replacing the previous Microsoft DialoGPT-medium model. This provides:

- **Better Reasoning**: 21B parameters with 3.6B active parameters
- **Apache 2.0 License**: Commercial use allowed
- **Modern Architecture**: Supports both chat completion and text generation APIs
- **Financial Context Awareness**: Optimized prompts for financial queries

## Implementation Details

### Model Configuration

The model is configured in `services/huggingface_manager.py`:

```python
self.models = {
    "conversational": "openai/gpt-oss-20b",
    "general": "openai/gpt-oss-20b"
}
```

### API Integration

Two methods are supported:

1. **Chat Completion API** (Preferred):
```python
response = client.chat.completions.create(
    model="openai/gpt-oss-20b",
    messages=[
        {"role": "system", "content": "You are a helpful financial assistant..."},
        {"role": "user", "content": "User question..."}
    ],
    max_tokens=200,
    temperature=0.7
)
```

2. **Text Generation API** (Fallback):
```python
result = client.text_generation(
    prompt="<|im_start|>system....<|im_end|>",
    model="openai/gpt-oss-20b",
    max_new_tokens=200,
    stop=["<|im_end|>"]
)
```

## Environment Setup

Set your HuggingFace API key in `.env`:
```bash
HUGGINGFACE_API_KEY=your_token_here
```

Optional model overrides:
```bash
HF_CONVERSATIONAL_MODEL=openai/gpt-oss-20b
HF_GENERAL_MODEL=openai/gpt-oss-20b
```

## Usage Examples

### Financial Query Processing

```python
from services.huggingface_manager import HuggingFaceManager

hf_manager = HuggingFaceManager(api_key)

response = hf_manager.generate_financial_response(
    query="How much did I spend on groceries?",
    financial_data={
        "category_breakdown": {"Groceries": 180.50},
        "total_amount": 450.75
    },
    query_type=QueryType.SPENDING_SUMMARY
)
```

### Response Quality

The GPT OSS model provides:
- **Contextual Awareness**: Understands financial terminology
- **Conversational Tone**: Natural, helpful responses
- **Data Integration**: Incorporates provided financial data
- **Fallback Handling**: Graceful degradation to template responses

## Testing

Run the integration test:
```bash
cd ai_poc
python test_gpt_oss.py
```

Expected output:
- ✅ Model availability verification
- ✅ Financial response generation tests
- ✅ Error handling validation

## Performance Characteristics

- **Response Time**: ~2-5 seconds (depends on HuggingFace infrastructure)
- **Token Usage**: ~150-250 tokens per response
- **Context Window**: Supports financial context + conversation history
- **Fallback Strategy**: Multiple fallback layers for reliability

## Advantages Over Previous Model

| Feature | DialoGPT-medium | GPT OSS 20B |
|---------|-----------------|-------------|
| Parameters | 117M | 21B (3.6B active) |
| License | MIT | Apache 2.0 |
| Financial Understanding | Basic | Enhanced |
| API Support | Text generation only | Chat + Text generation |
| Response Quality | Good | Excellent |
| Context Handling | Limited | Advanced |

## Integration Benefits

1. **Improved Response Quality**: More coherent and contextually relevant financial advice
2. **Better Error Handling**: Multiple fallback strategies ensure reliability
3. **Modern API Support**: Chat completion API for better conversation flow
4. **Commercial Viability**: Apache 2.0 license allows commercial deployment
5. **Scalability**: HuggingFace Inference API handles scaling automatically

## Troubleshooting

### Common Issues

1. **API Rate Limits**: HuggingFace free tier has rate limits
   - Solution: Upgrade to HuggingFace Pro or implement request queuing

2. **Model Unavailable**: Model might be temporarily unavailable
   - Solution: Automatic fallback to template responses implemented

3. **Response Quality**: Inconsistent response quality
   - Solution: Multiple model fallbacks and template responses

### Debug Mode

Enable debug logging:
```python
import logging
logging.getLogger('services.huggingface_manager').setLevel(logging.DEBUG)
```

## Future Enhancements

1. **Response Caching**: Cache responses for common queries
2. **Custom Fine-tuning**: Train on financial domain data
3. **Streaming Responses**: Implement streaming for real-time responses
4. **Model Ensemble**: Combine multiple models for better accuracy
5. **Local Deployment**: Consider local deployment for privacy/performance