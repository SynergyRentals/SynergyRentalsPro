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
  // Create a separate standalone Express app for direct CSV upload
  // This completely bypasses the middleware chain
  const directUploadApp = express();
  
  // Only add minimal required middleware
  directUploadApp.use(express.json());
  
  // Add CORS middleware to allow requests from the main app
  directUploadApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });
  
  directUploadApp.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: './tmp/',
  }));
  
  // Add direct CSV upload endpoint
  directUploadApp.post('/direct_csv_upload', async (req, res) => {
    // Always force JSON response
    res.setHeader('Content-Type', 'application/json');
    console.log("[Direct Upload] CSV upload request received");
    
    try {
      // Check if the request includes a file
      if (!req.files || !req.files.file) {
        console.log("[Direct Upload] No file found in request");
        return res.status(400).json({
          success: false,
          message: "No file was uploaded. Please ensure you're sending a file with field name 'file'."
        });
      }
      
      const uploadedFile = req.files.file as fileUpload.UploadedFile;
      console.log("[Direct Upload] File received:", uploadedFile.name, "Size:", uploadedFile.size, "MIME:", uploadedFile.mimetype);
      
      // Ensure it's a CSV file
      if (!uploadedFile.name.endsWith('.csv') && uploadedFile.mimetype !== 'text/csv') {
        return res.status(400).json({
          success: false,
          message: `Uploaded file must be a CSV file. Received: ${uploadedFile.mimetype}`
        });
      }
      
      // Process the CSV file
      console.log("[Direct Upload] Processing CSV file");
      
      // Import the CSV importer dynamically to avoid circular references
      const { importGuestyPropertiesFromCSV } = await import('./lib/csvImporter');
      const result = await importGuestyPropertiesFromCSV(uploadedFile.tempFilePath);
      
      // Send the JSON response
      console.log("[Direct Upload] CSV import complete, returning result");
      return res.json(result);
    } catch (error) {
      console.error("[Direct Upload] Error:", error);
      return res.status(500).json({
        success: false,
        message: `CSV import failed: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
  });
  
  // Start direct upload server on a different port
  directUploadApp.listen(5001, '0.0.0.0', () => {
    console.log("[Direct Upload] Direct upload server running on port 5001");
  });
  
  // Set up the main app
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