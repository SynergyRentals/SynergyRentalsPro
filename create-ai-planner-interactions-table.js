/**
 * This script creates the ai_planner_interactions table in the database.
 * This resolves the error: "relation "ai_planner_interactions" does not exist"
 */

import pg from 'pg';
const { Pool } = pg;

async function main() {
  try {
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    console.log('Creating ai_planner_interactions table...');

    // Create the AI Planner interactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_planner_interactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        prompt TEXT NOT NULL,
        raw_ai_response JSONB,
        generated_plan JSONB,
        edited_plan JSONB,
        final_plan JSONB,
        status TEXT NOT NULL DEFAULT 'draft',
        converted_to_project_id INTEGER REFERENCES projects(id),
        converted_to_task_id INTEGER REFERENCES project_tasks(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        feedback TEXT,
        context JSONB
      )
    `);

    console.log('Table created successfully');
    
    await pool.end();
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

main();