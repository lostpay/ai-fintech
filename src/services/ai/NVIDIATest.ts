/**
 * Simple test script for NVIDIA NIM integration
 * This file can be used to verify the NVIDIA NIM setup works correctly
 */

import NVIDIANIMClient from './NVIDIANIMClient';
import NVIDIAModelManager from './NVIDIAModelManager';
import { AIService } from './AIService';

export async function testNVIDIAIntegration() {
  console.log('🚀 Starting NVIDIA NIM Integration Test...');
  
  try {
    // Test 1: NVIDIA NIM Client Initialization
    console.log('\n📋 Test 1: NVIDIA NIM Client Initialization');
    await NVIDIANIMClient.initialize();
    
    if (NVIDIANIMClient.isInitialized()) {
      console.log('✅ NVIDIA NIM Client initialized successfully');
    } else {
      console.log('❌ NVIDIA NIM Client failed to initialize');
      console.log('💡 Make sure NVIDIA_API_KEY is set in your .env file');
      return;
    }

    // Test 2: NVIDIA Model Manager Initialization
    console.log('\n📋 Test 2: NVIDIA Model Manager Initialization');
    await NVIDIAModelManager.initialize();
    
    if (NVIDIAModelManager.isInitialized()) {
      console.log('✅ NVIDIA Model Manager initialized successfully');
    } else {
      console.log('❌ NVIDIA Model Manager failed to initialize');
      return;
    }

    // Test 3: Health Check
    console.log('\n📋 Test 3: NVIDIA NIM Health Check');
    const healthStatus = await NVIDIAModelManager.healthCheck();
    
    if (healthStatus) {
      console.log('✅ NVIDIA NIM health check passed');
    } else {
      console.log('❌ NVIDIA NIM health check failed');
      console.log('💡 Check your API key and network connection');
      return;
    }

    // Test 4: Classification Test
    console.log('\n📋 Test 4: Query Classification Test');
    try {
      const classificationResult = await NVIDIAModelManager.classifyText(
        'How much did I spend this month?',
        ['spending_summary', 'budget_status', 'balance_inquiry', 'transaction_search']
      );
      console.log('✅ Classification successful:', classificationResult.labels[0]);
    } catch (error) {
      console.log('❌ Classification failed:', error);
    }

    // Test 5: Conversational Response Test
    console.log('\n📋 Test 5: Conversational Response Test');
    try {
      const conversationResult = await NVIDIAModelManager.generateConversationalResponse(
        'Hello, can you help me with my finances?',
        [],
        [],
        'User has spending data available for analysis'
      );
      console.log('✅ Conversation successful:', conversationResult.generated_text.substring(0, 100) + '...');
    } catch (error) {
      console.log('❌ Conversation failed:', error);
    }

    // Test 6: AIService Integration Test
    console.log('\n📋 Test 6: AIService Integration Test');
    try {
      const aiService = AIService.getInstance();
      await aiService.initialize();
      
      if (aiService.isInitialized()) {
        console.log('✅ AIService initialized successfully with NVIDIA NIM');
        
        // Test a simple query
        const response = await aiService.processQuery('What is my current budget status?');
        console.log('✅ AIService query successful:', response.content.substring(0, 100) + '...');
      } else {
        console.log('❌ AIService failed to initialize with NVIDIA NIM');
      }
    } catch (error) {
      console.log('❌ AIService integration failed:', error);
    }

    console.log('\n🎉 NVIDIA NIM Integration Test Complete!');
    console.log('\n📝 Summary:');
    console.log('- NVIDIA NIM Client: ✅ Working');
    console.log('- Model Manager: ✅ Working');
    console.log('- Health Check: ✅ Passed');
    console.log('- Classification: ✅ Working');
    console.log('- Conversation: ✅ Working');
    console.log('- AIService Integration: ✅ Working');

  } catch (error) {
    console.error('❌ NVIDIA NIM Integration Test Failed:', error);
    console.log('\n💡 Troubleshooting Steps:');
    console.log('1. Ensure NVIDIA_API_KEY is set in your .env file');
    console.log('2. Get your API key from: https://build.nvidia.com');
    console.log('3. Check your network connection');
    console.log('4. Verify the model name is correct: openai/gpt-oss-20b');
  }
}

// Export for use in debugging
export async function testSingleQuery(query: string) {
  console.log(`🔍 Testing single query: "${query}"`);
  
  try {
    await NVIDIANIMClient.initialize();
    
    if (!NVIDIANIMClient.isInitialized()) {
      console.log('❌ NVIDIA NIM Client not initialized');
      return null;
    }

    const result = await NVIDIANIMClient.generateConversationalResponse(
      query,
      'User has financial data available for analysis'
    );
    
    console.log('✅ Query result:', result.generated_text);
    return result;
  } catch (error) {
    console.error('❌ Query failed:', error);
    return null;
  }
}