import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import Pusher from 'pusher-js';
import axios from 'axios';

// 타입 정의
interface HealthData {
  userId?: string;
  heartRate: number;
  oxygenLevel: number;
  ecgData: number[];
  timestamp: string;
}

interface HistoricalData {
  daily: HealthData[];
  weekly: HealthData[];
  monthly: HealthData[];
}

interface RiskData {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  recommendations: string[];
  timestamp: string;
}

interface HealthDataContextType {
  currentData: HealthData | null;
  historicalData: HistoricalData;
  riskData: RiskData | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  refreshData: (userId: string) => Promise<void>;
  toggleRiskAnalysis: () => void;
}

// 기본 히스토리컬 데이터
const defaultHistoricalData: HistoricalData = {
  daily: [],
  weekly: [],
  monthly: [],
};

// 컨텍스트 생성
const HealthDataContext = createContext<HealthDataContextType | undefined>(undefined);

// 환경 변수
const API_URL = process.env.REACT_APP_API_URL || 'https://nottoday-api.onrender.com';
const PUSHER_KEY = process.env.REACT_APP_PUSHER_KEY || 'your-pusher-key';
const PUSHER_CLUSTER = process.env.REACT_APP_PUSHER_CLUSTER || 'ap3';

// Pusher 초기화
const pusher = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,
});

// 컨텍스트 프로바이더
export const HealthDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentData, setCurrentData] = useState<HealthData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData>(defaultHistoricalData);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [channel, setChannel] = useState<any>(null);

  // Pusher 채널 초기화
  useEffect(() => {
    if (userId) {
      const newChannel = pusher.subscribe('health-channel');
      
      newChannel.bind('new-data', (data: HealthData) => {
        console.log('Pusher에서 건강 데이터 수신:', data);
        if (data.userId === userId) {
          setCurrentData(data);
          updateHistoricalData(data);
        }
      });

      newChannel.bind('risk-alert', (data: RiskData) => {
        console.log('Pusher에서 리스크 알림 수신:', data);
        if (data.userId === userId) {
          setRiskData(data);
        }
      });

      setChannel(newChannel);

      return () => {
        newChannel.unbind_all();
        pusher.unsubscribe('health-channel');
      };
    }
  }, [userId]);

  // 히스토리컬 데이터 업데이트
  const updateHistoricalData = (newData: HealthData) => {
    setHistoricalData((prev) => {
      const updatedDaily = [...prev.daily, newData].slice(-24);
      const updatedWeekly = [...prev.weekly, newData].slice(-168);
      const updatedMonthly = [...prev.monthly, newData].slice(-720);
      
      return {
        daily: updatedDaily,
        weekly: updatedWeekly,
        monthly: updatedMonthly,
      };
    });
  };

  // 데이터 새로고침
  const refreshData = async (newUserId: string) => {
    if (!newUserId) return;
    
    setIsLoading(true);
    setUserId(newUserId);
    
    try {
      // 최신 데이터 가져오기
      const response = await axios.get(`${API_URL}/api/health/latest/${newUserId}`);
      
      if (response.data.success && response.data.data) {
        setCurrentData(response.data.data);
      }

      // 히스토리 데이터 가져오기
      const historyResponse = await axios.get(`${API_URL}/api/health/history/${newUserId}`);
      
      if (historyResponse.data.success && historyResponse.data.data) {
        setHistoricalData(historyResponse.data.data);
      }

      // 리스크 데이터 가져오기 (분석 활성화된 경우)
      if (isAnalyzing) {
        const riskResponse = await axios.get(`${API_URL}/api/analysis/risk/${newUserId}`);
        
        if (riskResponse.data.success && riskResponse.data.data) {
          setRiskData(riskResponse.data.data);
        }
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 리스크 분석 토글
  const toggleRiskAnalysis = () => {
    setIsAnalyzing((prev) => {
      const newValue = !prev;
      
      // 토글 시 서버에 알림
      if (userId) {
        axios.post(`${API_URL}/api/analysis/toggle`, {
          userId,
          isActive: newValue
        }).catch(error => {
          console.error('리스크 분석 토글 오류:', error);
        });
      }
      
      return newValue;
    });
  };

  // 프로바이더 값
  const value: HealthDataContextType = {
    currentData,
    historicalData,
    riskData,
    isLoading,
    isAnalyzing,
    refreshData,
    toggleRiskAnalysis,
  };

  return (
    <HealthDataContext.Provider value={value}>
      {children}
    </HealthDataContext.Provider>
  );
};

// 커스텀 훅
export const useHealthData = () => {
  const context = useContext(HealthDataContext);
  if (context === undefined) {
    throw new Error('useHealthData는 HealthDataProvider 내에서 사용해야 합니다.');
  }
  return context;
};

export default HealthDataContext; 