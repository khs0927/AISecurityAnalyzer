import { pgTable, text, serial, integer, boolean, timestamp, json, real, varchar, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  age: integer("age"),
  gender: text("gender"),
  role: text("role").default("user").notNull(), // 'user' or 'guardian'
  profileImage: text("profile_image"),
  medicalConditions: text("medical_conditions").array(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  age: true,
  gender: true,
  role: true,
  medicalConditions: true
});

// Health Data
export const healthData = pgTable("health_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  heartRate: integer("heart_rate"),
  oxygenLevel: real("oxygen_level"),
  temperature: real("temperature"),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  riskLevel: integer("risk_level"), // 0-100
  recordedAt: timestamp("recorded_at").defaultNow()
});

export const insertHealthDataSchema = createInsertSchema(healthData).pick({
  userId: true,
  heartRate: true,
  oxygenLevel: true,
  temperature: true,
  bloodPressureSystolic: true,
  bloodPressureDiastolic: true,
  riskLevel: true
});

// ECG Recordings
export const ecgRecordings = pgTable("ecg_recordings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  data: json("data").notNull(), // Array of ECG data points
  duration: integer("duration").notNull(), // in seconds
  abnormalities: text("abnormalities").array(),
  analysis: json("analysis"),
  recordedAt: timestamp("recorded_at").defaultNow()
});

export const insertEcgRecordingSchema = createInsertSchema(ecgRecordings).pick({
  userId: true,
  data: true,
  duration: true,
  abnormalities: true,
  analysis: true
});

// Guardian Relationships
export const guardianRelationships = pgTable("guardian_relationships", {
  id: serial("id").primaryKey(),
  guardianId: integer("guardian_id").notNull(),
  userId: integer("user_id").notNull(), // The user being monitored
  relationship: text("relationship"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertGuardianRelationshipSchema = createInsertSchema(guardianRelationships).pick({
  guardianId: true,
  userId: true,
  relationship: true
});

// Alerts
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  alertType: text("alert_type").notNull(), // 'risk', 'warning', 'info'
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  healthDataId: integer("health_data_id"),
  ecgRecordingId: integer("ecg_recording_id"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertAlertSchema = createInsertSchema(alerts).pick({
  userId: true,
  alertType: true,
  message: true,
  healthDataId: true,
  ecgRecordingId: true
});

// AI Consultations
export const aiConsultations = pgTable("ai_consultations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  messages: json("messages").notNull(), // Array of message objects
  category: text("category"), // 'symptoms', 'lifestyle', etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertAiConsultationSchema = createInsertSchema(aiConsultations).pick({
  userId: true,
  messages: true,
  category: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type HealthData = typeof healthData.$inferSelect;
export type InsertHealthData = z.infer<typeof insertHealthDataSchema>;

export type EcgRecording = typeof ecgRecordings.$inferSelect;
export type InsertEcgRecording = z.infer<typeof insertEcgRecordingSchema>;

export type GuardianRelationship = typeof guardianRelationships.$inferSelect;
export type InsertGuardianRelationship = z.infer<typeof insertGuardianRelationshipSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

// Emergency Contacts
export const emergencyContacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  relationship: text("relationship"),
  phoneNumber: text("phone_number").notNull(),
  isDefault: boolean("is_default").default(false),
  priority: integer("priority").default(1), // 1 highest, 2, 3, etc.
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).pick({
  userId: true,
  name: true,
  relationship: true,
  phoneNumber: true,
  isDefault: true,
  priority: true,
  lastContactedAt: true
});

// Medications
export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(), // e.g., 'once_daily', 'twice_daily', etc.
  timeOfDay: text("time_of_day").array(), // e.g., ['morning', 'evening']
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  description: text("description"),
  sideEffects: text("side_effects").array(),
  interactionWarnings: text("interaction_warnings").array(),
  imageUrl: text("image_url"),
  isCurrent: boolean("is_current").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertMedicationSchema = createInsertSchema(medications).pick({
  userId: true,
  name: true,
  dosage: true,
  frequency: true,
  timeOfDay: true,
  startDate: true,
  endDate: true,
  description: true,
  sideEffects: true,
  interactionWarnings: true,
  imageUrl: true,
  isCurrent: true
});

// Daily Health Reports
export const dailyReports = pgTable("daily_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  averageHeartRate: integer("average_heart_rate"),
  minHeartRate: integer("min_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  averageOxygenLevel: real("average_oxygen_level"),
  averageBloodPressureSystolic: integer("average_blood_pressure_systolic"),
  averageBloodPressureDiastolic: integer("average_blood_pressure_diastolic"),
  steps: integer("steps"),
  caloriesBurned: integer("calories_burned"),
  sleepDuration: integer("sleep_duration"), // in minutes
  sleepQuality: text("sleep_quality"), // 'poor', 'fair', 'good', 'excellent'
  riskAssessment: integer("risk_assessment"), // 0-100
  nutritionRecommendations: json("nutrition_recommendations"),
  activityRecommendations: json("activity_recommendations"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertDailyReportSchema = createInsertSchema(dailyReports).pick({
  userId: true,
  date: true,
  averageHeartRate: true,
  minHeartRate: true,
  maxHeartRate: true,
  averageOxygenLevel: true,
  averageBloodPressureSystolic: true,
  averageBloodPressureDiastolic: true,
  steps: true,
  caloriesBurned: true,
  sleepDuration: true,
  sleepQuality: true,
  riskAssessment: true,
  nutritionRecommendations: true,
  activityRecommendations: true
});

// Multimodal AI Analysis
export const aiAnalyses = pgTable("ai_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  analysisType: text("analysis_type").notNull(), // 'ecg', 'vital_signs', 'medication', 'comprehensive'
  input: json("input").notNull(), // The data used for analysis (multimodal)
  result: json("result").notNull(), // The analysis results
  confidence: real("confidence"), // Confidence score from 0-1
  models: text("models").array(), // Which AI models were used
  processingTime: integer("processing_time"), // in milliseconds
  createdAt: timestamp("created_at").defaultNow()
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalyses).pick({
  userId: true,
  analysisType: true,
  input: true,
  result: true,
  confidence: true,
  models: true,
  processingTime: true
});

// Emergency Events
export const emergencyEvents = pgTable("emergency_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  triggeredBy: text("triggered_by").notNull(), // 'system', 'user', 'guardian'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  status: text("status").default("active").notNull(), // 'active', 'resolved', 'false_alarm'
  healthDataId: integer("health_data_id"),
  ecgRecordingId: integer("ecg_recording_id"),
  aiAnalysisId: integer("ai_analysis_id"),
  contactedEmergencyServices: boolean("contacted_emergency_services").default(false),
  contactedEmergencyContacts: boolean("contacted_emergency_contacts").default(false),
  location: json("location"), // { lat: number, long: number }
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertEmergencyEventSchema = createInsertSchema(emergencyEvents).pick({
  userId: true,
  triggeredBy: true,
  severity: true,
  status: true,
  healthDataId: true,
  ecgRecordingId: true,
  aiAnalysisId: true,
  contactedEmergencyServices: true,
  contactedEmergencyContacts: true,
  location: true,
  notes: true
});

export type AiConsultation = typeof aiConsultations.$inferSelect;
export type InsertAiConsultation = z.infer<typeof insertAiConsultationSchema>;

// New Types
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;

export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;

export type EmergencyEvent = typeof emergencyEvents.$inferSelect;
export type InsertEmergencyEvent = z.infer<typeof insertEmergencyEventSchema>;

// Hospitals Table - 병원 정보 (건강보험심사평가원 API)
export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  hiraId: text("hira_id").unique(), // 건강보험심사평가원 병원 ID
  name: text("name").notNull(), // 병원 이름
  type: text("type"), // 병원 유형 (종합병원, 의원, 한의원 등)
  category: text("category"), // 병원 분류 (내과, 외과, 정형외과 등)
  address: text("address"), // 주소
  zipCode: text("zip_code"), // 우편번호
  phone: text("phone"), // 전화번호
  latitude: doublePrecision("latitude"), // 위도
  longitude: doublePrecision("longitude"), // 경도
  isEmergency: boolean("is_emergency").default(false), // 응급실 운영 여부
  isOpen24h: boolean("is_open_24h").default(false), // 24시간 운영 여부
  isHeartCenter: boolean("is_heart_center").default(false), // 심장 전문 센터 여부
  specialty: text("specialty").array(), // 전문 분야들
  openingHours: json("opening_hours"), // 운영 시간 정보 (JSON 형식으로 저장)
  websiteUrl: text("website_url"), // 웹사이트 주소
  imageUrl: text("image_url"), // 병원 이미지 URL
  updatedAt: timestamp("updated_at").defaultNow(), // 마지막 업데이트 시간
  createdAt: timestamp("created_at").defaultNow() // 생성 시간
});

export const insertHospitalSchema = createInsertSchema(hospitals).pick({
  hiraId: true,
  name: true,
  type: true,
  category: true,
  address: true,
  zipCode: true,
  phone: true,
  latitude: true,
  longitude: true,
  isEmergency: true,
  isOpen24h: true,
  isHeartCenter: true,
  specialty: true,
  openingHours: true,
  websiteUrl: true,
  imageUrl: true
});

// 병원 부서/과 정보
export const hospitalDepartments = pgTable("hospital_departments", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull(), // 병원 ID
  name: text("name").notNull(), // 부서/과 이름
  doctors: integer("doctors"), // 의사 수
  description: text("description"), // 부서 설명
  createdAt: timestamp("created_at").defaultNow()
});

// 응급실 운영 현황 정보 (실시간)
export const emergencyRoomStatus = pgTable("emergency_room_status", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull(), // 병원 ID
  availableBeds: integer("available_beds"), // 가용 병상 수
  totalBeds: integer("total_beds"), // 전체 병상 수
  status: text("status"), // 상태 (운영중, 과밀화, 인력부족 등)
  waitTime: integer("wait_time"), // 예상 대기 시간 (분)
  updatedAt: timestamp("updated_at").defaultNow() // 마지막 업데이트 시간
});

// 병원 리뷰
export const hospitalReviews = pgTable("hospital_reviews", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull(), // 병원 ID
  userId: integer("user_id").notNull(), // 리뷰 작성자
  rating: integer("rating").notNull(), // 평점 (1-5)
  reviewText: text("review_text"), // 리뷰 내용
  visitDate: timestamp("visit_date"), // 방문 날짜
  createdAt: timestamp("created_at").defaultNow()
});

// 약국 정보
export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  hiraId: text("hira_id").unique(), // 약국 ID
  name: text("name").notNull(), // 약국 이름
  address: text("address"), // 주소
  phone: text("phone"), // 전화번호
  latitude: doublePrecision("latitude"), // 위도
  longitude: doublePrecision("longitude"), // 경도
  isOpen24h: boolean("is_open_24h").default(false), // 24시간 운영 여부
  openingHours: json("opening_hours"), // 운영 시간 정보
  updatedAt: timestamp("updated_at").defaultNow(), // 마지막 업데이트 시간
  createdAt: timestamp("created_at").defaultNow() // 생성 시간
});

// 추가된 타입들
export type Hospital = typeof hospitals.$inferSelect;
export type InsertHospital = z.infer<typeof insertHospitalSchema>;

export type HospitalDepartment = typeof hospitalDepartments.$inferSelect;
export type EmergencyRoomStatus = typeof emergencyRoomStatus.$inferSelect;
export type HospitalReview = typeof hospitalReviews.$inferSelect;
export type Pharmacy = typeof pharmacies.$inferSelect;
