# Guesty On-Demand Sync Guide

This document provides information about the Guesty on-demand synchronization functionality in the Synergy Rentals platform.

## Overview

Due to Guesty's severe API rate limitations (approximately 5 requests/day), we've implemented a dual-approach strategy:

1. **On-Demand Full Synchronization** - For initial setup and occasional manual refreshes (covered in this guide)
2. **Real-time Webhooks** - For incremental updates as they happen in Guesty (covered in a separate guide)

## On-Demand Sync Implementation

The on-demand sync functionality allows administrators to manually trigger a full synchronization of all Guesty data. This is useful for:

- Initial population of the database when setting up the system
- Periodic verification to ensure data consistency
- Recovery after prolonged outages or webhook processing issues

The implementation includes:

- Pagination support to handle large datasets
- Rate limiting awareness to prevent API overuse
- Comprehensive logging of sync activities
- Ability to sync properties and reservations separately or together

## Available Endpoints

### Sync All Data

```
POST /api/guesty/sync
```

This endpoint triggers a full synchronization of both properties and reservations. It requires admin or ops role to access.

Response format:
```json
{
  "success": true,
  "message": "Successfully synced 42 properties and 156 reservations",
  "properties_synced": 42,
  "reservations_synced": 156,
  "sync_status": "success"
}
```

### Sync Properties Only

```
POST /api/guesty/sync-properties
```

This endpoint triggers a synchronization of only property data. It requires admin or ops role to access.

Response format:
```json
{
  "success": true,
  "message": "Successfully synced 42 properties",
  "properties_synced": 42
}
```

### Sync Reservations Only

```
POST /api/guesty/sync-reservations
```

This endpoint triggers a synchronization of only reservation data. It requires admin or ops role to access.

Response format:
```json
{
  "success": true,
  "message": "Successfully synced 156 reservations",
  "reservations_synced": 156
}
```

### Check Sync Status

```
GET /api/guesty/sync-status
```

This endpoint retrieves the status of the most recent synchronization. It requires any authenticated user role.

Response format:
```json
{
  "latest_sync": {
    "id": 123,
    "sync_type": "full",
    "status": "success",
    "started_at": "2025-04-16T10:30:00Z",
    "completed_at": "2025-04-16T10:35:00Z",
    "properties_count": 42,
    "reservations_count": 156,
    "notes": "Successfully synced 42 properties and 156 reservations"
  },
  "last_successful_sync": "2025-04-16T10:35:00Z"
}
```

## CSV Import Alternative

When Guesty API rate limits are particularly restrictive, we provide alternative CSV import endpoints:

### Import from Predefined CSV File

```
POST /api/guesty/import-csv
```

This endpoint imports property data from a predefined CSV file in the attached_assets directory. It requires admin or ops role.

### Import from Uploaded CSV File

```
POST /api/guesty/import-csv-upload
```

This endpoint allows uploading and importing a custom CSV file with property data. It requires admin or ops role and expects a multipart/form-data request with a file field named "file".

## Implementation Details

- The sync service is defined in `server/services/guestySyncService.ts`
- API routes are defined in `server/routes.ts`
- The Guesty API client is in `server/lib/guestyApiClient.ts`
- CSV import functionality is in `server/lib/csvImporter.ts`

## Recommendations for Usage

Given the severe rate limitations:

1. **Use Sparingly**: Only trigger full syncs when absolutely necessary
2. **Prefer Webhooks**: For day-to-day operations, rely on webhook updates
3. **Schedule During Off-Hours**: When possible, schedule syncs during off-peak times
4. **Monitor Rate Limits**: Check Guesty dashboard for current rate limit status
5. **CSV Alternative**: Consider using CSV imports when API access is completely limited

## Troubleshooting

### Rate Limit Errors

If you encounter rate limit errors (HTTP 429):

1. The sync will automatically abort with a message indicating the rate limit was reached
2. Wait at least 24 hours before attempting another sync
3. Consider using the CSV import alternative

### Authentication Errors

If you encounter authentication errors:

1. Verify that the Guesty API credentials are correctly set in the environment variables
2. Check if the OAuth token needs to be refreshed
3. Verify that your Guesty account has the necessary permissions

### Sync Taking Too Long

If a sync operation seems to be taking too long:

1. Check the application logs for progress updates
2. Verify that the sync has not hit a rate limit
3. For very large datasets, consider syncing properties and reservations separately