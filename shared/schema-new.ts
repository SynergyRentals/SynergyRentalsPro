import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uniqueIndex, real } from "drizzle-orm/pg-core";
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
  icalUrl: text("ical_url"),
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
  title: text("title").notNull(),
  description: text("description"),
  unitId: integer("unit_id"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  budgetEstimate: real("budget_estimate"),
  actualSpend: real("actual_spend").default(0),
  category: text("category"),
  status: text("status").default("planning").notNull(), // planning, in-progress, completed, on-hold, cancelled
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  actualSpend: true,
  createdAt: true,
  updatedAt: true,
});

// Project Milestones
export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(), 
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  dueDate: timestamp("due_date"),
  complete: boolean("complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
  complete: true,
});

// Project Tasks (distinct from the existing tasks table)
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: 'set null' }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: 'set null' }),
  taskType: text("task_type").notNull(), // Cleaning, Maintenance, Inventory, VA, Admin
  description: text("description").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  dueDate: timestamp("due_date"),
  status: text("status").default("open").notNull(), // open, in-progress, blocked, completed
  priority: text("priority").default("normal"), // low, normal, high, urgent
  notes: text("notes"),
  images: text("images").array(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Task Comments
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  timestamp: true,
});

// Project Files
export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  uploadedAt: true,
});

// AI Generated Plans
export const aiGeneratedPlans = pgTable("ai_generated_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  input: jsonb("input").notNull(),
  output: jsonb("output").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedInProject: boolean("used_in_project").default(false),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
});

export const insertAiGeneratedPlanSchema = createInsertSchema(aiGeneratedPlans).omit({
  id: true,
  createdAt: true,
  usedInProject: true,
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

// Cleaning
export const cleaningTasks = pgTable("cleaning_tasks", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, in-progress, completed, verified
  scheduledFor: timestamp("scheduled_for").notNull(),
  assignedTo: integer("assigned_to"), // user_id of cleaner
  assignedBy: integer("assigned_by"), // user_id of manager
  completedAt: timestamp("completed_at"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by"), // user_id of verifier
  cleaningType: text("cleaning_type").notNull().default("turnover"), // turnover, deep-clean, maintenance
  estimatedDuration: integer("estimated_duration"), // in minutes
  actualDuration: integer("actual_duration"), // in minutes
  notes: text("notes"),
  photos: text("photos").array(),
  checklistTemplateId: integer("checklist_template_id"), // reference to the template if used
  score: integer("score"), // cleanliness score (1-100)
  isInspection: boolean("is_inspection").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCleaningTaskSchema = createInsertSchema(cleaningTasks)
  .omit({
    id: true,
    status: true,
    completedAt: true,
    verifiedAt: true,
    actualDuration: true,
    createdAt: true,
  })
  .extend({
    // Allow string date format which will be parsed to Date object
    scheduledFor: z.union([z.string().datetime(), z.date()]),
  });

// Cleaning Checklists (templates)
export const cleaningChecklists = pgTable("cleaning_checklists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  propertyType: text("property_type"), // apartment, house, condo etc., or null for all
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(), // user_id
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCleaningChecklistSchema = createInsertSchema(cleaningChecklists).omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

// Cleaning Checklist Items
export const cleaningChecklistItems = pgTable("cleaning_checklist_items", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull(), // reference to checklist template
  description: text("description").notNull(),
  room: text("room").notNull(), // bathroom, kitchen, bedroom, etc.
  order: integer("order").notNull(),
  requiresPhoto: boolean("requires_photo").default(false),
  isRequired: boolean("is_required").default(true),
  notes: text("notes"),
});

export const insertCleaningChecklistItemSchema = createInsertSchema(cleaningChecklistItems).omit({
  id: true,
});

// Cleaning Checklist Completion (instances of checklist items for specific cleaning tasks)
export const cleaningChecklistCompletions = pgTable("cleaning_checklist_completions", {
  id: serial("id").primaryKey(),
  cleaningTaskId: integer("cleaning_task_id").notNull(),
  checklistItemId: integer("checklist_item_id").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by"), // user_id
  photoUrl: text("photo_url"),
  notes: text("notes"),
});

export const insertCleaningChecklistCompletionSchema = createInsertSchema(cleaningChecklistCompletions).omit({
  id: true,
  completed: true,
  completedAt: true,
});

// NEW SIMPLIFIED PROPERTY SCHEMA
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  bedrooms: integer("bedrooms").default(1),
  bathrooms: integer("bathrooms").default(1),
  description: text("description"),
  notes: text("notes"),
  amenities: text("amenities").array(),
  icalUrl: text("ical_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  active: true,
  createdAt: true,
  updatedAt: true,
});

// Host AI tasks
export const hostAiTasks = pgTable("host_ai_tasks", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  status: text("status").notNull().default("new"), // new, assigned, in-progress, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  hostAiAction: text("host_ai_action"),
  hostAiStatus: text("host_ai_status"),
  hostAiNotes: text("host_ai_notes"),
  hostAiConfidence: real("host_ai_confidence"),
  hostAiDecision: text("host_ai_decision"),
  hostAiScheduledFor: timestamp("host_ai_scheduled_for"),
  hostAiUrgency: text("host_ai_urgency"),
  hostAiTeam: text("host_ai_team"),
  hostAiCreatedAt: timestamp("host_ai_created_at"),
});

export const insertHostAiTaskSchema = createInsertSchema(hostAiTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// HostAI Settings
export const hostAiSettings = pgTable("host_ai_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(false),
  confidenceThreshold: real("confidence_threshold").default(0.7),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by"),
});

// HostAI Logs
export const hostAiLogs = pgTable("host_ai_logs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"),
  taskId: integer("task_id"),
  scheduledFor: timestamp("scheduled_for"),
  decision: text("decision").notNull(),
  urgency: text("urgency"),
  team: text("team"),
  confidence: real("confidence").notNull(),
});

// Export type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

export type AiGeneratedPlan = typeof aiGeneratedPlans.$inferSelect;
export type InsertAiGeneratedPlan = z.infer<typeof insertAiGeneratedPlanSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

export type CleaningTask = typeof cleaningTasks.$inferSelect;
export type InsertCleaningTask = z.infer<typeof insertCleaningTaskSchema>;

export type CleaningChecklist = typeof cleaningChecklists.$inferSelect;
export type InsertCleaningChecklist = z.infer<typeof insertCleaningChecklistSchema>;

export type CleaningChecklistItem = typeof cleaningChecklistItems.$inferSelect;
export type InsertCleaningChecklistItem = z.infer<typeof insertCleaningChecklistItemSchema>;

export type CleaningChecklistCompletion = typeof cleaningChecklistCompletions.$inferSelect;
export type InsertCleaningChecklistCompletion = z.infer<typeof insertCleaningChecklistCompletionSchema>;

// Property types
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

// HostAI types
export type HostAiTask = typeof hostAiTasks.$inferSelect;
export type InsertHostAiTask = z.infer<typeof insertHostAiTaskSchema>;
export type HostAiSettings = typeof hostAiSettings.$inferSelect;
export type HostAiLog = typeof hostAiLogs.$inferSelect;