/**
 * Test script for free-form query handling
 * This demonstrates the new hybrid intent routing system
 */

import { HybridIntentRouter } from './HybridIntentRouter';
import AIQueryProcessor from './AIQueryProcessor';

export class FreeFormQueryTest {
  private hybridRouter = HybridIntentRouter.getInstance();
  
  async runTests(): Promise<void> {
    console.log('🧪 Testing Free-form Query Handling...\n');
    
    // Test queries from the solution document
    const testQueries = [
      'my number 1 top category',
      'biggest spend at restaurants last 90 days',
      'how much did I spend at Tokopedia yesterday?',
      'compare this month vs last month groceries', 
      'what are my top 3 spending categories?',
      'show me budget status',
      'spending trends this year',
      'transactions over $500',
      'food expenses last week',
      'am I over budget in any category?'
    ];
    
    try {
      // Initialize the hybrid router
      await this.hybridRouter.initialize();
      await AIQueryProcessor.initialize();
      
      console.log('✅ Hybrid router and processor initialized\n');
      
      for (const query of testQueries) {
        console.log(`🔍 Query: "${query}"`);
        
        // Test hybrid routing
        const routeResult = await this.hybridRouter.routeIntent(query);
        console.log(`   📍 Intent: ${routeResult.intent} (${routeResult.method}, confidence: ${routeResult.confidence.toFixed(2)})`);
        
        // Test slot extraction
        const slots = this.hybridRouter.extractSlots(query);
        if (Object.keys(slots).length > 0) {
          console.log(`   🎯 Slots:`, JSON.stringify(slots, null, 2).replace(/\n/g, '\n      '));
        }
        
        // Test query processing
        try {
          const processingResult = await AIQueryProcessor.processQuery(query);
          console.log(`   ✅ Processing: ${processingResult.isValid ? 'Valid' : 'Invalid'} (confidence: ${processingResult.classification.confidence.toFixed(2)})`);
          console.log(`   📊 Query Type: ${processingResult.classification.type}`);
          
          if (processingResult.errors) {
            console.log(`   ⚠️  Errors: ${processingResult.errors.join(', ')}`);
          }
        } catch (error) {
          console.log(`   ❌ Processing Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        console.log('');
      }
      
      console.log('🎉 Free-form query testing completed!');
      
    } catch (error) {
      console.error('❌ Test initialization failed:', error);
    }
  }
  
  async testSpecificPatterns(): Promise<void> {
    console.log('🧪 Testing Specific Patterns...\n');
    
    const patternTests = [
      {
        category: 'Top Categories',
        queries: ['top category', 'biggest spending category', 'number 1 expense', '#1 category', 'largest spending area']
      },
      {
        category: 'Time Extraction', 
        queries: ['last 30 days', 'this month', 'last month', 'yesterday', 'last week']
      },
      {
        category: 'Merchant Detection',
        queries: ['spending at Starbucks', 'transactions from Amazon', 'purchases at Target', 'expenses from Uber']
      },
      {
        category: 'Amount Filters',
        queries: ['transactions over $100', 'expenses above 50', 'spending under $25', 'purchases between $10 and $50']
      }
    ];
    
    for (const test of patternTests) {
      console.log(`📋 ${test.category} Tests:`);
      
      for (const query of test.queries) {
        const slots = this.hybridRouter.extractSlots(query);
        const routeResult = await this.hybridRouter.routeIntent(query);
        
        console.log(`   "${query}" → ${routeResult.intent} (${JSON.stringify(slots)})`);
      }
      console.log('');
    }
  }
}

// Example usage
export async function runFreeFormTests(): Promise<void> {
  const tester = new FreeFormQueryTest();
  await tester.runTests();
  await tester.testSpecificPatterns();
}

export default FreeFormQueryTest;