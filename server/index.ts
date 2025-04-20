// server/routes/guesty-sync-routes.ts
import express, { Request, Response } from 'express';
import { syncAll } from '../services/guesty'; // Assuming this service exists
import { getSyncLogs } from '../services/syncLog'; // Assuming this service exists
import { handleError } from '../lib/errorHandling'; //Example error handling function

const router = express.Router();

router.post('/full-sync', async (req: Request, res: Response) => {
  try {
    const summary = await syncAll();
    res.json({ success: true, summary });
  } catch (error) {
    handleError(error, res);
  }
});

router.get('/status', async (req: Request, res: Response) => {
  try {
    const logs = await getSyncLogs();
    res.json({ success: true, logs });
  } catch (error) {
    handleError(error, res);
  }
});

export const setupGuestySyncRoutes = (app: express.Application) => {
  app.use('/api/admin/guesty', router);
};

```

```typescript
// server/index.ts
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
  setupGuestySyncRoutes(app); // Added Guesty sync routes setup

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

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
```

```typescript
// tests/guesty/fullSync.test.ts
import request from 'supertest';
import { app } from '../../server'; // Adjust path as needed
import { vi } from 'vitest';

vi.mock('../../server/services/guesty', () => ({
  syncAll: vi.fn(),
}));

test('POST /api/admin/guesty/full-sync returns 200', async () => {
  const { syncAll } = require('../../server/services/guesty'); //Import again after mocking
  syncAll.mockResolvedValue({ success: true, message: 'Sync complete' }); // Mock the success case

  const response = await request(app).post('/api/admin/guesty/full-sync');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ success: true, summary: { success: true, message: 'Sync complete' }});
  expect(syncAll).toHaveBeenCalledTimes(1);
});


test('POST /api/admin/guesty/full-sync handles errors', async () => {
  const { syncAll } = require('../../server/services/guesty');
  const mockError = new Error('Guesty sync failed');
  syncAll.mockRejectedValue(mockError);

  const response = await request(app).post('/api/admin/guesty/full-sync');
  expect(response.status).toBe(500);
  expect(response.body).toHaveProperty('message'); //Check for an error message in the response
  expect(syncAll).toHaveBeenCalledTimes(1);
});

```

```json
// package.json (add or update scripts section)
{
  "scripts": {
    "test": "vitest"
  }
}