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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.setHeader('Content-Type', 'application/json');
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 0; // Use 0 to let the OS assign an available port
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    log(`serving on port ${actualPort}`);
  });
})();