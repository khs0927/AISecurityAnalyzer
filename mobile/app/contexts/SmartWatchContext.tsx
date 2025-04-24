import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Alert, Platform, AppState, AppStateStatus } from 'react-native';
import { BleManager, Device, Subscription, BleError } from 'react-native-ble-plx';
import { connectWebSocket } from '../api/client';
import * as Notifications from 'expo-notifications';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import Constants from 'expo-constants';
import Pusher from 'pusher-js/react-native';

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

interface SmartWatchContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  deviceInfo: DeviceInfo | null;
  data: SmartWatchData;
  scanForDevices: () => Promise<Device[]>;
  connectToWatch: (device: Device) => Promise<boolean>;
  disconnectWatch: () => Promise<void>;
  startHeartRateMonitoring: () => Promise<boolean>;
  stopHeartRateMonitoring: () => Promise<void>;
  clearData: () => void;
  errorMessage: string | null;
  isScanning: boolean;
  connecting: boolean;
  currentData: HealthData | null;
  historicalData: HistoricalData;
  riskData: RiskData | null;
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  refreshData: () => Promise<void>;
  sendHealthData: (data: Partial<HealthData>) => Promise<void>;
  toggleRiskAnalysis: () => void;
  isAnalyzing: boolean;
}

// BLE 서비스 및 특성 UUID
const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_CHARACTERISTIC = '00002a37-0000-1000-8000-00805f9b34fb';
const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_CHARACTERISTIC = '00002a19-0000-1000-8000-00805f9b34fb';

// 컨텍스트 생성
const SmartWatchContext = createContext<SmartWatchContextType | undefined>(undefined);

// 컨텍스트 훅
export const useSmartWatch = (): SmartWatchContextType => {
  const context = useContext(SmartWatchContext);
  if (!context) {
    throw new Error('useSmartWatch must be used within a SmartWatchProvider');
  }
  return context;
};

export const SmartWatchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bleManager] = useState(() => new BleManager());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  
  const [data, setData] = useState<SmartWatchData>({
    heartRate: null,
    oxygenLevel: null,
    batteryLevel: null,
    ecgData: [],
    ppgData: [],
    lastUpdated: null
  });
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [currentData, setCurrentData] = useState<HealthData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData>({
    day: [],
    week: [],
    month: [],
  });
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskData[]>([]);
  const [isRiskAnalysisActive, setIsRiskAnalysisActive] = useState(true);
  
  // 기기 검색
  const scanForDevices = async (): Promise<Device[]> => {
    try {
      setErrorMessage(null);
      setIsScanning(true);
      
      // Android에서는 위치 권한 필요
      if (Platform.OS === 'android') {
        const granted = await requestAndroidPermissions();
        if (!granted) {
          throw new Error('BLE 스캔을 위한 권한이 필요합니다.');
        }
      }
      
      return new Promise((resolve, reject) => {
        const devices: Device[] = [];
        
        // 스캔 타임아웃 10초
        const timeout = setTimeout(() => {
          bleManager.stopDeviceScan();
          setIsScanning(false);
          resolve(devices);
        }, 10000);
        
        bleManager.startDeviceScan(
          [HEART_RATE_SERVICE, BATTERY_SERVICE], 
          { allowDuplicates: false },
          (error, device) => {
            if (error) {
              clearTimeout(timeout);
              bleManager.stopDeviceScan();
              setIsScanning(false);
              reject(error);
              return;
            }
            
            if (device && device.name && !devices.find(d => d.id === device.id)) {
              devices.push(device);
            }
          }
        );
      });
    } catch (error) {
      console.error('기기 스캔 오류:', error);
      setErrorMessage('기기 검색 중 오류가 발생했습니다.');
      setIsScanning(false);
      return [];
    } finally {
      setIsScanning(false);
    }
  };
  
  // Android 권한 요청
  const requestAndroidPermissions = async (): Promise<boolean> => {
    // Android 12 이상에서는 BLUETOOTH_SCAN, BLUETOOTH_CONNECT 권한 필요
    // 이 부분은 라이브러리를 통해 처리하거나 직접 구현 필요
    return true; // 실제 구현 필요
  };
  
  // 웹소켓 초기화
  useEffect(() => {
    const socket = connectWebSocket();
    setWebSocket(socket);
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);
  
  // 앱 종료 시 연결 해제
  useEffect(() => {
    return () => {
      if (connectedDevice) {
        bleManager.cancelDeviceConnection(connectedDevice.id)
          .catch(error => console.error('연결 해제 오류:', error));
      }
      bleManager.destroy();
    };
  }, [bleManager, connectedDevice]);
  
  // 기기 연결
  const connectToWatch = async (device: Device): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);
      
      const connectedDevice = await bleManager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(connectedDevice);
      setDeviceInfo({
        id: device.id,
        name: device.name || '알 수 없는 기기',
        model: null,
        manufacturer: null
      });
      
      setConnectionStatus('connected');
      
      // 배터리 모니터링 시작
      try {
        await monitorBatteryLevel(connectedDevice);
      } catch (error) {
        console.warn('배터리 모니터링 실패:', error);
      }
      
      return true;
    } catch (error) {
      console.error('기기 연결 오류:', error);
      setConnectionStatus('error');
      setErrorMessage('기기 연결 중 오류가 발생했습니다.');
      return false;
    }
  };
  
  // 배터리 레벨 모니터링
  const monitorBatteryLevel = async (device: Device): Promise<void> => {
    try {
      const batteryService = await device.services().then(services => 
        services.find(s => s.uuid.toLowerCase() === BATTERY_SERVICE));
      
      if (batteryService) {
        const batteryCharacteristic = await batteryService.characteristics().then(characteristics => 
          characteristics.find(c => c.uuid.toLowerCase() === BATTERY_CHARACTERISTIC));
        
        if (batteryCharacteristic) {
          device.monitorCharacteristicForService(
            BATTERY_SERVICE,
            BATTERY_CHARACTERISTIC,
            (error, characteristic) => {
              if (error) {
                console.error('배터리 모니터링 오류:', error);
                return;
              }
              
              if (characteristic?.value) {
                const decoded = Buffer.from(characteristic.value, 'base64');
                const batteryLevel = decoded[0];
                
                setData(prev => ({
                  ...prev,
                  batteryLevel,
                  lastUpdated: new Date()
                }));
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('배터리 서비스 검색 오류:', error);
      throw error;
    }
  };
  
  // 심박수 모니터링 시작
  const startHeartRateMonitoring = async (): Promise<boolean> => {
    if (!connectedDevice || connectionStatus !== 'connected') {
      setErrorMessage('심박수 모니터링을 시작하려면 먼저 기기를 연결하세요.');
      return false;
    }
    
    try {
      const service = await connectedDevice.services().then(services => 
        services.find(s => s.uuid.toLowerCase() === HEART_RATE_SERVICE));
      
      if (!service) {
        setErrorMessage('이 기기는 심박수 서비스를 지원하지 않습니다.');
        return false;
      }
      
      const characteristic = await service.characteristics().then(characteristics => 
        characteristics.find(c => c.uuid.toLowerCase() === HEART_RATE_CHARACTERISTIC));
      
      if (!characteristic) {
        setErrorMessage('이 기기는 심박수 특성을 지원하지 않습니다.');
        return false;
      }
      
      connectedDevice.monitorCharacteristicForService(
        HEART_RATE_SERVICE,
        HEART_RATE_CHARACTERISTIC,
        (error, characteristic) => {
          if (error) {
            console.error('심박수 모니터링 오류:', error);
            return;
          }
          
          if (characteristic?.value) {
            const decoded = Buffer.from(characteristic.value, 'base64');
            
            // 심박수 데이터 파싱 (기기마다 다를 수 있음)
            // 대부분의 경우 두 번째 바이트가 심박수
            const heartRate = decoded[1];
            
            setData(prev => ({
              ...prev,
              heartRate,
              lastUpdated: new Date()
            }));
            
            // 웹소켓으로 데이터 전송
            if (webSocket && webSocket.readyState === WebSocket.OPEN) {
              webSocket.send(JSON.stringify({
                type: 'heartrate',
                data: { heartRate, timestamp: new Date().toISOString() }
              }));
            }
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('심박수 모니터링 시작 오류:', error);
      setErrorMessage('심박수 모니터링을 시작하는 중 오류가 발생했습니다.');
      return false;
    }
  };
  
  // 심박수 모니터링 중지
  const stopHeartRateMonitoring = async (): Promise<void> => {
    if (connectedDevice) {
      try {
        await connectedDevice.cancelConnection();
      } catch (error) {
        console.error('심박수 모니터링 중지 오류:', error);
      }
    }
  };
  
  // 연결 해제
  const disconnectWatch = async (): Promise<void> => {
    if (connectedDevice) {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
        setDeviceInfo(null);
        setConnectionStatus('disconnected');
      } catch (error) {
        console.error('연결 해제 오류:', error);
        setErrorMessage('기기 연결을 해제하는 중 오류가 발생했습니다.');
      }
    }
  };
  
  // 데이터 초기화
  const clearData = (): void => {
    setData({
      heartRate: null,
      oxygenLevel: null,
      batteryLevel: null,
      ecgData: [],
      ppgData: [],
      lastUpdated: null
    });
  };
  
  // 알림 설정
  useEffect(() => {
    registerForPushNotificationsAsync();

    // 앱 상태 변경 감지
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // 앱 상태 변경 처리
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // 앱이 포그라운드로 돌아오면 연결 상태 확인
      if (socket && !socket.connected && isConnected) {
        reconnect();
      }
    }
  };

  // 알림 등록
  async function registerForPushNotificationsAsync() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('알림 권한 필요', '위험 알림을 받기 위해 알림 권한이 필요합니다.');
      return;
    }
    
    // 알림 핸들러 설정
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  // 알림 표시
  const sendNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: null,
    });
  };

  // 서버 연결
  const connect = async () => {
    try {
      setConnecting(true);
      
      // 저장된 사용자 정보 가져오기
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('authToken');
      
      if (!userId || !token) {
        throw new Error('인증 정보가 없습니다. 로그인이 필요합니다.');
      }
      
      // 소켓 연결
      const newSocket = io(API_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      newSocket.on('connect', () => {
        console.log('Socket connected');
        
        // 인증
        newSocket.emit('authenticate', { userId, token });
      });
      
      newSocket.on('authenticate_success', async () => {
        setIsConnected(true);
        setConnecting(false);
        console.log('Authentication successful');
        
        // 연결 성공 시 데이터 갱신
        await refreshData();
      });
      
      newSocket.on('authenticate_error', (error) => {
        console.error('Authentication failed:', error);
        setConnecting(false);
        Alert.alert('연결 실패', '인증에 실패했습니다. 다시 로그인해주세요.');
        disconnect();
      });
      
      // 위험도 업데이트 수신
      newSocket.on('risk_update', (data: RiskData) => {
        setRiskData(data);
        // 위험도 히스토리에 추가 (최대 50개 유지)
        setRiskHistory(prev => {
          const updated = [data, ...prev];
          return updated.slice(0, 50);
        });
      });
      
      // 위험 알림 수신
      newSocket.on('risk_alert', async (data: { level: string, message: string }) => {
        const title = data.level === 'critical' ? '심각한 위험 감지!' : '주의 필요';
        await sendNotification(title, data.message);
      });
      
      // 위험도 분석 상태 업데이트
      newSocket.on('risk_analysis_status', (data: { active: boolean }) => {
        setIsRiskAnalysisActive(data.active);
      });
      
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });
      
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });
      
      setSocket(newSocket);
    } catch (error) {
      console.error('Connection error:', error.message);
      setConnecting(false);
      Alert.alert('연결 실패', error.message);
    }
  };

  // 재연결
  const reconnect = () => {
    if (socket) {
      socket.connect();
    } else {
      connect();
    }
  };

  // 연결 해제
  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsConnected(false);
  };

  // 데이터 갱신
  const refreshData = async () => {
    try {
      // 실제 API 호출 구현
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('사용자 ID가 없습니다');
      
      // 최신 데이터 가져오기
      const responseLatest = await fetch(`${API_URL}/api/health/latest/${userId}`);
      if (responseLatest.ok) {
        const latestData = await responseLatest.json();
        setCurrentData(latestData);
      }
      
      // 일일 데이터
      const responseDay = await fetch(`${API_URL}/api/health/history/${userId}?period=day`);
      // 주간 데이터
      const responseWeek = await fetch(`${API_URL}/api/health/history/${userId}?period=week`);
      // 월간 데이터
      const responseMonth = await fetch(`${API_URL}/api/health/history/${userId}?period=month`);
      
      if (responseDay.ok && responseWeek.ok && responseMonth.ok) {
        const dayData = await responseDay.json();
        const weekData = await responseWeek.json();
        const monthData = await responseMonth.json();
        
        setHistoricalData({
          day: dayData,
          week: weekData,
          month: monthData,
        });
      }
      
      // 최신 위험도 데이터
      const responseRisk = await fetch(`${API_URL}/api/health/risk/${userId}/latest`);
      if (responseRisk.ok) {
        const riskData = await responseRisk.json();
        setRiskData(riskData);
      }
      
      // 위험도 히스토리
      const responseRiskHistory = await fetch(`${API_URL}/api/health/risk/${userId}/history?limit=20`);
      if (responseRiskHistory.ok) {
        const riskHistoryData = await responseRiskHistory.json();
        setRiskHistory(riskHistoryData);
      }
      
      return true;
    } catch (error) {
      console.error('Data refresh error:', error.message);
      return false;
    }
  };

  // 건강 데이터 전송
  const sendHealthData = (data: Partial<HealthData>) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return;
    }
    
    const timestampedData = {
      ...data,
      timestamp: Date.now(),
    };
    
    socket.emit('health_data', timestampedData);
    
    // 로컬 상태 업데이트
    if (currentData) {
      const updatedData = { ...currentData, ...timestampedData };
      setCurrentData(updatedData);
    } else {
      setCurrentData({
        heartRate: data.heartRate || 0,
        oxygenLevel: data.oxygenLevel || 0,
        ecgData: data.ecgData || [],
        timestamp: timestampedData.timestamp,
      });
    }
  };

  // 위험도 분석 토글
  const toggleRiskAnalysis = (active: boolean) => {
    if (socket && isConnected) {
      socket.emit('toggle_risk_analysis', { active });
      setIsRiskAnalysisActive(active);
    }
  };

  const contextValue: SmartWatchContextType = {
    isConnected,
    connectionStatus,
    deviceInfo,
    data,
    scanForDevices,
    connectToWatch,
    disconnectWatch,
    startHeartRateMonitoring,
    stopHeartRateMonitoring,
    clearData,
    errorMessage,
    isScanning,
    connecting,
    currentData,
    historicalData,
    riskData,
    riskHistory,
    connect,
    disconnect: disconnect,
    refreshData,
    sendHealthData,
    toggleRiskAnalysis,
    isRiskAnalysisActive,
  };
  
  return (
    <SmartWatchContext.Provider value={contextValue}>
      {children}
    </SmartWatchContext.Provider>
  );
};

export default SmartWatchProvider; 