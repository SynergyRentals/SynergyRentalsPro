import { pool } from './server/db.ts';

async function createTables() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Creating insights table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS insights (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        unit_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        insight_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actionable BOOLEAN DEFAULT TRUE,
        data JSONB
      );
    `);
    
    console.log('Creating unit_health_scores table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS unit_health_scores (
        id SERIAL PRIMARY KEY,
        unit_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        revenue_score INTEGER,
        maintenance_score INTEGER,
        guest_satisfaction_score INTEGER,
        inventory_score INTEGER,
        cleaning_score INTEGER,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        trend_direction TEXT,
        trend_value INTEGER
      );
    `);
    
    console.log('Creating review_sentiment table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS review_sentiment (
        id SERIAL PRIMARY KEY,
        review_id INTEGER,
        unit_id INTEGER,
        sentiment_score REAL NOT NULL,
        analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        positive_aspects JSONB,
        negative_aspects JSONB,
        keywords JSONB
      );
    `);
    
    console.log('Creating revenue_snapshots table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unit_id INTEGER,
        daily_revenue REAL,
        weekly_revenue REAL,
        monthly_revenue REAL,
        quarterly_revenue REAL,
        yearly_revenue REAL,
        occupancy_rate REAL,
        avg_booking_value REAL,
        forecasted_revenue JSONB
      );
    `);
    
    console.log('Creating insight_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS insight_logs (
        id SERIAL PRIMARY KEY,
        analysis_type TEXT NOT NULL,
        unit_id INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        input_data JSONB,
        result_data JSONB,
        actionability_score REAL,
        processing_time INTEGER,
        prompt_tokens INTEGER,
        completion_tokens INTEGER
      );
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('All tables created successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables().catch(console.error);