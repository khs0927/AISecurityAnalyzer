import React, { createContext, useContext, ReactNode, useState } from 'react';
import { SmartWatchProvider } from '@/contexts/SmartWatchContext';

interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  medicalConditions?: string[];
  healthData?: {
    heartRate?: number;
    bloodPressure?: string;
    bloodOxygen?: number;
  };
}

interface HealthData {
  heartRate?: number;
  bloodPressure?: string;
  bloodOxygen?: number;
  oxygenLevel?: number;
  temperature?: number;
  ecgData?: number[];
  riskLevel?: number; // 위험도를 숫자로 저장(0-100)
  lastUpdated?: Date;
}

interface GuardianPatient {
  id: number;
  name: string;
  status: 'normal' | 'warning' | 'risk';
  heartRate?: number;
  lastUpdated?: Date;
  age?: number;
  gender?: 'male' | 'female';
  medicalConditions?: string[];
  healthData?: {
    heartRate: number;
    riskLevel: number;
    oxygenLevel: number;
    temperature: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    recordedAt: Date;
  };
}

interface AppContextType {
  // 앱 전역 상태
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: 'ko' | 'en';
  setLanguage: (lang: 'ko' | 'en') => void;
  user: User | null;
  setUser: (user: User | null) => void;
  healthData: HealthData;
  guardianPatients: GuardianPatient[];
  currentUser: User | null;
  simulateRiskLevel: (customLevel?: number) => void;
  
  // ECG 모니터링 관련 상태 및 기능
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  ecgStatus: 'normal' | 'warning' | 'critical';
  simulateEcgAnomaly: (anomalyType: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>({
    id: 1,
    name: '이서연',
    email: 'user@example.com',
    phone: '010-1234-5678',
    medicalConditions: ['고혈압', '당뇨'],
    healthData: {
      heartRate: 75,
      bloodPressure: '120/80',
      bloodOxygen: 98
    }
  });
  
  // 건강 데이터 상태
  const [healthData, setHealthData] = useState<HealthData>({
    heartRate: 75,
    bloodPressure: '120/80',
    bloodOxygen: 98,
    oxygenLevel: 98,
    temperature: 36.5,
    ecgData: [],
    riskLevel: 15,  // 낮은 위험도(0-100)
    lastUpdated: new Date()
  });
  
  // 보호자 모드 환자 상태
  const [guardianPatients, setGuardianPatients] = useState<GuardianPatient[]>([
    {
      id: 1,
      name: '이서연',
      status: 'normal',
      heartRate: 75,
      lastUpdated: new Date()
    },
    {
      id: 2,
      name: '김민준',
      status: 'warning',
      heartRate: 92,
      lastUpdated: new Date()
    },
    {
      id: 3,
      name: '박지현',
      status: 'risk',
      heartRate: 115,
      lastUpdated: new Date()
    }
  ]);
  
  // 현재 로그인한 사용자 정보
  const currentUser = user;

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };
  
  // 위험도 시뮬레이션 함수
  const simulateRiskLevel = (customLevel?: number) => {
    if (customLevel !== undefined && customLevel >= 0 && customLevel <= 100) {
      // 사용자 정의 위험도가 제공된 경우
      setHealthData(prev => ({
        ...prev,
        riskLevel: customLevel,
        lastUpdated: new Date()
      }));
    } else {
      // 기본 동작: 랜덤 위험도 선택
      const riskLevels = [
        15,   // 낮은 위험도
        45,   // 중간 위험도
        75    // 높은 위험도
      ];
      const randomIndex = Math.floor(Math.random() * riskLevels.length);
      setHealthData(prev => ({
        ...prev,
        riskLevel: riskLevels[randomIndex],
        lastUpdated: new Date()
      }));
    }
  };

  // ECG 모니터링 관련 상태 및 함수
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [ecgStatus, setEcgStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  
  const startMonitoring = () => {
    setIsMonitoring(true);
  };
  
  const stopMonitoring = () => {
    setIsMonitoring(false);
    setEcgStatus('normal');
  };
  
  const simulateEcgAnomaly = (anomalyType: string) => {
    if (anomalyType === '심방세동') {
      setEcgStatus('warning');
    } else if (anomalyType === 'ST상승') {
      setEcgStatus('critical');
    } else {
      setEcgStatus('normal');
    }
  };
  
  // 전역 값 설정
  const value = {
    theme,
    toggleTheme,
    language,
    setLanguage,
    user,
    setUser,
    healthData,
    guardianPatients,
    currentUser,
    simulateRiskLevel,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    ecgStatus,
    simulateEcgAnomaly
  };

  return (
    <AppContext.Provider value={value}>
      <SmartWatchProvider>
        {children}
      </SmartWatchProvider>
    </AppContext.Provider>
  );
};