# Properties Module Migration Plan

This document outlines the step-by-step process to replace the existing properties module with a new simplified version.

## Prerequisites
- Backup the database before starting (if possible)
- Ensure you have admin access to execute SQL scripts

## Migration Steps

### 1. Drop Existing Property-Related Tables
Execute the `drop-property-tables.js` script to remove all tables related to the Guesty integration:
```
node drop-property-tables.js
```

This script will drop the following tables:
- guesty_webhook_events
- guesty_reservations
- guesty_properties
- guesty_sync_logs

### 2. Create New Properties Table
Execute the `create-new-properties-table.js` script to create the new simplified properties table:
```
node create-new-properties-table.js
```

### 3. Replace Schema File
Replace the existing schema definition with the new version:
```
cp shared/schema-new.ts shared/schema.ts
```

### 4. Update Server-Side Code
1. Replace the old routes with the new simplified routes:
```
cp server/routes-new.ts server/routes.ts
```

2. Implement the new property service by creating the proper imports in the main server file to use the new service.

### 5. Update Client-Side Code
1. Replace the old App.tsx with the new version:
```
cp client/src/App-new.tsx client/src/App.tsx
```

2. The new components and pages will be used automatically through the updated routes.

### 6. Clean Up
After confirming everything works, remove the temporary files:
```
rm shared/schema-new.ts
rm server/routes-new.ts
rm client/src/App-new.tsx
```

## Testing Plan

### 1. Database Verification
- Verify the new `properties` table exists and has the correct structure
- Confirm all old tables have been properly dropped

### 2. API Endpoint Testing
- Test all property CRUD operations using Postman or curl
- Test the calendar integration functionality

### 3. UI Testing
- Test property listing page loads correctly
- Test property detail view with calendar integration
- Test create/edit/delete property functionality

## Rollback Plan
If issues occur, follow these steps to rollback:

1. Restore the database from backup
2. Restore the original schema.ts file
3. Restore the original routes.ts file
4. Restore the original App.tsx file

## Post-Migration Cleanup
Once the migration is successful and stable, the following files can be removed:
- Old property-related components
- Test scripts used for migration
- Any backup files created during the process