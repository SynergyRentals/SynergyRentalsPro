import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User and Auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("va"), // admin, ops, va, maintenance, cleaner
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  active: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Units
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  leaseUrl: text("lease_url"),
  wifiInfo: text("wifi_info"),
  notes: text("notes"),
  tags: text("tags").array(),
  active: boolean("active").notNull().default(true),
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  active: true,
});

// Guests
export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  unitId: integer("unit_id").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  flags: text("flags").array(),
  notes: text("notes"),
  sentiment: integer("sentiment"), // 1-5 star rating
  bookingSource: text("booking_source"),
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
});

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // cleaning, maintenance, inventory, etc.
  unitId: integer("unit_id").notNull(),
  assignedTo: integer("assigned_to"), // user_id
  dueDate: timestamp("due_date"),
  completed: boolean("completed").notNull().default(false),
  checklistUrl: text("checklist_url"),
  photos: text("photos").array(),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  completed: true,
  createdAt: true,
  completedAt: true,
});

// Maintenance
export const maintenance = pgTable("maintenance", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  unitId: integer("unit_id").notNull(),
  cost: integer("cost"), // in cents
  vendorId: integer("vendor_id"),
  status: text("status").notNull().default("open"), // open, in-progress, completed
  priority: text("priority").default("normal"), // low, normal, high, urgent
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const insertMaintenanceSchema = createInsertSchema(maintenance).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  status: true,
});

// Inventory
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  unitId: integer("unit_id"), // null for garage inventory
  parLevel: integer("par_level").notNull(),
  currentStock: integer("current_stock").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  category: text("category"), // linens, toiletries, kitchen, etc.
  reorderThreshold: integer("reorder_threshold"),
  notes: text("notes"),
  sku: text("sku"), // Stock Keeping Unit
  upc: text("upc"), // Universal Product Code
  cost: integer("cost"), // in cents
  supplier: text("supplier"),
  location: text("location"), // specific location within unit or garage
  minOrderQuantity: integer("min_order_quantity"),
  isConsumable: boolean("is_consumable").default(true),
  imageUrl: text("image_url"),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  lastUpdated: true,
});

// Inventory Transfers
export const inventoryTransfers = pgTable("inventory_transfers", {
  id: serial("id").primaryKey(),
  sourceUnitId: integer("source_unit_id"), // null for garage
  destinationUnitId: integer("destination_unit_id"), // null for garage
  inventoryId: integer("inventory_id").notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, cancelled
  requestedBy: integer("requested_by").notNull(), // user_id
  approvedBy: integer("approved_by"), // user_id
  requestedAt: timestamp("requested_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const insertInventoryTransferSchema = createInsertSchema(inventoryTransfers).omit({
  id: true,
  requestedAt: true,
  completedAt: true,
  status: true,
});

// Inventory Transactions
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull(),
  quantity: integer("quantity").notNull(), // positive for additions, negative for removals
  transactionType: text("transaction_type").notNull(), // purchase, consume, transfer, adjustment, etc.
  unitId: integer("unit_id"), // null for garage
  performedBy: integer("performed_by").notNull(), // user_id
  transactionDate: timestamp("transaction_date").defaultNow(),
  notes: text("notes"),
  referenceId: integer("reference_id"), // could link to a transfer, order, etc.
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  transactionDate: true,
});

// Vendors
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
  category: text("category"),
  rating: integer("rating"), // 1-5 star rating
  documents: text("documents").array(),
  notes: text("notes"),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  unitId: integer("unit_id"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: integer("budget"), // in cents
  status: text("status").default("planned"), // planned, in-progress, completed
  notes: text("notes"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

// Documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // SOP, lease, policy, etc.
  fileUrl: text("file_url").notNull(),
  uploadedBy: integer("uploaded_by").notNull(), // user_id
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  unitId: integer("unit_id"), // null for company-wide docs
  tags: text("tags").array(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

// System Logs
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  targetTable: text("target_table"),
  targetId: integer("target_id"),
  notes: text("notes"),
  ipAddress: text("ip_address"),
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true,
});

// AI Prompt Schema
export const aiPromptSchema = z.object({
  prompt: z.string().min(10, "Please provide a detailed description of at least 10 characters"),
});

// Type Exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type AiPromptFormValues = z.infer<typeof aiPromptSchema>;

export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;

export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Maintenance = typeof maintenance.$inferSelect;
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type InventoryTransfer = typeof inventoryTransfers.$inferSelect;
export type InsertInventoryTransfer = z.infer<typeof insertInventoryTransferSchema>;

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
