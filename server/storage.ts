import { 
  User, InsertUser, Guest, InsertGuest, Unit, InsertUnit, 
  Task, InsertTask, Maintenance, InsertMaintenance, 
  Inventory, InsertInventory, Vendor, InsertVendor, 
  Project, InsertProject, Document, InsertDocument, 
  Log, InsertLog 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Units
  getUnit(id: number): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<Unit>): Promise<Unit | undefined>;
  getAllUnits(): Promise<Unit[]>;
  
  // Guests
  getGuest(id: number): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, guest: Partial<Guest>): Promise<Guest | undefined>;
  getAllGuests(): Promise<Guest[]>;
  getGuestsByUnit(unitId: number): Promise<Guest[]>;
  
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  getTasksByUnit(unitId: number): Promise<Task[]>;
  getTasksByAssignee(userId: number): Promise<Task[]>;
  getTasksByType(type: string): Promise<Task[]>;
  
  // Maintenance
  getMaintenance(id: number): Promise<Maintenance | undefined>;
  createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance>;
  updateMaintenance(id: number, maintenance: Partial<Maintenance>): Promise<Maintenance | undefined>;
  getAllMaintenance(): Promise<Maintenance[]>;
  getMaintenanceByUnit(unitId: number): Promise<Maintenance[]>;
  
  // Inventory
  getInventory(id: number): Promise<Inventory | undefined>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, inventory: Partial<Inventory>): Promise<Inventory | undefined>;
  getAllInventory(): Promise<Inventory[]>;
  getInventoryByUnit(unitId: number): Promise<Inventory[]>;
  getGarageInventory(): Promise<Inventory[]>;
  
  // Vendors
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor | undefined>;
  getAllVendors(): Promise<Vendor[]>;
  
  // Projects
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByUnit(unitId: number): Promise<Project[]>;
  
  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByUnit(unitId: number): Promise<Document[]>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  
  // Logs
  createLog(log: InsertLog): Promise<Log>;
  getAllLogs(): Promise<Log[]>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private units: Map<number, Unit>;
  private guests: Map<number, Guest>;
  private tasks: Map<number, Task>;
  private maintenanceItems: Map<number, Maintenance>;
  private inventoryItems: Map<number, Inventory>;
  private vendors: Map<number, Vendor>;
  private projects: Map<number, Project>;
  private documents: Map<number, Document>;
  private logs: Map<number, Log>;
  
  sessionStore: session.Store;
  
  private userIdCounter: number;
  private unitIdCounter: number;
  private guestIdCounter: number;
  private taskIdCounter: number;
  private maintenanceIdCounter: number;
  private inventoryIdCounter: number;
  private vendorIdCounter: number;
  private projectIdCounter: number;
  private documentIdCounter: number;
  private logIdCounter: number;

  constructor() {
    this.users = new Map();
    this.units = new Map();
    this.guests = new Map();
    this.tasks = new Map();
    this.maintenanceItems = new Map();
    this.inventoryItems = new Map();
    this.vendors = new Map();
    this.projects = new Map();
    this.documents = new Map();
    this.logs = new Map();
    
    this.userIdCounter = 1;
    this.unitIdCounter = 1;
    this.guestIdCounter = 1;
    this.taskIdCounter = 1;
    this.maintenanceIdCounter = 1;
    this.inventoryIdCounter = 1;
    this.vendorIdCounter = 1;
    this.projectIdCounter = 1;
    this.documentIdCounter = 1;
    this.logIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Clear expired sessions every 24h
    });
    
    // Add admin user
    this.createUser({
      name: "Admin User",
      username: "admin",
      password: "password123", // This will be hashed by auth.ts
      email: "admin@synergyrentals.com",
      role: "admin",
      phone: "555-123-4567",
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, active: true, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Unit Methods
  async getUnit(id: number): Promise<Unit | undefined> {
    return this.units.get(id);
  }
  
  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const id = this.unitIdCounter++;
    const unit: Unit = { ...insertUnit, id, active: true };
    this.units.set(id, unit);
    return unit;
  }
  
  async updateUnit(id: number, unitData: Partial<Unit>): Promise<Unit | undefined> {
    const unit = this.units.get(id);
    if (!unit) return undefined;
    
    const updatedUnit = { ...unit, ...unitData };
    this.units.set(id, updatedUnit);
    return updatedUnit;
  }
  
  async getAllUnits(): Promise<Unit[]> {
    return Array.from(this.units.values());
  }
  
  // Guest Methods
  async getGuest(id: number): Promise<Guest | undefined> {
    return this.guests.get(id);
  }
  
  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    const id = this.guestIdCounter++;
    const guest: Guest = { ...insertGuest, id };
    this.guests.set(id, guest);
    return guest;
  }
  
  async updateGuest(id: number, guestData: Partial<Guest>): Promise<Guest | undefined> {
    const guest = this.guests.get(id);
    if (!guest) return undefined;
    
    const updatedGuest = { ...guest, ...guestData };
    this.guests.set(id, updatedGuest);
    return updatedGuest;
  }
  
  async getAllGuests(): Promise<Guest[]> {
    return Array.from(this.guests.values());
  }
  
  async getGuestsByUnit(unitId: number): Promise<Guest[]> {
    return Array.from(this.guests.values()).filter(guest => guest.unitId === unitId);
  }
  
  // Task Methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const createdAt = new Date();
    const task: Task = { 
      ...insertTask, 
      id, 
      completed: false, 
      createdAt,
      completedAt: null 
    };
    this.tasks.set(id, task);
    return task;
  }
  
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    // If task is being marked as completed, set completedAt
    if (taskData.completed === true && !task.completed) {
      taskData.completedAt = new Date();
    }
    
    const updatedTask = { ...task, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  
  async getTasksByUnit(unitId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.unitId === unitId);
  }
  
  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.assignedTo === userId);
  }
  
  async getTasksByType(type: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.type === type);
  }
  
  // Maintenance Methods
  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    return this.maintenanceItems.get(id);
  }
  
  async createMaintenance(insertMaintenance: InsertMaintenance): Promise<Maintenance> {
    const id = this.maintenanceIdCounter++;
    const createdAt = new Date();
    const maintenance: Maintenance = { 
      ...insertMaintenance, 
      id, 
      status: "open", 
      createdAt,
      completedAt: null 
    };
    this.maintenanceItems.set(id, maintenance);
    return maintenance;
  }
  
  async updateMaintenance(id: number, maintenanceData: Partial<Maintenance>): Promise<Maintenance | undefined> {
    const maintenance = this.maintenanceItems.get(id);
    if (!maintenance) return undefined;
    
    // If maintenance is being marked as completed, set completedAt
    if (maintenanceData.status === 'completed' && maintenance.status !== 'completed') {
      maintenanceData.completedAt = new Date();
    }
    
    const updatedMaintenance = { ...maintenance, ...maintenanceData };
    this.maintenanceItems.set(id, updatedMaintenance);
    return updatedMaintenance;
  }
  
  async getAllMaintenance(): Promise<Maintenance[]> {
    return Array.from(this.maintenanceItems.values());
  }
  
  async getMaintenanceByUnit(unitId: number): Promise<Maintenance[]> {
    return Array.from(this.maintenanceItems.values()).filter(item => item.unitId === unitId);
  }
  
  // Inventory Methods
  async getInventory(id: number): Promise<Inventory | undefined> {
    return this.inventoryItems.get(id);
  }
  
  async createInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const id = this.inventoryIdCounter++;
    const lastUpdated = new Date();
    const inventory: Inventory = { ...insertInventory, id, lastUpdated };
    this.inventoryItems.set(id, inventory);
    return inventory;
  }
  
  async updateInventory(id: number, inventoryData: Partial<Inventory>): Promise<Inventory | undefined> {
    const inventory = this.inventoryItems.get(id);
    if (!inventory) return undefined;
    
    // Update lastUpdated timestamp
    inventoryData.lastUpdated = new Date();
    
    const updatedInventory = { ...inventory, ...inventoryData };
    this.inventoryItems.set(id, updatedInventory);
    return updatedInventory;
  }
  
  async getAllInventory(): Promise<Inventory[]> {
    return Array.from(this.inventoryItems.values());
  }
  
  async getInventoryByUnit(unitId: number): Promise<Inventory[]> {
    return Array.from(this.inventoryItems.values()).filter(item => item.unitId === unitId);
  }
  
  async getGarageInventory(): Promise<Inventory[]> {
    return Array.from(this.inventoryItems.values()).filter(item => item.unitId === null);
  }
  
  // Vendor Methods
  async getVendor(id: number): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }
  
  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const id = this.vendorIdCounter++;
    const vendor: Vendor = { ...insertVendor, id };
    this.vendors.set(id, vendor);
    return vendor;
  }
  
  async updateVendor(id: number, vendorData: Partial<Vendor>): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;
    
    const updatedVendor = { ...vendor, ...vendorData };
    this.vendors.set(id, updatedVendor);
    return updatedVendor;
  }
  
  async getAllVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }
  
  // Project Methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const project: Project = { ...insertProject, id };
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...projectData };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProjectsByUnit(unitId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(project => project.unitId === unitId);
  }
  
  // Document Methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const uploadedAt = new Date();
    const document: Document = { ...insertDocument, id, uploadedAt };
    this.documents.set(id, document);
    return document;
  }
  
  async updateDocument(id: number, documentData: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...documentData };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }
  
  async getDocumentsByUnit(unitId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.unitId === unitId);
  }
  
  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.category === category);
  }
  
  // Log Methods
  async createLog(insertLog: InsertLog): Promise<Log> {
    const id = this.logIdCounter++;
    const timestamp = new Date();
    const log: Log = { ...insertLog, id, timestamp };
    this.logs.set(id, log);
    return log;
  }
  
  async getAllLogs(): Promise<Log[]> {
    return Array.from(this.logs.values());
  }
}

export const storage = new MemStorage();
