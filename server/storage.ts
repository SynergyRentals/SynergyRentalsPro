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
  CleaningFlag, InsertCleaningFlag,
  CleanerPerformance, InsertCleanerPerformance,
  // New Project & Task module types
  ProjectMilestone, InsertProjectMilestone,
  ProjectTask, InsertProjectTask,
  TaskComment, InsertTaskComment,
  ProjectFile, InsertProjectFile,
  AiGeneratedPlan, InsertAiGeneratedPlan,
  // HostAI integration
  HostAiTask, InsertHostAiTask,
  // HostAI Autopilot features
  hostAiAutopilotSettings, hostAiAutopilotLog,
  InsertHostAiAutopilotSettings, InsertHostAiAutopilotLog
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
  
  // Cleaning Flags
  getCleaningFlag(id: number): Promise<CleaningFlag | undefined>;
  createCleaningFlag(flag: InsertCleaningFlag): Promise<CleaningFlag>;
  updateCleaningFlag(id: number, flag: Partial<CleaningFlag>): Promise<CleaningFlag | undefined>;
  getAllCleaningFlags(): Promise<CleaningFlag[]>;
  getCleaningFlagsByTask(taskId: number): Promise<CleaningFlag[]>;
  getCleaningFlagsByStatus(status: string): Promise<CleaningFlag[]>;
  
  // Cleaner Performance
  getCleanerPerformance(id: number): Promise<CleanerPerformance | undefined>;
  createCleanerPerformance(performance: InsertCleanerPerformance): Promise<CleanerPerformance>;
  updateCleanerPerformance(id: number, performance: Partial<CleanerPerformance>): Promise<CleanerPerformance | undefined>;
  getAllCleanerPerformance(): Promise<CleanerPerformance[]>;
  getCleanerPerformanceByUser(userId: number): Promise<CleanerPerformance[]>;
  
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
  
  // Cleaning Flags
  getCleaningFlag(id: number): Promise<CleaningFlag | undefined>;
  createCleaningFlag(flag: InsertCleaningFlag): Promise<CleaningFlag>;
  updateCleaningFlag(id: number, flag: Partial<CleaningFlag>): Promise<CleaningFlag | undefined>;
  getAllCleaningFlags(): Promise<CleaningFlag[]>;
  getCleaningFlagsByTask(taskId: number): Promise<CleaningFlag[]>;
  getCleaningFlagsByStatus(status: string): Promise<CleaningFlag[]>;
  
  // Cleaner Performance Metrics
  getCleanerPerformance(id: number): Promise<CleanerPerformance | undefined>;
  createCleanerPerformance(performance: InsertCleanerPerformance): Promise<CleanerPerformance>;
  updateCleanerPerformance(id: number, performance: Partial<CleanerPerformance>): Promise<CleanerPerformance | undefined>;
  getAllCleanerPerformance(): Promise<CleanerPerformance[]>;
  getCleanerPerformanceByUser(userId: number): Promise<CleanerPerformance[]>;
  
  // HostAI Tasks
  getHostAiTask(id: number): Promise<HostAiTask | undefined>;
  createHostAiTask(task: InsertHostAiTask): Promise<HostAiTask>;
  updateHostAiTask(id: number, task: Partial<HostAiTask>): Promise<HostAiTask | undefined>;
  getAllHostAiTasks(): Promise<HostAiTask[]>;
  getHostAiTasksByStatus(status: string): Promise<HostAiTask[]>;
  getHostAiTasksByAssignee(userId: number): Promise<HostAiTask[]>;
  
  // HostAI Autopilot Settings
  getHostAiAutopilotSettings(userId: number): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined>;
  getHostAiAutopilotSettingsByUser(userId: number): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined>;
  createHostAiAutopilotSettings(settings: InsertHostAiAutopilotSettings): Promise<typeof hostAiAutopilotSettings.$inferSelect>;
  updateHostAiAutopilotSettings(id: number, settings: Partial<typeof hostAiAutopilotSettings.$inferSelect>): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined>;
  
  // HostAI Autopilot Log
  createHostAiAutopilotLog(log: InsertHostAiAutopilotLog): Promise<typeof hostAiAutopilotLog.$inferSelect>;
  getHostAiAutopilotLogsByTask(taskId: number): Promise<typeof hostAiAutopilotLog.$inferSelect[]>;
  getAllHostAiAutopilotLogs(): Promise<typeof hostAiAutopilotLog.$inferSelect[]>;
  
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
  private cleaningFlags: Map<number, CleaningFlag>;
  private cleanerPerformance: Map<number, CleanerPerformance>;
  // New Project Task module maps
  private projectMilestones: Map<number, ProjectMilestone>;
  private projectTasks: Map<number, ProjectTask>;
  private taskComments: Map<number, TaskComment>;
  private projectFiles: Map<number, ProjectFile>;
  private aiGeneratedPlans: Map<number, AiGeneratedPlan>;
  // HostAI Tasks
  private hostAiTasks: Map<number, HostAiTask>;
  // HostAI Autopilot Settings
  private hostAiAutopilotSettings: Map<number, typeof hostAiAutopilotSettings.$inferSelect>;
  // HostAI Autopilot Logs
  private hostAiAutopilotLogs: Map<number, typeof hostAiAutopilotLog.$inferSelect>;
  
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
  private cleaningFlagIdCounter: number;
  private cleanerPerformanceIdCounter: number;
  // New Project Task module counters
  private projectMilestoneIdCounter: number;
  private projectTaskIdCounter: number;
  private taskCommentIdCounter: number;
  private projectFileIdCounter: number;
  private aiGeneratedPlanIdCounter: number;
  // HostAI Tasks counter
  private hostAiTaskIdCounter: number;
  // HostAI Autopilot counter
  private hostAiAutopilotSettingsIdCounter: number;
  private hostAiAutopilotLogIdCounter: number;

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
    this.cleaningFlags = new Map();
    this.cleanerPerformance = new Map();
    // Initialize Project Task module maps
    this.projectMilestones = new Map();
    this.projectTasks = new Map();
    this.taskComments = new Map();
    this.projectFiles = new Map();
    this.aiGeneratedPlans = new Map();
    // Initialize HostAI Tasks
    this.hostAiTasks = new Map();
    // Initialize HostAI Autopilot Settings and Logs
    this.hostAiAutopilotSettings = new Map();
    this.hostAiAutopilotLogs = new Map();
    
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
    this.cleaningFlagIdCounter = 1;
    this.cleanerPerformanceIdCounter = 1;
    // Initialize Project Task module counters
    this.projectMilestoneIdCounter = 1;
    this.projectTaskIdCounter = 1;
    this.taskCommentIdCounter = 1;
    this.projectFileIdCounter = 1;
    this.aiGeneratedPlanIdCounter = 1;
    // Initialize HostAI Tasks counter
    this.hostAiTaskIdCounter = 1;
    // Initialize HostAI Autopilot counters
    this.hostAiAutopilotSettingsIdCounter = 1;
    this.hostAiAutopilotLogIdCounter = 1;
    
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
  
  // Project Milestone Methods
  async getProjectMilestone(id: number): Promise<ProjectMilestone | undefined> {
    return this.projectMilestones.get(id);
  }
  
  async createProjectMilestone(insertMilestone: InsertProjectMilestone): Promise<ProjectMilestone> {
    const id = this.projectMilestoneIdCounter++;
    const createdAt = new Date();
    const milestone: ProjectMilestone = { 
      ...insertMilestone, 
      id, 
      createdAt,
      completedAt: null
    };
    this.projectMilestones.set(id, milestone);
    return milestone;
  }
  
  async updateProjectMilestone(id: number, milestoneData: Partial<ProjectMilestone>): Promise<ProjectMilestone | undefined> {
    const milestone = this.projectMilestones.get(id);
    if (!milestone) return undefined;
    
    // If milestone is being marked as completed, set completedAt
    if (milestoneData.completed === true && !milestone.completed) {
      milestoneData.completedAt = new Date();
    }
    
    const updatedMilestone = { ...milestone, ...milestoneData };
    this.projectMilestones.set(id, updatedMilestone);
    return updatedMilestone;
  }
  
  async getProjectMilestonesByProject(projectId: number): Promise<ProjectMilestone[]> {
    return Array.from(this.projectMilestones.values()).filter(milestone => milestone.projectId === projectId);
  }
  
  // Project Task Methods
  async getProjectTask(id: number): Promise<ProjectTask | undefined> {
    return this.projectTasks.get(id);
  }
  
  async createProjectTask(insertTask: InsertProjectTask): Promise<ProjectTask> {
    const id = this.projectTaskIdCounter++;
    const createdAt = new Date();
    const task: ProjectTask = { 
      ...insertTask, 
      id, 
      status: "pending", 
      createdAt,
      completedAt: null
    };
    this.projectTasks.set(id, task);
    return task;
  }
  
  async updateProjectTask(id: number, taskData: Partial<ProjectTask>): Promise<ProjectTask | undefined> {
    const task = this.projectTasks.get(id);
    if (!task) return undefined;
    
    // If task is being marked as completed, set completedAt
    if (taskData.status === 'completed' && task.status !== 'completed') {
      taskData.completedAt = new Date();
    }
    
    const updatedTask = { ...task, ...taskData };
    this.projectTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async getAllProjectTasks(): Promise<ProjectTask[]> {
    return Array.from(this.projectTasks.values());
  }
  
  async getProjectTasksByProject(projectId: number): Promise<ProjectTask[]> {
    return Array.from(this.projectTasks.values()).filter(task => task.projectId === projectId);
  }
  
  async getProjectTasksByUnit(unitId: number): Promise<ProjectTask[]> {
    return Array.from(this.projectTasks.values()).filter(task => task.unitId === unitId);
  }
  
  async getProjectTasksByAssignee(userId: number): Promise<ProjectTask[]> {
    return Array.from(this.projectTasks.values()).filter(task => task.assignedTo === userId);
  }
  
  async getProjectTasksByStatus(status: string): Promise<ProjectTask[]> {
    return Array.from(this.projectTasks.values()).filter(task => task.status === status);
  }
  
  // Task Comment Methods
  async getTaskComment(id: number): Promise<TaskComment | undefined> {
    return this.taskComments.get(id);
  }
  
  async createTaskComment(insertComment: InsertTaskComment): Promise<TaskComment> {
    const id = this.taskCommentIdCounter++;
    const createdAt = new Date();
    const comment: TaskComment = { 
      ...insertComment, 
      id, 
      createdAt
    };
    this.taskComments.set(id, comment);
    return comment;
  }
  
  async getTaskCommentsByTask(taskId: number): Promise<TaskComment[]> {
    return Array.from(this.taskComments.values()).filter(comment => comment.taskId === taskId);
  }
  
  // Project File Methods
  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    return this.projectFiles.get(id);
  }
  
  async createProjectFile(insertFile: InsertProjectFile): Promise<ProjectFile> {
    const id = this.projectFileIdCounter++;
    const uploadedAt = new Date();
    const file: ProjectFile = { 
      ...insertFile, 
      id, 
      uploadedAt
    };
    this.projectFiles.set(id, file);
    return file;
  }
  
  async getProjectFilesByProject(projectId: number): Promise<ProjectFile[]> {
    return Array.from(this.projectFiles.values()).filter(file => file.projectId === projectId);
  }
  
  // AI Generated Plan Methods
  async getAiGeneratedPlan(id: number): Promise<AiGeneratedPlan | undefined> {
    return this.aiGeneratedPlans.get(id);
  }
  
  async createAiGeneratedPlan(insertPlan: InsertAiGeneratedPlan): Promise<AiGeneratedPlan> {
    const id = this.aiGeneratedPlanIdCounter++;
    const createdAt = new Date();
    const plan: AiGeneratedPlan = { 
      ...insertPlan, 
      id, 
      createdAt
    };
    this.aiGeneratedPlans.set(id, plan);
    return plan;
  }
  
  async updateAiGeneratedPlan(id: number, planData: Partial<AiGeneratedPlan>): Promise<AiGeneratedPlan | undefined> {
    const plan = this.aiGeneratedPlans.get(id);
    if (!plan) return undefined;
    
    const updatedPlan = { ...plan, ...planData };
    this.aiGeneratedPlans.set(id, updatedPlan);
    return updatedPlan;
  }
  
  async getAiGeneratedPlansByProject(projectId: number): Promise<AiGeneratedPlan[]> {
    return Array.from(this.aiGeneratedPlans.values()).filter(plan => plan.projectId === projectId);
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
  
  // Cleaning Flags Methods
  async getCleaningFlag(id: number): Promise<CleaningFlag | undefined> {
    return this.cleaningFlags.get(id);
  }
  
  async createCleaningFlag(insertFlag: InsertCleaningFlag): Promise<CleaningFlag> {
    const id = this.cleaningFlagIdCounter++;
    const createdAt = new Date();
    const resolvedAt = null;
    const flag: CleaningFlag = { 
      ...insertFlag, 
      id,
      createdAt,
      resolvedAt,
      photos: insertFlag.photos || null
    };
    this.cleaningFlags.set(id, flag);
    
    // Update the cleaning task to indicate it has flagged issues
    if (insertFlag.cleaningTaskId) {
      const task = this.cleaningTasks.get(insertFlag.cleaningTaskId);
      if (task) {
        task.hasFlaggedIssues = true;
        this.cleaningTasks.set(task.id, task);
      }
    }
    
    return flag;
  }
  
  async updateCleaningFlag(id: number, flagData: Partial<CleaningFlag>): Promise<CleaningFlag | undefined> {
    const flag = this.cleaningFlags.get(id);
    if (!flag) return undefined;
    
    // If flag is being marked as resolved, set resolvedAt
    if (flagData.status === 'resolved' && flag.status !== 'resolved') {
      flagData.resolvedAt = new Date();
    }
    
    const updatedFlag = { ...flag, ...flagData };
    this.cleaningFlags.set(id, updatedFlag);
    return updatedFlag;
  }
  
  async getAllCleaningFlags(): Promise<CleaningFlag[]> {
    return Array.from(this.cleaningFlags.values());
  }
  
  async getCleaningFlagsByTask(taskId: number): Promise<CleaningFlag[]> {
    return Array.from(this.cleaningFlags.values()).filter(flag => flag.cleaningTaskId === taskId);
  }
  
  async getCleaningFlagsByStatus(status: string): Promise<CleaningFlag[]> {
    return Array.from(this.cleaningFlags.values()).filter(flag => flag.status === status);
  }
  
  // Cleaner Performance Methods
  async getCleanerPerformance(id: number): Promise<CleanerPerformance | undefined> {
    return this.cleanerPerformance.get(id);
  }
  
  async createCleanerPerformance(insertPerformance: InsertCleanerPerformance): Promise<CleanerPerformance> {
    const id = this.cleanerPerformanceIdCounter++;
    const performance: CleanerPerformance = { 
      ...insertPerformance, 
      id,
      avgScore: insertPerformance.avgScore || null,
      avgDuration: insertPerformance.avgDuration || null,
      flagsReceived: insertPerformance.flagsReceived || 0,
      onTimePercentage: insertPerformance.onTimePercentage || null,
      photoQualityScore: insertPerformance.photoQualityScore || null
    };
    this.cleanerPerformance.set(id, performance);
    return performance;
  }
  
  async updateCleanerPerformance(id: number, performanceData: Partial<CleanerPerformance>): Promise<CleanerPerformance | undefined> {
    const performance = this.cleanerPerformance.get(id);
    if (!performance) return undefined;
    
    const updatedPerformance = { ...performance, ...performanceData };
    this.cleanerPerformance.set(id, updatedPerformance);
    return updatedPerformance;
  }
  
  async getAllCleanerPerformance(): Promise<CleanerPerformance[]> {
    return Array.from(this.cleanerPerformance.values());
  }
  
  async getCleanerPerformanceByUser(userId: number): Promise<CleanerPerformance[]> {
    return Array.from(this.cleanerPerformance.values())
      .filter(performance => performance.cleanerId === userId);
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
  
  // HostAI Task Methods
  async getHostAiTask(id: number): Promise<HostAiTask | undefined> {
    return this.hostAiTasks.get(id);
  }
  
  async createHostAiTask(insertTask: InsertHostAiTask): Promise<HostAiTask> {
    const id = this.hostAiTaskIdCounter++;
    const createdAt = new Date();
    const task: HostAiTask = { 
      ...insertTask, 
      id, 
      createdAt,
      updatedAt: createdAt,
      status: insertTask.status || "new"
    };
    this.hostAiTasks.set(id, task);
    return task;
  }
  
  async updateHostAiTask(id: number, taskData: Partial<HostAiTask>): Promise<HostAiTask | undefined> {
    const task = this.hostAiTasks.get(id);
    if (!task) return undefined;
    
    // Update the updatedAt timestamp
    taskData.updatedAt = new Date();
    
    const updatedTask = { ...task, ...taskData };
    this.hostAiTasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async getAllHostAiTasks(): Promise<HostAiTask[]> {
    return Array.from(this.hostAiTasks.values());
  }
  
  async getHostAiTasksByStatus(status: string): Promise<HostAiTask[]> {
    return Array.from(this.hostAiTasks.values()).filter(task => task.status === status);
  }
  
  async getHostAiTasksByAssignee(userId: number): Promise<HostAiTask[]> {
    return Array.from(this.hostAiTasks.values()).filter(task => task.assignedToUserId === userId);
  }

  // HostAI Autopilot Settings Methods
  async getHostAiAutopilotSettings(userId: number): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined> {
    return Array.from(this.hostAiAutopilotSettings.values()).find(settings => settings.userId === userId);
  }
  
  async getHostAiAutopilotSettingsByUser(userId: number): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined> {
    return Array.from(this.hostAiAutopilotSettings.values()).find(settings => settings.userId === userId);
  }

  async createHostAiAutopilotSettings(settings: InsertHostAiAutopilotSettings): Promise<typeof hostAiAutopilotSettings.$inferSelect> {
    const id = this.hostAiAutopilotSettingsIdCounter++;
    const createdAt = new Date();
    // Ensure all required fields are set with defaults if not provided
    const newSettings: typeof hostAiAutopilotSettings.$inferSelect = {
      ...settings,
      id,
      createdAt,
      updatedAt: createdAt,
      enabled: settings.enabled ?? true,
      confidenceThreshold: settings.confidenceThreshold ?? 0.85
    };
    this.hostAiAutopilotSettings.set(id, newSettings);
    return newSettings;
  }
  
  async getAllHostAiAutopilotLogs(): Promise<typeof hostAiAutopilotLog.$inferSelect[]> {
    return Array.from(this.hostAiAutopilotLogs.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async updateHostAiAutopilotSettings(id: number, settingsData: Partial<typeof hostAiAutopilotSettings.$inferSelect>): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined> {
    const settings = this.hostAiAutopilotSettings.get(id);
    if (!settings) return undefined;
    
    const updatedSettings = { 
      ...settings, 
      ...settingsData,
      updatedAt: new Date() 
    };
    this.hostAiAutopilotSettings.set(id, updatedSettings);
    return updatedSettings;
  }
  
  // HostAI Autopilot Log Methods
  async createHostAiAutopilotLog(log: InsertHostAiAutopilotLog): Promise<typeof hostAiAutopilotLog.$inferSelect> {
    const id = this.hostAiAutopilotLogIdCounter++;
    const timestamp = new Date();
    const newLog: typeof hostAiAutopilotLog.$inferSelect = {
      ...log,
      id,
      timestamp
    };
    this.hostAiAutopilotLogs.set(id, newLog);
    return newLog;
  }

  async getHostAiAutopilotLogsByTask(taskId: number): Promise<typeof hostAiAutopilotLog.$inferSelect[]> {
    return Array.from(this.hostAiAutopilotLogs.values()).filter(log => log.taskId === taskId);
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
  
  // Project Milestone Methods
  async getProjectMilestone(id: number): Promise<ProjectMilestone | undefined> {
    const [milestone] = await db.select().from(schema.projectMilestones).where(eq(schema.projectMilestones.id, id));
    return milestone;
  }
  
  async createProjectMilestone(insertMilestone: InsertProjectMilestone): Promise<ProjectMilestone> {
    const [milestone] = await db.insert(schema.projectMilestones).values({
      ...insertMilestone,
      complete: false,
      completedAt: null,
      createdAt: new Date()
    }).returning();
    return milestone;
  }
  
  async updateProjectMilestone(id: number, milestoneData: Partial<ProjectMilestone>): Promise<ProjectMilestone | undefined> {
    // If milestone is being marked as completed, set completedAt
    if (milestoneData.complete === true) {
      const [milestone] = await db.select().from(schema.projectMilestones).where(eq(schema.projectMilestones.id, id));
      if (milestone && !milestone.complete) {
        milestoneData.completedAt = new Date();
      }
    }
    
    const [updatedMilestone] = await db.update(schema.projectMilestones)
      .set(milestoneData)
      .where(eq(schema.projectMilestones.id, id))
      .returning();
    return updatedMilestone;
  }
  
  async getProjectMilestonesByProject(projectId: number): Promise<ProjectMilestone[]> {
    return await db.select().from(schema.projectMilestones)
      .where(eq(schema.projectMilestones.projectId, projectId));
  }
  
  // Project Task Methods
  async getProjectTask(id: number): Promise<ProjectTask | undefined> {
    const [task] = await db.select().from(schema.projectTasks).where(eq(schema.projectTasks.id, id));
    return task;
  }
  
  async createProjectTask(insertTask: InsertProjectTask): Promise<ProjectTask> {
    const [task] = await db.insert(schema.projectTasks).values({
      ...insertTask,
      status: "pending",
      createdAt: new Date(),
      completedAt: null
    }).returning();
    return task;
  }
  
  async updateProjectTask(id: number, taskData: Partial<ProjectTask>): Promise<ProjectTask | undefined> {
    // If task is being marked as completed, set completedAt
    if (taskData.status === 'completed') {
      const [task] = await db.select().from(schema.projectTasks).where(eq(schema.projectTasks.id, id));
      if (task && task.status !== 'completed') {
        taskData.completedAt = new Date();
      }
    }
    
    const [updatedTask] = await db.update(schema.projectTasks)
      .set(taskData)
      .where(eq(schema.projectTasks.id, id))
      .returning();
    return updatedTask;
  }
  
  async getAllProjectTasks(): Promise<ProjectTask[]> {
    return await db.select().from(schema.projectTasks);
  }
  
  async getProjectTasksByProject(projectId: number): Promise<ProjectTask[]> {
    return await db.select().from(schema.projectTasks)
      .where(eq(schema.projectTasks.projectId, projectId));
  }
  
  async getProjectTasksByUnit(unitId: number): Promise<ProjectTask[]> {
    return await db.select().from(schema.projectTasks)
      .where(eq(schema.projectTasks.unitId, unitId));
  }
  
  async getProjectTasksByAssignee(userId: number): Promise<ProjectTask[]> {
    return await db.select().from(schema.projectTasks)
      .where(eq(schema.projectTasks.assignedTo, userId));
  }
  
  async getProjectTasksByStatus(status: string): Promise<ProjectTask[]> {
    return await db.select().from(schema.projectTasks)
      .where(eq(schema.projectTasks.status, status));
  }
  
  // Task Comment Methods
  async getTaskComment(id: number): Promise<TaskComment | undefined> {
    const [comment] = await db.select().from(schema.taskComments).where(eq(schema.taskComments.id, id));
    return comment;
  }
  
  async createTaskComment(insertComment: InsertTaskComment): Promise<TaskComment> {
    const [comment] = await db.insert(schema.taskComments).values({
      ...insertComment,
      timestamp: new Date()
    }).returning();
    return comment;
  }
  
  async getTaskCommentsByTask(taskId: number): Promise<TaskComment[]> {
    return await db.select().from(schema.taskComments)
      .where(eq(schema.taskComments.taskId, taskId));
  }
  
  // Project File Methods
  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const [file] = await db.select().from(schema.projectFiles).where(eq(schema.projectFiles.id, id));
    return file;
  }
  
  async createProjectFile(insertFile: InsertProjectFile): Promise<ProjectFile> {
    const [file] = await db.insert(schema.projectFiles).values({
      ...insertFile,
      uploadedAt: new Date()
    }).returning();
    return file;
  }
  
  async getProjectFilesByProject(projectId: number): Promise<ProjectFile[]> {
    return await db.select().from(schema.projectFiles)
      .where(eq(schema.projectFiles.projectId, projectId));
  }
  
  // AI Generated Plan Methods
  async getAiGeneratedPlan(id: number): Promise<AiGeneratedPlan | undefined> {
    const [plan] = await db.select().from(schema.aiGeneratedPlans).where(eq(schema.aiGeneratedPlans.id, id));
    return plan;
  }
  
  async createAiGeneratedPlan(insertPlan: InsertAiGeneratedPlan): Promise<AiGeneratedPlan> {
    const [plan] = await db.insert(schema.aiGeneratedPlans).values({
      ...insertPlan,
      createdAt: new Date()
    }).returning();
    return plan;
  }
  
  async updateAiGeneratedPlan(id: number, planData: Partial<AiGeneratedPlan>): Promise<AiGeneratedPlan | undefined> {
    const [updatedPlan] = await db.update(schema.aiGeneratedPlans)
      .set(planData)
      .where(eq(schema.aiGeneratedPlans.id, id))
      .returning();
    return updatedPlan;
  }
  
  async getAiGeneratedPlansByProject(projectId: number): Promise<AiGeneratedPlan[]> {
    return await db.select().from(schema.aiGeneratedPlans)
      .where(eq(schema.aiGeneratedPlans.projectId, projectId));
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
  
  // Cleaning Flags Methods
  async getCleaningFlag(id: number): Promise<CleaningFlag | undefined> {
    const [flag] = await db.select().from(schema.cleaningFlags).where(eq(schema.cleaningFlags.id, id));
    return flag;
  }
  
  async createCleaningFlag(insertFlag: InsertCleaningFlag): Promise<CleaningFlag> {
    const [flag] = await db.insert(schema.cleaningFlags).values({
      ...insertFlag,
      createdAt: new Date(),
      resolvedAt: null,
      photos: insertFlag.photos || null
    }).returning();
    
    // Update the cleaning task to indicate it has flagged issues
    if (insertFlag.cleaningTaskId) {
      await db.update(schema.cleaningTasks)
        .set({ hasFlaggedIssues: true })
        .where(eq(schema.cleaningTasks.id, insertFlag.cleaningTaskId));
    }
    
    return flag;
  }
  
  async updateCleaningFlag(id: number, flagData: Partial<CleaningFlag>): Promise<CleaningFlag | undefined> {
    // If flag is being marked as resolved, set resolvedAt
    if (flagData.status === 'resolved') {
      const [flag] = await db.select().from(schema.cleaningFlags).where(eq(schema.cleaningFlags.id, id));
      if (flag && flag.status !== 'resolved') {
        flagData.resolvedAt = new Date();
      }
    }
    
    const [updatedFlag] = await db.update(schema.cleaningFlags)
      .set(flagData)
      .where(eq(schema.cleaningFlags.id, id))
      .returning();
    return updatedFlag;
  }
  
  async getAllCleaningFlags(): Promise<CleaningFlag[]> {
    return await db.select().from(schema.cleaningFlags);
  }
  
  async getCleaningFlagsByTask(taskId: number): Promise<CleaningFlag[]> {
    return await db.select().from(schema.cleaningFlags)
      .where(eq(schema.cleaningFlags.cleaningTaskId, taskId));
  }
  
  async getCleaningFlagsByStatus(status: string): Promise<CleaningFlag[]> {
    return await db.select().from(schema.cleaningFlags)
      .where(eq(schema.cleaningFlags.status, status));
  }
  
  // Cleaner Performance Methods
  async getCleanerPerformance(id: number): Promise<CleanerPerformance | undefined> {
    const [performance] = await db.select().from(schema.cleanerPerformance).where(eq(schema.cleanerPerformance.id, id));
    return performance;
  }
  
  async createCleanerPerformance(insertPerformance: InsertCleanerPerformance): Promise<CleanerPerformance> {
    const [performance] = await db.insert(schema.cleanerPerformance).values({
      ...insertPerformance,
      tasksCompleted: insertPerformance.tasksCompleted || 0,
      avgScore: insertPerformance.avgScore || null,
      avgDuration: insertPerformance.avgDuration || null,
      flagsReceived: insertPerformance.flagsReceived || 0,
      onTimePercentage: insertPerformance.onTimePercentage || null,
      photoQualityScore: insertPerformance.photoQualityScore || null
    }).returning();
    return performance;
  }
  
  async updateCleanerPerformance(id: number, performanceData: Partial<CleanerPerformance>): Promise<CleanerPerformance | undefined> {
    const [updatedPerformance] = await db.update(schema.cleanerPerformance)
      .set(performanceData)
      .where(eq(schema.cleanerPerformance.id, id))
      .returning();
    return updatedPerformance;
  }
  
  async getAllCleanerPerformance(): Promise<CleanerPerformance[]> {
    return await db.select().from(schema.cleanerPerformance);
  }
  
  async getCleanerPerformanceByUser(userId: number): Promise<CleanerPerformance[]> {
    return await db.select().from(schema.cleanerPerformance)
      .where(eq(schema.cleanerPerformance.cleanerId, userId));
  }
  
  // HostAI Task Methods
  async getHostAiTask(id: number): Promise<HostAiTask | undefined> {
    const [task] = await db.select().from(schema.hostAiTasks).where(eq(schema.hostAiTasks.id, id));
    return task;
  }
  
  async createHostAiTask(insertTask: InsertHostAiTask): Promise<HostAiTask> {
    const now = new Date();
    const [task] = await db.insert(schema.hostAiTasks).values({
      ...insertTask,
      createdAt: now,
      updatedAt: now,
      status: insertTask.status || "new"
    }).returning();
    return task;
  }
  
  async updateHostAiTask(id: number, taskData: Partial<HostAiTask>): Promise<HostAiTask | undefined> {
    // Update the updatedAt timestamp
    taskData.updatedAt = new Date();
    
    const [updatedTask] = await db.update(schema.hostAiTasks)
      .set(taskData)
      .where(eq(schema.hostAiTasks.id, id))
      .returning();
    return updatedTask;
  }
  
  async getAllHostAiTasks(): Promise<HostAiTask[]> {
    return await db.select().from(schema.hostAiTasks);
  }
  
  async getHostAiTasksByStatus(status: string): Promise<HostAiTask[]> {
    return await db.select().from(schema.hostAiTasks).where(eq(schema.hostAiTasks.status, status));
  }
  
  async getHostAiTasksByAssignee(userId: number): Promise<HostAiTask[]> {
    return await db.select().from(schema.hostAiTasks).where(eq(schema.hostAiTasks.assignedToUserId, userId));
  }
  
  // HostAI Autopilot Settings Methods
  async getHostAiAutopilotSettings(userId: number): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined> {
    const [settings] = await db.select().from(schema.hostAiAutopilotSettings).where(eq(schema.hostAiAutopilotSettings.userId, userId));
    return settings;
  }
  
  async getHostAiAutopilotSettingsByUser(userId: number): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined> {
    const [settings] = await db.select().from(schema.hostAiAutopilotSettings).where(eq(schema.hostAiAutopilotSettings.userId, userId));
    return settings;
  }

  async createHostAiAutopilotSettings(settings: InsertHostAiAutopilotSettings): Promise<typeof hostAiAutopilotSettings.$inferSelect> {
    const [newSettings] = await db.insert(schema.hostAiAutopilotSettings).values({
      ...settings,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newSettings;
  }

  async updateHostAiAutopilotSettings(id: number, settingsData: Partial<typeof hostAiAutopilotSettings.$inferSelect>): Promise<typeof hostAiAutopilotSettings.$inferSelect | undefined> {
    const [updatedSettings] = await db.update(schema.hostAiAutopilotSettings)
      .set({
        ...settingsData,
        updatedAt: new Date()
      })
      .where(eq(schema.hostAiAutopilotSettings.id, id))
      .returning();
    return updatedSettings;
  }
  
  // HostAI Autopilot Log Methods
  async createHostAiAutopilotLog(log: InsertHostAiAutopilotLog): Promise<typeof hostAiAutopilotLog.$inferSelect> {
    const [newLog] = await db.insert(schema.hostAiAutopilotLog).values({
      ...log,
      createdAt: new Date()
    }).returning();
    return newLog;
  }

  async getHostAiAutopilotLogsByTask(taskId: number): Promise<typeof hostAiAutopilotLog.$inferSelect[]> {
    return await db.select().from(schema.hostAiAutopilotLog).where(eq(schema.hostAiAutopilotLog.taskId, taskId));
  }
  
  async getAllHostAiAutopilotLogs(): Promise<typeof hostAiAutopilotLog.$inferSelect[]> {
    return await db.select().from(schema.hostAiAutopilotLog)
      .orderBy(desc(schema.hostAiAutopilotLog.createdAt));
  }
}

export const storage = new DatabaseStorage();
