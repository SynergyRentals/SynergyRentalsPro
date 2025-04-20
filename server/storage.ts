import { eq, like, and, or, desc, asc, isNull, inArray } from 'drizzle-orm';
import {
  users, tasks, units, guests, projects, maintenanceIssues, inventoryItems, vendors,
  User, InsertUser, Task, InsertTask, Unit, InsertUnit, Guest, InsertGuest,
  Project, InsertProject, MaintenanceIssue, InsertMaintenanceIssue, 
  InventoryItem, InsertInventoryItem, Vendor, InsertVendor,
  guestyProperties, guestyReservations, guestySyncLogs, guestyWebhookEvents,
  GuestyProperty, InsertGuestyProperty, GuestyReservation, InsertGuestyReservation,
  GuestySyncLog, InsertGuestySyncLog, GuestyWebhookEvent, InsertGuestyWebhookEvent
} from "../shared/schema";
import { db } from "./db";

// Interface for storage operations
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Units
  getUnit(id: number): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<Unit>): Promise<Unit | undefined>;
  deleteUnit(id: number): Promise<boolean>;
  getAllUnits(): Promise<Unit[]>;

  // Guests
  getGuest(id: number): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, guest: Partial<Guest>): Promise<Guest | undefined>;
  deleteGuest(id: number): Promise<boolean>;
  getAllGuests(): Promise<Guest[]>;
  getGuestsByUnit(unitId: number): Promise<Guest[]>;

  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  getAllTasks(): Promise<Task[]>;
  getTasksByUnit(unitId: number): Promise<Task[]>;

  // Maintenance Issues
  getMaintenanceIssue(id: number): Promise<MaintenanceIssue | undefined>;
  createMaintenanceIssue(issue: InsertMaintenanceIssue): Promise<MaintenanceIssue>;
  updateMaintenanceIssue(id: number, issue: Partial<MaintenanceIssue>): Promise<MaintenanceIssue | undefined>;
  deleteMaintenanceIssue(id: number): Promise<boolean>;
  getAllMaintenanceIssues(): Promise<MaintenanceIssue[]>;
  getMaintenanceIssuesByUnit(unitId: number): Promise<MaintenanceIssue[]>;

  // Inventory Items
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemsByUnit(unitId: number): Promise<InventoryItem[]>;

  // Vendors
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;
  getAllVendors(): Promise<Vendor[]>;

  // Projects
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getAllProjects(): Promise<Project[]>;

  // Properties (mapping to Guesty Properties in routes-safe.ts)
  getProperty(id: number): Promise<GuestyProperty | undefined>;
  getAllProperties(): Promise<GuestyProperty[]>;
  getPropertyReservations(propertyId: number): Promise<GuestyReservation[]>;

  // Guesty Properties
  getGuestyProperty(id: number): Promise<GuestyProperty | undefined>;
  getGuestyPropertyByGuestyId(guestyId: string): Promise<GuestyProperty | undefined>;
  createGuestyProperty(property: InsertGuestyProperty): Promise<GuestyProperty>;
  updateGuestyProperty(id: number, property: Partial<GuestyProperty>): Promise<GuestyProperty | undefined>;
  deleteGuestyProperty(id: number): Promise<boolean>;
  getAllGuestyProperties(): Promise<GuestyProperty[]>;

  // Guesty Reservations
  getGuestyReservation(id: number): Promise<GuestyReservation | undefined>;
  getGuestyReservationByGuestyId(guestyId: string): Promise<GuestyReservation | undefined>;
  createGuestyReservation(reservation: InsertGuestyReservation): Promise<GuestyReservation>;
  updateGuestyReservation(id: number, reservation: Partial<GuestyReservation>): Promise<GuestyReservation | undefined>;
  deleteGuestyReservation(id: number): Promise<boolean>;
  getAllGuestyReservations(): Promise<GuestyReservation[]>;
  getGuestyReservationsByProperty(propertyId: number): Promise<GuestyReservation[]>;

  // Guesty Sync Logs
  createGuestySyncLog(log: InsertGuestySyncLog): Promise<GuestySyncLog>;
  getAllGuestySyncLogs(): Promise<GuestySyncLog[]>;
  
  // Guesty Webhook Events
  createGuestyWebhookEvent(event: InsertGuestyWebhookEvent): Promise<GuestyWebhookEvent>;
  updateGuestyWebhookEvent(id: number, event: Partial<GuestyWebhookEvent>): Promise<GuestyWebhookEvent | undefined>;
  getAllGuestyWebhookEvents(): Promise<GuestyWebhookEvent[]>;
  getUnprocessedGuestyWebhookEvents(): Promise<GuestyWebhookEvent[]>;
}

// Database Storage implementation
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Units
  async getUnit(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit;
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const [newUnit] = await db.insert(units).values(unit).returning();
    return newUnit;
  }

  async updateUnit(id: number, unit: Partial<Unit>): Promise<Unit | undefined> {
    const [updatedUnit] = await db.update(units).set(unit).where(eq(units.id, id)).returning();
    return updatedUnit;
  }

  async deleteUnit(id: number): Promise<boolean> {
    const result = await db.delete(units).where(eq(units.id, id));
    return result.rowCount > 0;
  }

  async getAllUnits(): Promise<Unit[]> {
    return await db.select().from(units);
  }

  // Guests
  async getGuest(id: number): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest;
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const [newGuest] = await db.insert(guests).values(guest).returning();
    return newGuest;
  }

  async updateGuest(id: number, guest: Partial<Guest>): Promise<Guest | undefined> {
    const [updatedGuest] = await db.update(guests).set(guest).where(eq(guests.id, id)).returning();
    return updatedGuest;
  }

  async deleteGuest(id: number): Promise<boolean> {
    const result = await db.delete(guests).where(eq(guests.id, id));
    return result.rowCount > 0;
  }

  async getAllGuests(): Promise<Guest[]> {
    return await db.select().from(guests);
  }

  async getGuestsByUnit(unitId: number): Promise<Guest[]> {
    return await db.select().from(guests).where(eq(guests.unitId, unitId));
  }

  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task | undefined> {
    const [updatedTask] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTasksByUnit(unitId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.unitId, unitId));
  }

  // Maintenance Issues
  async getMaintenanceIssue(id: number): Promise<MaintenanceIssue | undefined> {
    const [issue] = await db.select().from(maintenanceIssues).where(eq(maintenanceIssues.id, id));
    return issue;
  }

  async createMaintenanceIssue(issue: InsertMaintenanceIssue): Promise<MaintenanceIssue> {
    const [newIssue] = await db.insert(maintenanceIssues).values(issue).returning();
    return newIssue;
  }

  async updateMaintenanceIssue(id: number, issue: Partial<MaintenanceIssue>): Promise<MaintenanceIssue | undefined> {
    const [updatedIssue] = await db.update(maintenanceIssues).set(issue).where(eq(maintenanceIssues.id, id)).returning();
    return updatedIssue;
  }

  async deleteMaintenanceIssue(id: number): Promise<boolean> {
    const result = await db.delete(maintenanceIssues).where(eq(maintenanceIssues.id, id));
    return result.rowCount > 0;
  }

  async getAllMaintenanceIssues(): Promise<MaintenanceIssue[]> {
    return await db.select().from(maintenanceIssues);
  }

  async getMaintenanceIssuesByUnit(unitId: number): Promise<MaintenanceIssue[]> {
    return await db.select().from(maintenanceIssues).where(eq(maintenanceIssues.unitId, unitId));
  }

  // Inventory Items
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const [updatedItem] = await db.update(inventoryItems).set(item).where(eq(inventoryItems.id, id)).returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    return result.rowCount > 0;
  }

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems);
  }

  async getInventoryItemsByUnit(unitId: number): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).where(eq(inventoryItems.unitId, unitId));
  }

  // Vendors
  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor | undefined> {
    const [updatedVendor] = await db.update(vendors).set(vendor).where(eq(vendors.id, id)).returning();
    return updatedVendor;
  }

  async deleteVendor(id: number): Promise<boolean> {
    const result = await db.delete(vendors).where(eq(vendors.id, id));
    return result.rowCount > 0;
  }

  async getAllVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  // Projects
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  // Properties (mapping to Guesty Properties in routes-safe.ts)
  async getProperty(id: number): Promise<GuestyProperty | undefined> {
    return await this.getGuestyProperty(id);
  }

  async getAllProperties(): Promise<GuestyProperty[]> {
    return await this.getAllGuestyProperties();
  }

  async getPropertyReservations(propertyId: number): Promise<GuestyReservation[]> {
    const property = await this.getGuestyProperty(propertyId);
    if (!property || !property.guestyId) {
      return [];
    }
    return await db.select().from(guestyReservations).where(eq(guestyReservations.guestyPropertyId, property.guestyId));
  }

  // Guesty Properties
  async getGuestyProperty(id: number): Promise<GuestyProperty | undefined> {
    const [property] = await db.select().from(guestyProperties).where(eq(guestyProperties.id, id));
    return property;
  }

  async getGuestyPropertyByGuestyId(guestyId: string): Promise<GuestyProperty | undefined> {
    const [property] = await db.select().from(guestyProperties).where(eq(guestyProperties.guestyId, guestyId));
    return property;
  }

  async createGuestyProperty(property: InsertGuestyProperty): Promise<GuestyProperty> {
    const [newProperty] = await db.insert(guestyProperties).values(property).returning();
    return newProperty;
  }

  async updateGuestyProperty(id: number, property: Partial<GuestyProperty>): Promise<GuestyProperty | undefined> {
    const [updatedProperty] = await db.update(guestyProperties).set(property).where(eq(guestyProperties.id, id)).returning();
    return updatedProperty;
  }

  async deleteGuestyProperty(id: number): Promise<boolean> {
    const result = await db.delete(guestyProperties).where(eq(guestyProperties.id, id));
    return result.rowCount > 0;
  }

  async getAllGuestyProperties(): Promise<GuestyProperty[]> {
    return await db.select().from(guestyProperties);
  }

  // Guesty Reservations
  async getGuestyReservation(id: number): Promise<GuestyReservation | undefined> {
    const [reservation] = await db.select().from(guestyReservations).where(eq(guestyReservations.id, id));
    return reservation;
  }

  async getGuestyReservationByGuestyId(guestyId: string): Promise<GuestyReservation | undefined> {
    const [reservation] = await db.select().from(guestyReservations).where(eq(guestyReservations.guestyId, guestyId));
    return reservation;
  }

  async createGuestyReservation(reservation: InsertGuestyReservation): Promise<GuestyReservation> {
    const [newReservation] = await db.insert(guestyReservations).values(reservation).returning();
    return newReservation;
  }

  async updateGuestyReservation(id: number, reservation: Partial<GuestyReservation>): Promise<GuestyReservation | undefined> {
    const [updatedReservation] = await db.update(guestyReservations).set(reservation).where(eq(guestyReservations.id, id)).returning();
    return updatedReservation;
  }

  async deleteGuestyReservation(id: number): Promise<boolean> {
    const result = await db.delete(guestyReservations).where(eq(guestyReservations.id, id));
    return result.rowCount > 0;
  }

  async getAllGuestyReservations(): Promise<GuestyReservation[]> {
    return await db.select().from(guestyReservations);
  }

  async getGuestyReservationsByProperty(propertyId: number): Promise<GuestyReservation[]> {
    return await db.select().from(guestyReservations).where(eq(guestyReservations.propertyId, propertyId));
  }

  // Guesty Sync Logs
  async createGuestySyncLog(log: InsertGuestySyncLog): Promise<GuestySyncLog> {
    const [newLog] = await db.insert(guestySyncLogs).values(log).returning();
    return newLog;
  }

  async getAllGuestySyncLogs(): Promise<GuestySyncLog[]> {
    return await db.select().from(guestySyncLogs);
  }

  // Guesty Webhook Events
  async createGuestyWebhookEvent(event: InsertGuestyWebhookEvent): Promise<GuestyWebhookEvent> {
    const [newEvent] = await db.insert(guestyWebhookEvents).values(event).returning();
    return newEvent;
  }

  async updateGuestyWebhookEvent(id: number, event: Partial<GuestyWebhookEvent>): Promise<GuestyWebhookEvent | undefined> {
    const [updatedEvent] = await db.update(guestyWebhookEvents).set(event).where(eq(guestyWebhookEvents.id, id)).returning();
    return updatedEvent;
  }

  async getAllGuestyWebhookEvents(): Promise<GuestyWebhookEvent[]> {
    return await db.select().from(guestyWebhookEvents);
  }

  async getUnprocessedGuestyWebhookEvents(): Promise<GuestyWebhookEvent[]> {
    return await db.select().from(guestyWebhookEvents).where(eq(guestyWebhookEvents.processed, false));
  }
}

// Export an instance of the database storage
export const storage = new DatabaseStorage();