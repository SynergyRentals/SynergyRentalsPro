/**
 * Schema Validator Utility
 * 
 * This utility validates that the database structure matches the schema definitions
 * It compares the table structure against the schema definitions in shared/schema.ts
 */
import { Pool } from 'pg';
import * as schema from '../../shared/schema';
import util from 'util';

/**
 * Interface for a column definition
 */
interface ColumnDefinition {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
}

/**
 * Validates that the database schema matches the TypeScript schema definitions
 */
export async function validateSchema(pool: Pool): Promise<{ 
  valid: boolean; 
  missingTables: string[]; 
  missingColumns: ColumnDefinition[];
}> {
  try {
    // Extract table and column information from schema definitions
    const expectedTables = extractSchemaInfo();
    
    // Get current database schema
    const actualTables = await getDatabaseSchema(pool);
    
    // Find missing tables
    const missingTables = findMissingTables(expectedTables, actualTables);
    
    // Find missing columns
    const missingColumns = findMissingColumns(expectedTables, actualTables);
    
    return {
      valid: missingTables.length === 0 && missingColumns.length === 0,
      missingTables,
      missingColumns
    };
  } catch (error) {
    console.error('Error validating schema:', error);
    return {
      valid: false,
      missingTables: [],
      missingColumns: []
    };
  }
}

/**
 * Extracts table and column information from schema definitions
 */
function extractSchemaInfo(): Map<string, Map<string, any>> {
  const tableMap = new Map<string, Map<string, any>>();
  
  // Find all pgTable definitions in the schema
  Object.entries(schema).forEach(([key, value]) => {
    // Skip non-table items (like insert schemas)
    if (!value || typeof value !== 'object' || !('_': 'object') in value) {
      return;
    }
    
    try {
      // Try to access table information
      if (value._ && value._.name) {
        const tableName = value._.name;
        const columns = new Map<string, any>();
        
        // Extract column information
        if (value._.columns) {
          Object.entries(value._.columns).forEach(([colName, colDef]) => {
            columns.set(colName, colDef);
          });
        }
        
        tableMap.set(tableName, columns);
      }
    } catch (e) {
      // Skip items that don't follow the expected structure
    }
  });
  
  return tableMap;
}

/**
 * Gets the current database schema
 */
async function getDatabaseSchema(pool: Pool): Promise<Map<string, Map<string, any>>> {
  const tableMap = new Map<string, Map<string, any>>();
  
  // Query to get table and column information
  const query = `
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable
    FROM 
      information_schema.tables t
    JOIN 
      information_schema.columns c
    ON 
      t.table_name = c.table_name
    WHERE 
      t.table_schema = 'public'
    ORDER BY 
      t.table_name, c.ordinal_position;
  `;
  
  const result = await pool.query(query);
  
  // Process results into a structured format
  result.rows.forEach(row => {
    const tableName = row.table_name;
    
    // Create new table entry if it doesn't exist
    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, new Map());
    }
    
    // Add column information
    tableMap.get(tableName)!.set(row.column_name, {
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES'
    });
  });
  
  return tableMap;
}

/**
 * Finds tables that are in the schema but not in the database
 */
function findMissingTables(
  expectedTables: Map<string, Map<string, any>>,
  actualTables: Map<string, Map<string, any>>
): string[] {
  const missingTables: string[] = [];
  
  // Check each expected table
  for (const tableName of expectedTables.keys()) {
    if (!actualTables.has(tableName)) {
      missingTables.push(tableName);
    }
  }
  
  return missingTables;
}

/**
 * Finds columns that are in the schema but not in the database
 */
function findMissingColumns(
  expectedTables: Map<string, Map<string, any>>,
  actualTables: Map<string, Map<string, any>>
): ColumnDefinition[] {
  const missingColumns: ColumnDefinition[] = [];
  
  // Check each table
  for (const [tableName, expectedColumns] of expectedTables.entries()) {
    // Skip if table doesn't exist
    if (!actualTables.has(tableName)) {
      continue;
    }
    
    const actualColumns = actualTables.get(tableName)!;
    
    // Check each expected column
    for (const columnName of expectedColumns.keys()) {
      if (!actualColumns.has(columnName)) {
        missingColumns.push({
          tableName,
          columnName,
          dataType: 'unknown', // We don't have this information from the schema easily
          isNullable: true // Conservative assumption
        });
      }
    }
  }
  
  return missingColumns;
}

/**
 * Logs schema validation results
 */
export function logSchemaValidationResults(results: { 
  valid: boolean; 
  missingTables: string[]; 
  missingColumns: ColumnDefinition[];
}): void {
  if (results.valid) {
    console.log('✅ Schema validation passed. Database structure matches schema definitions.');
    return;
  }
  
  console.log('❌ Schema validation failed. Database structure does not match schema definitions.');
  
  if (results.missingTables.length > 0) {
    console.log('\nMissing tables:');
    results.missingTables.forEach(table => {
      console.log(`  - ${table}`);
    });
  }
  
  if (results.missingColumns.length > 0) {
    console.log('\nMissing columns:');
    results.missingColumns.forEach(column => {
      console.log(`  - ${column.tableName}.${column.columnName}`);
    });
  }
  
  console.log('\nTo fix these issues, create a migration using:');
  console.log('  node migrations/create.js "add missing schema elements"\n');
}