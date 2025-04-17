# Issue Prevention Guide

This guide outlines strategies to prevent common issues encountered in the application, particularly focusing on database schema mismatches and UI component errors.

## Database Schema Mismatches

### Problem

When changes are made to the schema definitions in `shared/schema.ts` but the corresponding database tables are not updated, it causes runtime errors when the application tries to access missing columns or tables.

### Prevention Strategies

1. **Use the Migrations System**

   Always create a migration when changing the schema:

   ```bash
   node migrations/create.js "description of your change"
   ```

   This creates a timestamped migration script that you can implement to update the database.

2. **Run Migration Status Checks**

   Before deploying or after making schema changes, check migration status:

   ```bash
   node migrations/status.js
   ```

3. **Validate Schema Against Database**

   Use the schema validation utility to ensure the database matches the schema:

   ```bash
   npx tsx scripts/validate-schema.ts
   ```

4. **Follow Schema-First Development**

   Always update schema definitions first, then create migrations, and finally update application code.

## UI Component Errors

### Problem: Empty SelectItem Values

SelectItem components with empty string values cause validation errors and UI rendering issues.

### Prevention Strategies

1. **Use the SafeSelectItem Component**

   Replace `SelectItem` with `SafeSelectItem` which prevents empty values:

   ```tsx
   import { SafeSelectItem } from "@/components/ui/safe-select-item";

   <Select>
     <SafeSelectItem value="option1">Option 1</SafeSelectItem>
     <SafeSelectItem value="option2">Option 2</SafeSelectItem>
   </Select>
   ```

2. **Validate Components Before Committing**

   Run the component validator to check for issues:

   ```bash
   node scripts/validate-components.js
   ```

3. **Use Pre-commit Validation**

   Set up the pre-commit validator to automatically check for issues:

   ```bash
   # Make the script executable
   chmod +x scripts/pre-commit-validator.js

   # Set up as a pre-commit hook
   ln -s ../../scripts/pre-commit-validator.js .git/hooks/pre-commit
   ```

4. **Follow Component Guidelines**

   Refer to `docs/component-guidelines.md` for best practices in component development.

## Code Review Checklist

Before submitting code for review, ensure:

- [ ] Schema changes are accompanied by migration scripts
- [ ] Migrations have been tested against a development database
- [ ] Schema validation passes (no missing tables or columns)
- [ ] Component validation passes (no empty SelectItem values)
- [ ] Pre-commit validator has been run

## Setting Up Automated Prevention

1. **Install Migration Scripts**

   ```bash
   # Create migrations directory if it doesn't exist
   mkdir -p migrations/scripts

   # Copy migration utilities
   cp migrations/create.js migrations/run.js migrations/status.js migrations/
   ```

2. **Set Up Component Validation**

   ```bash
   # Copy validation scripts
   cp scripts/validate-components.js scripts/pre-commit-validator.js scripts/
   
   # Make the pre-commit validator executable
   chmod +x scripts/pre-commit-validator.js
   
   # Set up as a pre-commit hook
   mkdir -p .git/hooks
   ln -s ../../scripts/pre-commit-validator.js .git/hooks/pre-commit
   ```

3. **Add the SafeSelectItem Component**

   ```bash
   # Copy the SafeSelectItem component
   cp client/src/components/ui/safe-select-item.tsx client/src/components/ui/
   
   # Copy the component validator utility
   cp client/src/utils/componentValidator.ts client/src/utils/
   ```

## Debugging Common Issues

If you encounter issues despite prevention measures:

1. **Schema-related errors**:
   - Run `node migrations/status.js` to check for pending migrations
   - Run `npx tsx scripts/validate-schema.ts` to identify missing tables/columns

2. **Component-related errors**:
   - Check console warnings for empty SelectItem values
   - Run `node scripts/validate-components.js` to find problematic components

3. **Form validation errors**:
   - Ensure all form fields have default values
   - Check zod validation schema for required fields