import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertTaskSchema, insertUnitSchema, insertGuestSchema, 
  insertMaintenanceSchema, insertInventorySchema, insertVendorSchema,
  insertProjectSchema, insertDocumentSchema, insertLogSchema
} from "@shared/schema";
import { sendSlackMessage } from "./slack";
import { z } from "zod";
import { askAI, generateAiInsights, trainAI, generateMaintenanceTicket } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication - provides /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Middleware to check if user is authenticated
  const checkAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Middleware to check if user has specific role
  const checkRole = (roles: string[]) => (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  // Log API access
  app.use("/api/*", async (req, res, next) => {
    if (req.isAuthenticated()) {
      await storage.createLog({
        userId: req.user.id,
        action: `${req.method} ${req.path}`,
        targetTable: req.path.split("/")[2], // e.g. /api/tasks -> tasks
        notes: JSON.stringify(req.body).substring(0, 100),
        ipAddress: req.ip,
      });
    }
    next();
  });

  // Units
  app.get("/api/units", checkAuth, async (req, res) => {
    const units = await storage.getAllUnits();
    res.json(units);
  });

  app.get("/api/units/:id", checkAuth, async (req, res) => {
    const unit = await storage.getUnit(parseInt(req.params.id));
    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }
    res.json(unit);
  });

  app.post("/api/units", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      const validatedData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/units/:id", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      const unit = await storage.updateUnit(parseInt(req.params.id), req.body);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Guests
  app.get("/api/guests", checkAuth, async (req, res) => {
    const guests = await storage.getAllGuests();
    res.json(guests);
  });

  app.get("/api/guests/:id", checkAuth, async (req, res) => {
    const guest = await storage.getGuest(parseInt(req.params.id));
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }
    res.json(guest);
  });

  app.post("/api/guests", checkAuth, async (req, res) => {
    try {
      const validatedData = insertGuestSchema.parse(req.body);
      const guest = await storage.createGuest(validatedData);
      res.status(201).json(guest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/guests/:id", checkAuth, async (req, res) => {
    try {
      const guest = await storage.updateGuest(parseInt(req.params.id), req.body);
      if (!guest) {
        return res.status(404).json({ message: "Guest not found" });
      }
      res.json(guest);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tasks
  app.get("/api/tasks", checkAuth, async (req, res) => {
    const tasks = await storage.getAllTasks();
    res.json(tasks);
  });

  app.get("/api/tasks/:id", checkAuth, async (req, res) => {
    const task = await storage.getTask(parseInt(req.params.id));
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  });

  app.post("/api/tasks", checkAuth, async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      
      // Send Slack notification for high priority tasks
      if (task.priority === "high" || task.priority === "urgent") {
        const unit = await storage.getUnit(task.unitId);
        const unitName = unit ? unit.name : `Unit #${task.unitId}`;
        const assignee = task.assignedTo ? await storage.getUser(task.assignedTo) : null;
        const assigneeName = assignee ? assignee.name : "Unassigned";
        
        try {
          await sendSlackMessage({
            channel: process.env.SLACK_CHANNEL_ID || "#operations",
            text: `🚨 New ${task.priority} priority ${task.type} task created for ${unitName}! Assigned to: ${assigneeName}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*New ${task.priority.toUpperCase()} Priority Task*`
                }
              },
              {
                type: "section",
                fields: [
                  {
                    type: "mrkdwn",
                    text: `*Type:*\n${task.type}`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Location:*\n${unitName}`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Assigned To:*\n${assigneeName}`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Due Date:*\n${task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Not set'}`
                  }
                ]
              }
            ]
          });
        } catch (error) {
          console.error("Failed to send Slack notification:", error);
        }
      }
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/tasks/:id", checkAuth, async (req, res) => {
    try {
      const task = await storage.getTask(parseInt(req.params.id));
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const updatedTask = await storage.updateTask(parseInt(req.params.id), req.body);
      
      // Send Slack notification if task was completed or missed
      if (req.body.completed === true && !task.completed) {
        const unit = await storage.getUnit(task.unitId);
        const unitName = unit ? unit.name : `Unit #${task.unitId}`;
        
        try {
          await sendSlackMessage({
            channel: process.env.SLACK_CHANNEL_ID || "#operations",
            text: `✅ ${task.type} task completed for ${unitName}`,
          });
        } catch (error) {
          console.error("Failed to send Slack notification:", error);
        }
      }
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Maintenance
  app.get("/api/maintenance", checkAuth, async (req, res) => {
    const maintenanceItems = await storage.getAllMaintenance();
    res.json(maintenanceItems);
  });

  app.get("/api/maintenance/:id", checkAuth, async (req, res) => {
    const maintenance = await storage.getMaintenance(parseInt(req.params.id));
    if (!maintenance) {
      return res.status(404).json({ message: "Maintenance item not found" });
    }
    res.json(maintenance);
  });

  app.post("/api/maintenance", checkAuth, async (req, res) => {
    try {
      const validatedData = insertMaintenanceSchema.parse(req.body);
      const maintenance = await storage.createMaintenance(validatedData);
      
      // Send Slack notification for urgent maintenance
      if (maintenance.priority === "urgent") {
        const unit = await storage.getUnit(maintenance.unitId);
        const unitName = unit ? unit.name : `Unit #${maintenance.unitId}`;
        
        try {
          await sendSlackMessage({
            channel: process.env.SLACK_CHANNEL_ID || "#operations",
            text: `🔴 URGENT MAINTENANCE REQUIRED at ${unitName}: ${maintenance.description}`,
          });
        } catch (error) {
          console.error("Failed to send Slack notification:", error);
        }
      }
      
      res.status(201).json(maintenance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/maintenance/:id", checkAuth, async (req, res) => {
    try {
      const maintenance = await storage.updateMaintenance(parseInt(req.params.id), req.body);
      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance item not found" });
      }
      res.json(maintenance);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI-generated maintenance ticket
  app.post("/api/maintenance/generate", checkAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      const generatedTicket = await generateMaintenanceTicket(prompt);
      res.json(generatedTicket);
    } catch (error) {
      console.error("Error generating maintenance ticket:", error);
      res.status(500).json({ message: "Error generating maintenance ticket" });
    }
  });

  // Inventory
  app.get("/api/inventory", checkAuth, async (req, res) => {
    const inventory = await storage.getAllInventory();
    res.json(inventory);
  });

  app.get("/api/inventory/:id", checkAuth, async (req, res) => {
    const item = await storage.getInventory(parseInt(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json(item);
  });
  
  // Handle QR code supply requests
  app.post("/api/inventory/request-supplies", checkAuth, async (req, res) => {
    try {
      const { unitId, items, urgency, notes } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Items are required" });
      }
      
      // Create log entry for the request
      const logEntry = await storage.createLog({
        action: "SUPPLY_REQUEST",
        userId: req.user?.id,
        targetTable: "inventory",
        notes: `Supply request for unit #${unitId}: ${items.map(i => `${i.name} x ${i.quantity}`).join(", ")}. Urgency: ${urgency}. Notes: ${notes}`,
        ipAddress: req.ip
      });
      
      // If Slack is configured, send notification
      if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
        try {
          const unit = unitId ? await storage.getUnit(unitId) : null;
          const unitName = unit ? unit.name : "Unknown";
          const user = req.user ? await storage.getUser(req.user.id) : null;
          const userName = user ? user.name : "Unknown";
          
          await sendSlackMessage({
            channel: process.env.SLACK_CHANNEL_ID,
            text: `🧹 Supply Request for ${unitName}`,
            blocks: [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: `🧹 Supply Request for ${unitName}`,
                  emoji: true
                }
              },
              {
                type: "section",
                fields: [
                  {
                    type: "mrkdwn",
                    text: `*Requested by:*\n${userName}`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Urgency:*\n${urgency === "urgent" ? "🔴 URGENT" : "🟢 Normal"}`
                  }
                ]
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Items Requested:*\n${items.map(i => `• ${i.name} (x${i.quantity})`).join("\n")}`
                }
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Notes:*\n${notes || "No additional notes"}`
                }
              }
            ]
          });
        } catch (slackError) {
          console.error("Failed to send Slack notification:", slackError);
          // We continue even if Slack notification fails
        }
      }
      
      res.status(201).json({ 
        success: true, 
        message: "Supply request submitted successfully", 
        logId: logEntry.id 
      });
    } catch (error) {
      console.error("Error processing supply request:", error);
      res.status(500).json({ message: "Error processing supply request" });
    }
  });

  app.post("/api/inventory", checkAuth, async (req, res) => {
    try {
      const validatedData = insertInventorySchema.parse(req.body);
      const item = await storage.createInventory(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/inventory/:id", checkAuth, async (req, res) => {
    try {
      const inventory = await storage.updateInventory(parseInt(req.params.id), req.body);
      if (!inventory) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      // Send Slack notification for critically low inventory
      if (inventory.currentStock < inventory.reorderThreshold) {
        const unit = inventory.unitId ? await storage.getUnit(inventory.unitId) : null;
        const location = unit ? unit.name : "Garage Inventory";
        
        try {
          await sendSlackMessage({
            channel: process.env.SLACK_CHANNEL_ID || "#operations",
            text: `⚠️ Low inventory alert: ${inventory.itemName} at ${location} is below reorder threshold (${inventory.currentStock}/${inventory.reorderThreshold})`,
          });
        } catch (error) {
          console.error("Failed to send Slack notification:", error);
        }
      }
      
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Vendors
  app.get("/api/vendors", checkAuth, async (req, res) => {
    const vendors = await storage.getAllVendors();
    res.json(vendors);
  });

  app.get("/api/vendors/:id", checkAuth, async (req, res) => {
    const vendor = await storage.getVendor(parseInt(req.params.id));
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json(vendor);
  });

  app.post("/api/vendors", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      const validatedData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validatedData);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/vendors/:id", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      const vendor = await storage.updateVendor(parseInt(req.params.id), req.body);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Projects
  app.get("/api/projects", checkAuth, async (req, res) => {
    const projects = await storage.getAllProjects();
    res.json(projects);
  });

  app.get("/api/projects/:id", checkAuth, async (req, res) => {
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  });

  app.post("/api/projects", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/projects/:id", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      const project = await storage.updateProject(parseInt(req.params.id), req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Documents
  app.get("/api/documents", checkAuth, async (req, res) => {
    const documents = await storage.getAllDocuments();
    res.json(documents);
  });

  app.get("/api/documents/:id", checkAuth, async (req, res) => {
    const document = await storage.getDocument(parseInt(req.params.id));
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(document);
  });

  app.post("/api/documents", checkAuth, async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        uploadedBy: req.user.id,
      });
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/documents/:id", checkAuth, async (req, res) => {
    try {
      const document = await storage.updateDocument(parseInt(req.params.id), req.body);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System Logs (Admin only)
  app.get("/api/logs", checkRole(["admin"]), async (req, res) => {
    const logs = await storage.getAllLogs();
    res.json(logs);
  });

  // Users
  app.get("/api/users", checkRole(["admin", "ops"]), async (req, res) => {
    const users = await storage.getAllUsers();
    // Remove password field for security
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    res.json(sanitizedUsers);
  });

  // Slack Routes
  app.post("/api/slack/send", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      // Check if Slack token is available
      if (!process.env.SLACK_BOT_TOKEN) {
        return res.status(503).json({ 
          message: "Slack service unavailable", 
          details: "Slack Bot Token is not configured. Please contact your administrator." 
        });
      }
      
      const { channel, message, blocks } = req.body;
      
      if (!message && !blocks) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      const slackMessage: any = {
        text: message
      };
      
      if (channel) {
        slackMessage.channel = channel;
      }
      
      if (blocks) {
        slackMessage.blocks = blocks;
      }
      
      const timestamp = await sendSlackMessage(slackMessage);
      
      await storage.createLog({
        userId: req.user.id,
        action: "SEND_SLACK_MESSAGE",
        targetTable: null,
        targetId: null,
        details: JSON.stringify({ channel, message: message?.substring(0, 100) }),
        ipAddress: req.ip
      });
      
      res.json({ success: true, timestamp });
    } catch (error) {
      console.error("Slack send error:", error);
      res.status(500).json({ message: "Failed to send Slack message" });
    }
  });
  
  app.post("/api/slack/maintenance-notification", checkAuth, async (req, res) => {
    try {
      // Check if Slack token is available
      if (!process.env.SLACK_BOT_TOKEN) {
        return res.status(503).json({ 
          message: "Slack service unavailable", 
          details: "Slack Bot Token is not configured. Please contact your administrator." 
        });
      }
      
      const { maintenanceId } = req.body;
      
      if (!maintenanceId) {
        return res.status(400).json({ message: "Maintenance ID is required" });
      }
      
      const maintenance = await storage.getMaintenance(parseInt(maintenanceId));
      
      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance request not found" });
      }
      
      // Get user who reported
      const reporter = await storage.getUser(maintenance.reportedBy);
      const reporterName = reporter ? reporter.name : "Unknown";
      
      const timestamp = await sendMaintenanceNotification({
        ...maintenance,
        reportedBy: reporterName
      });
      
      await storage.createLog({
        userId: req.user.id,
        action: "SEND_MAINTENANCE_NOTIFICATION",
        targetTable: "maintenance",
        targetId: maintenance.id,
        details: JSON.stringify({ maintenanceId, title: maintenance.title }),
        ipAddress: req.ip
      });
      
      res.json({ success: true, timestamp });
    } catch (error) {
      console.error("Maintenance notification error:", error);
      res.status(500).json({ message: "Failed to send maintenance notification" });
    }
  });
  
  app.post("/api/slack/inventory-alert", checkAuth, async (req, res) => {
    try {
      // Check if Slack token is available
      if (!process.env.SLACK_BOT_TOKEN) {
        return res.status(503).json({ 
          message: "Slack service unavailable", 
          details: "Slack Bot Token is not configured. Please contact your administrator." 
        });
      }
      
      const { inventoryId } = req.body;
      
      if (!inventoryId) {
        return res.status(400).json({ message: "Inventory ID is required" });
      }
      
      const inventory = await storage.getInventory(parseInt(inventoryId));
      
      if (!inventory) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      const timestamp = await sendInventoryAlert(inventory);
      
      await storage.createLog({
        userId: req.user.id,
        action: "SEND_INVENTORY_ALERT",
        targetTable: "inventory",
        targetId: inventory.id,
        details: JSON.stringify({ 
          inventoryId, 
          name: inventory.name,
          quantity: inventory.currentQuantity
        }),
        ipAddress: req.ip
      });
      
      res.json({ success: true, timestamp });
    } catch (error) {
      console.error("Inventory alert error:", error);
      res.status(500).json({ message: "Failed to send inventory alert" });
    }
  });
  
  app.post("/api/slack/guest-checkin", checkAuth, async (req, res) => {
    try {
      // Check if Slack token is available
      if (!process.env.SLACK_BOT_TOKEN) {
        return res.status(503).json({ 
          message: "Slack service unavailable", 
          details: "Slack Bot Token is not configured. Please contact your administrator." 
        });
      }
      
      const { guestId } = req.body;
      
      if (!guestId) {
        return res.status(400).json({ message: "Guest ID is required" });
      }
      
      const guest = await storage.getGuest(parseInt(guestId));
      
      if (!guest) {
        return res.status(404).json({ message: "Guest not found" });
      }
      
      const timestamp = await sendGuestCheckInNotification(guest);
      
      await storage.createLog({
        userId: req.user.id,
        action: "SEND_GUEST_CHECKIN_NOTIFICATION",
        targetTable: "guests",
        targetId: guest.id,
        details: JSON.stringify({ 
          guestId, 
          name: guest.name,
          unitId: guest.unitId
        }),
        ipAddress: req.ip
      });
      
      res.json({ success: true, timestamp });
    } catch (error) {
      console.error("Guest check-in notification error:", error);
      res.status(500).json({ message: "Failed to send guest check-in notification" });
    }
  });
  
  app.get("/api/slack/history", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      // Check if Slack token is available
      if (!process.env.SLACK_BOT_TOKEN) {
        return res.status(503).json({ 
          message: "Slack service unavailable", 
          details: "Slack Bot Token is not configured. Please contact your administrator." 
        });
      }
      
      if (!process.env.SLACK_CHANNEL_ID) {
        return res.status(503).json({ 
          message: "Slack service misconfigured", 
          details: "Slack Channel ID is not configured. Please contact your administrator." 
        });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const channel = req.query.channel || process.env.SLACK_CHANNEL_ID;
      
      const history = await readSlackHistory(channel as string, limit);
      
      await storage.createLog({
        userId: req.user.id,
        action: "READ_SLACK_HISTORY",
        targetTable: null,
        targetId: null,
        details: JSON.stringify({ channel, limit }),
        ipAddress: req.ip
      });
      
      res.json({ messages: history.messages || [] });
    } catch (error) {
      console.error("Error reading Slack history:", error);
      res.status(500).json({ message: "Failed to read Slack message history" });
    }
  });

  // AI Routes
  app.post("/api/ai/ask", checkAuth, async (req, res) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "AI service unavailable", 
          details: "OpenAI API key is not configured. Please contact your administrator." 
        });
      }
      
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }
      
      const answer = await askAI(question);
      res.json({ answer });
    } catch (error) {
      console.error("AI error:", error);
      res.status(500).json({ message: "AI service error" });
    }
  });

  app.post("/api/ai/insights", checkAuth, async (req, res) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "AI service unavailable", 
          details: "OpenAI API key is not configured. Please contact your administrator." 
        });
      }
      
      const { dataType } = req.body;
      if (!dataType) {
        return res.status(400).json({ message: "Data type is required" });
      }
      
      const insights = await generateAiInsights(dataType);
      res.json({ insights });
    } catch (error) {
      console.error("AI insights error:", error);
      res.status(500).json({ message: "AI service error" });
    }
  });

  app.post("/api/ai/train", checkRole(["admin", "ops"]), async (req, res) => {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "AI service unavailable", 
          details: "OpenAI API key is not configured. Please contact your administrator." 
        });
      }
      
      const { documentId } = req.body;
      if (!documentId) {
        return res.status(400).json({ message: "Document ID is required" });
      }
      
      const document = await storage.getDocument(parseInt(documentId));
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const result = await trainAI(document);
      res.json(result);
    } catch (error) {
      console.error("AI training error:", error);
      res.status(500).json({ message: "AI training service error" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
