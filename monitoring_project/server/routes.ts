import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertHealthDataSchema, 
  insertEcgRecordingSchema,
  insertGuardianRelationshipSchema, 
  insertAlertSchema,
  insertAiConsultationSchema,
  insertEmergencyContactSchema,
  insertMedicationSchema,
  insertDailyReportSchema,
  insertAiAnalysisSchema,
  insertEmergencyEventSchema,
  hospitals,
  hospitalDepartments,
  pharmacies
} from "@shared/schema";
import { ZodError } from "zod";
import { generateHealthConsultationResponse, analyzeECGData, analyzeHealthRisk } from "./aiModels";
import mobileApiRouter from "./mobileApi";
import { db } from "./db";
import { asc, desc, eq, and, or, between, sql, like, not, isNull, is } from "drizzle-orm";

// Websocket clients mapping
type Client = {
  ws: WebSocket;
  userId?: number;
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients: Client[] = [];
  
  // Expo 연결을 위한 정적 파일 제공
  app.use('/static', express.static('static'));
  
  // Expo 연결 페이지 및 디버그 페이지 라우트
  app.get('/connect', (req, res) => {
    res.redirect('/static/heart-care-connection.html');
  });
  
  app.get('/debug', (req, res) => {
    res.redirect('/static/heart-care-debug.html');
  });
  
  app.get('/expo-control', (req, res) => {
    res.redirect('/static/expo-control.html');
  });

  // 스마트워치 연결 API 엔드포인트 추가
  app.get('/api/users/:userId/smartwatch-connections', async (req, res) => {
    // 데모를 위한 스마트워치 연결 정보 반환
    res.json([
      {
        id: '1',
        type: 'apple',
        name: 'Apple Watch',
        model: 'Series 7',
        batteryLevel: 78,
        firmwareVersion: '8.5.1',
        lastSynced: new Date().toISOString(),
        connected: true,
        updateAvailable: true
      }
    ]);
  });

  wss.on('connection', (ws) => {
    const client: Client = { ws };
    clients.push(client);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === 'auth') {
          client.userId = parseInt(data.userId);
        }
        
        // Handle ECG data streaming
        if (data.type === 'ecgData' && client.userId) {
          // Broadcast to guardians watching this user
          const relationships = await storage.getGuardianRelationshipsByUserId(client.userId);
          const guardianIds = relationships.map(rel => rel.guardianId);
          
          // Find guardian clients
          clients.forEach(guardianClient => {
            if (guardianClient.userId && guardianIds.includes(guardianClient.userId) && 
                guardianClient.ws.readyState === WebSocket.OPEN) {
              guardianClient.ws.send(JSON.stringify({
                type: 'ecgUpdate',
                userId: client.userId,
                data: data.data
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      const index = clients.findIndex(c => c.ws === ws);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });
  });

  // Broadcast to specific user
  const broadcastToUser = (userId: number, data: any) => {
    clients.forEach(client => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    });
  };

  // Broadcast to guardians of a user
  const broadcastToGuardians = async (userId: number, data: any) => {
    const relationships = await storage.getGuardianRelationshipsByUserId(userId);
    const guardianIds = relationships.map(rel => rel.guardianId);
    
    clients.forEach(client => {
      if (client.userId && guardianIds.includes(client.userId) && 
          client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    });
  };

  // User routes
  app.post('/api/users', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create user' });
      }
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      const user = await storage.updateUser(id, userData);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Health data routes
  app.post('/api/health-data', async (req, res) => {
    try {
      const healthData = insertHealthDataSchema.parse(req.body);
      const data = await storage.createHealthData(healthData);
      
      // Check if the risk level is high and create an alert if needed
      if (data.riskLevel && data.riskLevel > 50) {
        const alert = await storage.createAlert({
          userId: data.userId,
          alertType: data.riskLevel > 70 ? 'risk' : 'warning',
          message: data.riskLevel > 70 
            ? '높은 위험: 심장 건강 경고 발생' 
            : '주의 필요: 심장 건강 위험 상승',
          healthDataId: data.id
        });
        
        // Notify user and guardians about the alert
        const alertData = {
          type: 'alert',
          alert
        };
        
        broadcastToUser(data.userId, alertData);
        await broadcastToGuardians(data.userId, alertData);
      }
      
      res.status(201).json(data);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid health data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create health data' });
      }
    }
  });

  app.get('/api/users/:userId/health-data', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const data = await storage.getHealthDataByUserId(userId);
    res.json(data);
  });

  app.get('/api/users/:userId/health-data/latest', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const data = await storage.getLatestHealthData(userId);
    
    if (!data) {
      return res.status(404).json({ message: 'No health data found for this user' });
    }
    
    res.json(data);
  });

  // ECG recording routes
  app.post('/api/ecg-recordings', async (req, res) => {
    try {
      const recording = insertEcgRecordingSchema.parse(req.body);
      const savedRecording = await storage.createEcgRecording(recording);
      
      // Check for abnormalities and create alerts if needed
      if (savedRecording.abnormalities && savedRecording.abnormalities.length > 0) {
        const alert = await storage.createAlert({
          userId: savedRecording.userId,
          alertType: 'risk',
          message: `ECG 이상 감지: ${savedRecording.abnormalities.join(', ')}`,
          ecgRecordingId: savedRecording.id
        });
        
        // Notify user and guardians
        const alertData = {
          type: 'alert',
          alert
        };
        
        broadcastToUser(savedRecording.userId, alertData);
        await broadcastToGuardians(savedRecording.userId, alertData);
      }
      
      res.status(201).json(savedRecording);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid ECG recording data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to save ECG recording' });
      }
    }
  });

  app.get('/api/users/:userId/ecg-recordings', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const recordings = await storage.getEcgRecordingsByUserId(userId);
    res.json(recordings);
  });

  // Guardian relationship routes
  app.post('/api/guardian-relationships', async (req, res) => {
    try {
      const relationship = insertGuardianRelationshipSchema.parse(req.body);
      const savedRelationship = await storage.createGuardianRelationship(relationship);
      res.status(201).json(savedRelationship);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid relationship data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create guardian relationship' });
      }
    }
  });

  app.get('/api/guardians/:guardianId/monitored-users', async (req, res) => {
    const guardianId = parseInt(req.params.guardianId);
    const users = await storage.getUsersMonitoredByGuardian(guardianId);
    
    // Fetch latest health data for each user
    const usersWithData = await Promise.all(
      users.map(async (user) => {
        const healthData = await storage.getLatestHealthData(user.id);
        return { 
          ...user, 
          healthData 
        };
      })
    );
    
    res.json(usersWithData);
  });

  // Alert routes
  app.get('/api/users/:userId/alerts', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const alerts = await storage.getAlertsByUserId(userId);
    res.json(alerts);
  });

  app.post('/api/alerts/:id/read', async (req, res) => {
    const id = parseInt(req.params.id);
    const alert = await storage.markAlertAsRead(id);
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    res.json(alert);
  });

  // AI consultation routes
  // AI-powered consultation endpoints
  app.post('/api/ai-chat', async (req, res) => {
    try {
      const { userId, message, context = "" } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ message: 'userId and message are required' });
      }
      
      // Generate AI response using OpenAI
      const aiResponse = await generateHealthConsultationResponse(message, context);
      
      // Save the consultation record with proper JSON formatting
      const messagesJSON = JSON.stringify([
        { sender: 'user', content: message, timestamp: new Date().toISOString() },
        { sender: 'ai', content: aiResponse, timestamp: new Date().toISOString() }
      ]);

      const consultation = await storage.createAiConsultation({
        userId,
        messages: messagesJSON as any,
        category: 'general'
      });
      
      res.json({ consultation, aiResponse });
    } catch (error) {
      console.error('AI Chat Error:', error);
      res.status(500).json({ 
        message: 'AI consultation failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  app.post('/api/ai-analyze/ecg', async (req, res) => {
    try {
      const { userId, ecgData, userInfo } = req.body;
      
      if (!userId || !ecgData || !Array.isArray(ecgData)) {
        return res.status(400).json({ message: 'userId and valid ecgData array are required' });
      }
      
      // Get user information if not provided
      const user = userInfo || await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Analyze ECG data using OpenAI
      const analysis = await analyzeECGData(ecgData, user);
      
      // Store the ECG recording with analysis
      const recording = await storage.createEcgRecording({
        userId,
        data: ecgData,
        duration: ecgData.length / 250, // Assuming 250Hz sampling rate
        abnormalities: analysis.detectedIssues,
        analysis: {
          summary: analysis.summary,
          riskLevel: analysis.riskLevel,
          recommendations: analysis.recommendations
        }
      });
      
      // Create an alert if risk level is high or critical
      if (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical') {
        const alert = await storage.createAlert({
          userId,
          alertType: 'risk',
          message: `ECG 분석 위험 감지: ${analysis.detectedIssues.join(', ')}`,
          ecgRecordingId: recording.id
        });
        
        // Notify user and guardians
        const alertData = {
          type: 'alert',
          alert
        };
        
        broadcastToUser(userId, alertData);
        await broadcastToGuardians(userId, alertData);
      }
      
      res.json({ recording, analysis });
    } catch (error) {
      console.error('ECG Analysis Error:', error);
      res.status(500).json({ 
        message: 'ECG analysis failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  app.post('/api/ai-analyze/risk', async (req, res) => {
    try {
      const { userId, healthData } = req.body;
      
      if (!userId || !healthData) {
        return res.status(400).json({ message: 'userId and healthData are required' });
      }
      
      // Get user information if not in healthData
      if (!healthData.age || !healthData.gender) {
        const user = await storage.getUser(userId);
        if (user) {
          healthData.age = user.age;
          healthData.gender = user.gender;
          healthData.riskFactors = healthData.riskFactors || [];
          
          // Add medical conditions as risk factors if available
          if (user.medicalConditions && user.medicalConditions.length > 0) {
            healthData.medicalConditions = user.medicalConditions;
          }
        }
      }
      
      // Analyze health risk using OpenAI
      const riskAnalysis = await analyzeHealthRisk(healthData);
      
      // Store health data with risk score
      const storedHealthData = await storage.createHealthData({
        userId,
        heartRate: healthData.heartRate,
        oxygenLevel: healthData.oxygenLevel,
        temperature: healthData.temperature,
        bloodPressureSystolic: healthData.bloodPressureSystolic,
        bloodPressureDiastolic: healthData.bloodPressureDiastolic,
        riskLevel: riskAnalysis.overallRiskScore
      });
      
      // Create an alert if risk score is high
      if (riskAnalysis.overallRiskScore > 70) {
        const alert = await storage.createAlert({
          userId,
          alertType: 'risk',
          message: `높은 위험 점수: ${riskAnalysis.overallRiskScore}%, 즉시 주의가 필요합니다`,
          healthDataId: storedHealthData.id
        });
        
        // Notify user and guardians
        const alertData = {
          type: 'alert',
          alert
        };
        
        broadcastToUser(userId, alertData);
        await broadcastToGuardians(userId, alertData);
      }
      
      res.json({ healthData: storedHealthData, riskAnalysis });
    } catch (error) {
      console.error('Risk Analysis Error:', error);
      res.status(500).json({ 
        message: 'Health risk analysis failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post('/api/ai-consultations', async (req, res) => {
    try {
      const consultation = insertAiConsultationSchema.parse(req.body);
      const savedConsultation = await storage.createAiConsultation(consultation);
      res.status(201).json(savedConsultation);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid consultation data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create AI consultation' });
      }
    }
  });

  app.put('/api/ai-consultations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const consultationData = req.body;
      const consultation = await storage.updateAiConsultation(id, consultationData);
      
      if (!consultation) {
        return res.status(404).json({ message: 'Consultation not found' });
      }
      
      res.json(consultation);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update consultation' });
    }
  });

  app.get('/api/users/:userId/ai-consultations', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const consultations = await storage.getAiConsultationsByUserId(userId);
    res.json(consultations);
  });

  // Simulation endpoints for demo purposes
  app.post('/api/simulate/risk-level', async (req, res) => {
    try {
      const { userId, riskLevel } = req.body;
      
      if (!userId || riskLevel === undefined) {
        return res.status(400).json({ message: 'userId and riskLevel are required' });
      }
      
      // Create health data with the simulated risk level
      const healthData = await storage.createHealthData({
        userId,
        heartRate: Math.floor(70 + riskLevel / 2),
        oxygenLevel: Math.max(90, 100 - riskLevel / 10),
        temperature: 36.5 + (riskLevel > 50 ? 0.8 : 0),
        bloodPressureSystolic: Math.floor(120 + riskLevel),
        bloodPressureDiastolic: Math.floor(80 + riskLevel / 2),
        riskLevel
      });
      
      // Notify clients
      const data = {
        type: 'healthUpdate',
        healthData
      };
      
      broadcastToUser(userId, data);
      await broadcastToGuardians(userId, data);
      
      res.json(healthData);
    } catch (error) {
      res.status(500).json({ message: 'Simulation failed' });
    }
  });

  app.post('/api/simulate/ecg-anomaly', async (req, res) => {
    try {
      const { userId, anomalyType } = req.body;
      
      if (!userId || !anomalyType) {
        return res.status(400).json({ message: 'userId and anomalyType are required' });
      }
      
      // Create an ECG recording with the simulated anomaly
      const recording = await storage.createEcgRecording({
        userId,
        data: [], // In a real app, this would contain ECG data points
        duration: 30,
        abnormalities: [anomalyType],
        analysis: {
          severity: 'high',
          confidence: 0.92,
          recommendation: '즉시 의료 조치가 필요합니다.'
        }
      });
      
      // Create an alert for this anomaly
      const alert = await storage.createAlert({
        userId,
        alertType: 'risk',
        message: `ECG 이상 감지: ${anomalyType}`,
        ecgRecordingId: recording.id
      });
      
      // Notify clients
      const alertData = {
        type: 'alert',
        alert
      };
      
      broadcastToUser(userId, alertData);
      await broadcastToGuardians(userId, alertData);
      
      res.json({ recording, alert });
    } catch (error) {
      res.status(500).json({ message: 'Simulation failed' });
    }
  });

  // Emergency Contact routes
  app.get('/api/users/:userId/emergency-contacts', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const contacts = await storage.getEmergencyContactsByUserId(userId);
    res.json(contacts);
  });

  app.post('/api/emergency-contacts', async (req, res) => {
    try {
      const contactData = insertEmergencyContactSchema.parse(req.body);
      
      // If this contact is set as default, unset any existing default contacts
      if (contactData.isDefault) {
        const existingContacts = await storage.getEmergencyContactsByUserId(contactData.userId);
        for (const contact of existingContacts) {
          if (contact.isDefault) {
            await storage.updateEmergencyContact(contact.id, { isDefault: false });
          }
        }
      }
      
      const contact = await storage.createEmergencyContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid emergency contact data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create emergency contact' });
      }
    }
  });

  app.put('/api/emergency-contacts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contactData = req.body;
      
      // If updating to make this contact default
      if (contactData.isDefault) {
        const contact = await storage.getEmergencyContact(id);
        if (contact) {
          const existingContacts = await storage.getEmergencyContactsByUserId(contact.userId);
          for (const c of existingContacts) {
            if (c.id !== id && c.isDefault) {
              await storage.updateEmergencyContact(c.id, { isDefault: false });
            }
          }
        }
      }
      
      const updatedContact = await storage.updateEmergencyContact(id, contactData);
      
      if (!updatedContact) {
        return res.status(404).json({ message: 'Emergency contact not found' });
      }
      
      res.json(updatedContact);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update emergency contact' });
    }
  });

  app.delete('/api/emergency-contacts/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteEmergencyContact(id);
    
    if (!success) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }
    
    res.status(204).end();
  });
  
  // Medication Management routes
  app.get('/api/users/:userId/medications', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const medications = await storage.getMedicationsByUserId(userId);
    res.json(medications);
  });

  app.post('/api/medications', async (req, res) => {
    try {
      const medicationData = insertMedicationSchema.parse(req.body);
      const medication = await storage.createMedication(medicationData);
      res.status(201).json(medication);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid medication data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create medication' });
      }
    }
  });

  app.put('/api/medications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const medicationData = req.body;
      const medication = await storage.updateMedication(id, medicationData);
      
      if (!medication) {
        return res.status(404).json({ message: 'Medication not found' });
      }
      
      res.json(medication);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update medication' });
    }
  });

  app.delete('/api/medications/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteMedication(id);
    
    if (!success) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    
    res.status(204).end();
  });

  // Daily Health Report routes
  app.get('/api/users/:userId/daily-reports', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const reports = await storage.getDailyReportsByUserId(userId, limit);
    res.json(reports);
  });

  app.get('/api/users/:userId/daily-reports/date/:date', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const date = new Date(req.params.date);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    const report = await storage.getDailyReportByDate(userId, date);
    
    if (!report) {
      // 해당 날짜에 보고서가 없으면 기본 예시 데이터를 반환합니다
      const defaultReport = {
        id: 0,
        userId,
        date,
        averageHeartRate: 72,
        minHeartRate: 58,
        maxHeartRate: 110,
        averageOxygenLevel: 98,
        averageBloodPressureSystolic: 118,
        averageBloodPressureDiastolic: 75,
        steps: 6500,
        activeMinutes: 35,
        caloriesBurned: 1850,
        sleepDuration: 420,
        sleepQuality: "양호",
        dietaryIntake: {
          calories: 1950,
          carbs: 220,
          protein: 85,
          fat: 60,
          water: 1800
        },
        riskAssessment: 28,
        stressLevel: 3,
        ecgRecordingId: null,
        nutritionRecommendations: {
          suggestions: [
            "나트륨 섭취를 줄이세요",
            "더 많은 물을 마시세요",
            "식이 섬유가 풍부한 음식을 섭취하세요"
          ]
        },
        activityRecommendations: {
          suggestions: [
            "하루에 30분씩 빠른 걸음으로 걷기",
            "무릎에 부담이 적은 운동 추천",
            "일주일에 2~3회 근력 운동 추천"
          ]
        },
        createdAt: new Date()
      };
      
      // 기본 보고서를 storage에 생성하지 않고 직접 응답으로 반환합니다
      return res.json(defaultReport);
    }
    
    res.json(report);
  });

  app.post('/api/daily-reports', async (req, res) => {
    try {
      const reportData = insertDailyReportSchema.parse(req.body);
      
      // Check if a report already exists for this date
      const existingReport = await storage.getDailyReportByDate(reportData.userId, reportData.date);
      
      if (existingReport) {
        return res.status(409).json({ 
          message: 'A report already exists for this date', 
          existingReport 
        });
      }
      
      const report = await storage.createDailyReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid daily report data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create daily report' });
      }
    }
  });

  // Emergency Event routes
  app.get('/api/users/:userId/emergency-events', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const status = req.query.status as string | undefined;
    const events = await storage.getEmergencyEventsByUserId(userId, status);
    res.json(events);
  });

  app.post('/api/emergency-events', async (req, res) => {
    try {
      const eventData = insertEmergencyEventSchema.parse(req.body);
      const event = await storage.createEmergencyEvent(eventData);
      
      // Notify the user and guardians about the emergency
      const eventNotification = {
        type: 'emergencyEvent',
        event
      };
      
      broadcastToUser(eventData.userId, eventNotification);
      await broadcastToGuardians(eventData.userId, eventNotification);
      
      // If the event is critical, also notify emergency contacts
      if (eventData.severity === 'critical') {
        const emergencyContacts = await storage.getEmergencyContactsByUserId(eventData.userId);
        
        // In a real app, this would trigger actual calls/SMS to emergency contacts
        // For now, we'll just create alert records
        for (const contact of emergencyContacts) {
          await storage.createAlert({
            userId: eventData.userId,
            alertType: 'risk',
            message: `비상 상황: ${contact.name}님에게 자동 연락 시도됨`,
          });
          
          // Set lastContactedAt field to now
          await storage.updateEmergencyContact(contact.id, {
            lastContactedAt: new Date() as any // Type casting as any to avoid type errors
          });
        }
      }
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid emergency event data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create emergency event' });
      }
    }
  });

  app.put('/api/emergency-events/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }
      
      const event = await storage.updateEmergencyEventStatus(id, status, notes);
      
      if (!event) {
        return res.status(404).json({ message: 'Emergency event not found' });
      }
      
      // Notify the user and guardians about the status change
      const eventUpdate = {
        type: 'emergencyUpdate',
        event
      };
      
      broadcastToUser(event.userId, eventUpdate);
      await broadcastToGuardians(event.userId, eventUpdate);
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update emergency event status' });
    }
  });

  // Multimodal AI Analysis routes
  app.post('/api/ai/multimodal-analysis', async (req, res) => {
    try {
      const { userId, analysisType, data } = req.body;
      
      if (!userId || !analysisType || !data) {
        return res.status(400).json({ message: 'userId, analysisType, and data are required' });
      }
      
      // Define which models to use based on analysis type
      let models: string[] = ['gpt-4o'];  // Default model
      
      // For comprehensive analysis, use multiple models
      if (analysisType === 'comprehensive') {
        // Check if Anthropic API key is available
        // Here we could use Claude models as well if available
        models = ['gpt-4o', 'deepseek-medical'];
      } else if (analysisType === 'ecg') {
        models = ['deepseek-medical', 'gpt-4o'];
      }
      
      // Prepare input data for analysis
      const input = {
        userId,
        timestamp: new Date(),
        data,
        userInfo: await storage.getUser(userId),
        recentHealthData: await storage.getLatestHealthData(userId)
      };
      
      let results: any;
      let confidence = 0;
      const startTime = Date.now();
      
      // Perform analysis based on type - in a real app this would call specific model APIs
      switch (analysisType) {
        case 'ecg':
          results = await analyzeECGData(data.ecgData, input.userInfo);
          // Adding recommendations field if it doesn't already exist
          if (!results.recommendations) {
            results.recommendations = [
              "ECG 결과를 의사와 상담하세요.",
              "정기적인 심장 검진을 유지하세요.",
              "필요한 경우 추가 검사를 받으세요."
            ];
          }
          confidence = 0.92;
          break;
        case 'vital_signs':
          results = await analyzeHealthRisk({
            ...data.vitalSigns,
            age: input.userInfo?.age,
            gender: input.userInfo?.gender,
            medicalConditions: input.userInfo?.medicalConditions
          });
          // Adding recommendations based on suggestions
          results.recommendations = results.suggestions || [
            "충분한 수분 섭취를 유지하세요.",
            "규칙적인 운동을 하세요.",
            "스트레스 관리에 신경 쓰세요."
          ];
          confidence = 0.88;
          break;
        case 'medication':
          // In a real app, this would call a specialized medication analysis API
          results = {
            interactions: [],
            warnings: [],
            recommendations: ["현재 복용 중인 약물에 특이사항은 없습니다."]
          };
          confidence = 0.85;
          break;
        case 'comprehensive':
          // Comprehensive analysis combines multiple analyses
          const ecgResults = data.ecgData ? 
            await analyzeECGData(data.ecgData, input.userInfo) : null;
          
          const vitalResults = data.vitalSigns ? 
            await analyzeHealthRisk({
              ...data.vitalSigns,
              age: input.userInfo?.age,
              gender: input.userInfo?.gender,
              medicalConditions: input.userInfo?.medicalConditions
            }) : null;
          
          // Ensure ecgResults has recommendations
          if (ecgResults && !ecgResults.recommendations) {
            ecgResults.recommendations = [
              "ECG 결과를 의사와 상담하세요.",
              "정기적인 심장 검진을 유지하세요."
            ];
          }
          
          // Define suggestions or recommendations for results
          let vitalSuggestions = vitalResults?.suggestions || [];
          
          // Ensure we're not directly modifying the result structure
          const vitalResultsWithRecommendations = vitalResults ? {
            ...vitalResults,
            recommendations: vitalSuggestions
          } : null;
          
          results = {
            ecgAnalysis: ecgResults,
            vitalSignsAnalysis: vitalResultsWithRecommendations,
            combinedRiskLevel: Math.max(
              ecgResults?.riskLevel === 'high' ? 80 : 
                ecgResults?.riskLevel === 'moderate' ? 50 : 30,
              vitalResults?.overallRiskScore || 0
            ),
            recommendations: [
              ...(ecgResults?.recommendations || []),
              ...vitalSuggestions
            ]
          };
          confidence = 0.94;
          break;
        default:
          return res.status(400).json({ message: 'Invalid analysis type' });
      }
      
      const processingTime = Date.now() - startTime;
      
      // Save the analysis to the database
      const analysis = await storage.createAiAnalysis({
        userId,
        analysisType,
        input: input as any,
        result: results as any,
        confidence,
        models,
        processingTime
      });
      
      // If the analysis indicates a risk, create an alert
      if ((analysisType === 'comprehensive' && results.combinedRiskLevel > 70) ||
          (analysisType === 'ecg' && (results.riskLevel === 'high' || results.riskLevel === 'critical')) ||
          (analysisType === 'vital_signs' && results.overallRiskScore > 70)) {
        
        const alert = await storage.createAlert({
          userId,
          alertType: 'risk',
          message: `AI 분석 위험 감지: ${analysisType} 분석에서 위험 상황이 감지되었습니다.`,
        });
        
        // Notify the user and guardians
        const alertData = {
          type: 'alert',
          alert
        };
        
        broadcastToUser(userId, alertData);
        await broadcastToGuardians(userId, alertData);
      }
      
      res.json({ analysis, results });
    } catch (error) {
      console.error('Multimodal AI Analysis Error:', error);
      res.status(500).json({ 
        message: 'Multimodal AI analysis failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get('/api/users/:userId/ai-analyses', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const analysisType = req.query.type as string | undefined;
    const analyses = await storage.getAiAnalysesByUserId(userId, analysisType);
    res.json(analyses);
  });

  app.get('/api/ai-analyses/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const analysis = await storage.getAiAnalysis(id);
    
    if (!analysis) {
      return res.status(404).json({ message: 'AI analysis not found' });
    }
    
    res.json(analysis);
  });
  
  // Phone Call Simulation API (for emergency situations)
  app.post('/api/simulate/emergency-call', async (req, res) => {
    try {
      const { userId, contactId, callType } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }
      
      // If contactId is provided, simulate calling that specific contact
      // Otherwise, simulate calling emergency services (119)
      let contact;
      let callTarget;
      
      if (contactId) {
        contact = await storage.getEmergencyContact(parseInt(contactId));
        if (!contact) {
          return res.status(404).json({ message: 'Emergency contact not found' });
        }
        callTarget = `${contact.name} (${contact.phoneNumber})`;
      } else {
        callTarget = callType === 'emergency' ? '119 응급 서비스' : '의료 상담 서비스';
      }
      
      // Create an emergency event for this call
      const event = await storage.createEmergencyEvent({
        userId,
        triggeredBy: 'user',
        severity: callType === 'emergency' ? 'critical' : 'high',
        status: 'active', // status is required
        notes: `${callTarget}에 전화 연결 시도`
      });
      
      // Create an alert for the call
      const alert = await storage.createAlert({
        userId,
        alertType: 'info',
        message: `${callTarget}에 전화 연결됨`,
      });
      
      // Notify the user and guardians
      const eventNotification = {
        type: 'emergencyCall',
        event,
        callTarget
      };
      
      broadcastToUser(userId, eventNotification);
      await broadcastToGuardians(userId, eventNotification);
      
      // In a real app, this would initiate an actual call using a telephony API
      // For now, we just simulate a successful call
      
      res.json({ 
        success: true, 
        message: `${callTarget}에 전화 연결됨`, 
        callId: Date.now().toString(),
        event,
        alert
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to simulate emergency call' });
    }
  });

  // Hospital Search API
  app.get('/api/hospitals/search', async (req, res) => {
    const { query, location, speciality } = req.query;
    
    if (!query && !location) {
      return res.status(400).json({ message: '검색어 또는 위치 정보가 필요합니다' });
    }
    
    try {
      // 실제 시스템에서는 외부 API 연동이나 데이터베이스 쿼리가 필요합니다.
      // 현재는 샘플 데이터를 반환합니다
      const hospitals = [
        {
          id: '1',
          name: '서울대학교병원',
          address: '서울특별시 종로구 대학로 101',
          phoneNumber: '02-2072-2114',
          specialities: ['내과', '외과', '신경과', '심장내과'],
          rating: 4.7,
          location: {
            latitude: 37.5802,
            longitude: 126.9998
          }
        },
        {
          id: '2',
          name: '세브란스병원',
          address: '서울특별시 서대문구 연세로 50-1',
          phoneNumber: '02-2228-0114',
          specialities: ['내과', '외과', '심장내과', '소아과'],
          rating: 4.6,
          location: {
            latitude: 37.5626,
            longitude: 126.9409
          }
        },
        {
          id: '3',
          name: '아산병원',
          address: '서울특별시 송파구 올림픽로 43길 88',
          phoneNumber: '1688-7575',
          specialities: ['내과', '외과', '심장내과', '정형외과'],
          rating: 4.8,
          location: {
            latitude: 37.5274,
            longitude: 127.1091
          }
        }
      ];
      
      // 검색 필터 적용
      let filteredHospitals = hospitals;
      
      if (query) {
        const searchTerm = (query as string).toLowerCase();
        filteredHospitals = filteredHospitals.filter(hospital => 
          hospital.name.toLowerCase().includes(searchTerm) || 
          hospital.address.toLowerCase().includes(searchTerm)
        );
      }
      
      if (speciality) {
        filteredHospitals = filteredHospitals.filter(hospital => 
          hospital.specialities.some(s => s.toLowerCase().includes((speciality as string).toLowerCase()))
        );
      }
      
      res.json(filteredHospitals);
    } catch (error) {
      console.error('병원 검색 오류:', error);
      res.status(500).json({ message: '병원 정보를 검색하는 중 오류가 발생했습니다' });
    }
  });
  
  // Medication Search API (약학정보원 API 연동)
  // 약학정보원 데이터 (한국 의약품 정보)
  // 한국 의약품 정보 데이터
  // 공공 데이터 포털(data.go.kr)의 의약품 정보를 기반으로 확장된 데이터셋
  app.get('/api/medications/search', async (req, res) => {
    try {
      const { name, shape, color, dosage } = req.query;
      
      const koreanMedicationData = [
        {
          id: 'k1',
          name: '아스피린프로텍트정100밀리그램',
          genericName: '아세틸살리실산',
          category: '진통제/해열제/항혈소판제',
          dosage: '100mg',
          form: '장용정제',
          shape: '원형',
          color: '흰색',
          manufacturer: '바이엘코리아',
          description: '혈소판 응집 억제제로, 심근경색 및 뇌졸중 등 혈전성 질환의 예방 및 치료에 사용됩니다.',
          sideEffects: ['위장 장애', '구역질', '출혈 위험 증가', '소화성 궤양'],
          interactions: ['와파린', '이부프로펜', '알코올', '메토트렉세이트'],
          prescriptionRequired: false,
          image: 'https://www.health.kr/images/medi_info/pill/PB00154A_01.jpg'
        },
        {
          id: 'k2',
          name: '리피토정10밀리그램',
          genericName: '아토르바스타틴칼슘삼수화물',
          category: '고지혈증 치료제',
          dosage: '10mg',
          form: '필름코팅정',
          shape: '타원형',
          color: '흰색',
          manufacturer: '한국화이자제약',
          description: 'HMG-CoA 환원효소 저해제로, 고콜레스테롤혈증 및 관상동맥질환 위험 감소에 사용됩니다.',
          sideEffects: ['근육통', '간 효소 증가', '소화 불량', '두통', '관절통'],
          interactions: ['에리스로마이신', '자몽 주스', '사이클로스포린', '페노피브레이트'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00078C_01.jpg'
        },
        {
          id: 'k3',
          name: '노바스크정5밀리그램',
          genericName: '암로디핀베실산염',
          category: '칼슘채널차단제',
          dosage: '5mg',
          form: '필름코팅정',
          shape: '팔각형',
          color: '연노란색',
          manufacturer: '한국화이자제약',
          description: '칼슘 채널 차단제로, 고혈압 및 협심증 치료에 사용됩니다.',
          sideEffects: ['안면홍조', '두통', '부종', '현기증', '피로'],
          interactions: ['심바스타틴', '자몽 주스', '다른 혈압 강하제'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB01197A_01.jpg'
        },
        {
          id: 'k4',
          name: '콘서타OROS서방정18밀리그램',
          genericName: '메틸페니데이트염산염',
          category: '중추신경 자극제',
          dosage: '18mg',
          form: 'OROS 서방정',
          shape: '원통형',
          color: '노란색',
          manufacturer: '한국얀센',
          description: '주의력결핍 과잉행동장애(ADHD) 치료에 사용됩니다.',
          sideEffects: ['식욕감소', '불면증', '두통', '구강건조', '복통'],
          interactions: ['MAO 억제제', '와파린', '항고혈압제'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00350A_01.jpg'
        },
        {
          id: 'k4-1',
          name: '콘서타OROS서방정27밀리그램',
          genericName: '메틸페니데이트염산염',
          category: '중추신경 자극제',
          dosage: '27mg',
          form: 'OROS 서방정',
          shape: '원통형',
          color: '회색',
          manufacturer: '한국얀센',
          description: '주의력결핍 과잉행동장애(ADHD) 치료에 사용됩니다.',
          sideEffects: ['식욕감소', '불면증', '두통', '구강건조', '복통'],
          interactions: ['MAO 억제제', '와파린', '항고혈압제'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00351A_01.jpg'
        },
        {
          id: 'k4-2',
          name: '콘서타OROS서방정36밀리그램',
          genericName: '메틸페니데이트염산염',
          category: '중추신경 자극제',
          dosage: '36mg',
          form: 'OROS 서방정',
          shape: '원통형',
          color: '흰색',
          manufacturer: '한국얀센',
          description: '주의력결핍 과잉행동장애(ADHD) 치료에 사용됩니다.',
          sideEffects: ['식욕감소', '불면증', '두통', '구강건조', '복통'],
          interactions: ['MAO 억제제', '와파린', '항고혈압제'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00352A_01.jpg'
        },
        {
          id: 'k4-3',
          name: '콘서타OROS서방정54밀리그램',
          genericName: '메틸페니데이트염산염',
          category: '중추신경 자극제',
          dosage: '54mg',
          form: 'OROS 서방정',
          shape: '원통형',
          color: '적갈색',
          manufacturer: '한국얀센',
          description: '주의력결핍 과잉행동장애(ADHD) 치료에 사용됩니다.',
          sideEffects: ['식욕감소', '불면증', '두통', '구강건조', '복통'],
          interactions: ['MAO 억제제', '와파린', '항고혈압제'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00353A_01.jpg'
        },
        {
          id: 'k5',
          name: '판토록정40밀리그램',
          genericName: '판토프라졸나트륨세스키히드레이트',
          category: '양성자펌프억제제',
          dosage: '40mg',
          form: '장용코팅정',
          shape: '타원형',
          color: '황색',
          manufacturer: '한국다케다제약',
          description: '위산분비 억제제로, 소화성 궤양, 위식도역류질환(GERD) 치료에 사용됩니다.',
          sideEffects: ['두통', '설사', '구역', '복통', '현기증'],
          interactions: ['아타자나비어', '클로피도그렐', '철분제제'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00781B_01.jpg'
        },
        {
          id: 'k6',
          name: '디아제팜정5밀리그램',
          genericName: '디아제팜',
          category: '벤조디아제핀계 항불안제',
          dosage: '5mg',
          form: '정제',
          shape: '원형',
          color: '흰색',
          manufacturer: '대한약품공업',
          description: '항불안제로, 불안장애, 알코올 금단증상, 근육 경련에 사용됩니다.',
          sideEffects: ['졸음', '피로', '운동실조', '기억장애', '의존성'],
          interactions: ['알코올', '항우울제', '오피오이드', '항히스타민제'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00230B_01.jpg'
        },
        {
          id: 'k7',
          name: '메가트루정',
          genericName: '에스오메프라졸마그네슘삼수화물',
          category: '양성자펌프억제제',
          dosage: '20mg',
          form: '장용코팅정',
          shape: '타원형',
          color: '분홍색',
          manufacturer: '한미약품',
          description: '위산분비 억제제로, 위식도역류질환, 소화성 궤양 치료에 사용됩니다.',
          sideEffects: ['두통', '구역', '복통', '설사', '현기증'],
          interactions: ['클로피도그렐', '디곡신', '철분제제', '아타자나비어'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB01003A_01.jpg'
        },
        {
          id: 'k8',
          name: '타이레놀정500밀리그램',
          genericName: '아세트아미노펜',
          category: '해열진통제',
          dosage: '500mg',
          form: '정제',
          shape: '장방형',
          color: '흰색',
          manufacturer: '한국얀센',
          description: '해열 및 진통 작용이 있어 두통, 치통, 근육통, 생리통 등의 통증과 발열에 사용됩니다.',
          sideEffects: ['간 손상(과량 복용 시)', '알레르기 반응', '두드러기'],
          interactions: ['알코올', '와파린', '항경련제'],
          prescriptionRequired: false,
          image: 'https://www.health.kr/images/medi_info/pill/PB00006A_01.jpg'
        },
        {
          id: 'k9',
          name: '프레가발린캡슐75밀리그램',
          genericName: '프레가발린',
          category: '항전간제',
          dosage: '75mg',
          form: '캡슐',
          shape: '캡슐형',
          color: '흰색/주황색',
          manufacturer: '화이자제약',
          description: '신경병증성 통증, 섬유근육통, 간질 발작의 보조치료에 사용됩니다.',
          sideEffects: ['어지러움', '졸음', '무력증', '말초부종', '시야흐림'],
          interactions: ['중추신경계 억제제', '옥시코돈', '로라제팜'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB01344A_01.jpg'
        },
        {
          id: 'k10',
          name: '자이프렉사정10밀리그램',
          genericName: '올란자핀',
          category: '비정형 항정신병약',
          dosage: '10mg',
          form: '정제',
          shape: '원형',
          color: '흰색',
          manufacturer: '한국릴리',
          description: '조현병, 양극성 장애의 조증 및 혼합 삽화의 치료에 사용됩니다.',
          sideEffects: ['체중 증가', '졸음', '현기증', '변비', '구갈'],
          interactions: ['플루복사민', '카바마제핀', '알코올'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00189A_01.jpg'
        },
        {
          id: 'k11',
          name: '클로자릴정25밀리그램',
          genericName: '클로자핀',
          category: '비정형 항정신병약',
          dosage: '25mg',
          form: '정제',
          shape: '원형',
          color: '노란색',
          manufacturer: '한국노바티스',
          description: '다른 항정신병약에 반응하지 않는 치료저항성 조현병 치료에 사용됩니다.',
          sideEffects: ['졸음', '타액분비 증가', '현기증', '변비', '빈맥'],
          interactions: ['벤조디아제핀', 'SSRIs', '카페인', '알코올'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00176A_01.jpg'
        },
        {
          id: 'k12',
          name: '아빌리파이정10밀리그램',
          genericName: '아리피프라졸',
          category: '비정형 항정신병약',
          dosage: '10mg',
          form: '정제',
          shape: '장방형',
          color: '분홍색',
          manufacturer: '한국오츠카제약',
          description: '조현병, 양극성 장애의 조증 및 혼합 삽화의 치료에 사용됩니다.',
          sideEffects: ['두통', '불안', '불면증', '구역', '현기증'],
          interactions: ['CYP2D6 억제제', 'CYP3A4 억제제', '항고혈압제'],
          prescriptionRequired: true,
          image: 'https://www.health.kr/images/medi_info/pill/PB00852A_01.jpg'
        }
      ];
      
      // 검색 필터 적용
      let filteredMedications = [...koreanMedicationData];
      
      // 이름으로 검색
      if (name) {
        const nameStr = String(name).toLowerCase();
        // 검색어를 더 제대로 처리하도록 수정 (짧은 검색어나 밀리그램 부분 제거하고 검색)
        const simpleNameStr = nameStr.replace(/\d+밀리그램$|\d+mg$/i, "").trim();
        
        filteredMedications = koreanMedicationData.filter(med => 
          med.name.toLowerCase().includes(nameStr) || 
          med.genericName.toLowerCase().includes(nameStr) ||
          med.name.toLowerCase().includes(simpleNameStr) ||
          med.genericName.toLowerCase().includes(simpleNameStr)
        );
      }
      
      if (shape) {
        const shapeStr = String(shape).toLowerCase();
        filteredMedications = filteredMedications.filter(med => 
          med.shape.toLowerCase().includes(shapeStr)
        );
      }
      
      if (color) {
        const colorStr = String(color).toLowerCase();
        filteredMedications = filteredMedications.filter(med => 
          med.color.toLowerCase().includes(colorStr)
        );
      }
      
      if (dosage) {
        const dosageStr = String(dosage);
        filteredMedications = filteredMedications.filter(med => 
          med.dosage.includes(dosageStr)
        );
      }
      
      res.json(filteredMedications);
    } catch (error) {
      console.error('약물 검색 오류:', error);
      res.status(500).json({ message: '약물 정보를 검색하는 중 오류가 발생했습니다' });
    }
  });
  
  // 약품 이미지 스캔 API (카메라를 통해 약품 이미지 인식)
  app.post('/api/medications/scan', async (req, res) => {
    try {
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: '이미지 데이터가 필요합니다' });
      }
      
      // 실제 구현에서는 OpenAI API나 Google Cloud Vision API 등의 
      // 이미지 인식 API를 사용하여 약품을 식별해야 합니다
      // 현재는 처방전 텍스트를 인식한 결과를 시뮬레이션합니다
      
      // 인식된 처방전 데이터 시뮬레이션
      const recognizedPrescription = {
        hospitalName: "서울메디컬센터",
        doctorName: "김의사",
        patientName: "홍길동",
        patientID: "123456789",
        prescriptionDate: "2025-04-01",
        medications: [
          {
            id: 'k1',
            name: '아스피린프로텍트정100밀리그램',
            genericName: '아세틸살리실산',
            dosage: '100mg',
            instructions: '1일 1회 1정, 식후 30분',
            duration: '90일분'
          },
          {
            id: 'k3',
            name: '노바스크정5밀리그램',
            genericName: '암로디핀베실산염',
            dosage: '5mg',
            instructions: '1일 1회 1정, 아침 식전',
            duration: '30일분'
          },
          {
            id: 'k4',
            name: '콘서타OROS서방정18밀리그램',
            genericName: '메틸페니데이트염산염',
            dosage: '18mg',
            instructions: '1일 1회 1정, 아침 식사 전',
            duration: '30일분'
          }
        ],
        additionalNotes: "약은 반드시 처방된 용량과 시간에 맞춰 복용하십시오. 부작용이 발생할 경우 즉시 의사와 상담하십시오."
      };
      
      // 해당하는 약물 정보 검색 (실제 이미지 URL 포함)
      const medicationDetails = await Promise.all(
        recognizedPrescription.medications.map(async (med) => {
          // 각 약물에 대한 상세 정보 조회
          // 실제 구현에서는 데이터베이스 검색 등이 필요합니다
          
          // 약물 정보 데이터
          const koreanMedicationData = [
            {
              id: "aspirin",
              name: "아스피린",
              category: "진통제/소염제",
              form: "정제",
              image: "https://i.imgur.com/LTx7FoX.jpg",
              sideEffects: ["위장 장애", "위출혈", "알레르기 반응"],
              interactions: ["항응고제", "알코올", "이부프로펜"]
            },
            {
              id: "lipitor",
              name: "리피토",
              category: "스타틴",
              form: "정제",
              image: "https://i.imgur.com/bGtvUVU.jpg",
              sideEffects: ["근육통", "간 효소 증가", "소화 불량"],
              interactions: ["자몽 주스", "특정 항생제", "특정 항진균제"]
            },
            {
              id: "metformin",
              name: "메트포민",
              category: "당뇨병약",
              form: "정제",
              image: "https://i.imgur.com/J7V0G7z.jpg",
              sideEffects: ["설사", "메스꺼움", "금속성 맛"],
              interactions: ["알코올", "조영제", "특정 항생제"]
            },
            {
              id: "lisinopril",
              name: "리시노프릴",
              category: "ACE 억제제",
              form: "정제",
              image: "https://i.imgur.com/FLZMYIl.jpg",
              sideEffects: ["마른 기침", "두통", "현기증"],
              interactions: ["칼륨 보충제", "특정 이뇨제", "NSAIDs"]
            },
            {
              id: "synthroid",
              name: "신스로이드",
              category: "갑상선 호르몬",
              form: "정제",
              image: "https://i.imgur.com/w7sFFKp.jpg",
              sideEffects: ["불안", "두통", "발한"],
              interactions: ["칼슘 보충제", "철분 보충제", "제산제"]
            }
          ];
          
          // 약물 ID로 데이터 검색을 시뮬레이션
          const matchedMedication = koreanMedicationData.find((m: any) => m.id === med.id);
          
          return {
            ...med,
            category: matchedMedication?.category || '정보 없음',
            form: matchedMedication?.form || '정보 없음',
            image: matchedMedication?.image || null,
            sideEffects: matchedMedication?.sideEffects || [],
            interactions: matchedMedication?.interactions || [],
            confidence: Math.random() * 0.2 + 0.8, // 80~100% 랜덤 신뢰도 (데모용)
          };
        })
      );
      
      // 응답 시간을 시뮬레이션하기 위한 지연
      setTimeout(() => {
        res.json({
          success: true,
          prescriptionInfo: {
            ...recognizedPrescription,
            medications: medicationDetails
          },
          message: `처방전이 성공적으로 스캔되었습니다. ${medicationDetails.length}개의 약품이 인식되었습니다.`
        });
      }, 2000); // 2초 지연으로 인식 시간 시뮬레이션
      
    } catch (error) {
      console.error('처방전 스캔 오류:', error);
      res.status(500).json({ message: '처방전 이미지 스캔 중 오류가 발생했습니다' });
    }
  });
  
  // ECG 표준 데이터 제공 API
  app.get('/api/reference/ecg-standards', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const csv = require('csv-parser');
      
      const results: any[] = [];
      fs.createReadStream(path.join(__dirname, 'data/ecg_standards.csv'))
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => {
          res.json(results);
        });
    } catch (error) {
      console.error('ECG 표준 데이터 로딩 오류:', error);
      res.status(500).json({ message: 'ECG 표준 데이터를 로드하는 중 오류가 발생했습니다' });
    }
  });
  
  // PPG 표준 데이터 제공 API
  app.get('/api/reference/ppg-standards', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const csv = require('csv-parser');
      
      const results: any[] = [];
      fs.createReadStream(path.join(__dirname, 'data/ppg_standards.csv'))
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => {
          res.json(results);
        });
    } catch (error) {
      console.error('PPG 표준 데이터 로딩 오류:', error);
      res.status(500).json({ message: 'PPG 표준 데이터를 로드하는 중 오류가 발생했습니다' });
    }
  });
  
  // 복합 위험도 표준 데이터 제공 API
  app.get('/api/reference/combined-risk', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const csv = require('csv-parser');
      
      const results: any[] = [];
      fs.createReadStream(path.join(__dirname, 'data/ecg_ppg_combined_risk.csv'))
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => {
          res.json(results);
        });
    } catch (error) {
      console.error('복합 위험도 데이터 로딩 오류:', error);
      res.status(500).json({ message: '복합 위험도 데이터를 로드하는 중 오류가 발생했습니다' });
    }
  });
  
  // 연구 참고문헌 데이터 제공 API
  app.get('/api/reference/research', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const data = fs.readFileSync(path.join(__dirname, 'data/research_references.json'), 'utf8');
      const references = JSON.parse(data);
      res.json(references);
    } catch (error) {
      console.error('연구 참고문헌 데이터 로딩 오류:', error);
      res.status(500).json({ message: '연구 참고문헌 데이터를 로드하는 중 오류가 발생했습니다' });
    }
  });
  
  // 맞춤형 식단 추천 API (일일 보고서 기반)
  app.get('/api/users/:userId/dietary-recommendations', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { date } = req.query;
    
    try {
      // 사용자 정보 가져오기
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
      }
      
      // 맞춤형 식단 추천 데이터 생성
      const recommendations = {
        dailyRecommendations: [
          {
            mealType: '아침',
            menu: '오트밀과 베리 믹스, 무가당 두유',
            calories: 350,
            nutrition: {
              carbs: 45,
              protein: 15,
              fat: 10,
              fiber: 8
            },
            benefits: ['혈당 조절에 도움', '오메가-3 지방산 함유']
          },
          {
            mealType: '점심',
            menu: '현미밥, 구운 연어, 시금치 샐러드',
            calories: 450,
            nutrition: {
              carbs: 50,
              protein: 30,
              fat: 15,
              fiber: 6
            },
            benefits: ['오메가-3 지방산', '항산화 성분']
          },
          {
            mealType: '저녁',
            menu: '퀴노아 샐러드와 구운 닭가슴살',
            calories: 400,
            nutrition: {
              carbs: 40,
              protein: 35,
              fat: 10,
              fiber: 7
            },
            benefits: ['저지방 단백질', '복합 탄수화물']
          },
          {
            mealType: '간식',
            menu: '무염 견과류 혼합, 과일',
            calories: 150,
            nutrition: {
              carbs: 10,
              protein: 5,
              fat: 10,
              fiber: 3
            },
            benefits: ['건강한 지방', '불포화 지방산']
          }
        ],
        totalCalories: 1350,
        totalNutrition: {
          carbs: 145,
          protein: 85,
          fat: 45,
          fiber: 24
        },
        healthConditionTips: [
          {
            condition: '고혈압 관리',
            recommendations: [
              '나트륨 섭취를 제한하세요 (하루 2,000mg 이하)',
              '칼륨이 풍부한 식품을 섭취하세요 (바나나, 감자, 아보카도)',
              '카페인 섭취를 제한하세요'
            ]
          },
          {
            condition: '심장 건강 관리',
            recommendations: [
              '포화 지방과 트랜스 지방 섭취를 줄이세요',
              '식이 섬유가 풍부한 음식을 섭취하세요',
              '오메가-3 지방산이 풍부한 음식을 섭취하세요'
            ]
          }
        ]
      };
      
      res.json(recommendations);
    } catch (error) {
      console.error('식단 추천 생성 오류:', error);
      res.status(500).json({ message: '식단 추천을 생성하는 중 오류가 발생했습니다' });
    }
  });
  
  // Medical Staff Search API
  app.get('/api/hospitals/:hospitalId/staff', async (req, res) => {
    const { hospitalId } = req.params;
    const { speciality } = req.query;
    
    try {
      // 실제 시스템에서는 외부 API 연동이나 데이터베이스 쿼리가 필요합니다.
      // 현재는 샘플 데이터를 반환합니다
      const staffList = [
        {
          id: '101',
          name: '김민석',
          speciality: '심장내과',
          position: '교수',
          hospitalId: '1', 
          profileImage: 'https://randomuser.me/api/portraits/men/1.jpg',
          experience: '15년',
          education: '서울대학교 의과대학',
          availableHours: '월~금 09:00-17:00'
        },
        {
          id: '102',
          name: '이지은',
          speciality: '심장내과',
          position: '부교수',
          hospitalId: '1',
          profileImage: 'https://randomuser.me/api/portraits/women/2.jpg',
          experience: '12년',
          education: '연세대학교 의과대학',
          availableHours: '월,수,금 09:00-18:00'
        },
        {
          id: '103',
          name: '박준호',
          speciality: '내과',
          position: '전문의',
          hospitalId: '1',
          profileImage: 'https://randomuser.me/api/portraits/men/3.jpg',
          experience: '8년',
          education: '고려대학교 의과대학',
          availableHours: '화,목 09:00-17:00'
        },
        {
          id: '201',
          name: '최유진',
          speciality: '심장내과',
          position: '교수',
          hospitalId: '2',
          profileImage: 'https://randomuser.me/api/portraits/women/4.jpg',
          experience: '18년',
          education: '연세대학교 의과대학',
          availableHours: '월~금 09:00-17:00'
        },
        {
          id: '301',
          name: '정승호',
          speciality: '심장내과',
          position: '부교수',
          hospitalId: '3',
          profileImage: 'https://randomuser.me/api/portraits/men/5.jpg',
          experience: '14년',
          education: '울산대학교 의과대학',
          availableHours: '월,화,수 10:00-18:00'
        }
      ];
      
      // 병원 ID로 필터링
      let filteredStaff = staffList.filter(staff => staff.hospitalId === hospitalId);
      
      // 전문분야로 필터링 (선택 사항)
      if (speciality) {
        filteredStaff = filteredStaff.filter(staff => 
          staff.speciality.toLowerCase() === (speciality as string).toLowerCase()
        );
      }
      
      res.json(filteredStaff);
    } catch (error) {
      console.error('의료진 검색 오류:', error);
      res.status(500).json({ message: '의료진 정보를 검색하는 중 오류가 발생했습니다' });
    }
  });
  
  // 응급 상황 아이콘 상태 업데이트 API (가디언 모드용)
  app.post('/api/users/:userId/emergency-icons/update', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { iconType, enabled, visibleTo } = req.body;
      
      if (!iconType) {
        return res.status(400).json({ message: 'iconType은 필수입니다' });
      }
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'enabled 값은 필수입니다' });
      }
      
      // 실제 구현에서는 사용자의 응급 상황 아이콘 설정을 데이터베이스에 저장해야 합니다
      // 현재는 성공 응답만 반환합니다
      
      // 가디언들에게 아이콘 상태 변경 알림
      if (visibleTo === 'guardians' || visibleTo === 'all') {
        const notificationData = {
          type: 'emergencyIconUpdate',
          data: {
            userId,
            iconType,
            enabled,
            timestamp: new Date()
          }
        };
        
        await broadcastToGuardians(userId, notificationData);
      }
      
      // 해당 사용자에게 알림
      if (visibleTo === 'user' || visibleTo === 'all') {
        const notificationData = {
          type: 'emergencyIconUpdate',
          data: {
            iconType,
            enabled,
            timestamp: new Date()
          }
        };
        
        broadcastToUser(userId, notificationData);
      }
      
      res.json({
        success: true,
        message: `응급 상황 아이콘 '${iconType}'이(가) ${enabled ? '활성화' : '비활성화'}되었습니다`,
        userId,
        iconType,
        enabled
      });
    } catch (error) {
      console.error('응급 상황 아이콘 업데이트 오류:', error);
      res.status(500).json({ message: '응급 상황 아이콘 상태를 업데이트하는 중 오류가 발생했습니다' });
    }
  });
  
  // 응급 상황 아이콘 상태 조회 API
  app.get('/api/users/:userId/emergency-icons', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // 실제 구현에서는 데이터베이스에서 사용자의 응급 상황 아이콘 설정을 조회해야 합니다
      // 현재는 샘플 데이터를 반환합니다
      const emergencyIcons = [
        {
          iconType: 'emergency_call',
          label: '응급 전화',
          enabled: true,
          color: 'red',
          priority: 1
        },
        {
          iconType: 'medical_alert',
          label: '의료 알림',
          enabled: true,
          color: 'orange',
          priority: 2
        },
        {
          iconType: 'medication_reminder',
          label: '약물 복용 알림',
          enabled: true,
          color: 'blue',
          priority: 3
        },
        {
          iconType: 'fall_detection',
          label: '낙상 감지',
          enabled: false,
          color: 'purple',
          priority: 4
        },
        {
          iconType: 'location_sharing',
          label: '위치 공유',
          enabled: true,
          color: 'green',
          priority: 5
        }
      ];
      
      res.json(emergencyIcons);
    } catch (error) {
      console.error('응급 상황 아이콘 조회 오류:', error);
      res.status(500).json({ message: '응급 상황 아이콘 상태를 조회하는 중 오류가 발생했습니다' });
    }
  });
  
  // 모바일 API 라우트 등록
  app.use('/api/mobile', mobileApiRouter);
  
  // 병원 정보 조회 API 엔드포인트
  app.get('/api/hospitals/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 3000, bounds } = req.query;
      
      // 위도/경도만 있는 경우와 지도 영역 bounds를 통한 검색 모두 지원
      if ((!lat || !lng) && !bounds) {
        return res.status(400).json({ 
          message: '위도(lat)와 경도(lng) 또는 지도 영역(bounds)이 필요합니다.' 
        });
      }
      
      // 데이터베이스에서 병원 정보 조회
      let dbHospitals = [];
      
      // bounds 파라미터 사용 시 (지도 영역 내 병원 검색)
      if (bounds) {
        try {
          const [swLat, swLng, neLat, neLng] = (bounds as string).split(',').map(parseFloat);
          
          // 지도 영역 내 병원 검색
          dbHospitals = await db.select({
            id: hospitals.id, 
            hiraId: hospitals.hiraId,
            name: hospitals.name,
            address: hospitals.address,
            tel: hospitals.phone,
            lat: hospitals.latitude,
            lng: hospitals.longitude,
            isEmergency: hospitals.isEmergency,
            isOpen24h: hospitals.isOpen24h,
            isHeartCenter: hospitals.isHeartCenter,
            specialty: hospitals.specialty
          })
          .from(hospitals)
          .where(
            and(
              between(hospitals.latitude, swLat, neLat),
              between(hospitals.longitude, swLng, neLng)
            )
          );
          
          console.log(`지도 영역 내 ${dbHospitals.length}개 병원 정보를 조회하였습니다.`);
        } catch (e) {
          console.error('지도 영역 파싱 오류:', e);
          return res.status(400).json({ message: '지도 영역(bounds) 파라미터 형식이 잘못되었습니다.' });
        }
      } else {
        // 위도/경도 중심 반경 검색 (거리 계산)
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        const searchRadius = parseFloat(radius as string) || 3000;
        
        // 최적화를 위해 경계 상자 계산 (대략적인 위도/경도 범위)
        // 1도는 약 111km, 반경을 도 단위로 변환
        const latRange = searchRadius / 111000;
        const lngRange = searchRadius / (111000 * Math.cos(userLat * Math.PI / 180));
        
        // 경계 상자 내 병원 조회 후 정확한 거리 계산
        const boundBoxHospitals = await db.select({
          id: hospitals.id, 
          hiraId: hospitals.hiraId,
          name: hospitals.name,
          address: hospitals.address,
          tel: hospitals.phone,
          lat: hospitals.latitude,
          lng: hospitals.longitude,
          isEmergency: hospitals.isEmergency,
          isOpen24h: hospitals.isOpen24h,
          isHeartCenter: hospitals.isHeartCenter,
          specialty: hospitals.specialty
        })
        .from(hospitals)
        .where(
          and(
            between(hospitals.latitude, userLat - latRange, userLat + latRange),
            between(hospitals.longitude, userLng - lngRange, userLng + lngRange)
          )
        );
        
        // 정확한 거리 계산 및 반경 내 필터링
        dbHospitals = boundBoxHospitals
          .map(hospital => {
            // 하버사인 공식으로 두 지점 간 거리 계산 (km)
            const distance = calculateDistance(
              userLat, userLng, 
              hospital.lat as number, hospital.lng as number
            );
            
            return {
              ...hospital,
              distance: parseFloat(distance.toFixed(1))
            };
          })
          .filter(hospital => hospital.distance <= searchRadius / 1000); // 미터를 km로 변환하여 비교
        
        console.log(`사용자 위치 주변 ${dbHospitals.length}개 병원 정보를 조회하였습니다.`);
      }
      
      // 결과가 없는 경우 기본 데이터 사용 (테스트를 위한 샘플 데이터)
      if (dbHospitals.length === 0) {
        console.log('데이터베이스에서 병원 정보를 찾을 수 없어 샘플 데이터를 반환합니다.');
        
        // 부산 지역 좌표인 경우 (약 35.1 ~ 35.2, 129.0 ~ 129.1)
        if (lat && lng && parseFloat(lat as string) >= 35.0 && parseFloat(lat as string) <= 35.3 && 
            parseFloat(lng as string) >= 128.9 && parseFloat(lng as string) <= 129.2) {
          return res.json({
            count: 5,
            hospitals: [
              {
                id: 'B1004',
                name: '부산성모병원',
                address: '부산 남구 용호로 232번길',
                tel: '051-933-7000',
                lat: 35.1195,
                lng: 129.0988,
                distance: 2.5,
                isEmergency: true,
                isOpen24h: true,
                isHeartCenter: true,
                specialty: '종합병원, 심장센터, 심장전문의, 심장CT/MRI, 혈관조영술'
              },
              {
                id: 'B1001',
                name: '부산대학교병원',
                address: '부산 서구 구덕로 179',
                tel: '051-240-7000',
                lat: 35.1039,
                lng: 129.0145,
                distance: 0.8,
                isEmergency: true,
                isOpen24h: true,
                isHeartCenter: false,
                specialty: '종합병원, 응급의료센터'
              },
              {
                id: 'B1002',
                name: '동아대학교병원',
                address: '부산 서구 대신공원로 26',
                tel: '051-240-2000',
                lat: 35.1040,
                lng: 129.0219,
                distance: 1.2,
                isEmergency: true,
                isOpen24h: true,
                isHeartCenter: false,
                specialty: '종합병원, 24시간 응급실'
              },
              {
                id: 'B1003',
                name: '메리놀병원',
                address: '부산 중구 대청로 85-2',
                tel: '051-465-8801',
                lat: 35.1138,
                lng: 129.0335,
                distance: 1.9,
                isEmergency: false,
                isOpen24h: false,
                isHeartCenter: false,
                specialty: '종합병원'
              },
              {
                id: 'B1005',
                name: '고신대학교 복음병원',
                address: '부산 서구 감천로 262',
                tel: '051-990-6114',
                lat: 35.0856,
                lng: 129.0131,
                distance: 3.8,
                isEmergency: true,
                isOpen24h: true,
                isHeartCenter: false,
                specialty: '종합병원, 24시간 운영'
              }
            ]
          });
        } else {
          // 기본 서울 지역 샘플 데이터
          return res.json({
            count: 5,
            hospitals: [
              {
                id: 'A1001',
                name: '서울대학교병원',
                address: '서울 종로구 대학로 101',
                tel: '02-2072-2114',
                lat: 37.5802,
                lng: 127.0031,
                distance: 1.2,
                isEmergency: true,
                isOpen24h: true,
                isHeartCenter: true,
                specialty: '종합병원, 응급의료센터, 심장센터'
              },
              {
                id: 'A1002',
                name: '세브란스병원',
                address: '서울 서대문구 연세로 50-1',
                tel: '02-2228-0114',
                lat: 37.5621,
                lng: 126.9395,
                distance: 3.5,
                isEmergency: true,
                isOpen24h: true,
                isHeartCenter: true,
                specialty: '종합병원, 심장내과 특화'
              },
              {
                id: 'A1004',
                name: '가톨릭대학교 서울성모병원',
                address: '서울 서초구 반포대로 222',
                tel: '02-2258-5000',
                lat: 37.5013,
                lng: 127.0050,
                distance: 4.8,
                isEmergency: true,
                isOpen24h: true,
                isHeartCenter: false,
                specialty: '종합병원, 응급의료센터'
              },
              {
                id: 'A1010',
                name: '중앙대학교병원',
                address: '서울 동작구 흑석로 102',
                tel: '02-6299-1114',
                lat: 37.5064,
                lng: 126.9611,
                distance: 5.7,
                isEmergency: false,
                isOpen24h: false,
                isHeartCenter: false,
                specialty: '종합병원'
              },
              {
                id: 'A1006',
                name: '강남세브란스병원',
                address: '서울 강남구 언주로 211',
                tel: '02-2019-3114',
                lat: 37.4928,
                lng: 127.0461,
                distance: 7.2,
                isEmergency: true,
                isOpen24h: true,
                isHeartCenter: false,
                specialty: '종합병원, 응급의료센터'
              }
            ]
          });
        }
      }
      
      // 데이터베이스 결과 사용 - 우선순위: 심장전문 > 응급의료센터 > 24시간 > 종합병원
      const sortedHospitals = dbHospitals.sort((a, b) => {
        // 심장 전문병원
        if (a.isHeartCenter && !b.isHeartCenter) return -1;
        if (!a.isHeartCenter && b.isHeartCenter) return 1;
        
        // 응급의료센터
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        
        // 24시간 운영
        if (a.isOpen24h && !b.isOpen24h) return -1;
        if (!a.isOpen24h && b.isOpen24h) return 1;
        
        // 거리 순
        return (a.distance || 0) - (b.distance || 0);
      });
      
      // 상위 15개만 반환 (너무 많은 결과를 방지)
      const limitedHospitals = sortedHospitals.slice(0, 15);
      
      // 결과 변환 (specialty 배열을 문자열로)
      const formattedHospitals = limitedHospitals.map(h => ({
        ...h,
        specialty: Array.isArray(h.specialty) ? h.specialty.join(', ') : h.specialty
      }));
      
      res.json({ 
        count: formattedHospitals.length,
        hospitals: formattedHospitals
      });
    } catch (error) {
      console.error('병원 조회 오류:', error);
      res.status(500).json({ message: '병원 정보를 가져오는 중 오류가 발생했습니다.' });
    }
  });
  
  // 두 지점 간의 거리를 계산하는 함수 (하버사인 공식, km 단위)
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 지구 반경 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c;
    return distance;
  }
  
  // 주변 약국 검색 API 엔드포인트
  app.get('/api/pharmacies/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 3000, bounds } = req.query;
      
      // 위도/경도만 있는 경우와 지도 영역 bounds를 통한 검색 모두 지원
      if ((!lat || !lng) && !bounds) {
        return res.status(400).json({ 
          message: '위도(lat)와 경도(lng) 또는 지도 영역(bounds)이 필요합니다.' 
        });
      }
      
      // 데이터베이스에서 약국 정보 조회
      let dbPharmacies = [];
      
      // bounds 파라미터 사용 시 (지도 영역 내 약국 검색)
      if (bounds) {
        try {
          const [swLat, swLng, neLat, neLng] = (bounds as string).split(',').map(parseFloat);
          
          // 지도 영역 내 약국 검색
          dbPharmacies = await db.select({
            id: pharmacies.id, 
            hiraId: pharmacies.hiraId,
            name: pharmacies.name,
            address: pharmacies.address,
            phone: pharmacies.phone,
            lat: pharmacies.latitude,
            lng: pharmacies.longitude,
            isOpen24h: pharmacies.isOpen24h,
            openingHours: pharmacies.openingHours
          })
          .from(pharmacies)
          .where(
            and(
              between(pharmacies.latitude, swLat, neLat),
              between(pharmacies.longitude, swLng, neLng)
            )
          );
          
          console.log(`지도 영역 내 ${dbPharmacies.length}개 약국 정보를 조회하였습니다.`);
        } catch (e) {
          console.error('지도 영역 파싱 오류:', e);
          return res.status(400).json({ message: '지도 영역(bounds) 파라미터 형식이 잘못되었습니다.' });
        }
      } else {
        // 위도/경도 중심 반경 검색 (거리 계산)
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        const searchRadius = parseFloat(radius as string) || 3000;
        
        // 최적화를 위해 경계 상자 계산 (대략적인 위도/경도 범위)
        // 1도는 약 111km, 반경을 도 단위로 변환
        const latRange = searchRadius / 111000;
        const lngRange = searchRadius / (111000 * Math.cos(userLat * Math.PI / 180));
        
        // 경계 상자 내 약국 조회 후 정확한 거리 계산
        const boundBoxPharmacies = await db.select({
          id: pharmacies.id, 
          hiraId: pharmacies.hiraId,
          name: pharmacies.name,
          address: pharmacies.address,
          phone: pharmacies.phone,
          lat: pharmacies.latitude,
          lng: pharmacies.longitude,
          isOpen24h: pharmacies.isOpen24h,
          openingHours: pharmacies.openingHours
        })
        .from(pharmacies)
        .where(
          and(
            between(pharmacies.latitude, userLat - latRange, userLat + latRange),
            between(pharmacies.longitude, userLng - lngRange, userLng + lngRange)
          )
        );
        
        // 정확한 거리 계산 및 반경 내 필터링
        dbPharmacies = boundBoxPharmacies
          .map(pharmacy => {
            // 하버사인 공식으로 두 지점 간 거리 계산 (km)
            const distance = calculateDistance(
              userLat, userLng, 
              pharmacy.lat as number, pharmacy.lng as number
            );
            
            return {
              ...pharmacy,
              distance: parseFloat(distance.toFixed(1))
            };
          })
          .filter(pharmacy => pharmacy.distance <= searchRadius / 1000); // 미터를 km로 변환하여 비교
        
        console.log(`사용자 위치 주변 ${dbPharmacies.length}개 약국 정보를 조회하였습니다.`);
      }
      
      // 결과가 없는 경우 샘플 데이터 사용
      if (dbPharmacies.length === 0) {
        console.log('약국 데이터가 없습니다. 데이터베이스에 더 많은 약국 정보를 추가해 주세요.');
      }
      
      // 결과 정렬: 24시간 약국 > 거리 순
      const sortedPharmacies = dbPharmacies.sort((a, b) => {
        // 24시간 약국 우선
        if (a.isOpen24h && !b.isOpen24h) return -1;
        if (!a.isOpen24h && b.isOpen24h) return 1;
        
        // 거리 순
        return (a.distance || 0) - (b.distance || 0);
      });
      
      // 상위 15개만 반환 (너무 많은 결과를 방지)
      const limitedPharmacies = sortedPharmacies.slice(0, 15);
      
      res.json({ 
        count: limitedPharmacies.length,
        pharmacies: limitedPharmacies
      });
    } catch (error) {
      console.error('약국 조회 오류:', error);
      res.status(500).json({ message: '약국 정보를 가져오는 중 오류가 발생했습니다.' });
    }
  });

  // 약국 상세 정보 조회 API 엔드포인트
  app.get('/api/pharmacies/:id', async (req, res) => {
    try {
      const pharmacyId = parseInt(req.params.id);
      
      if (isNaN(pharmacyId)) {
        return res.status(400).json({ message: '유효하지 않은 약국 ID입니다.' });
      }
      
      const pharmacy = await db.select()
        .from(pharmacies)
        .where(eq(pharmacies.id, pharmacyId))
        .limit(1);
      
      if (pharmacy.length === 0) {
        return res.status(404).json({ message: '해당 약국을 찾을 수 없습니다.' });
      }
      
      res.json(pharmacy[0]);
    } catch (error) {
      console.error('약국 상세 정보 조회 오류:', error);
      res.status(500).json({ message: '약국 정보를 가져오는 중 오류가 발생했습니다.' });
    }
  });

  // 모든 병원 목록 API
  app.get('/api/hospitals', async (req, res) => {
    try {
      const hospitalList = await db
        .select({
          id: hospitals.id, 
          hiraId: hospitals.hiraId,
          name: hospitals.name,
          address: hospitals.address,
          tel: hospitals.phone,
          lat: hospitals.latitude,
          lng: hospitals.longitude,
          isEmergency: hospitals.isEmergency,
          isOpen24h: hospitals.isOpen24h,
          isHeartCenter: hospitals.isHeartCenter,
          specialty: hospitals.specialty
        })
        .from(hospitals)
        .limit(1000);  // 모든 병원 데이터 로드를 위해 제한 확대

      // 거리 계산 (더미 데이터 기반)
      const hospitalsWithDistance = hospitalList.map(hospital => {
        return {
          ...hospital,
          // 임의의 거리 할당 (2km ~ 10km)
          distance: parseFloat((Math.random() * 8 + 2).toFixed(1))
        };
      });

      return res.json({
        count: hospitalsWithDistance.length,
        hospitals: hospitalsWithDistance
      });
    } catch (error) {
      console.error('병원 목록 조회 오류:', error);
      return res.status(500).json({ message: '병원 목록을 가져오는 중 오류가 발생했습니다.' });
    }
  });

  // 내 위치 주변 병원 검색 API - 구체적인 경로를 먼저 배치
  app.get('/api/hospitals/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 5 } = req.query;
      
      // 좌표 파라미터 확인
      if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
        return res.status(400).json({ 
          message: '유효한 위도, 경도 값이 필요합니다.',
          success: false 
        });
      }
      
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const searchRadius = parseInt(radius as string) || 5; // 기본 반경 5km
      
      // 데이터베이스에서 병원 정보 가져오기
      const hospitalList = await db
        .select({
          id: hospitals.id, 
          hiraId: hospitals.hiraId,
          name: hospitals.name,
          address: hospitals.address,
          tel: hospitals.phone,
          lat: hospitals.latitude,
          lng: hospitals.longitude,
          isEmergency: hospitals.isEmergency,
          isOpen24h: hospitals.isOpen24h,
          isHeartCenter: hospitals.isHeartCenter,
          specialty: hospitals.specialty
        })
        .from(hospitals)
        .limit(1000);
      
      // 위치 기반 필터링 및 거리 계산
      const nearbyHospitals = hospitalList
        .filter(hospital => hospital.lat !== null && hospital.lng !== null)
        .map(hospital => {
          // Haversine 공식으로 거리 계산 (km 단위)
          const distance = calculateDistance(
            userLat, userLng,
            hospital.lat!, hospital.lng!
          );
          
          // 검색 반경 내에 있는 병원만 반환
          if (distance <= searchRadius) {
            return {
              ...hospital,
              distance: Math.round(distance * 10) / 10 // 소수점 첫째 자리까지 표시
            };
          }
          return null;
        })
        .filter(Boolean) // null 값 제거
        .sort((a, b) => a!.distance - b!.distance); // 거리 순 정렬
      
      console.log(`사용자 위치 주변 ${nearbyHospitals.length}개 병원 정보를 조회하였습니다.`);
      
      return res.json({
        count: nearbyHospitals.length,
        hospitals: nearbyHospitals
      });
    } catch (error) {
      console.error('주변 병원 검색 오류:', error);
      return res.status(500).json({ 
        message: '주변 병원 정보를 가져오는 중 오류가 발생했습니다.',
        success: false 
      });
    }
  });
  
  // 지도 영역 내 병원 검색 API
  app.get('/api/hospitals/map-area', async (req, res) => {
    try {
      const { swLat, swLng, neLat, neLng } = req.query;
      
      // 지도 경계 파라미터 확인
      if (!swLat || !swLng || !neLat || !neLng || 
          isNaN(Number(swLat)) || isNaN(Number(swLng)) || 
          isNaN(Number(neLat)) || isNaN(Number(neLng))) {
        return res.status(400).json({ 
          message: '유효한 지도 경계 값이 필요합니다.',
          success: false 
        });
      }
      
      const southWestLat = parseFloat(swLat as string);
      const southWestLng = parseFloat(swLng as string);
      const northEastLat = parseFloat(neLat as string);
      const northEastLng = parseFloat(neLng as string);
      
      // 데이터베이스에서 병원 정보 가져오기
      const hospitalList = await db
        .select({
          id: hospitals.id,
          hiraId: hospitals.hiraId,
          name: hospitals.name,
          address: hospitals.address,
          tel: hospitals.phone,
          lat: hospitals.latitude,
          lng: hospitals.longitude,
          isEmergency: hospitals.isEmergency,
          isOpen24h: hospitals.isOpen24h,
          isHeartCenter: hospitals.isHeartCenter,
          specialty: hospitals.specialty
        })
        .from(hospitals)
        .limit(1000);
      
      // 지도 영역 내 병원 필터링
      const mapAreaHospitals = hospitalList
        .filter(hospital => {
          // 병원의 좌표가 유효한지 확인
          if (!hospital.lat || !hospital.lng) return false;
          
          // 지도 영역 내에 있는지 확인
          return (
            hospital.lat >= southWestLat && 
            hospital.lat <= northEastLat && 
            hospital.lng >= southWestLng && 
            hospital.lng <= northEastLng
          );
        })
        .map(hospital => ({
          ...hospital,
          // 임의의 거리 할당 (나중에 사용자 위치 기반으로 계산 가능)
          distance: parseFloat((Math.random() * 4 + 1).toFixed(1))
        }))
        .sort((a, b) => {
          // 심장 전문 병원 최우선
          const aHeart = a.specialty && Array.isArray(a.specialty) && a.specialty.some(s => s.includes('심장')) ? 1 : 0;
          const bHeart = b.specialty && Array.isArray(b.specialty) && b.specialty.some(s => s.includes('심장')) ? 1 : 0;
          if (aHeart !== bHeart) return bHeart - aHeart;
          
          // 응급의료센터 두번째 우선
          if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
          
          // 24시간 병원 세번째 우선
          if (a.isOpen24h !== b.isOpen24h) return a.isOpen24h ? -1 : 1;
          
          // 거리순 정렬
          return a.distance - b.distance;
        });
      
      console.log(`지도 영역 내 ${mapAreaHospitals.length}개 병원 정보를 조회하였습니다.`);
      
      return res.json({
        count: mapAreaHospitals.length,
        hospitals: mapAreaHospitals
      });
    } catch (error) {
      console.error('지도 영역 병원 검색 오류:', error);
      return res.status(500).json({ 
        message: '지도 영역 병원 정보를 가져오는 중 오류가 발생했습니다.',
        success: false 
      });
    }
  });
  
  // 위도/경도 간 거리 계산 함수 (Haversine 공식)
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 지구 반경 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // 거리 (km)
  }
  
  // 병원 상세 정보 조회 API 엔드포인트 - 구체적인 경로 이후에 배치
  app.get('/api/hospitals/:id', async (req, res) => {
    try {
      const hospitalId = parseInt(req.params.id);
      
      if (isNaN(hospitalId)) {
        return res.status(400).json({ message: '유효하지 않은 병원 ID입니다.' });
      }
      
      // 병원 기본 정보 가져오기
      const hospital = await db.select()
        .from(hospitals)
        .where(eq(hospitals.id, hospitalId))
        .limit(1);
      
      if (hospital.length === 0) {
        return res.status(404).json({ message: '해당 병원을 찾을 수 없습니다.' });
      }
      
      // 병원 진료과목 정보 가져오기
      const departments = await db.select()
        .from(hospitalDepartments)
        .where(eq(hospitalDepartments.hospitalId, hospitalId));
      
      // 병원 정보와 진료과목 정보 합치기
      const hospitalWithDepartments = {
        ...hospital[0],
        departments: departments
      };
      
      res.json(hospitalWithDepartments);
    } catch (error) {
      console.error('병원 상세 정보 조회 오류:', error);
      res.status(500).json({ message: '병원 정보를 가져오는 중 오류가 발생했습니다.' });
    }
  });

  // 카카오맵 API 키 제공 (클라이언트에서 안전하게 사용할 수 있도록)
  app.get('/api/config/kakao-map-key', (req, res) => {
    const kakaoMapApiKey = process.env.KAKAO_MAP_API_KEY;
    
    if (!kakaoMapApiKey) {
      return res.status(500).json({ 
        message: '카카오맵 API 키가 설정되지 않았습니다.',
        success: false 
      });
    }
    
    res.json({ 
      apiKey: kakaoMapApiKey,
      success: true 
    });
  });
  
  // HIRA 병원/약국 데이터 가져오기 API (관리자용)
  app.post('/api/admin/import-hospital-data', async (req, res) => {
    try {
      const { processExcelData } = await import('./scripts/process-hira-excel');
      
      console.log('병원/약국 데이터 가져오기 시작...');
      await processExcelData();
      
      res.json({
        message: '병원/약국 데이터 가져오기 완료',
        success: true
      });
    } catch (error) {
      console.error('병원/약국 데이터 가져오기 오류:', error);
      res.status(500).json({
        message: '병원/약국 데이터 가져오기 실패',
        error: error.message,
        success: false
      });
    }
  });
  
  // 전국 지역 병원 데이터 추가 API
  app.post('/api/admin/add-nationwide-hospitals', async (req, res) => {
    try {
      const { addNationwideHospitals } = await import('./scripts/add-nationwide-hospitals');
      
      console.log('전국 지역 병원 데이터 추가 시작...');
      const result = await addNationwideHospitals();
      
      res.json({
        message: '전국 지역 병원 데이터 추가 완료',
        ...result
      });
    } catch (error) {
      console.error('전국 지역 병원 데이터 추가 오류:', error);
      res.status(500).json({
        message: '전국 지역 병원 데이터 추가 실패',
        error: error.message,
        success: false
      });
    }
  });
  
  // 전국 병원 정보 가져오기 API (HIRA 데이터 기반)
  app.post('/api/admin/fetch-nationwide-hospitals', async (req, res) => {
    try {
      const { fetchNationwideHospitals } = await import('./scripts/fetch-nationwide-hospitals');
      
      console.log('전국 병원 데이터 가져오기 시작...');
      const result = await fetchNationwideHospitals();
      
      res.json({
        message: '전국 병원 데이터 가져오기 완료',
        ...result
      });
    } catch (error) {
      console.error('전국 병원 데이터 가져오기 오류:', error);
      res.status(500).json({
        message: '전국 병원 데이터 가져오기 실패',
        error: error.message,
        success: false
      });
    }
  });
  
  // 심장 전문, 종합병원, 24시간, 응급센터 병원 가져오기 API
  app.get('/api/hospitals/specialized', async (req, res) => {
    try {
      // 기본 필터링 조건
      const { 
        isHeartCenter = false, 
        isEmergency = false, 
        isOpen24h = false,
        lat, lng, radius = 50 // 반경 50km로 확장
      } = req.query;
      
      console.log(`전문 병원 검색 조건: 심장센터=${isHeartCenter}, 응급실=${isEmergency}, 24시간=${isOpen24h}`);
      
      // 쿼리 빌더 초기화
      let query = db.select({
        id: hospitals.id,
        hiraId: hospitals.hiraId,
        name: hospitals.name,
        address: hospitals.address,
        tel: hospitals.phone,
        lat: hospitals.latitude,
        lng: hospitals.longitude,
        isEmergency: hospitals.isEmergency,
        isOpen24h: hospitals.isOpen24h,
        isHeartCenter: hospitals.isHeartCenter,
        specialty: hospitals.specialty
      })
      .from(hospitals)
      .where(
        // 조건부 필터링 구현
        (isHeartCenter === 'true' || isHeartCenter === true) ? eq(hospitals.isHeartCenter, true) :
        (isEmergency === 'true' || isEmergency === true) ? eq(hospitals.isEmergency, true) :
        (isOpen24h === 'true' || isOpen24h === true) ? eq(hospitals.isOpen24h, true) :
        // 기본적으로 최소한 하나 이상의 조건을 만족하는 병원 검색
        or(
          eq(hospitals.isHeartCenter, true),
          eq(hospitals.isEmergency, true),
          eq(hospitals.isOpen24h, true)
        )
      )
      .limit(1000);
      
      const specializedHospitals = await query;
      
      // 거리 계산 및 정렬 로직 (위치 정보가 제공된 경우)
      let processedHospitals = specializedHospitals;
      
      if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        
        processedHospitals = specializedHospitals
          .filter(hospital => hospital.lat !== null && hospital.lng !== null)
          .map(hospital => {
            const distance = calculateDistance(
              userLat, userLng,
              hospital.lat!, hospital.lng!
            );
            
            return {
              ...hospital,
              distance: Math.round(distance * 10) / 10 // 소수점 첫째 자리까지
            };
          })
          .filter(hospital => hospital.distance <= Number(radius))
          .sort((a, b) => {
            // 심장 전문 병원 최우선
            if (a.isHeartCenter !== b.isHeartCenter) return b.isHeartCenter ? 1 : -1;
            
            // 응급의료센터 두번째 우선
            if (a.isEmergency !== b.isEmergency) return b.isEmergency ? 1 : -1;
            
            // 24시간 병원 세번째 우선
            if (a.isOpen24h !== b.isOpen24h) return b.isOpen24h ? 1 : -1;
            
            // 거리순 정렬
            return a.distance - b.distance;
          });
      } else {
        // 위치 정보가 없는 경우, 우선순위만 적용
        processedHospitals = specializedHospitals.sort((a, b) => {
          // 심장 전문 병원 최우선
          if (a.isHeartCenter !== b.isHeartCenter) return b.isHeartCenter ? 1 : -1;
          
          // 응급의료센터 두번째 우선
          if (a.isEmergency !== b.isEmergency) return b.isEmergency ? 1 : -1;
          
          // 24시간 병원 세번째 우선
          if (a.isOpen24h !== b.isOpen24h) return b.isOpen24h ? 1 : -1;
          
          // 이름순 정렬
          return a.name.localeCompare(b.name);
        });
      }
      
      console.log(`전문 병원 ${processedHospitals.length}개를 찾았습니다.`);
      
      return res.json({
        count: processedHospitals.length,
        hospitals: processedHospitals
      });
    } catch (error) {
      console.error('전문 병원 검색 오류:', error);
      return res.status(500).json({ 
        message: '전문 병원 정보를 가져오는 중 오류가 발생했습니다.',
        success: false 
      });
    }
  });
  
  return httpServer;
}
