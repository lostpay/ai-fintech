-- SQL script to create ML-related tables in Supabase
-- Run this in the Supabase SQL editor

-- ML Predictions table
CREATE TABLE IF NOT EXISTS ml_predictions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    predictions JSONB NOT NULL,
    confidence FLOAT DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, timeframe)
);

-- ML Budgets table
CREATE TABLE IF NOT EXISTS ml_budgets (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    month TEXT NOT NULL,
    categories JSONB NOT NULL,
    total_budget FLOAT NOT NULL,
    methodology JSONB,
    confidence FLOAT DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- ML Patterns table
CREATE TABLE IF NOT EXISTS ml_patterns (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    patterns JSONB NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ML Model Metadata table
CREATE TABLE IF NOT EXISTS ml_model_metadata (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    metrics JSONB NOT NULL,
    trained_at TIMESTAMP WITH TIME ZONE NOT NULL,
    model_version TEXT DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_id ON ml_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_timeframe ON ml_predictions(timeframe);
CREATE INDEX IF NOT EXISTS idx_ml_budgets_user_id ON ml_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_budgets_month ON ml_budgets(month);
CREATE INDEX IF NOT EXISTS idx_ml_patterns_user_id ON ml_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_metadata_user_id ON ml_model_metadata(user_id);

-- Add Row Level Security (RLS) policies
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication setup)
-- These examples assume service key access for backend

-- ML Predictions policies
CREATE POLICY "Service key can manage ml_predictions" ON ml_predictions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ML Budgets policies
CREATE POLICY "Service key can manage ml_budgets" ON ml_budgets
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ML Patterns policies
CREATE POLICY "Service key can manage ml_patterns" ON ml_patterns
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ML Model Metadata policies
CREATE POLICY "Service key can manage ml_model_metadata" ON ml_model_metadata
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ml_predictions_updated_at BEFORE UPDATE ON ml_predictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_budgets_updated_at BEFORE UPDATE ON ml_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_patterns_updated_at BEFORE UPDATE ON ml_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_model_metadata_updated_at BEFORE UPDATE ON ml_model_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();