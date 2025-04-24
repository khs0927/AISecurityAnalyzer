import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { 
  scanForBluetoothDevices, 
  connectToDevice, 
  disconnectDevice,
  startECGMonitoring,
  startPPGMonitoring,
  stopECGMonitoring,
  stopPPGMonitoring
} from '@/lib/bluetooth';

// 스마트워치 데이터 타입 정의
interface SmartWatchData {
  heartRate: number | null;
  oxygenLevel: number | null;
  batteryLevel: number | null;
  ecgData: number[];
  ppgData: number[];
  lastUpdated: Date | null;
}

interface DeviceInfo {
  id: string;
  name: string;
  model: string | null;
  manufacturer: string | null;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SmartWatchContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  deviceInfo: DeviceInfo | null;
  data: SmartWatchData;
  scanForDevices: () => Promise<any[]>;
  connectToWatch: (deviceId: string) => Promise<boolean>;
  disconnectWatch: () => Promise<void>;
  startECGReading: () => Promise<boolean>;
  startPPGReading: () => Promise<boolean>;
  stopECGReading: () => Promise<void>;
  stopPPGReading: () => Promise<void>;
  clearData: () => void;
  errorMessage: string | null;
}

const SmartWatchContext = createContext<SmartWatchContextType | undefined>(undefined);

export const useSmartWatch = () => {
  const context = useContext(SmartWatchContext);
  if (!context) {
    throw new Error('useSmartWatch must be used within a SmartWatchProvider');
  }
  return context;
};

export const SmartWatchProvider = ({ children }: { children: ReactNode }) => {
  // 테스트를 위해 스마트워치가 항상 연결된 상태로 설정
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>({
    id: 'mock-device-1',
    name: 'Galaxy Watch 6',
    model: 'SM-R900',
    manufacturer: 'Samsung'
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [data, setData] = useState<SmartWatchData>({
    heartRate: 78,
    oxygenLevel: 97,
    batteryLevel: 85,
    ecgData: Array.from({length: 100}, () => Math.random() * 0.5 - 0.25),
    ppgData: Array.from({length: 50}, () => Math.random() * 10 + 90),
    lastUpdated: new Date()
  });
  
  // 블루투스 기기 검색
  const scanForDevices = async () => {
    try {
      setErrorMessage(null);
      console.log('스마트워치 검색 시작...');
      const devices = await scanForBluetoothDevices();
      console.log('검색된 기기:', devices);
      return devices;
    } catch (error) {
      console.error('기기 검색 오류:', error);
      setErrorMessage('기기를 검색하는 중 오류가 발생했습니다.');
      return [];
    }
  };
  
  // 스마트워치 연결
  const connectToWatch = async (deviceId: string) => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);
      
      console.log(`기기 ID ${deviceId}에 연결 중...`);
      const device = await connectToDevice(deviceId);
      
      if (device) {
        setConnectionStatus('connected');
        setDeviceInfo({
          id: device.id,
          name: device.name || '알 수 없는 기기',
          model: device.model || null,
          manufacturer: device.manufacturer || null
        });
        
        console.log('기기 연결 성공:', device);
        return true;
      } else {
        throw new Error('연결 실패');
      }
    } catch (error) {
      console.error('기기 연결 오류:', error);
      setConnectionStatus('error');
      setErrorMessage('기기에 연결하는 중 오류가 발생했습니다.');
      return false;
    }
  };
  
  // 스마트워치 연결 해제
  const disconnectWatch = async () => {
    try {
      if (connectionStatus === 'connected' && deviceInfo) {
        await disconnectDevice(deviceInfo.id);
      }
      setConnectionStatus('disconnected');
      setDeviceInfo(null);
    } catch (error) {
      console.error('연결 해제 오류:', error);
      setErrorMessage('기기 연결을 해제하는 중 오류가 발생했습니다.');
    }
  };
  
  // ECG 모니터링 시작
  const startECGReading = async () => {
    if (!deviceInfo || connectionStatus !== 'connected') {
      setErrorMessage('ECG 모니터링을 시작하려면 먼저 기기를 연결하세요.');
      return false;
    }
    
    try {
      setErrorMessage(null);
      await startECGMonitoring(deviceInfo.id, (value: number) => {
        setData(prev => ({
          ...prev,
          ecgData: [...prev.ecgData, value],
          lastUpdated: new Date()
        }));
      });
      return true;
    } catch (error) {
      console.error('ECG 모니터링 오류:', error);
      setErrorMessage('ECG 모니터링을 시작하는 중 오류가 발생했습니다.');
      return false;
    }
  };
  
  // PPG 모니터링 시작
  const startPPGReading = async () => {
    if (!deviceInfo || connectionStatus !== 'connected') {
      setErrorMessage('PPG 모니터링을 시작하려면 먼저 기기를 연결하세요.');
      return false;
    }
    
    try {
      setErrorMessage(null);
      await startPPGMonitoring(deviceInfo.id, (ppgValue: number, hrValue: number | null, spO2Value: number | null) => {
        setData(prev => ({
          ...prev,
          ppgData: [...prev.ppgData, ppgValue],
          heartRate: hrValue !== null ? hrValue : prev.heartRate,
          oxygenLevel: spO2Value !== null ? spO2Value : prev.oxygenLevel,
          lastUpdated: new Date()
        }));
      });
      return true;
    } catch (error) {
      console.error('PPG 모니터링 오류:', error);
      setErrorMessage('PPG 모니터링을 시작하는 중 오류가 발생했습니다.');
      return false;
    }
  };
  
  // ECG 모니터링 중지
  const stopECGReading = async () => {
    if (deviceInfo) {
      try {
        await stopECGMonitoring(deviceInfo.id);
      } catch (error) {
        console.error('ECG 모니터링 중지 오류:', error);
      }
    }
  };
  
  // PPG 모니터링 중지
  const stopPPGReading = async () => {
    if (deviceInfo) {
      try {
        await stopPPGMonitoring(deviceInfo.id);
      } catch (error) {
        console.error('PPG 모니터링 중지 오류:', error);
      }
    }
  };
  
  // 데이터 초기화
  const clearData = () => {
    setData({
      heartRate: null,
      oxygenLevel: null,
      batteryLevel: null,
      ecgData: [],
      ppgData: [],
      lastUpdated: null
    });
  };
  
  // 앱 종료 시 연결 해제 처리
  useEffect(() => {
    return () => {
      if (connectionStatus === 'connected' && deviceInfo) {
        disconnectDevice(deviceInfo.id).catch(console.error);
      }
    };
  }, [connectionStatus, deviceInfo]);
  
  // 스마트워치 컨텍스트 값
  const value: SmartWatchContextType = {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    deviceInfo,
    data,
    scanForDevices,
    connectToWatch,
    disconnectWatch,
    startECGReading,
    startPPGReading,
    stopECGReading,
    stopPPGReading,
    clearData,
    errorMessage
  };
  
  return (
    <SmartWatchContext.Provider value={value}>
      {children}
    </SmartWatchContext.Provider>
  );
};