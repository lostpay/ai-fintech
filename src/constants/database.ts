export const DATABASE_NAME = 'budget_tracker.db';
export const DATABASE_VERSION = 1;

// Default categories data
export const DEFAULT_CATEGORIES = [
  { name: 'Dining', color: '#FF9800', icon: 'restaurant', is_default: 1 },
  { name: 'Groceries', color: '#4CAF50', icon: 'local-grocery-store', is_default: 1 },
  { name: 'Transportation', color: '#2196F3', icon: 'directions-car', is_default: 1 },
  { name: 'Entertainment', color: '#9C27B0', icon: 'movie', is_default: 1 },
  { name: 'Shopping', color: '#F44336', icon: 'shopping-bag', is_default: 1 },
  { name: 'Healthcare', color: '#00BCD4', icon: 'local-hospital', is_default: 1 },
  { name: 'Utilities', color: '#607D8B', icon: 'bolt', is_default: 1 },
  { name: 'Income', color: '#8BC34A', icon: 'attach-money', is_default: 1 },
  { name: 'Other', color: '#795548', icon: 'category', is_default: 1 },
];

// SQL Statements
export const CREATE_TABLES_SQL = {
  CATEGORIES: `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT 0,
      is_hidden BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      CHECK (length(name) > 0 AND length(name) <= 50),
      CHECK (color LIKE '#%' AND length(color) = 7),
      CHECK (length(icon) > 0 AND length(icon) <= 30)
    );
  `,
  
  TRANSACTIONS: `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income')),
      date DATE NOT NULL DEFAULT (date('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      
      CHECK (amount > 0),
      CHECK (length(description) > 0 AND length(description) <= 200)
    );
  `,
  
  BUDGETS: `
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE (category_id, period_start, period_end),
      
      CHECK (amount > 0),
      CHECK (period_end > period_start)
    );
  `,
  
  GOALS: `
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      current_amount INTEGER NOT NULL DEFAULT 0,
      target_date DATE,
      description TEXT NOT NULL,
      is_completed BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      CHECK (length(name) > 0 AND length(name) <= 100),
      CHECK (target_amount > 0),
      CHECK (current_amount >= 0),
      CHECK (length(description) <= 500)
    );
  `,
  
  AI_CONVERSATIONS: `
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      messages TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    );
  `,
  
  AI_QUERY_CONTEXT: `
    CREATE TABLE IF NOT EXISTS ai_query_context (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      last_query_type TEXT,
      relevant_timeframe TEXT,
      focus_categories TEXT,
      budget_context TEXT,
      langchain_memory TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
    );
  `,
};

export const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(transaction_type, date);',
  'CREATE INDEX IF NOT EXISTS idx_budgets_category_period ON budgets(category_id, period_start, period_end);',
  'CREATE INDEX IF NOT EXISTS idx_categories_visibility ON categories(is_default, is_hidden);',
  'CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);',
  'CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_active ON ai_conversations(user_id, is_active);',
  'CREATE INDEX IF NOT EXISTS idx_ai_query_context_conversation ON ai_query_context(conversation_id);',
];

export const CREATE_TRIGGERS_SQL = [
  `
    CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
    AFTER UPDATE ON categories
    BEGIN
      UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `,
  `
    CREATE TRIGGER IF NOT EXISTS update_transactions_timestamp 
    AFTER UPDATE ON transactions
    BEGIN
      UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `,
  `
    CREATE TRIGGER IF NOT EXISTS update_budgets_timestamp 
    AFTER UPDATE ON budgets
    BEGIN
      UPDATE budgets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `,
  `
    CREATE TRIGGER IF NOT EXISTS update_goals_timestamp 
    AFTER UPDATE ON goals
    BEGIN
      UPDATE goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `,
  `
    CREATE TRIGGER IF NOT EXISTS update_ai_conversations_timestamp 
    AFTER UPDATE ON ai_conversations
    BEGIN
      UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `,
  `
    CREATE TRIGGER IF NOT EXISTS update_ai_query_context_timestamp 
    AFTER UPDATE ON ai_query_context
    BEGIN
      UPDATE ai_query_context SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `,
];