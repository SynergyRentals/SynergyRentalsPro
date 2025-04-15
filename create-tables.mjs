import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Set up WebSocket support for Neon
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTables() {
  try {
    console.log('Creating tables...');
    
    // Create cleaning_tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cleaning_tasks (
        id SERIAL PRIMARY KEY,
        unit_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        scheduled_for TIMESTAMP NOT NULL,
        assigned_to INTEGER,
        assigned_by INTEGER,
        completed_at TIMESTAMP,
        verified_at TIMESTAMP,
        verified_by INTEGER,
        cleaning_type TEXT NOT NULL DEFAULT 'turnover',
        estimated_duration INTEGER,
        actual_duration INTEGER,
        notes TEXT,
        photos TEXT[],
        checklist_template_id INTEGER,
        score INTEGER,
        is_inspection BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create cleaning_checklists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cleaning_checklists (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        property_type TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create cleaning_checklist_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cleaning_checklist_items (
        id SERIAL PRIMARY KEY,
        checklist_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        room TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        requires_photo BOOLEAN,
        is_required BOOLEAN DEFAULT TRUE,
        notes TEXT
      );
    `);
    
    // Create cleaning_checklist_completions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cleaning_checklist_completions (
        id SERIAL PRIMARY KEY,
        cleaning_task_id INTEGER NOT NULL,
        checklist_item_id INTEGER NOT NULL,
        completed BOOLEAN,
        completed_at TIMESTAMP,
        completed_by INTEGER,
        photo_url TEXT,
        notes TEXT
      );
    `);
    
    // Create sample cleaning task
    await pool.query(`
      INSERT INTO cleaning_tasks (
        unit_id, status, scheduled_for, cleaning_type, estimated_duration, notes
      ) VALUES (
        1, 'scheduled', NOW() + INTERVAL '1 day', 'turnover', 120, 'Regular turnover cleaning'
      );
    `);
    
    await pool.query(`
      INSERT INTO cleaning_tasks (
        unit_id, status, scheduled_for, assigned_to, completed_at, cleaning_type, estimated_duration, actual_duration, notes, score
      ) VALUES (
        1, 'completed', NOW() - INTERVAL '2 day', 2, NOW() - INTERVAL '1 day', 'deep-clean', 180, 200, 'Deep cleaning after guest checkout', 95
      );
    `);
    
    console.log('Tables created successfully with sample data');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createTables().catch(console.error);