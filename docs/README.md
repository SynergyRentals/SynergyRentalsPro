# Synergy Rentals API Documentation

This directory contains documentation for the Synergy Rentals internal operations platform.

## Guesty Integration

The Guesty integration is a critical component of our platform, providing synchronization of property and reservation data from Guesty to our internal database.

### Key Documentation

- [Guesty Webhook Guide](./guesty-webhook-guide.md): Details about the webhook integration for real-time updates
- [Guesty Sync Guide](./guesty-sync-guide.md): Information about on-demand synchronization functionality

### Guesty Integration Architecture

Our Guesty integration follows a dual-approach strategy:

1. **On-Demand Full Synchronization**
   - Used for initial data loading and occasional manual refreshes
   - Handles pagination and rate limiting
   - Provides comprehensive logging
   - Offers CSV import alternatives when API access is limited

2. **Real-time Webhooks**
   - Provides incremental updates as they happen in Guesty
   - Verifies webhook authenticity using HMAC-SHA256 signatures
   - Processes updates asynchronously to prevent timeouts
   - Logs all webhook events for audit and troubleshooting

### Required Environment Variables

- `GUESTY_CLIENT_ID`: OAuth client ID for the Guesty API
- `GUESTY_CLIENT_SECRET`: OAuth client secret for the Guesty API
- `GUESTY_WEBHOOK_SECRET`: Signing key for webhook verification

### Retrieving the Webhook Secret

The webhook secret can be obtained through the following methods:

1. **From Guesty Dashboard**: When setting up webhooks in Guesty, copy the provided Signing Key (secret)
2. **From Our API**: Access the temporary endpoint `/api/guesty-management/get-webhook-secret` (admin access required)

These methods are documented in more detail in the [Guesty Webhook Guide](./guesty-webhook-guide.md).

### Implementation Details

- `server/lib/guestyApiClient.ts`: Client for making API requests to Guesty
- `server/services/guestySyncService.ts`: Handles on-demand synchronization
- `server/lib/webhookVerifier.ts`: Verifies webhook signatures
- `server/lib/webhookProcessor.ts`: Processes webhook events
- `server/lib/guestyWebhookHandler.ts`: Entity-specific webhook handlers
- `server/lib/csvImporter.ts`: Handles CSV imports as an API alternative

## Additional Resources

For more information about the Guesty API, refer to the [Guesty API Documentation](https://docs.guesty.com/).