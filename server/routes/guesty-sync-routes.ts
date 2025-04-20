import express from "express";
import { syncAll, getLatestSyncLog } from "../guesty";

const router = express.Router();

export function setupGuestySyncRoutes(app: express.Application) {
  app.use("/api/admin/guesty", router);
}

// Trigger full sync
router.post("/full-sync", async (_req, res) => {
  try {
    const result = await syncAll();
    res.status(result.success ? 200 : 500).json(result);
  } catch (err: any) {
    console.error("Full‑sync error:", err);
    res.status(500).json({ success: false, message: err?.message ?? "Unknown" });
  }
});

// Status endpoint
router.get("/status", async (_req, res) => {
  try {
    const data = await getLatestSyncLog();
    res.json(data ?? { message: "No sync history yet." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch sync status" });
  }
});