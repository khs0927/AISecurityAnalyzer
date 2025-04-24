import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { BleManager, Device, Subscription, BleError } from 'react-native-ble-plx';
import { connectWebSocket } from '../api/client';

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
  scanForDevices: () => Promise<Device[]>;
  connectToWatch: (device: Device) => Promise<boolean>;
  disconnectWatch: () => Promise<void>;
  startHeartRateMonitoring: () => Promise<boolean>;
  stopHeartRateMonitoring: () => Promise<void>;
  clearData: () => void;
  errorMessage: string | null;
  isScanning: boolean;
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
  
  const contextValue: SmartWatchContextType = {
    isConnected: connectionStatus === 'connected',
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
    isScanning
  };
  
  return (
    <SmartWatchContext.Provider value={contextValue}>
      {children}
    </SmartWatchContext.Provider>
  );
};

export default SmartWatchProvider; 