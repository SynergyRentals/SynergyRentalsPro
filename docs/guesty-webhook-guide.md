# Guesty Webhook Integration Guide

This guide explains how to set up and test the Guesty webhook integration in the Synergy Rentals application.

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

### Development Mode

In development mode, if the `GUESTY_WEBHOOK_SECRET` environment variable is not set, the system will use a development fallback secret for testing:

```
test-webhook-secret-for-signature-validation
```

This allows you to test the webhook functionality without needing the actual secret, but this is NOT secure for production use.

### Test Scripts

The repository includes several scripts for testing webhook functionality:

- `test-guesty-webhook-test.js` - Tests the webhook test endpoint with different modes
- `test-webhook-secret.js` - Tests retrieving the webhook secret from the Guesty API
- `test-webhook-direct.js` - Tests sending a webhook request directly to the main endpoint
- `test-guesty-webhook.js` - Test script that simulates a Guesty webhook with proper signature

## Security Considerations

1. **Never** hardcode webhook secrets in the application code
2. Always use HTTPS for webhook URLs in production
3. Implement rate limiting to prevent abuse
4. Log all webhook events for auditing purposes
5. Use signature verification to ensure webhooks are coming from Guesty

## Webhook Flow

1. Guesty sends a webhook to the `/api/webhooks/guesty` endpoint
2. The middleware verifies the signature in the `X-Guesty-Signature-V2` header
3. The webhook is logged and stored in the database
4. The webhook is processed asynchronously to avoid blocking the response
5. The application responds with a 202 Accepted status to Guesty
6. When processing completes, the webhook status is updated in the database

This approach ensures that webhook processing is reliable and does not impact the performance of the application.