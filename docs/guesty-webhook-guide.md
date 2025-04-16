# Guesty Webhook Integration Guide

This document provides information about the Guesty webhook integration in the Synergy Rentals platform.

## Overview

Due to Guesty's severe API rate limitations (approximately 5 requests/day), we've implemented a dual-approach strategy:

1. **On-Demand Full Synchronization** - For initial setup and occasional manual refreshes
2. **Real-time Webhooks** - For incremental updates as they happen in Guesty

## Webhook Implementation

Our webhook implementation follows Guesty's specifications:

- Accepts POST requests at `/api/webhooks/guesty`
- Verifies webhook signatures using HMAC-SHA256 via the `X-Guesty-Signature-V2` header
- Requires the `GUESTY_WEBHOOK_SECRET` environment variable to be set
- Returns 200 OK immediately after verification to prevent Guesty retries
- Processes webhooks asynchronously to prevent timeouts

## Setting Up Webhooks in Guesty

1. Log into your Guesty account
2. Navigate to Settings > Integrations > Webhooks
3. Click "Add Webhook"
4. Enter the webhook URL: `https://your-synergy-app.example.com/api/webhooks/guesty`
5. Select the events you want to subscribe to:
   - `listing.created`
   - `listing.updated`
   - `listing.deleted`
   - `reservation.created`
   - `reservation.updated`
   - `reservation.cancelled`
   - `reservation.deleted`
6. Save the webhook configuration
7. Copy the Signing Key (secret) provided by Guesty
8. Set this value as the `GUESTY_WEBHOOK_SECRET` environment variable in your application

If Guesty does not provide the webhook secret directly, you can retrieve it through the application:

1. Login to the Synergy Rentals application with an admin account
2. Navigate to: `/api/guesty-management/get-webhook-secret`
3. The response will contain a JSON object with the secret in the `data.secret.key` field
4. Copy this value and set it as the `GUESTY_WEBHOOK_SECRET` environment variable

## Testing Webhooks

For development and testing purposes, we provide several methods to test webhook functionality:

### 1. Using Sample Webhooks

Send a POST request to `/api/webhooks/guesty/test` with a JSON body containing a `sampleType` field:

```json
{
  "sampleType": "property.created"
}
```

Available sample types:
- `property.created`
- `property.updated`
- `property.deleted`
- `reservation.created`
- `reservation.updated`
- `reservation.cancelled`
- `reservation.deleted`

### 2. Using Guesty-like Payload

Send a POST request to `/api/webhooks/guesty/test` with a JSON body containing a complete Guesty-like webhook payload:

```json
{
  "event": "listing.created",
  "eventId": "test-event-123",
  "data": {
    "_id": "test-property-123",
    "title": "Test Property",
    "bedrooms": 3,
    "bathrooms": 2
  }
}
```

### 3. Using Direct Mode

Send a POST request to `/api/webhooks/guesty/test` with a JSON body containing the required fields:

```json
{
  "eventType": "created",
  "entityType": "property",
  "entityId": "test-property-123",
  "eventData": {
    "title": "Test Property",
    "bedrooms": 3,
    "bathrooms": 2
  }
}
```

## Viewing Webhook Events

Navigate to `/api/webhooks/guesty/events` (admin access required) to view all received webhook events.

## Reprocessing Webhook Events

If a webhook failed to process correctly, you can reprocess it by sending a POST request to `/api/webhooks/guesty/reprocess/:id` where `:id` is the webhook event ID.

## Troubleshooting

### Webhook Signature Verification Failures

If you're getting 403 Forbidden responses when testing with real Guesty webhooks:

1. Verify that the `GUESTY_WEBHOOK_SECRET` environment variable is set correctly
2. Ensure it matches the Signing Key provided by Guesty
3. Check that the webhook is being sent with the `X-Guesty-Signature-V2` header

### Processing Errors

If webhooks are being received but not processed correctly:

1. Check the application logs for error messages
2. View the webhook event in the database to see the processing error
3. Try reprocessing the webhook using the reprocess endpoint

## Implementation Details

- The webhook endpoint is defined in `server/routes.ts`
- Webhook verification logic is in `server/lib/webhookVerifier.ts`
- Webhook processing logic is in `server/lib/webhookProcessor.ts`
- Entity-specific handlers are in `server/lib/guestyWebhookHandler.ts`