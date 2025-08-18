/**
 * Simple Node.js script to run the fake data generator
 * 
 * Usage:
 * node scripts/runFakeDataGenerator.js
 * node scripts/runFakeDataGenerator.js --clear
 * node scripts/runFakeDataGenerator.js --months 12 --transactions 100
 */

// Since this is a React Native project, we need to set up the environment
const path = require('path');
const fs = require('fs');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the app root directory');
  process.exit(1);
}

// Set up environment for React Native/Expo
process.env.NODE_ENV = 'development';

// Mock React Native specific modules that might be imported
const mockAsyncStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

// Set up global mocks
global.__DEV__ = true;
global.process = process;

// Mock React Native AsyncStorage
const AsyncStorage = mockAsyncStorage;

// Mock Expo Constants
const mockConstants = {
  expoConfig: {
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key',
    }
  }
};

// Set up module resolution
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(...args) {
  const moduleName = args[0];
  
  // Mock React Native and Expo modules
  if (moduleName === '@react-native-async-storage/async-storage') {
    return mockAsyncStorage;
  }
  if (moduleName === 'expo-constants') {
    return { default: mockConstants };
  }
  if (moduleName.startsWith('react-native') || moduleName.startsWith('expo-')) {
    return {}; // Return empty object for other RN/Expo modules
  }
  
  return originalRequire.apply(this, args);
};

// Helper to convert TypeScript to JavaScript on the fly
function convertTStoJS() {
  // Simple conversion - remove TypeScript syntax
  const tsContent = fs.readFileSync(path.join(__dirname, 'generateFakeData.ts'), 'utf8');
  
  // Basic TypeScript to JavaScript conversion
  let jsContent = tsContent
    .replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?\s*/g, '') // Remove type imports
    .replace(/:\s*[A-Za-z<>[\]|{}\s,]+(?=\s*[=;,)])/g, '') // Remove type annotations
    .replace(/interface\s+\w+\s*{[^}]+}/gs, '') // Remove interfaces
    .replace(/export\s*{\s*\w+\s*};?\s*$/gm, '') // Remove exports
    .replace(/export\s+/g, '') // Remove export keyword
    .replace(/private\s+|public\s+/g, '') // Remove access modifiers
    .replace(/readonly\s+/g, '') // Remove readonly
    .replace(/<[^>]+>/g, '') // Remove generics
    .replace(/as\s+\w+/g, ''); // Remove type assertions
  
  return jsContent;
}

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
    console.log('📁 Loaded .env file');
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Setting up fake data generation environment...');
    
    // Load environment variables from .env file
    loadEnvFile();
    
    // Check if Supabase credentials are available
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials!');
      console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables');
      console.error('Or add them to your .env file');
      process.exit(1);
    }
    
    // Convert and execute the TypeScript generator
    const jsCode = convertTStoJS();
    
    // Create a simplified version of the generator
    console.log('📊 Creating fake data generator...');
    
    const { createClient } = require('@supabase/supabase-js');
    
    const DEFAULT_USER_ID = 'default-user'; // Match your Supabase config
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Connected to Supabase');
    
    // Simplified fake data generation
    await generateSimpleFakeData(supabase, DEFAULT_USER_ID);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function generateSimpleFakeData(supabase, userId) {
  console.log('🎲 Generating fake data...');
  
  try {
    // First, get categories (both default and user-specific)
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .eq('is_hidden', false);
    
    if (catError) throw catError;
    
    if (!categories || categories.length === 0) {
      console.error('❌ No categories found in database. Please ensure categories are created first.');
      return;
    }
    
    console.log(`📂 Found ${categories.length} categories`);
    
    // Generate transactions for the last 3 months
    const transactions = [];
    const today = new Date();
    
    const merchants = {
      'Dining': ['McDonald\'s', 'Starbucks', 'Subway', 'Pizza Hut', 'Chipotle'],
      'Groceries': ['Walmart', 'Target', 'Kroger', 'Whole Foods', 'Trader Joe\'s'],
      'Transportation': ['Uber', 'Shell', 'Metro', 'Gas Station', 'Parking'],
      'Entertainment': ['Netflix', 'Spotify', 'AMC Theaters', 'Steam', 'Concert'],
      'Shopping': ['Amazon', 'Best Buy', 'Target', 'Nike', 'H&M'],
      'Healthcare': ['CVS Pharmacy', 'Dr. Clinic', 'Dental Care', 'Vision Center'],
      'Utilities': ['Electric Co', 'Water Dept', 'Internet', 'Phone Service'],
      'Income': ['Employer Payroll', 'Freelance', 'Bonus', 'Side Gig'],
      'Other': ['Bank Fee', 'ATM', 'Subscription', 'Gift']
    };
    
    const priceRanges = {
      'Dining': { min: 8, max: 85 },
      'Groceries': { min: 15, max: 180 },
      'Transportation': { min: 5, max: 120 },
      'Entertainment': { min: 9, max: 150 },
      'Shopping': { min: 12, max: 300 },
      'Healthcare': { min: 20, max: 500 },
      'Utilities': { min: 45, max: 250 },
      'Income': { min: 500, max: 5000 },
      'Other': { min: 10, max: 200 }
    };
    
    // Generate 300 transactions over 3 months
    for (let i = 0; i < 300; i++) {
      const daysBack = Math.floor(Math.random() * 90);
      const transactionDate = new Date(today - daysBack * 24 * 60 * 60 * 1000);
      
      const category = categories[Math.floor(Math.random() * categories.length)];
      const categoryMerchants = merchants[category.name] || merchants['Other'];
      const merchant = categoryMerchants[Math.floor(Math.random() * categoryMerchants.length)];
      
      const priceRange = priceRanges[category.name] || priceRanges['Other'];
      const amount = priceRange.min + Math.random() * (priceRange.max - priceRange.min);
      
      const transaction = {
        amount: Math.round(amount * 100), // Convert to cents
        description: merchant,
        category_id: category.id,
        transaction_type: category.name === 'Income' ? 'income' : 'expense',
        date: transactionDate.toISOString().split('T')[0],
        user_id: userId,
      };
      
      transactions.push(transaction);
    }
    
    console.log(`💳 Inserting ${transactions.length} transactions...`);
    
    // Insert in batches
    for (let i = 0; i < transactions.length; i += 50) {
      const batch = transactions.slice(i, i + 50);
      const { error } = await supabase
        .from('transactions')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting transactions:', error);
        throw error;
      }
      
      console.log(`✓ Inserted batch ${Math.floor(i/50) + 1}/${Math.ceil(transactions.length/50)}`);
    }
    
    // Generate budgets
    console.log('💰 Creating budgets...');
    const budgets = [];
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthEnd = new Date(nextMonth - 1);
    
    // Create budgets for 5 categories
    const budgetCategories = categories.filter(c => c.name !== 'Income').slice(0, 5);
    
    for (const category of budgetCategories) {
      budgets.push({
        category_id: category.id,
        amount: Math.round((200 + Math.random() * 800) * 100), // $200-$1000 in cents
        period_start: currentMonth.toISOString().split('T')[0],
        period_end: monthEnd.toISOString().split('T')[0],
        user_id: userId,
      });
    }
    
    const { error: budgetError } = await supabase
      .from('budgets')
      .insert(budgets);
    
    if (budgetError) {
      console.error('Error inserting budgets:', budgetError);
    } else {
      console.log(`✓ Created ${budgets.length} budgets`);
    }
    
    // Generate goals
    console.log('🎯 Creating goals...');
    const goals = [
      {
        name: 'Emergency Fund',
        target_amount: 1000000, // $10,000 in cents
        current_amount: 350000, // $3,500 in cents
        target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: 'Build emergency fund for unexpected expenses',
        is_completed: false,
        user_id: userId,
      },
      {
        name: 'Vacation Fund',
        target_amount: 300000, // $3,000 in cents
        current_amount: 120000, // $1,200 in cents
        target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: 'Save for summer vacation',
        is_completed: false,
        user_id: userId,
      }
    ];
    
    const { error: goalError } = await supabase
      .from('goals')
      .insert(goals);
    
    if (goalError) {
      console.error('Error inserting goals:', goalError);
    } else {
      console.log(`✓ Created ${goals.length} goals`);
    }
    
    // Print summary
    console.log('\n📊 FAKE DATA GENERATION COMPLETE!');
    console.log('==================================');
    console.log(`💳 Transactions: ${transactions.length}`);
    console.log(`💰 Budgets: ${budgets.length}`);
    console.log(`🎯 Goals: ${goals.length}`);
    console.log(`👤 User ID: ${userId}`);
    console.log('\n🔍 Test your AI assistant with queries like:');
    console.log('• "How much did I spend on groceries this month?"');
    console.log('• "What are my top spending categories?"');
    console.log('• "Show me my budget status"');
    console.log('• "Am I on track with my emergency fund goal?"');
    
  } catch (error) {
    console.error('❌ Error generating fake data:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateSimpleFakeData };