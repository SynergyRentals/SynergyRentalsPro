const { Pool } = require('pg');
require('dotenv').config();

/**
 * This script creates the missing host_ai_autopilot_settings table in the database.
 * This resolves the error: "relation "host_ai_autopilot_settings" does not exist"
 */
async function createHostAIAutopilotTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create host_ai_autopilot_settings table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS host_ai_autopilot_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        enabled BOOLEAN NOT NULL DEFAULT false,
        confidence_threshold REAL NOT NULL DEFAULT 0.85,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('host_ai_autopilot_settings table created successfully');

    // Check if host_ai_autopilot_log table exists and create if needed
    await pool.query(`
      CREATE TABLE IF NOT EXISTS host_ai_autopilot_log (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES host_ai_tasks(id),
        decision TEXT NOT NULL,
        urgency TEXT,
        team TEXT,
        confidence REAL NOT NULL,
        scheduled_for TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('host_ai_autopilot_log table created successfully');

    // Create default autopilot settings for admin user (id=1)
    await pool.query(`
      INSERT INTO host_ai_autopilot_settings (user_id, enabled, confidence_threshold)
      VALUES (1, false, 0.85)
      ON CONFLICT (user_id) DO NOTHING;
    `);
    console.log('Default autopilot settings created for admin user');

  } catch (error) {
    console.error('Error creating HostAI autopilot tables:', error);
    throw error;
  } finally {
    // Release the pool
    await pool.end();
  }
}

async function main() {
  try {
    await createHostAIAutopilotTables();
    console.log('HostAI autopilot tables created successfully');
  } catch (error) {
    console.error('Failed to create HostAI autopilot tables:', error);
    process.exit(1);
  }
}

main();