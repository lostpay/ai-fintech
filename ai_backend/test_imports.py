#!/usr/bin/env python3
"""
Test script to verify AI PoC imports work correctly
Run this before starting the main server
"""
import sys
from pathlib import Path

# Add AI PoC modules to Python path
ai_poc_path = Path(__file__).parent.parent / "ai_poc"
sys.path.insert(0, str(ai_poc_path))

print(f"Testing imports from: {ai_poc_path}")
print(f"Path exists: {ai_poc_path.exists()}")

try:
    print("Testing AI PoC imports...")
    
    # Test data types import
    from models.data_types import QueryType, ProcessingType, AIResponse
    print("✅ Successfully imported data types")
    
    # Test services imports
    from services.ai_service import AIService
    print("✅ Successfully imported AIService")
    
    from services.huggingface_manager import HuggingFaceManager
    print("✅ Successfully imported HuggingFaceManager")
    
    from services.query_processor import QueryProcessor
    print("✅ Successfully imported QueryProcessor")
    
    from services.mock_database import MockDatabaseService
    print("✅ Successfully imported MockDatabaseService")
    
    print("\n🎉 All AI PoC imports successful!")
    print("You can now start the FastAPI server with: python main.py")
    
except ImportError as e:
    print(f"❌ Import failed: {e}")
    print("\nDebugging info:")
    print(f"AI PoC path: {ai_poc_path}")
    print(f"Path exists: {ai_poc_path.exists()}")
    print(f"Directory contents:")
    if ai_poc_path.exists():
        for item in ai_poc_path.iterdir():
            print(f"  - {item.name}")
    
    sys.exit(1)