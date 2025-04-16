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
  // sku: text("sku"), // Stock Keeping Unit - removed due to missing column in DB
  // upc: text("upc"), // Universal Product Code - removed due to missing column in DB
  // cost: integer("cost"), // in cents - removed due to missing column in DB
  // supplier: text("supplier"), // removed due to missing column in DB
  // location: text("location"), // specific location within unit or garage - removed due to missing column in DB
  // minOrderQuantity: integer("min_order_quantity"), // removed due to missing column in DB
  // isConsumable: boolean("is_consumable").default(true), // removed due to missing column in DB
  // imageUrl: text("image_url"), // removed due to missing column in DB
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

// Guesty Properties
export const guestyProperties = pgTable("guesty_properties", {
  id: serial("id").primaryKey(),
  propertyId: text("property_id").notNull().unique(), // from Guesty API
  name: text("name").notNull(),
  address: text("address").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: real("bathrooms"),
  amenities: text("amenities").array(),
  listingUrl: text("listing_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGuestyPropertySchema = createInsertSchema(guestyProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Guesty Reservations
export const guestyReservations = pgTable("guesty_reservations", {
  id: serial("id").primaryKey(),
  reservationId: text("reservation_id").notNull().unique(), // from Guesty API
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email"),
  propertyId: text("property_id").notNull(), // references Guesty's property_id
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  status: text("status").notNull(), // confirmed, canceled, etc.
  channel: text("channel"), // booking source: Airbnb, VRBO, etc.
  totalPrice: integer("total_price"), // store in cents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGuestyReservationSchema = createInsertSchema(guestyReservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Guesty Sync Logs
export const guestySyncLogs = pgTable("guesty_sync_logs", {
  id: serial("id").primaryKey(),
  syncType: text("sync_type").notNull(), // properties, reservations, webhook_property, webhook_reservation
  status: text("status").notNull(), // success, error
  propertiesCount: integer("properties_count"),
  reservationsCount: integer("reservations_count"),
  errorMessage: text("error_message"),
  notes: text("notes"), // Additional context such as webhook event type
  syncDate: timestamp("sync_date").defaultNow(),
});

export const insertGuestySyncLogSchema = createInsertSchema(guestySyncLogs).omit({
  id: true,
  syncDate: true,
});

// Guesty Webhook Events
export const guestyWebhookEvents = pgTable("guesty_webhook_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // property.created, property.updated, reservation.created, etc.
  entityId: text("entity_id").notNull(), // Guesty ID of the entity
  entityType: text("entity_type").notNull(), // property, reservation, etc.
  eventData: jsonb("event_data").notNull(), // Raw webhook payload
  signature: text("signature"), // X-Guesty-Signature-V2 value
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  ipAddress: text("ip_address"),
  processingErrors: text("processing_errors"),
});

export const insertGuestyWebhookEventSchema = createInsertSchema(guestyWebhookEvents).omit({
  id: true,
  processed: true,
  processedAt: true,
  createdAt: true,
});

// HostAI Tasks
export const hostAiTasks = pgTable("host_ai_tasks", {
  id: serial("id").primaryKey(),
  hostAiAction: text("host_ai_action"), // from task.action
  description: text("description").notNull(), // from task.description
  hostAiAssigneeFirstName: text("host_ai_assignee_first_name"), // from task.assignee.firstName
  hostAiAssigneeLastName: text("host_ai_assignee_last_name"), // from task.assignee.lastName  
  sourceType: text("source_type"), // from source.sourceType
  sourceLink: text("source_link"), // from source.link
  attachmentsJson: jsonb("attachments_json"), // store the attachments array as JSON
  guestName: text("guest_name"), // from guest.guestName
  guestEmail: text("guest_email"), // from guest.guestEmail
  guestPhone: text("guest_phone"), // from guest.guestPhone
  listingName: text("listing_name"), // from listing.listingName
  listingId: text("listing_id"), // from listing.listingId
  status: text("status").default("new").notNull(), // 'new', 'assigned', 'in_progress', 'completed'
  assignedToUserId: integer("assigned_to_user_id"), // foreign key to users
  hostAiCreatedAt: timestamp("host_ai_created_at"), // parsed from _creationDate
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHostAiTaskSchema = createInsertSchema(hostAiTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Host AI Autopilot Settings
export const hostAiAutopilotSettings = pgTable("host_ai_autopilot_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  enabled: boolean("enabled").notNull().default(false),
  confidenceThreshold: real("confidence_threshold").notNull().default(0.85), // Minimum confidence required to auto-process
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Host AI Autopilot Log for auditing
export const hostAiAutopilotLog = pgTable("host_ai_autopilot_log", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => hostAiTasks.id),
  decision: text("decision").notNull(), // auto-assigned, manual-review
  urgency: text("urgency"), // high, medium, low
  team: text("team"), // cleaning, maintenance, internal, vendor
  confidence: real("confidence").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  notes: text("notes"), // Reason for decision
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHostAiAutopilotSettingsSchema = createInsertSchema(hostAiAutopilotSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHostAiAutopilotLogSchema = createInsertSchema(hostAiAutopilotLog).omit({
  id: true,
  createdAt: true,
});

export type HostAiAutopilotSettings = typeof hostAiAutopilotSettings.$inferSelect;
export type InsertHostAiAutopilotSettings = z.infer<typeof insertHostAiAutopilotSettingsSchema>;

export type HostAiAutopilotLog = typeof hostAiAutopilotLog.$inferSelect;
export type InsertHostAiAutopilotLog = z.infer<typeof insertHostAiAutopilotLogSchema>;

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

export type GuestyProperty = typeof guestyProperties.$inferSelect;
export type InsertGuestyProperty = z.infer<typeof insertGuestyPropertySchema>;

export type GuestyReservation = typeof guestyReservations.$inferSelect;
export type InsertGuestyReservation = z.infer<typeof insertGuestyReservationSchema>;

export type GuestySyncLog = typeof guestySyncLogs.$inferSelect;
export type InsertGuestySyncLog = z.infer<typeof insertGuestySyncLogSchema>;

export type GuestyWebhookEvent = typeof guestyWebhookEvents.$inferSelect;
export type InsertGuestyWebhookEvent = z.infer<typeof insertGuestyWebhookEventSchema>;

// Company Insights module - AI powered analytics
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // revenue, sentiment, operational, unit_health, recommendation
  unitId: integer("unit_id"), // null for company-wide insights
  title: text("title").notNull(),
  description: text("description").notNull(),
  insightType: text("insight_type").notNull(), // info, warning, alert, suggestion
  severity: text("severity").notNull().default("info"), // info, low, medium, high, critical
  createdAt: timestamp("created_at").defaultNow(),
  actionable: boolean("actionable").default(true),
  data: jsonb("data"), // additional structured data for the insight
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

export const unitHealthScores = pgTable("unit_health_scores", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  score: integer("score").notNull(), // 0-100 rating
  revenueScore: integer("revenue_score"), // component scores (0-100)
  maintenanceScore: integer("maintenance_score"),
  guestSatisfactionScore: integer("guest_satisfaction_score"),
  inventoryScore: integer("inventory_score"),
  cleaningScore: integer("cleaning_score"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  notes: text("notes"),
  trendDirection: text("trend_direction"), // up, down, stable
  trendValue: integer("trend_value"), // change value
});

export const insertUnitHealthScoreSchema = createInsertSchema(unitHealthScores).omit({
  id: true,
  lastUpdated: true,
});

export const reviewSentiment = pgTable("review_sentiment", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  sentimentScore: real("sentiment_score").notNull(), // -1.0 to 1.0 scale
  trendingKeywords: text("trending_keywords").array(),
  reviewCount: integer("review_count").notNull().default(0),
  aiSummary: text("ai_summary"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  positiveAspects: text("positive_aspects").array(),
  negativeAspects: text("negative_aspects").array(),
  messageSentiment: real("message_sentiment"), // sentiment from guest messages
});

export const insertReviewSentimentSchema = createInsertSchema(reviewSentiment).omit({
  id: true,
  lastUpdated: true,
});

export const revenueSnapshots = pgTable("revenue_snapshots", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  revenue: integer("revenue").notNull(), // in cents
  occupancyRate: real("occupancy_rate"), // percentage (0-100)
  averageDailyRate: integer("average_daily_rate"), // in cents
  bookingCount: integer("booking_count").notNull().default(0),
  cancellationCount: integer("cancellation_count").default(0),
  forecastRevenue: integer("forecast_revenue"), // predicted revenue in cents
  period: text("period").notNull(), // daily, weekly, monthly, quarterly, yearly
  channelBreakdown: jsonb("channel_breakdown"), // revenue by booking source
});

export const insertRevenueSnapshotSchema = createInsertSchema(revenueSnapshots).omit({
  id: true,
});

export const efficiencyMetrics = pgTable("efficiency_metrics", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id"), // null for company-wide
  taskType: text("task_type").notNull(), // cleaning, maintenance, inventory, etc.
  onTimePercent: real("on_time_percent"),
  averageCompletionTime: integer("average_completion_time"), // in minutes
  tasksCompleted: integer("tasks_completed").default(0),
  tasksDelayed: integer("tasks_delayed").default(0),
  period: text("period").notNull(), // daily, weekly, monthly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  teamSize: integer("team_size"), 
  costPerTask: integer("cost_per_task"), // in cents
});

export const insertEfficiencyMetricSchema = createInsertSchema(efficiencyMetrics).omit({
  id: true,
});

export const insightLogs = pgTable("insight_logs", {
  id: serial("id").primaryKey(),
  analysisType: text("analysis_type").notNull(), // revenue, sentiment, operational, etc.
  unitId: integer("unit_id"), // null for company-wide
  timestamp: timestamp("timestamp").defaultNow(),
  inputData: jsonb("input_data"), // what was analyzed
  resultData: jsonb("result_data"), // what insights were generated
  actionabilityScore: real("actionability_score"), // how actionable the insights are (0-1)
  processingTime: integer("processing_time"), // in milliseconds
  promptTokens: integer("prompt_tokens"), // number of tokens in prompt
  completionTokens: integer("completion_tokens"), // number of tokens in completion
});

export const insertInsightLogSchema = createInsertSchema(insightLogs).omit({
  id: true,
  timestamp: true,
});

// Type exports for Company Insights module
export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;

export type UnitHealthScore = typeof unitHealthScores.$inferSelect;
export type InsertUnitHealthScore = z.infer<typeof insertUnitHealthScoreSchema>;

export type ReviewSentiment = typeof reviewSentiment.$inferSelect;
export type InsertReviewSentiment = z.infer<typeof insertReviewSentimentSchema>;

export type RevenueSnapshot = typeof revenueSnapshots.$inferSelect;
export type InsertRevenueSnapshot = z.infer<typeof insertRevenueSnapshotSchema>;

export type EfficiencyMetric = typeof efficiencyMetrics.$inferSelect;
export type InsertEfficiencyMetric = z.infer<typeof insertEfficiencyMetricSchema>;

export type InsightLog = typeof insightLogs.$inferSelect;
export type InsertInsightLog = z.infer<typeof insertInsightLogSchema>;

export type HostAiTask = typeof hostAiTasks.$inferSelect;
export type InsertHostAiTask = z.infer<typeof insertHostAiTaskSchema>;
