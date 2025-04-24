import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { websocketClient } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Data types
interface HealthData {
  heartRate: number;
  oxygenLevel: number;
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  riskLevel: number;
}

interface User {
  id: number;
  name: string;
  age: number;
  gender: string;
  role: 'user' | 'guardian';
  medicalConditions: string[];
}

interface Alert {
  id: number;
  userId: number;
  alertType: 'risk' | 'warning' | 'info';
  message: string;
  read: boolean;
  createdAt: Date;
}

// Context interface
interface AppContextType {
  currentMode: 'user' | 'guardian';
  setCurrentMode: (mode: 'user' | 'guardian') => void;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  healthData: HealthData | null;
  currentUser: User | null;
  user: User | null; // 별칭: currentUser와 동일 (Guardian 페이지 호환성)
  guardianPatients: (User & { healthData?: HealthData })[];
  alerts: Alert[];
  isEcgAnomalyDetected: boolean;
  ecgStatus: 'normal' | 'warning' | 'critical';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  simulateRiskLevel: (level: number) => Promise<void>;
  simulateEcgAnomaly: (anomalyType: string) => Promise<void>;
}

// Default values
const defaultHealthData: HealthData = {
  heartRate: 72,
  oxygenLevel: 98,
  temperature: 36.5,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  riskLevel: 20
};

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [currentMode, setCurrentMode] = useState<'user' | 'guardian'>('user');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [guardianPatients, setGuardianPatients] = useState<(User & { healthData?: HealthData })[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isEcgAnomalyDetected, setIsEcgAnomalyDetected] = useState(false);
  const [ecgStatus, setEcgStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load initial data
  useEffect(() => {
    // For demo purposes, using user ID 1 as the current user
    loadUserData(1);
    
    // Set up WebSocket handlers
    websocketClient.authenticate(1);
    
    websocketClient.on('healthUpdate', (data) => {
      if (data.healthData) {
        setHealthData(data.healthData);
        
        // Check if risk level is high
        if (data.healthData.riskLevel > 70) {
          setEcgStatus('critical');
          toast({
            title: "위험 상태 감지",
            description: "심각한 위험이 감지되었습니다. 즉시 의료진에게 연락하세요.",
            variant: "destructive",
          });
        } else if (data.healthData.riskLevel > 40) {
          setEcgStatus('warning');
          toast({
            title: "주의 상태",
            description: "심장 상태에 주의가 필요합니다.",
            variant: "default",
          });
        } else {
          setEcgStatus('normal');
        }
      }
    });
    
    websocketClient.on('alert', (data) => {
      if (data.alert) {
        // Add the new alert to state
        setAlerts(prevAlerts => [data.alert, ...prevAlerts]);
        
        // Show a toast notification
        const alertVariant = data.alert.alertType === 'risk' ? "destructive" : "default";
        
        toast({
          title: data.alert.alertType === 'risk' ? "위험 경고" : 
                data.alert.alertType === 'warning' ? "주의 필요" : "정보",
          description: data.alert.message,
          variant: alertVariant,
        });
      }
    });
    
    websocketClient.on('ecgUpdate', (data) => {
      // Handle real-time ECG updates for guardian mode
      // This would update a chart or visualization
      console.log('ECG update received:', data);
    });
    
    // Cleanup
    return () => {
      // Remove all event listeners
      ['healthUpdate', 'alert', 'ecgUpdate'].forEach(eventType => {
        websocketClient.off(eventType, () => {});
      });
    };
  }, [toast]);

  // Load user data (demo user for now)
  const loadUserData = async (userId: number) => {
    try {
      // Load user
      const userResponse = await fetch(`/api/users/${userId}`);
      const user = await userResponse.json();
      setCurrentUser(user);
      
      // Load health data
      const healthDataResponse = await fetch(`/api/users/${userId}/health-data/latest`);
      if (healthDataResponse.ok) {
        const data = await healthDataResponse.json();
        setHealthData(data);
      } else {
        // If no health data exists yet, use default values
        setHealthData(defaultHealthData);
      }
      
      // Load alerts
      const alertsResponse = await fetch(`/api/users/${userId}/alerts`);
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData);
      }
      
      // In guardian mode, load monitored patients
      if (user.role === 'guardian') {
        const patientsResponse = await fetch(`/api/guardians/${userId}/monitored-users`);
        if (patientsResponse.ok) {
          const patientsData = await patientsResponse.json();
          setGuardianPatients(patientsData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Use default values for demo
      setCurrentUser({
        id: 1,
        name: '홍길동',
        age: 45,
        gender: 'male',
        role: 'user',
        medicalConditions: ['고혈압', '당뇨']
      });
      setHealthData(defaultHealthData);
    }
  };

  // Start real-time monitoring
  const startMonitoring = () => {
    setIsMonitoring(true);
    toast({
      title: "모니터링 시작",
      description: "실시간 ECG 모니터링이 시작되었습니다.",
    });
  };

  // Stop monitoring
  const stopMonitoring = () => {
    setIsMonitoring(false);
    setIsEcgAnomalyDetected(false);
    setEcgStatus('normal');
  };

  // Simulate risk level change (for demo/testing)
  const simulateRiskLevel = async (level: number) => {
    try {
      await fetch('/api/simulate/risk-level', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser?.id || 1,
          riskLevel: level
        })
      });
      
      toast({
        title: "위험도 시뮬레이션",
        description: `위험도 레벨 ${level}% 시뮬레이션이 시작되었습니다.`,
      });
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "시뮬레이션 오류",
        description: "위험도 시뮬레이션 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // Simulate ECG anomaly (for demo/testing)
  const simulateEcgAnomaly = async (anomalyType: string) => {
    try {
      await fetch('/api/simulate/ecg-anomaly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser?.id || 1,
          anomalyType
        })
      });
      
      setIsEcgAnomalyDetected(true);
      setEcgStatus('critical');
      
      toast({
        title: "ECG 이상 시뮬레이션",
        description: `ECG ${anomalyType} 이상 시뮬레이션이 시작되었습니다.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "시뮬레이션 오류",
        description: "ECG 이상 시뮬레이션 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // Context value
  const value = {
    currentMode,
    setCurrentMode,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    healthData,
    currentUser,
    user: currentUser, // 별칭 추가
    guardianPatients,
    alerts,
    isEcgAnomalyDetected,
    ecgStatus,
    activeTab,
    setActiveTab,
    simulateRiskLevel,
    simulateEcgAnomaly
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook for using the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
