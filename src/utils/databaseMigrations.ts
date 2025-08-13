import * as SQLite from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

export class DatabaseMigrations {
  private static migrations: Migration[] = [
    {
      version: 1,
      name: 'initial_schema',
      up: async (db: SQLite.SQLiteDatabase) => {
        // This is handled by the initial table creation
        console.log('Initial schema migration (handled by createTables)');
      }
    },
    {
      version: 2,
      name: 'update_to_new_schema',
      up: async (db: SQLite.SQLiteDatabase) => {
        console.log('Running migration: update_to_new_schema');
        
        // Check if we need to migrate from old schema
        const tableInfo = await db.getAllAsync("PRAGMA table_info(transactions)");
        const hasOldSchema = tableInfo.some((col: any) => col.name === 'category_id');
        
        if (hasOldSchema) {
          console.log('Old schema detected, migrating to new schema...');
          
          // Start transaction
          await db.execAsync('BEGIN TRANSACTION;');
          
          try {
            // 1. Create new tables with correct schema
            await db.execAsync(`
              CREATE TABLE IF NOT EXISTS categories_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL,
                icon TEXT NOT NULL,
                is_system_category BOOLEAN NOT NULL DEFAULT 0,
                is_hidden BOOLEAN NOT NULL DEFAULT 0,
                created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                CHECK (length(name) > 0 AND length(name) <= 50),
                CHECK (color LIKE '#%' AND length(color) = 7),
                CHECK (length(icon) > 0 AND length(icon) <= 30)
              );
            `);

            await db.execAsync(`
              CREATE TABLE IF NOT EXISTS transactions_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount DECIMAL(10,2) NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
                date DATE NOT NULL DEFAULT (date('now')),
                created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                CHECK (amount > 0),
                CHECK (length(description) > 0 AND length(description) <= 200)
              );
            `);

            await db.execAsync(`
              CREATE TABLE IF NOT EXISTS budgets_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                budget_amount DECIMAL(10,2) NOT NULL,
                spent_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                percentage_used INTEGER NOT NULL DEFAULT 0,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE (category, period_start, period_end),
                
                CHECK (budget_amount > 0),
                CHECK (period_end > period_start)
              );
            `);
            
            // 2. Migrate categories data
            await db.execAsync(`
              INSERT INTO categories_new (id, name, color, icon, is_system_category, is_hidden, created_date, updated_at)
              SELECT 
                id, 
                name, 
                color, 
                icon, 
                COALESCE(is_default, 0) as is_system_category,
                COALESCE(is_hidden, 0) as is_hidden,
                COALESCE(created_at, datetime('now')) as created_date,
                COALESCE(updated_at, datetime('now')) as updated_at
              FROM categories;
            `);
            
            // 3. Migrate transactions data (join with categories to get category name)
            await db.execAsync(`
              INSERT INTO transactions_new (id, amount, description, category, type, date, created_date, updated_at)
              SELECT 
                t.id,
                CASE 
                  WHEN t.amount < 1000 THEN t.amount / 100.0
                  ELSE t.amount / 100.0
                END as amount,
                t.description,
                COALESCE(c.name, 'Other') as category,
                COALESCE(t.transaction_type, 'expense') as type,
                COALESCE(t.date, date('now')) as date,
                COALESCE(t.created_at, datetime('now')) as created_date,
                COALESCE(t.updated_at, datetime('now')) as updated_at
              FROM transactions t
              LEFT JOIN categories c ON t.category_id = c.id;
            `);
            
            // 4. Migrate budgets data (join with categories to get category name)  
            await db.execAsync(`
              INSERT INTO budgets_new (id, category, budget_amount, spent_amount, remaining_amount, percentage_used, period_start, period_end, created_date, updated_at)
              SELECT 
                b.id,
                COALESCE(c.name, 'Other') as category,
                b.amount / 100.0 as budget_amount,
                0 as spent_amount,
                b.amount / 100.0 as remaining_amount,
                0 as percentage_used,
                b.period_start,
                b.period_end,
                COALESCE(b.created_at, datetime('now')) as created_date,
                COALESCE(b.updated_at, datetime('now')) as updated_at
              FROM budgets b
              LEFT JOIN categories c ON b.category_id = c.id;
            `);
            
            // 5. Drop old tables
            await db.execAsync('DROP TABLE IF EXISTS transactions;');
            await db.execAsync('DROP TABLE IF EXISTS budgets;');
            await db.execAsync('DROP TABLE IF EXISTS categories;');
            
            // 6. Rename new tables
            await db.execAsync('ALTER TABLE categories_new RENAME TO categories;');
            await db.execAsync('ALTER TABLE transactions_new RENAME TO transactions;');
            await db.execAsync('ALTER TABLE budgets_new RENAME TO budgets;');
            
            // 7. Create indexes
            await db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category, date);');
            await db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);');
            await db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date);');
            await db.execAsync('CREATE INDEX IF NOT EXISTS idx_budgets_category_period ON budgets(category, period_start, period_end);');
            await db.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_visibility ON categories(is_system_category, is_hidden);');
            await db.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);');
            
            // 8. Create triggers
            await db.execAsync(`
              CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
              AFTER UPDATE ON categories
              BEGIN
                UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
              END;
            `);
            
            await db.execAsync(`
              CREATE TRIGGER IF NOT EXISTS update_transactions_timestamp 
              AFTER UPDATE ON transactions
              BEGIN
                UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
              END;
            `);
            
            await db.execAsync(`
              CREATE TRIGGER IF NOT EXISTS update_budgets_timestamp 
              AFTER UPDATE ON budgets
              BEGIN
                UPDATE budgets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
              END;
            `);
            
            await db.execAsync('COMMIT;');
            console.log('Schema migration completed successfully');
            
          } catch (error) {
            await db.execAsync('ROLLBACK;');
            throw error;
          }
        } else {
          console.log('New schema already in place, skipping migration');
        }
      }
    }
  ];

  static async getCurrentVersion(db: SQLite.SQLiteDatabase): Promise<number> {
    try {
      const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      return result?.user_version || 0;
    } catch (error) {
      console.log('Error getting schema version, assuming 0:', error);
      return 0;
    }
  }

  static async setVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
    await db.execAsync(`PRAGMA user_version = ${version};`);
  }

  static async runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
    const currentVersion = await this.getCurrentVersion(db);
    const targetVersion = Math.max(...this.migrations.map(m => m.version));
    
    console.log(`Database version: ${currentVersion}, target: ${targetVersion}`);
    
    if (currentVersion >= targetVersion) {
      console.log('Database is up to date');
      return;
    }
    
    const migrationsToRun = this.migrations
      .filter(m => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);
    
    console.log(`Running ${migrationsToRun.length} migrations...`);
    
    for (const migration of migrationsToRun) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      try {
        await migration.up(db);
        await this.setVersion(db, migration.version);
        console.log(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${error}`);
      }
    }
    
    console.log('All migrations completed successfully');
  }

  static async resetDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
    console.log('Resetting database...');
    
    await db.execAsync('BEGIN TRANSACTION;');
    
    try {
      // Drop all tables
      await db.execAsync('DROP TABLE IF EXISTS transactions;');
      await db.execAsync('DROP TABLE IF EXISTS budgets;');
      await db.execAsync('DROP TABLE IF EXISTS categories;');
      await db.execAsync('DROP TABLE IF EXISTS goals;');
      await db.execAsync('DROP TABLE IF EXISTS ai_conversations;');
      await db.execAsync('DROP TABLE IF EXISTS ai_query_context;');
      
      // Reset version
      await db.execAsync('PRAGMA user_version = 0;');
      
      await db.execAsync('COMMIT;');
      console.log('Database reset completed');
      
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}