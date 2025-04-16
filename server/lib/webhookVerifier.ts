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

    // Get the webhook secret from environment variables or use a development fallback
    let webhookSecret = process.env.GUESTY_WEBHOOK_SECRET;
    
    // For development only - allow a special bypass using a hard-coded test secret
    if (!webhookSecret && process.env.NODE_ENV === 'development') {
      const testSecret = 'test-webhook-secret-for-signature-validation';
      console.warn('[Webhook] WARNING: Using development mode test secret. This is NOT secure for production!');
      webhookSecret = testSecret;
    }
    
    if (!webhookSecret) {
      console.error('[Webhook] Missing GUESTY_WEBHOOK_SECRET environment variable');
      return res.status(500).send('Server configuration error');
    }

    // Ensure we have a raw body to verify
    console.log('[Webhook] Request body type:', typeof req.body);
    console.log('[Webhook] Is Buffer?', Buffer.isBuffer(req.body));
    console.log('[Webhook] Content-Type:', req.headers['content-type']);
    
    if (!req.body) {
      console.error('[Webhook] Request body is missing');
      return res.status(400).send('Missing request body');
    }
    
    // If body is not a buffer but is a string or object, convert it to a buffer
    let bodyBuffer: Buffer;
    if (!Buffer.isBuffer(req.body)) {
      if (typeof req.body === 'string') {
        bodyBuffer = Buffer.from(req.body);
      } else if (typeof req.body === 'object') {
        bodyBuffer = Buffer.from(JSON.stringify(req.body));
      } else {
        console.error('[Webhook] Request body is not in a processable format');
        return res.status(400).send('Invalid request format');
      }
      
      // Replace the request body with our buffer
      req.body = bodyBuffer;
    }

    // Calculate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');

    // Compare signatures - first do a simple comparison for development ease
    // Then use timing-safe equal in production to prevent timing attacks
    let signatureValid;
    
    if (process.env.NODE_ENV === 'development') {
      // In development, do a simple comparison for easier debugging
      signatureValid = receivedSignature === expectedSignature;
      console.log(`[Webhook] Development mode comparison:
        Received: ${receivedSignature}
        Expected: ${expectedSignature}
        Valid: ${signatureValid}`);
    } else {
      // In production, use timing-safe comparison to prevent timing attacks
      // Note: timingSafeEqual requires buffers of the same length
      try {
        signatureValid = crypto.timingSafeEqual(
          Buffer.from(receivedSignature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );
      } catch (error) {
        console.error('[Webhook] Error in timing-safe comparison, falling back to regular comparison:', error);
        signatureValid = receivedSignature === expectedSignature;
      }
    }

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