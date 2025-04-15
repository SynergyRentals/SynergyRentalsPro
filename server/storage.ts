import { 
  User, InsertUser, Guest, InsertGuest, Unit, InsertUnit, 
  Task, InsertTask, Maintenance, InsertMaintenance, 
  Inventory, InsertInventory, Vendor, InsertVendor, 
  Project, InsertProject, Document, InsertDocument, 
  Log, InsertLog,
  CleaningTask, InsertCleaningTask,
  CleaningChecklist, InsertCleaningChecklist,
  CleaningChecklistItem, InsertCleaningChecklistItem,
  CleaningChecklistCompletion, InsertCleaningChecklistCompletion,
  // New Project & Task module types
  ProjectMilestone, InsertProjectMilestone,
  ProjectTask, InsertProjectTask,
  TaskComment, InsertTaskComment,
  ProjectFile, InsertProjectFile,
  AiGeneratedPlan, InsertAiGeneratedPlan
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, isNull } from "drizzle-orm";
import * as schema from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

const PostgresSessionStore = connectPg(session);

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
  
  // Project Milestones
  getProjectMilestone(id: number): Promise<ProjectMilestone | undefined>;
  createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone>;
  updateProjectMilestone(id: number, milestone: Partial<ProjectMilestone>): Promise<ProjectMilestone | undefined>;
  getProjectMilestonesByProject(projectId: number): Promise<ProjectMilestone[]>;
  
  // Project Tasks
  getProjectTask(id: number): Promise<ProjectTask | undefined>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: number, task: Partial<ProjectTask>): Promise<ProjectTask | undefined>;
  getAllProjectTasks(): Promise<ProjectTask[]>;
  getProjectTasksByProject(projectId: number): Promise<ProjectTask[]>;
  getProjectTasksByUnit(unitId: number): Promise<ProjectTask[]>;
  getProjectTasksByAssignee(userId: number): Promise<ProjectTask[]>;
  getProjectTasksByStatus(status: string): Promise<ProjectTask[]>;
  
  // Task Comments
  getTaskComment(id: number): Promise<TaskComment | undefined>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  getTaskCommentsByTask(taskId: number): Promise<TaskComment[]>;
  
  // Project Files
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  getProjectFilesByProject(projectId: number): Promise<ProjectFile[]>;
  
  // AI Generated Plans
  getAiGeneratedPlan(id: number): Promise<AiGeneratedPlan | undefined>;
  createAiGeneratedPlan(plan: InsertAiGeneratedPlan): Promise<AiGeneratedPlan>;
  updateAiGeneratedPlan(id: number, plan: Partial<AiGeneratedPlan>): Promise<AiGeneratedPlan | undefined>;
  getAiGeneratedPlansByProject(projectId: number): Promise<AiGeneratedPlan[]>;
  
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
  
  // Cleaning Tasks
  getCleaningTask(id: number): Promise<CleaningTask | undefined>;
  createCleaningTask(task: InsertCleaningTask): Promise<CleaningTask>;
  updateCleaningTask(id: number, task: Partial<CleaningTask>): Promise<CleaningTask | undefined>;
  getAllCleaningTasks(): Promise<CleaningTask[]>;
  getCleaningTasksByUnit(unitId: number): Promise<CleaningTask[]>;
  getCleaningTasksByAssignee(userId: number): Promise<CleaningTask[]>;
  getCleaningTasksByStatus(status: string): Promise<CleaningTask[]>;
  
  // Cleaning Checklists
  getCleaningChecklist(id: number): Promise<CleaningChecklist | undefined>;
  createCleaningChecklist(checklist: InsertCleaningChecklist): Promise<CleaningChecklist>;
  updateCleaningChecklist(id: number, checklist: Partial<CleaningChecklist>): Promise<CleaningChecklist | undefined>;
  getAllCleaningChecklists(): Promise<CleaningChecklist[]>;
  
  // Cleaning Checklist Items
  getCleaningChecklistItem(id: number): Promise<CleaningChecklistItem | undefined>;
  createCleaningChecklistItem(item: InsertCleaningChecklistItem): Promise<CleaningChecklistItem>;
  updateCleaningChecklistItem(id: number, item: Partial<CleaningChecklistItem>): Promise<CleaningChecklistItem | undefined>;
  getCleaningChecklistItemsByChecklist(checklistId: number): Promise<CleaningChecklistItem[]>;
  
  // Cleaning Checklist Completions
  getCleaningChecklistCompletion(id: number): Promise<CleaningChecklistCompletion | undefined>;
  createCleaningChecklistCompletion(completion: InsertCleaningChecklistCompletion): Promise<CleaningChecklistCompletion>;
  updateCleaningChecklistCompletion(id: number, completion: Partial<CleaningChecklistCompletion>): Promise<CleaningChecklistCompletion | undefined>;
  getCleaningChecklistCompletionsByTask(taskId: number): Promise<CleaningChecklistCompletion[]>;
  
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
  private cleaningTasks: Map<number, CleaningTask>;
  private cleaningChecklists: Map<number, CleaningChecklist>;
  private cleaningChecklistItems: Map<number, CleaningChecklistItem>;
  private cleaningChecklistCompletions: Map<number, CleaningChecklistCompletion>;
  // New Project Task module maps
  private projectMilestones: Map<number, ProjectMilestone>;
  private projectTasks: Map<number, ProjectTask>;
  private taskComments: Map<number, TaskComment>;
  private projectFiles: Map<number, ProjectFile>;
  private aiGeneratedPlans: Map<number, AiGeneratedPlan>;
  
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
  private cleaningTaskIdCounter: number;
  private cleaningChecklistIdCounter: number;
  private cleaningChecklistItemIdCounter: number;
  private cleaningChecklistCompletionIdCounter: number;
  // New Project Task module counters
  private projectMilestoneIdCounter: number;
  private projectTaskIdCounter: number;
  private taskCommentIdCounter: number;
  private projectFileIdCounter: number;
  private aiGeneratedPlanIdCounter: number;

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
    this.cleaningTasks = new Map();
    this.cleaningChecklists = new Map();
    this.cleaningChecklistItems = new Map();
    this.cleaningChecklistCompletions = new Map();
    
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
    this.cleaningTaskIdCounter = 1;
    this.cleaningChecklistIdCounter = 1;
    this.cleaningChecklistItemIdCounter = 1;
    this.cleaningChecklistCompletionIdCounter = 1;
    
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Clear expired sessions every 24h
    });
    
    // Add admin user with pre-hashed password
    // The password is "password123" hashed with scrypt
    // This matches the hashing algorithm in auth.ts
    const adminId = this.userIdCounter++;
    const adminUser: User = {
      id: adminId,
      name: "Admin User",
      username: "admin",
      // Pre-hashed "password123" using the same algorithm in auth.ts
      password: "09531004adc7027d36b9cb3dcd9ba44f9cca120e46637ced58b6d35d0e969cc0f93a096c4d4d2ae71d3f00125f882654ce8d7c736788571dcebaeb0fc8e572d4.1e63c98694b3f13f45be49fbc67af531",
      email: "admin@synergyrentals.com",
      role: "admin",
      phone: "555-123-4567",
      active: true,
      createdAt: new Date(),
    };
    this.users.set(adminId, adminUser);
    
    // Let's also add a manager user for testing
    const managerId = this.userIdCounter++;
    const managerUser: User = {
      id: managerId,
      name: "Manager User",
      username: "manager",
      // Pre-hashed "password123" 
      password: "09531004adc7027d36b9cb3dcd9ba44f9cca120e46637ced58b6d35d0e969cc0f93a096c4d4d2ae71d3f00125f882654ce8d7c736788571dcebaeb0fc8e572d4.1e63c98694b3f13f45be49fbc67af531",
      email: "manager@synergyrentals.com",
      role: "manager",
      phone: "555-987-6543",
      active: true,
      createdAt: new Date(),
    };
    this.users.set(managerId, managerUser);
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
  
  // Cleaning Task Methods
  async getCleaningTask(id: number): Promise<CleaningTask | undefined> {
    return this.cleaningTasks.get(id);
  }
  
  async createCleaningTask(insertCleaningTask: InsertCleaningTask): Promise<CleaningTask> {
    const id = this.cleaningTaskIdCounter++;
    const createdAt = new Date();
    const cleaningTask: CleaningTask = { 
      ...insertCleaningTask, 
      id, 
      status: "scheduled", 
      createdAt,
      completedAt: null 
    };
    this.cleaningTasks.set(id, cleaningTask);
    return cleaningTask;
  }
  
  async updateCleaningTask(id: number, cleaningTaskData: Partial<CleaningTask>): Promise<CleaningTask | undefined> {
    const cleaningTask = this.cleaningTasks.get(id);
    if (!cleaningTask) return undefined;
    
    // If task is being marked as completed, set completedAt
    if (cleaningTaskData.status === 'completed' && cleaningTask.status !== 'completed') {
      cleaningTaskData.completedAt = new Date();
    }
    
    const updatedCleaningTask = { ...cleaningTask, ...cleaningTaskData };
    this.cleaningTasks.set(id, updatedCleaningTask);
    return updatedCleaningTask;
  }
  
  async getAllCleaningTasks(): Promise<CleaningTask[]> {
    return Array.from(this.cleaningTasks.values());
  }
  
  async getCleaningTasksByUnit(unitId: number): Promise<CleaningTask[]> {
    return Array.from(this.cleaningTasks.values()).filter(task => task.unitId === unitId);
  }
  
  async getCleaningTasksByAssignee(userId: number): Promise<CleaningTask[]> {
    return Array.from(this.cleaningTasks.values()).filter(task => task.assignedTo === userId);
  }
  
  async getCleaningTasksByStatus(status: string): Promise<CleaningTask[]> {
    return Array.from(this.cleaningTasks.values()).filter(task => task.status === status);
  }
  
  // Cleaning Checklist Methods
  async getCleaningChecklist(id: number): Promise<CleaningChecklist | undefined> {
    return this.cleaningChecklists.get(id);
  }
  
  async createCleaningChecklist(insertCleaningChecklist: InsertCleaningChecklist): Promise<CleaningChecklist> {
    const id = this.cleaningChecklistIdCounter++;
    const createdAt = new Date();
    const cleaningChecklist: CleaningChecklist = { 
      ...insertCleaningChecklist, 
      id, 
      active: true,
      createdAt
    };
    this.cleaningChecklists.set(id, cleaningChecklist);
    return cleaningChecklist;
  }
  
  async updateCleaningChecklist(id: number, checklistData: Partial<CleaningChecklist>): Promise<CleaningChecklist | undefined> {
    const checklist = this.cleaningChecklists.get(id);
    if (!checklist) return undefined;
    
    const updatedChecklist = { ...checklist, ...checklistData };
    this.cleaningChecklists.set(id, updatedChecklist);
    return updatedChecklist;
  }
  
  async getAllCleaningChecklists(): Promise<CleaningChecklist[]> {
    return Array.from(this.cleaningChecklists.values());
  }
  
  // Cleaning Checklist Items Methods
  async getCleaningChecklistItem(id: number): Promise<CleaningChecklistItem | undefined> {
    return this.cleaningChecklistItems.get(id);
  }
  
  async createCleaningChecklistItem(insertCleaningChecklistItem: InsertCleaningChecklistItem): Promise<CleaningChecklistItem> {
    const id = this.cleaningChecklistItemIdCounter++;
    const cleaningChecklistItem: CleaningChecklistItem = { 
      ...insertCleaningChecklistItem, 
      id 
    };
    this.cleaningChecklistItems.set(id, cleaningChecklistItem);
    return cleaningChecklistItem;
  }
  
  async updateCleaningChecklistItem(id: number, itemData: Partial<CleaningChecklistItem>): Promise<CleaningChecklistItem | undefined> {
    const item = this.cleaningChecklistItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.cleaningChecklistItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async getCleaningChecklistItemsByChecklist(checklistId: number): Promise<CleaningChecklistItem[]> {
    return Array.from(this.cleaningChecklistItems.values())
      .filter(item => item.checklistId === checklistId);
  }
  
  // Cleaning Checklist Completions Methods
  async getCleaningChecklistCompletion(id: number): Promise<CleaningChecklistCompletion | undefined> {
    return this.cleaningChecklistCompletions.get(id);
  }
  
  async createCleaningChecklistCompletion(insertCompletion: InsertCleaningChecklistCompletion): Promise<CleaningChecklistCompletion> {
    const id = this.cleaningChecklistCompletionIdCounter++;
    const completedAt = new Date();
    const completion: CleaningChecklistCompletion = { 
      ...insertCompletion, 
      id,
      completedAt
    };
    this.cleaningChecklistCompletions.set(id, completion);
    return completion;
  }
  
  async updateCleaningChecklistCompletion(id: number, completionData: Partial<CleaningChecklistCompletion>): Promise<CleaningChecklistCompletion | undefined> {
    const completion = this.cleaningChecklistCompletions.get(id);
    if (!completion) return undefined;
    
    const updatedCompletion = { ...completion, ...completionData };
    this.cleaningChecklistCompletions.set(id, updatedCompletion);
    return updatedCompletion;
  }
  
  async getCleaningChecklistCompletionsByTask(taskId: number): Promise<CleaningChecklistCompletion[]> {
    return Array.from(this.cleaningChecklistCompletions.values())
      .filter(completion => completion.cleaningTaskId === taskId);
  }
  
  // Get checklist items for a specific template
  async getCleaningChecklistItems(checklistId: number): Promise<CleaningChecklistItem[]> {
    return Array.from(this.cleaningChecklistItems.values())
      .filter(item => item.checklistId === checklistId);
  }
  
  // Get cleaning tasks for a specific unit
  async getCleaningTasksByUnitId(unitId: number): Promise<CleaningTask[]> {
    return Array.from(this.cleaningTasks.values())
      .filter(task => task.unitId === unitId);
  }
  
  // Get completions for a specific cleaning task
  async getCleaningChecklistCompletionsByTaskId(taskId: number): Promise<CleaningChecklistCompletion[]> {
    return Array.from(this.cleaningChecklistCompletions.values())
      .filter(completion => completion.cleaningTaskId === taskId);
  }
  
  // Get checklist completion by task and item
  async getCleaningChecklistCompletion(taskId: number, itemId: number): Promise<CleaningChecklistCompletion | undefined> {
    return Array.from(this.cleaningChecklistCompletions.values())
      .find(completion => completion.cleaningTaskId === taskId && completion.checklistItemId === itemId);
  }
  
  // Create activity log for user actions
  async createActivityLog(insertLog: { 
    action: string; 
    userId: number | null; 
    targetTable: string; 
    targetId?: number; 
    timestamp: Date;
    notes: string;
  }): Promise<any> {
    const id = this.logIdCounter++;
    const log = { ...insertLog, id };
    this.logs.set(id, log);
    return log;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool, 
      createTableIfMissing: true
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values({
      ...insertUser,
      active: true,
    }).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(schema.users);
  }

  // Unit Methods
  async getUnit(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(schema.units).where(eq(schema.units.id, id));
    return unit;
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const [unit] = await db.insert(schema.units).values({
      ...insertUnit,
      active: true,
    }).returning();
    return unit;
  }

  async updateUnit(id: number, unitData: Partial<Unit>): Promise<Unit | undefined> {
    const [updatedUnit] = await db.update(schema.units)
      .set(unitData)
      .where(eq(schema.units.id, id))
      .returning();
    return updatedUnit;
  }

  async getAllUnits(): Promise<Unit[]> {
    return await db.select().from(schema.units);
  }

  // Guest Methods
  async getGuest(id: number): Promise<Guest | undefined> {
    const [guest] = await db.select().from(schema.guests).where(eq(schema.guests.id, id));
    return guest;
  }

  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    const [guest] = await db.insert(schema.guests).values(insertGuest).returning();
    return guest;
  }

  async updateGuest(id: number, guestData: Partial<Guest>): Promise<Guest | undefined> {
    const [updatedGuest] = await db.update(schema.guests)
      .set(guestData)
      .where(eq(schema.guests.id, id))
      .returning();
    return updatedGuest;
  }

  async getAllGuests(): Promise<Guest[]> {
    return await db.select().from(schema.guests);
  }

  async getGuestsByUnit(unitId: number): Promise<Guest[]> {
    return await db.select().from(schema.guests).where(eq(schema.guests.unitId, unitId));
  }

  // Task Methods
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id));
    return task;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(schema.tasks).values({
      ...insertTask,
      completed: false,
    }).returning();
    return task;
  }

  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    // If task is being marked as completed, set completedAt
    if (taskData.completed === true) {
      const task = await this.getTask(id);
      if (task && !task.completed) {
        taskData.completedAt = new Date();
      }
    }

    const [updatedTask] = await db.update(schema.tasks)
      .set(taskData)
      .where(eq(schema.tasks.id, id))
      .returning();
    return updatedTask;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(schema.tasks);
  }

  async getTasksByUnit(unitId: number): Promise<Task[]> {
    return await db.select().from(schema.tasks).where(eq(schema.tasks.unitId, unitId));
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return await db.select().from(schema.tasks).where(eq(schema.tasks.assignedTo, userId));
  }

  async getTasksByType(type: string): Promise<Task[]> {
    return await db.select().from(schema.tasks).where(eq(schema.tasks.type, type));
  }

  // Maintenance Methods
  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    const [maintenance] = await db.select().from(schema.maintenance).where(eq(schema.maintenance.id, id));
    return maintenance;
  }

  async createMaintenance(insertMaintenance: InsertMaintenance): Promise<Maintenance> {
    const [maintenance] = await db.insert(schema.maintenance).values({
      ...insertMaintenance,
      status: "open",
    }).returning();
    return maintenance;
  }

  async updateMaintenance(id: number, maintenanceData: Partial<Maintenance>): Promise<Maintenance | undefined> {
    // If maintenance is being marked as completed, set completedAt
    if (maintenanceData.status === 'completed') {
      const maintenance = await this.getMaintenance(id);
      if (maintenance && maintenance.status !== 'completed') {
        maintenanceData.completedAt = new Date();
      }
    }

    const [updatedMaintenance] = await db.update(schema.maintenance)
      .set(maintenanceData)
      .where(eq(schema.maintenance.id, id))
      .returning();
    return updatedMaintenance;
  }

  async getAllMaintenance(): Promise<Maintenance[]> {
    return await db.select().from(schema.maintenance);
  }

  async getMaintenanceByUnit(unitId: number): Promise<Maintenance[]> {
    return await db.select().from(schema.maintenance).where(eq(schema.maintenance.unitId, unitId));
  }

  // Inventory Methods
  async getInventory(id: number): Promise<Inventory | undefined> {
    const [inventory] = await db.select().from(schema.inventory).where(eq(schema.inventory.id, id));
    return inventory;
  }

  async createInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const [inventory] = await db.insert(schema.inventory).values({
      ...insertInventory,
      lastUpdated: new Date(),
    }).returning();
    return inventory;
  }

  async updateInventory(id: number, inventoryData: Partial<Inventory>): Promise<Inventory | undefined> {
    // Update lastUpdated timestamp
    inventoryData.lastUpdated = new Date();

    const [updatedInventory] = await db.update(schema.inventory)
      .set(inventoryData)
      .where(eq(schema.inventory.id, id))
      .returning();
    return updatedInventory;
  }

  async getAllInventory(): Promise<Inventory[]> {
    return await db.select().from(schema.inventory);
  }

  async getInventoryByUnit(unitId: number): Promise<Inventory[]> {
    return await db.select().from(schema.inventory).where(eq(schema.inventory.unitId, unitId));
  }

  async getGarageInventory(): Promise<Inventory[]> {
    return await db.select().from(schema.inventory).where(isNull(schema.inventory.unitId));
  }

  // Vendor Methods
  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(schema.vendors).where(eq(schema.vendors.id, id));
    return vendor;
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [vendor] = await db.insert(schema.vendors).values(insertVendor).returning();
    return vendor;
  }

  async updateVendor(id: number, vendorData: Partial<Vendor>): Promise<Vendor | undefined> {
    const [updatedVendor] = await db.update(schema.vendors)
      .set(vendorData)
      .where(eq(schema.vendors.id, id))
      .returning();
    return updatedVendor;
  }

  async getAllVendors(): Promise<Vendor[]> {
    return await db.select().from(schema.vendors);
  }

  // Project Methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(schema.projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await db.update(schema.projects)
      .set(projectData)
      .where(eq(schema.projects.id, id))
      .returning();
    return updatedProject;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(schema.projects);
  }

  async getProjectsByUnit(unitId: number): Promise<Project[]> {
    return await db.select().from(schema.projects).where(eq(schema.projects.unitId, unitId));
  }

  // Document Methods
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
    return document;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(schema.documents).values(insertDocument).returning();
    return document;
  }

  async updateDocument(id: number, documentData: Partial<Document>): Promise<Document | undefined> {
    const [updatedDocument] = await db.update(schema.documents)
      .set(documentData)
      .where(eq(schema.documents.id, id))
      .returning();
    return updatedDocument;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(schema.documents);
  }

  async getDocumentsByUnit(unitId: number): Promise<Document[]> {
    return await db.select().from(schema.documents).where(eq(schema.documents.unitId, unitId));
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return await db.select().from(schema.documents).where(eq(schema.documents.category, category));
  }

  // Log Methods
  async createLog(insertLog: InsertLog): Promise<Log> {
    const [log] = await db.insert(schema.logs).values(insertLog).returning();
    return log;
  }

  async getAllLogs(): Promise<Log[]> {
    return await db.select().from(schema.logs);
  }
  
  // Cleaning Task Methods
  async getCleaningTask(id: number): Promise<CleaningTask | undefined> {
    const [cleaningTask] = await db.select().from(schema.cleaningTasks).where(eq(schema.cleaningTasks.id, id));
    return cleaningTask;
  }
  
  async createCleaningTask(insertCleaningTask: InsertCleaningTask): Promise<CleaningTask> {
    // Convert the scheduledFor to Date object if it's a string
    const { scheduledFor, ...rest } = insertCleaningTask;
    const scheduledForDate = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor;
    
    const [cleaningTask] = await db.insert(schema.cleaningTasks).values({
      ...rest,
      scheduledFor: scheduledForDate,
      status: "scheduled",
      verifiedAt: null,
      actualDuration: null,
    }).returning();
    return cleaningTask;
  }
  
  async updateCleaningTask(id: number, cleaningTaskData: Partial<CleaningTask>): Promise<CleaningTask | undefined> {
    // If task is being marked as completed, set completedAt
    if (cleaningTaskData.status === 'completed') {
      const task = await this.getCleaningTask(id);
      if (task && task.status !== 'completed') {
        cleaningTaskData.completedAt = new Date();
      }
    }

    const [updatedCleaningTask] = await db.update(schema.cleaningTasks)
      .set(cleaningTaskData)
      .where(eq(schema.cleaningTasks.id, id))
      .returning();
    return updatedCleaningTask;
  }
  
  async getAllCleaningTasks(): Promise<CleaningTask[]> {
    return await db.select().from(schema.cleaningTasks);
  }
  
  async getCleaningTasksByUnit(unitId: number): Promise<CleaningTask[]> {
    return await db.select().from(schema.cleaningTasks).where(eq(schema.cleaningTasks.unitId, unitId));
  }
  
  async getCleaningTasksByAssignee(userId: number): Promise<CleaningTask[]> {
    return await db.select().from(schema.cleaningTasks).where(eq(schema.cleaningTasks.assignedTo, userId));
  }
  
  async getCleaningTasksByStatus(status: string): Promise<CleaningTask[]> {
    return await db.select().from(schema.cleaningTasks).where(eq(schema.cleaningTasks.status, status));
  }
  
  // Cleaning Checklist Methods
  async getCleaningChecklist(id: number): Promise<CleaningChecklist | undefined> {
    const [cleaningChecklist] = await db.select().from(schema.cleaningChecklists).where(eq(schema.cleaningChecklists.id, id));
    return cleaningChecklist;
  }
  
  async createCleaningChecklist(insertCleaningChecklist: InsertCleaningChecklist): Promise<CleaningChecklist> {
    const [cleaningChecklist] = await db.insert(schema.cleaningChecklists).values({
      ...insertCleaningChecklist,
      isActive: true,
    }).returning();
    return cleaningChecklist;
  }
  
  async updateCleaningChecklist(id: number, checklistData: Partial<CleaningChecklist>): Promise<CleaningChecklist | undefined> {
    const [updatedChecklist] = await db.update(schema.cleaningChecklists)
      .set(checklistData)
      .where(eq(schema.cleaningChecklists.id, id))
      .returning();
    return updatedChecklist;
  }
  
  async getAllCleaningChecklists(): Promise<CleaningChecklist[]> {
    return await db.select().from(schema.cleaningChecklists);
  }
  
  // Cleaning Checklist Items Methods
  async getCleaningChecklistItem(id: number): Promise<CleaningChecklistItem | undefined> {
    const [cleaningChecklistItem] = await db.select().from(schema.cleaningChecklistItems).where(eq(schema.cleaningChecklistItems.id, id));
    return cleaningChecklistItem;
  }
  
  async createCleaningChecklistItem(insertCleaningChecklistItem: InsertCleaningChecklistItem): Promise<CleaningChecklistItem> {
    const [cleaningChecklistItem] = await db.insert(schema.cleaningChecklistItems).values(insertCleaningChecklistItem).returning();
    return cleaningChecklistItem;
  }
  
  async updateCleaningChecklistItem(id: number, itemData: Partial<CleaningChecklistItem>): Promise<CleaningChecklistItem | undefined> {
    const [updatedItem] = await db.update(schema.cleaningChecklistItems)
      .set(itemData)
      .where(eq(schema.cleaningChecklistItems.id, id))
      .returning();
    return updatedItem;
  }
  
  async getCleaningChecklistItemsByChecklist(checklistId: number): Promise<CleaningChecklistItem[]> {
    return await db.select().from(schema.cleaningChecklistItems).where(eq(schema.cleaningChecklistItems.checklistId, checklistId));
  }
  
  // Cleaning Checklist Completions Methods
  async getCleaningChecklistCompletion(id: number): Promise<CleaningChecklistCompletion | undefined> {
    const [completion] = await db.select().from(schema.cleaningChecklistCompletions).where(eq(schema.cleaningChecklistCompletions.id, id));
    return completion;
  }
  
  async createCleaningChecklistCompletion(insertCompletion: InsertCleaningChecklistCompletion): Promise<CleaningChecklistCompletion> {
    // Create completion with completed status
    const now = new Date();
    const [completion] = await db.insert(schema.cleaningChecklistCompletions).values({
      ...insertCompletion,
      completedAt: now,
      // Properties need to be added after spread to override any existing values
      completed: true
    }).returning();
    return completion;
  }
  
  async updateCleaningChecklistCompletion(id: number, completionData: Partial<CleaningChecklistCompletion>): Promise<CleaningChecklistCompletion | undefined> {
    const [updatedCompletion] = await db.update(schema.cleaningChecklistCompletions)
      .set(completionData)
      .where(eq(schema.cleaningChecklistCompletions.id, id))
      .returning();
    return updatedCompletion;
  }
  
  async getCleaningChecklistCompletionsByTask(taskId: number): Promise<CleaningChecklistCompletion[]> {
    return await db.select().from(schema.cleaningChecklistCompletions).where(eq(schema.cleaningChecklistCompletions.cleaningTaskId, taskId));
  }
}

export const storage = new DatabaseStorage();
