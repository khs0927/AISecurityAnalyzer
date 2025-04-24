import { 
  users, User, InsertUser,
  healthData, HealthData, InsertHealthData,
  ecgRecordings, EcgRecording, InsertEcgRecording,
  guardianRelationships, GuardianRelationship, InsertGuardianRelationship,
  alerts, Alert, InsertAlert,
  aiConsultations, AiConsultation, InsertAiConsultation,
  emergencyContacts, EmergencyContact, InsertEmergencyContact,
  medications, Medication, InsertMedication,
  dailyReports, DailyReport, InsertDailyReport,
  aiAnalyses, AiAnalysis, InsertAiAnalysis,
  emergencyEvents, EmergencyEvent, InsertEmergencyEvent
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Health data operations
  getHealthData(id: number): Promise<HealthData | undefined>;
  getHealthDataByUserId(userId: number): Promise<HealthData[]>;
  createHealthData(data: InsertHealthData): Promise<HealthData>;
  getLatestHealthData(userId: number): Promise<HealthData | undefined>;
  
  // ECG recording operations
  getEcgRecording(id: number): Promise<EcgRecording | undefined>;
  getEcgRecordingsByUserId(userId: number): Promise<EcgRecording[]>;
  createEcgRecording(recording: InsertEcgRecording): Promise<EcgRecording>;
  
  // Guardian relationship operations
  getGuardianRelationship(id: number): Promise<GuardianRelationship | undefined>;
  getGuardianRelationshipsByGuardianId(guardianId: number): Promise<GuardianRelationship[]>;
  getGuardianRelationshipsByUserId(userId: number): Promise<GuardianRelationship[]>;
  createGuardianRelationship(relationship: InsertGuardianRelationship): Promise<GuardianRelationship>;
  
  // Alert operations
  getAlert(id: number): Promise<Alert | undefined>;
  getAlertsByUserId(userId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<Alert | undefined>;
  
  // AI consultation operations
  getAiConsultation(id: number): Promise<AiConsultation | undefined>;
  getAiConsultationsByUserId(userId: number): Promise<AiConsultation[]>;
  createAiConsultation(consultation: InsertAiConsultation): Promise<AiConsultation>;
  updateAiConsultation(id: number, consultation: Partial<InsertAiConsultation>): Promise<AiConsultation | undefined>;
  
  // Emergency contact operations
  getEmergencyContact(id: number): Promise<EmergencyContact | undefined>;
  getEmergencyContactsByUserId(userId: number): Promise<EmergencyContact[]>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: number, contact: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined>;
  deleteEmergencyContact(id: number): Promise<boolean>;
  
  // Medication operations
  getMedication(id: number): Promise<Medication | undefined>;
  getMedicationsByUserId(userId: number): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: number, medication: Partial<InsertMedication>): Promise<Medication | undefined>;
  deleteMedication(id: number): Promise<boolean>;
  
  // Daily report operations
  getDailyReport(id: number): Promise<DailyReport | undefined>;
  getDailyReportsByUserId(userId: number, limit?: number): Promise<DailyReport[]>;
  getDailyReportByDate(userId: number, date: Date): Promise<DailyReport | undefined>;
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  
  // AI Analysis operations
  getAiAnalysis(id: number): Promise<AiAnalysis | undefined>;
  getAiAnalysesByUserId(userId: number, analysisType?: string): Promise<AiAnalysis[]>;
  createAiAnalysis(analysis: InsertAiAnalysis): Promise<AiAnalysis>;
  
  // Emergency events operations
  getEmergencyEvent(id: number): Promise<EmergencyEvent | undefined>;
  getEmergencyEventsByUserId(userId: number, status?: string): Promise<EmergencyEvent[]>;
  createEmergencyEvent(event: InsertEmergencyEvent): Promise<EmergencyEvent>;
  updateEmergencyEventStatus(id: number, status: string, notes?: string): Promise<EmergencyEvent | undefined>;
  
  // Additional operations
  getUsersMonitoredByGuardian(guardianId: number): Promise<User[]>;
  getUserWithLatestHealthData(userId: number): Promise<{user: User, healthData: HealthData | undefined}>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private healthDataStore: Map<number, HealthData> = new Map();
  private ecgRecordings: Map<number, EcgRecording> = new Map();
  private guardianRelationships: Map<number, GuardianRelationship> = new Map();
  private alerts: Map<number, Alert> = new Map();
  private aiConsultations: Map<number, AiConsultation> = new Map();
  private emergencyContacts: Map<number, EmergencyContact> = new Map();
  private medications: Map<number, Medication> = new Map();
  private dailyReports: Map<number, DailyReport> = new Map();
  private aiAnalyses: Map<number, AiAnalysis> = new Map();
  private emergencyEvents: Map<number, EmergencyEvent> = new Map();
  
  private userIdCounter = 1;
  private healthDataIdCounter = 1;
  private ecgRecordingIdCounter = 1;
  private guardianRelationshipIdCounter = 1;
  private alertIdCounter = 1;
  private aiConsultationIdCounter = 1;
  private emergencyContactIdCounter = 1;
  private medicationIdCounter = 1;
  private dailyReportIdCounter = 1;
  private aiAnalysisIdCounter = 1;
  private emergencyEventIdCounter = 1;

  // User operations
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
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Health data operations
  async getHealthData(id: number): Promise<HealthData | undefined> {
    return this.healthDataStore.get(id);
  }

  async getHealthDataByUserId(userId: number): Promise<HealthData[]> {
    return Array.from(this.healthDataStore.values()).filter(
      data => data.userId === userId
    ).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async createHealthData(data: InsertHealthData): Promise<HealthData> {
    const id = this.healthDataIdCounter++;
    const recordedAt = new Date();
    const healthData: HealthData = { ...data, id, recordedAt };
    this.healthDataStore.set(id, healthData);
    return healthData;
  }

  async getLatestHealthData(userId: number): Promise<HealthData | undefined> {
    const userHealthData = await this.getHealthDataByUserId(userId);
    return userHealthData.length > 0 ? userHealthData[0] : undefined;
  }

  // ECG recording operations
  async getEcgRecording(id: number): Promise<EcgRecording | undefined> {
    return this.ecgRecordings.get(id);
  }

  async getEcgRecordingsByUserId(userId: number): Promise<EcgRecording[]> {
    return Array.from(this.ecgRecordings.values()).filter(
      recording => recording.userId === userId
    ).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async createEcgRecording(recording: InsertEcgRecording): Promise<EcgRecording> {
    const id = this.ecgRecordingIdCounter++;
    const recordedAt = new Date();
    const ecgRecording: EcgRecording = { ...recording, id, recordedAt };
    this.ecgRecordings.set(id, ecgRecording);
    return ecgRecording;
  }

  // Guardian relationship operations
  async getGuardianRelationship(id: number): Promise<GuardianRelationship | undefined> {
    return this.guardianRelationships.get(id);
  }

  async getGuardianRelationshipsByGuardianId(guardianId: number): Promise<GuardianRelationship[]> {
    return Array.from(this.guardianRelationships.values()).filter(
      rel => rel.guardianId === guardianId
    );
  }

  async getGuardianRelationshipsByUserId(userId: number): Promise<GuardianRelationship[]> {
    return Array.from(this.guardianRelationships.values()).filter(
      rel => rel.userId === userId
    );
  }

  async createGuardianRelationship(relationship: InsertGuardianRelationship): Promise<GuardianRelationship> {
    const id = this.guardianRelationshipIdCounter++;
    const createdAt = new Date();
    const guardianRelationship: GuardianRelationship = { ...relationship, id, createdAt };
    this.guardianRelationships.set(id, guardianRelationship);
    return guardianRelationship;
  }

  // Alert operations
  async getAlert(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async getAlertsByUserId(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(
      alert => alert.userId === userId
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.alertIdCounter++;
    const createdAt = new Date();
    const newAlert: Alert = { ...alert, id, read: false, createdAt };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<Alert | undefined> {
    const alert = await this.getAlert(id);
    if (!alert) return undefined;
    
    const updatedAlert = { ...alert, read: true };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  // AI consultation operations
  async getAiConsultation(id: number): Promise<AiConsultation | undefined> {
    return this.aiConsultations.get(id);
  }

  async getAiConsultationsByUserId(userId: number): Promise<AiConsultation[]> {
    return Array.from(this.aiConsultations.values()).filter(
      consultation => consultation.userId === userId
    ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async createAiConsultation(consultation: InsertAiConsultation): Promise<AiConsultation> {
    const id = this.aiConsultationIdCounter++;
    const now = new Date();
    const aiConsultation: AiConsultation = { ...consultation, id, createdAt: now, updatedAt: now };
    this.aiConsultations.set(id, aiConsultation);
    return aiConsultation;
  }

  async updateAiConsultation(id: number, consultationData: Partial<InsertAiConsultation>): Promise<AiConsultation | undefined> {
    const consultation = await this.getAiConsultation(id);
    if (!consultation) return undefined;
    
    const updatedConsultation: AiConsultation = { 
      ...consultation, 
      ...consultationData, 
      updatedAt: new Date() 
    };
    this.aiConsultations.set(id, updatedConsultation);
    return updatedConsultation;
  }

  // Additional operations
  async getUsersMonitoredByGuardian(guardianId: number): Promise<User[]> {
    const relationships = await this.getGuardianRelationshipsByGuardianId(guardianId);
    const userIds = relationships.map(rel => rel.userId);
    
    const users: User[] = [];
    for (const userId of userIds) {
      const user = await this.getUser(userId);
      if (user) users.push(user);
    }
    
    return users;
  }

  async getUserWithLatestHealthData(userId: number): Promise<{user: User, healthData: HealthData | undefined}> {
    const user = await this.getUser(userId);
    if (!user) throw new Error(`User with id ${userId} not found`);
    
    const latestHealthData = await this.getLatestHealthData(userId);
    return { user, healthData: latestHealthData };
  }

  // Emergency contact operations
  async getEmergencyContact(id: number): Promise<EmergencyContact | undefined> {
    return this.emergencyContacts.get(id);
  }

  async getEmergencyContactsByUserId(userId: number): Promise<EmergencyContact[]> {
    return Array.from(this.emergencyContacts.values())
      .filter(contact => contact.userId === userId)
      .sort((a, b) => a.priority - b.priority);
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    const id = this.emergencyContactIdCounter++;
    const createdAt = new Date();
    const emergencyContact: EmergencyContact = { 
      ...contact, 
      id, 
      lastContactedAt: null,
      createdAt 
    };
    this.emergencyContacts.set(id, emergencyContact);
    return emergencyContact;
  }

  async updateEmergencyContact(id: number, contactData: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined> {
    const contact = await this.getEmergencyContact(id);
    if (!contact) return undefined;
    
    const updatedContact: EmergencyContact = { ...contact, ...contactData };
    this.emergencyContacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteEmergencyContact(id: number): Promise<boolean> {
    const exists = this.emergencyContacts.has(id);
    if (exists) {
      this.emergencyContacts.delete(id);
      return true;
    }
    return false;
  }

  // Medication operations
  async getMedication(id: number): Promise<Medication | undefined> {
    return this.medications.get(id);
  }

  async getMedicationsByUserId(userId: number): Promise<Medication[]> {
    return Array.from(this.medications.values())
      .filter(medication => medication.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const id = this.medicationIdCounter++;
    const now = new Date();
    const newMedication: Medication = { 
      ...medication, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.medications.set(id, newMedication);
    return newMedication;
  }

  async updateMedication(id: number, medicationData: Partial<InsertMedication>): Promise<Medication | undefined> {
    const medication = await this.getMedication(id);
    if (!medication) return undefined;
    
    const updatedMedication: Medication = { 
      ...medication, 
      ...medicationData, 
      updatedAt: new Date() 
    };
    this.medications.set(id, updatedMedication);
    return updatedMedication;
  }

  async deleteMedication(id: number): Promise<boolean> {
    const exists = this.medications.has(id);
    if (exists) {
      this.medications.delete(id);
      return true;
    }
    return false;
  }

  // Daily report operations
  async getDailyReport(id: number): Promise<DailyReport | undefined> {
    return this.dailyReports.get(id);
  }

  async getDailyReportsByUserId(userId: number, limit?: number): Promise<DailyReport[]> {
    const reports = Array.from(this.dailyReports.values())
      .filter(report => report.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return limit ? reports.slice(0, limit) : reports;
  }

  async getDailyReportByDate(userId: number, date: Date): Promise<DailyReport | undefined> {
    // Format date to only compare year, month, day
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return Array.from(this.dailyReports.values()).find(report => {
      const reportDate = new Date(report.date);
      reportDate.setHours(0, 0, 0, 0);
      return report.userId === userId && reportDate.getTime() === targetDate.getTime();
    });
  }

  async createDailyReport(report: InsertDailyReport): Promise<DailyReport> {
    const id = this.dailyReportIdCounter++;
    const createdAt = new Date();
    const dailyReport: DailyReport = { ...report, id, createdAt };
    this.dailyReports.set(id, dailyReport);
    return dailyReport;
  }

  // AI Analysis operations
  async getAiAnalysis(id: number): Promise<AiAnalysis | undefined> {
    return this.aiAnalyses.get(id);
  }

  async getAiAnalysesByUserId(userId: number, analysisType?: string): Promise<AiAnalysis[]> {
    let analyses = Array.from(this.aiAnalyses.values())
      .filter(analysis => analysis.userId === userId);
    
    if (analysisType) {
      analyses = analyses.filter(analysis => analysis.analysisType === analysisType);
    }
    
    return analyses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createAiAnalysis(analysis: InsertAiAnalysis): Promise<AiAnalysis> {
    const id = this.aiAnalysisIdCounter++;
    const createdAt = new Date();
    const aiAnalysis: AiAnalysis = { ...analysis, id, createdAt };
    this.aiAnalyses.set(id, aiAnalysis);
    return aiAnalysis;
  }

  // Emergency events operations
  async getEmergencyEvent(id: number): Promise<EmergencyEvent | undefined> {
    return this.emergencyEvents.get(id);
  }

  async getEmergencyEventsByUserId(userId: number, status?: string): Promise<EmergencyEvent[]> {
    let events = Array.from(this.emergencyEvents.values())
      .filter(event => event.userId === userId);
    
    if (status) {
      events = events.filter(event => event.status === status);
    }
    
    return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createEmergencyEvent(event: InsertEmergencyEvent): Promise<EmergencyEvent> {
    const id = this.emergencyEventIdCounter++;
    const createdAt = new Date();
    const emergencyEvent: EmergencyEvent = { 
      ...event, 
      id, 
      resolvedAt: null,
      createdAt 
    };
    this.emergencyEvents.set(id, emergencyEvent);
    return emergencyEvent;
  }

  async updateEmergencyEventStatus(id: number, status: string, notes?: string): Promise<EmergencyEvent | undefined> {
    const event = await this.getEmergencyEvent(id);
    if (!event) return undefined;
    
    const resolvedAt = (status === 'resolved' || status === 'false_alarm') ? new Date() : event.resolvedAt;
    
    const updatedEvent: EmergencyEvent = { 
      ...event, 
      status,
      notes: notes !== undefined ? notes : event.notes,
      resolvedAt
    };
    this.emergencyEvents.set(id, updatedEvent);
    return updatedEvent;
  }
}

export const storage = new MemStorage();
