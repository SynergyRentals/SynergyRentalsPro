import express, { type Request, Response, NextFunction } from "express";
import fileUpload from "express-fileupload";
import { setupRoutes } from "./routes-new";
import { registerRoutes } from "./routes-safe"; 
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { setupAuth } from "./auth";
import adminDataRoutes, { setupAdminDataRoutes } from "./routes/admin-data-routes";
import { createServer } from "http";
import { setupApiMiddleware, apiResponseMiddleware } from "./lib/apiMiddleware";
import { setupGuestySyncRoutes } from './routes/guesty-sync-routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: './tmp/',
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = createServer(app);
  setupAuth(app);
  app.use('/api', apiResponseMiddleware);
  await registerRoutes(app);
  setupRoutes(app);
  setupAdminDataRoutes(app);
  setupGuestySyncRoutes(app);
  
  // Apply API error middleware to ensure consistent JSON responses
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("API error middleware caught:", err);
    
    // Always set JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({ 
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Global error handler caught:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Always set JSON content type to fix HTML response bug
    res.setHeader('Content-Type', 'application/json');
    
    // Return a properly formatted JSON error response
    res.status(status).json({ 
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    // Don't rethrow the error - this was causing HTML responses
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try different ports if the primary one is unavailable
  let port = Number(process.env.PORT) || 5000;
  const fallbackPorts = [3000, 8080, 8000];
  let serverStarted = false;
  
  const startServer = (portToUse: number) => {
    server.listen({
      port: portToUse,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      serverStarted = true;
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : portToUse;
      log(`serving on port ${actualPort}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && fallbackPorts.length > 0) {
        const nextPort = fallbackPorts.shift();
        log(`Port ${portToUse} is in use, trying port ${nextPort}`);
        startServer(nextPort!);
      } else {
        log(`Failed to start server: ${err.message}`);
      }
    });
  };
  
  startServer(port);
})();