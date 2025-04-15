/**
 * Middleware to verify Guesty webhook signatures
 */
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to verify Guesty webhook signatures
 * Verifies the X-Guesty-Signature-V2 header against the raw request body
 * Uses HMAC-SHA256 with the GUESTY_WEBHOOK_SECRET environment variable
 */
export function verifyGuestyWebhookMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the signature from the header
    const receivedSignature = req.headers['x-guesty-signature-v2'] as string;
    if (!receivedSignature) {
      console.error('[Webhook] Missing X-Guesty-Signature-V2 header');
      return res.status(400).send('Missing signature header');
    }

    // Get the webhook secret from environment variables
    const webhookSecret = process.env.GUESTY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Webhook] Missing GUESTY_WEBHOOK_SECRET environment variable');
      return res.status(500).send('Server configuration error');
    }

    // Ensure we have a raw body to verify
    if (!req.body || !Buffer.isBuffer(req.body)) {
      console.error('[Webhook] Request body is not a buffer');
      return res.status(400).send('Invalid request format');
    }

    // Calculate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');

    // Compare signatures using timing-safe equal to prevent timing attacks
    const signatureValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );

    // If signatures don't match, reject the request
    if (!signatureValid) {
      console.error('[Webhook] Invalid signature');
      return res.status(403).send('Invalid signature');
    }

    // If signature is valid, continue to the route handler
    next();
  } catch (error) {
    console.error('[Webhook] Error verifying webhook signature:', error);
    return res.status(500).send('Error processing webhook');
  }
}