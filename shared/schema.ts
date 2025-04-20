import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  json,
  real,
  primaryKey,
  varchar,
  numeric,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email'),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

// User schema for insert
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Units table
export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  active: boolean('active').default(true),
  leaseUrl: text('lease_url'),
  wifiInfo: text('wifi_info'),
  notes: text('notes'),
  tags: json('tags').$type<string[]>(),
  icalUrl: text('ical_url'),
});

// Unit schema for insert
export const insertUnitSchema = createInsertSchema(units).omit({ id: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;

// Guests table
export const guests = pgTable('guests', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  unitId: integer('unit_id').notNull().references(() => units.id),
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  flags: json('flags').$type<string[]>(),
  sentiment: real('sentiment'),
  bookingSource: text('booking_source'),
});

// Guest schema for insert
export const insertGuestSchema = createInsertSchema(guests).omit({ id: true });
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guests.$inferSelect;

// Tasks table
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  type: text('type').notNull(), // cleaning, maintenance, etc.
  notes: text('notes'),
  unitId: integer('unit_id').notNull().references(() => units.id),
  assignedTo: integer('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date'),
  completed: boolean('completed').default(false),
  checklistUrl: text('checklist_url'),
  photos: json('photos').$type<string[]>(),
  priority: text('priority'),
  completedAt: timestamp('completed_at'),
});

// Task schema for insert
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Maintenance issues table
export const maintenanceIssues = pgTable('maintenance_issues', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  status: text('status').notNull(),
  notes: text('notes'),
  unitId: integer('unit_id').notNull().references(() => units.id),
  priority: text('priority'),
  completedAt: timestamp('completed_at'),
  description: text('description').notNull(),
  cost: real('cost'),
  vendorId: integer('vendor_id'),
});

// Maintenance issue schema for insert
export const insertMaintenanceIssueSchema = createInsertSchema(maintenanceIssues).omit({ id: true });
export type InsertMaintenanceIssue = z.infer<typeof insertMaintenanceIssueSchema>;
export type MaintenanceIssue = typeof maintenanceIssues.$inferSelect;

// Inventory items table
export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  notes: text('notes'),
  unitId: integer('unit_id').references(() => units.id),
  itemName: text('item_name').notNull(),
  parLevel: integer('par_level').notNull(),
  currentStock: integer('current_stock').notNull(),
  lastUpdated: timestamp('last_updated'),
  category: text('category'),
  reorderThreshold: integer('reorder_threshold'),
});

// Inventory item schema for insert
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// Vendors table
export const vendors = pgTable('vendors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  notes: text('notes'),
  category: text('category'),
  contact: text('contact'),
  rating: real('rating'),
  documents: json('documents').$type<string[]>(),
});

// Vendor schema for insert
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull(),
  deadline: timestamp('deadline'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  lastUpdated: timestamp('last_updated'),
});

// Project schema for insert
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedTasks: many(tasks),
  createdProjects: many(projects),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  guests: many(guests),
  tasks: many(tasks),
  maintenanceIssues: many(maintenanceIssues),
  inventoryItems: many(inventoryItems),
}));

export const guestsRelations = relations(guests, ({ one }) => ({
  unit: one(units, {
    fields: [guests.unitId],
    references: [units.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  unit: one(units, {
    fields: [tasks.unitId],
    references: [units.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
}));

export const maintenanceIssuesRelations = relations(maintenanceIssues, ({ one }) => ({
  unit: one(units, {
    fields: [maintenanceIssues.unitId],
    references: [units.id],
  }),
  vendor: one(vendors, {
    fields: [maintenanceIssues.vendorId],
    references: [vendors.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  unit: one(units, {
    fields: [inventoryItems.unitId],
    references: [units.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
}));

// Guesty Properties table
export const guestyProperties = pgTable('guesty_properties', {
  id: serial('id').primaryKey(),
  guestyId: varchar('guesty_id', { length: 255 }).notNull(),
  unitId: integer('unit_id').references(() => units.id),
  nickname: varchar('nickname', { length: 255 }),
  name: text('name'),
  address: text('address'),
  city: varchar('city', { length: 255 }),
  state: varchar('state', { length: 255 }),
  zipCode: varchar('zipcode', { length: 50 }), // Note the column is actually 'zipcode' without underscore
  bedrooms: integer('bedrooms'),
  bathrooms: real('bathrooms'),
  beds: integer('beds'),
  accommodates: integer('accommodates'),
  propertyType: varchar('property_type', { length: 255 }),
  roomType: varchar('room_type', { length: 255 }),
  country: varchar('country', { length: 255 }),
  picture: text('picture'),
  listingUrl: text('listing_url'),
  icalUrl: text('ical_url'),
  propertyId: text('property_id'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  amenities: text('amenities').array(), // This is an ARRAY type in the database
  images: json('images'),
  propertyData: json('property_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// Guesty Reservations table
export const guestyReservations = pgTable('guesty_reservations', {
  id: serial('id').primaryKey(),
  guestyId: varchar('guesty_id', { length: 255 }),
  propertyId: text('property_id'),
  guestyPropertyId: varchar('guesty_property_id', { length: 255 }),
  guestId: varchar('guest_id', { length: 255 }),
  reservationId: text('reservation_id'),
  confirmationCode: varchar('confirmation_code', { length: 255 }),
  guestName: text('guest_name'),
  guestEmail: text('guest_email'),
  guestPhone: varchar('guest_phone', { length: 255 }),
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  status: text('status'),
  source: varchar('source', { length: 255 }),
  channel: text('channel'),
  totalPrice: integer('total_price'),
  money: json('money'),
  adults: integer('adults'),
  children: integer('children'),
  infants: integer('infants'),
  pets: integer('pets'),
  totalGuests: integer('total_guests'),
  reservationData: json('reservation_data'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// Guesty Sync Logs table
export const guestySyncLogs = pgTable('guesty_sync_logs', {
  id: serial('id').primaryKey(),
  syncDate: timestamp('sync_date'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  itemsProcessed: integer('items_processed'),
  propertiesCount: integer('properties_count'),
  reservationsCount: integer('reservations_count'),
  syncType: text('sync_type'),
  status: text('status'), // 'success', 'failed', etc.
  errorMessage: text('error_message'),
  notes: text('notes'),
});

// Guesty Webhook Events table
export const guestyWebhookEvents = pgTable('guesty_webhook_events', {
  id: serial('id').primaryKey(),
  eventType: varchar('event_type', { length: 255 }).notNull(),
  entityType: varchar('entity_type', { length: 255 }),
  entityId: varchar('entity_id', { length: 255 }),
  eventData: json('event_data').notNull(),  // This was previously called 'payload'
  signature: varchar('signature', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 255 }),
  processed: boolean('processed').default(false),
  processingErrors: text('processing_errors'),
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at'),
});

// Schemas for Guesty entities
export const insertGuestyPropertySchema = createInsertSchema(guestyProperties).omit({ id: true });
export type InsertGuestyProperty = z.infer<typeof insertGuestyPropertySchema>;
export type GuestyProperty = typeof guestyProperties.$inferSelect;

export const insertGuestyReservationSchema = createInsertSchema(guestyReservations).omit({ id: true });
export type InsertGuestyReservation = z.infer<typeof insertGuestyReservationSchema>;
export type GuestyReservation = typeof guestyReservations.$inferSelect;

export const insertGuestySyncLogSchema = createInsertSchema(guestySyncLogs).omit({ id: true });
export type InsertGuestySyncLog = z.infer<typeof insertGuestySyncLogSchema>;
export type GuestySyncLog = typeof guestySyncLogs.$inferSelect;

export const insertGuestyWebhookEventSchema = createInsertSchema(guestyWebhookEvents).omit({ id: true });
export type InsertGuestyWebhookEvent = z.infer<typeof insertGuestyWebhookEventSchema>;
export type GuestyWebhookEvent = typeof guestyWebhookEvents.$inferSelect;

// Relations for Guesty entities
export const guestyPropertiesRelations = relations(guestyProperties, ({ one, many }) => ({
  unit: one(units, {
    fields: [guestyProperties.unitId],
    references: [units.id],
  }),
  reservations: many(guestyReservations),
}));

export const guestyReservationsRelations = relations(guestyReservations, ({ one }) => ({
  property: one(guestyProperties, {
    fields: [guestyReservations.guestyPropertyId],
    references: [guestyProperties.guestyId],
  }),
}));