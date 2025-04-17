import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure all API responses have consistent format and content type
 */
export function apiResponseMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store original res.json method
  const originalJson = res.json;
  
  // Override res.json method to ensure content-type is set
  res.json = function(body: any): Response {
    // Always set content-type for API responses
    res.setHeader('Content-Type', 'application/json');
    
    // Call the original json method with the body
    return originalJson.call(this, body);
  };
  
  // Continue to the next middleware/route handler
  next();
}

/**
 * Error handling middleware for API responses
 */
export function apiErrorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', err);
  
  // Set appropriate status code (default to 500 if not set)
  const statusCode = err.statusCode || 500;
  
  // Ensure we send a JSON response
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
}

/**
 * Middleware to verify content type is application/json for POST/PUT/PATCH requests
 */
export function contentTypeMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only check content-type for POST, PUT, PATCH requests with body
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
      Object.keys(req.body || {}).length > 0) {
    
    const contentType = req.headers['content-type'];
    
    // Check if content-type header exists and includes application/json
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        message: 'Content-Type must be application/json'
      });
    }
  }
  
  next();
}

/**
 * Not Found handler middleware
 */
export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
}

/**
 * Setup all API middleware on an Express application
 */
export function setupApiMiddleware(app: any) {
  // Apply API middleware to all /api routes
  app.use('/api', apiResponseMiddleware);
  app.use('/api', contentTypeMiddleware);
  
  // Apply error middleware last (after routes are registered)
  app.use(apiErrorMiddleware);
  
  // Apply 404 handler after all routes
  app.use(notFoundMiddleware);
}