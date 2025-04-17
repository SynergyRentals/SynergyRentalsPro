# Database Migrations

This directory contains all database migration scripts for the application.

## Migration Guidelines

1. **Always create a migration script** when changing the database schema in `shared/schema.ts`
2. **Name your migration scripts** using the format: `YYYYMMDD_HHMMSS_description.js` 
3. **Include up and down migrations** to allow for rollbacks
4. **Test migrations** in a development environment before applying to production
5. **Document your changes** in the migration script with clear comments

## Running Migrations

To run migrations, use the command:

```
node migrations/run.js
```

## Creating a New Migration

To create a new migration script, use:

```
node migrations/create.js "description of your change"
```

This will create a new timestamped migration script in the `migrations/scripts` directory.

## Migration Status

To check the status of migrations, use:

```
node migrations/status.js
```

This will show which migrations have been applied and which are pending.