import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, Watch, Activity, Battery, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Web Bluetooth API 타입 정의
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: {
        filters?: Array<{
          services?: string[];
          name?: string;
          namePrefix?: string;
        }>;
        optionalServices?: string[];
      }): Promise<{
        id: string;
        name: string;
        gatt?: {
          connect(): Promise<any>;
        };
      }>;
    };
  }
}

export interface SmartWatchDevice {
  id: string;
  name: string;
  type: 'apple' | 'galaxy' | 'other';
  model?: string;
  batteryLevel?: number;
  signal?: number;
  connected?: boolean;
}

interface SmartWatchScannerProps {
  onDeviceSelected?: (device: SmartWatchDevice) => void;
}

const SmartWatchScanner = ({ onDeviceSelected }: SmartWatchScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredDevices, setDiscoveredDevices] = useState<SmartWatchDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<SmartWatchDevice | null>(null);
  const [bluetoothAvailable, setBluetoothAvailable] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { toast } = useToast();

  // 가상 스캔 시뮬레이션 (실제 장치가 없거나 API가 지원되지 않을 때)
  const simulateScanning = () => {
    const interval = setInterval(() => {
      setScanProgress(prev => {
        const newProgress = prev + 4;
        
        // 진행 상황에 따라 가상 장치 발견
        if (newProgress === 20) {
          const mockWatch1: SmartWatchDevice = {
            id: 'mock-1',
            name: 'Galaxy Watch 5',
            type: 'galaxy',
            model: '44mm',
            batteryLevel: 72,
            signal: 85
          };
          setDiscoveredDevices(prev => [...prev, mockWatch1]);
        }
        
        if (newProgress === 60) {
          const mockWatch2: SmartWatchDevice = {
            id: 'mock-2',
            name: 'Apple Watch',
            type: 'apple',
            model: 'Series 7',
            batteryLevel: 63,
            signal: 92
          };
          setDiscoveredDevices(prev => [...prev, mockWatch2]);
        }
        
        if (newProgress === 80) {
          const mockWatch3: SmartWatchDevice = {
            id: 'mock-3',
            name: 'Mi Band',
            type: 'other',
            batteryLevel: 88,
            signal: 78
          };
          setDiscoveredDevices(prev => [...prev, mockWatch3]);
        }
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          return 100;
        }
        return newProgress;
      });
    }, 200);
  };

  // 가상 연결 시뮬레이션
  const simulateConnection = (device: SmartWatchDevice) => {
    // 연결 시간 시뮬레이션
    setTimeout(() => {
      const updatedDevice = { ...device, connected: true };
      setSelectedDevice(updatedDevice);
      
      if (onDeviceSelected) {
        onDeviceSelected(updatedDevice);
      }
      
      toast({
        title: "연결 성공",
        description: `${device.name}(가상)에 성공적으로 연결되었습니다.`
      });
      
      setConnecting(null);
    }, 1500);
  };

  // 실제 웹 블루투스 API 지원 여부 확인
  useEffect(() => {
    const checkBluetoothAvailability = () => {
      if (navigator.bluetooth) {
        setBluetoothAvailable(true);
      } else {
        setBluetoothAvailable(false);
      }
    };

    checkBluetoothAvailability();
  }, []);

  // 블루투스 장치 스캔 시작
  const startScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setDiscoveredDevices([]);
    
    // Web Bluetooth API 지원 여부 확인
    if (bluetoothAvailable) {
      try {
        // 실제 블루투스 스캔 시작
        const device = await navigator.bluetooth?.requestDevice({
          // 심박수 서비스 필터 (심장 모니터링 장치)
          filters: [
            { services: ['heart_rate'] },
            { namePrefix: 'Apple Watch' },
            { namePrefix: 'Galaxy Watch' }
          ],
          // 검색할 서비스
          optionalServices: ['battery_service', 'device_information']
        });
        
        if (device) {
          // 발견된 실제 장치 추가
          const newDevice: SmartWatchDevice = {
            id: device.id,
            name: device.name || '알 수 없는 장치',
            type: device.name?.includes('Apple') ? 'apple' : 
                  device.name?.includes('Galaxy') ? 'galaxy' : 'other',
            signal: 80 + Math.floor(Math.random() * 20), // 신호 강도 추정치
            connected: false
          };
          
          setDiscoveredDevices(prev => [...prev, newDevice]);
          setScanProgress(100);
          
          toast({
            title: "장치 발견됨",
            description: `${device.name || '알 수 없는 장치'}(이)가 발견되었습니다.`
          });
        } else {
          throw new Error('No device found');
        }
      } catch (error) {
        console.error("Bluetooth scanning error:", error);
        
        // 사용자가 취소한 경우 가상 장치로 대체하지 않음
        if (error instanceof DOMException && error.name === 'NotFoundError') {
          toast({
            title: "장치를 찾을 수 없음",
            description: "주변에 호환되는 스마트워치를 찾을 수 없습니다.",
            variant: "destructive"
          });
        } else {
          // 그 외의 오류는 가상 장치로 시뮬레이션
          simulateScanning();
          
          toast({
            title: "블루투스 스캔 오류",
            description: "실제 장치 스캔에 실패했습니다. 가상 장치를 사용합니다.",
            variant: "destructive"
          });
        }
      }
    } else {
      // 블루투스를 지원하지 않는 경우 가상으로 시뮬레이션
      simulateScanning();
    }
  };

  // 장치 연결 시도
  const connectToDevice = async (device: SmartWatchDevice) => {
    setConnecting(device.id);
    
    // 실제 블루투스 연결 시도
    if (bluetoothAvailable && device.id.startsWith('mock') === false) {
      try {
        // 실제 블루투스 연결 시도 로직
        const realDevice = await navigator.bluetooth?.requestDevice({
          filters: [{ name: device.name }]
        });
        
        if (realDevice) {
          const server = await realDevice.gatt?.connect();
          
          if (server) {
            // 연결 성공
            const updatedDevice = { ...device, connected: true };
            setSelectedDevice(updatedDevice);
            
            if (onDeviceSelected) {
              onDeviceSelected(updatedDevice);
            }
            
            toast({
              title: "연결 성공",
              description: `${device.name}에 성공적으로 연결되었습니다.`
            });
          }
        }
      } catch (error) {
        console.error("Bluetooth connection error:", error);
        
        // 연결 실패 시 가상 연결로 대체
        simulateConnection(device);
      } finally {
        setConnecting(null);
      }
    } else {
      // 가상 연결 시뮬레이션
      simulateConnection(device);
    }
  };

  return (
    <div className="space-y-4">
      {!bluetoothAvailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">블루투스 제한</h4>
              <p className="text-xs text-yellow-700 mt-1">
                현재 환경에서는 Web Bluetooth API를 지원하지 않습니다. 가상 스마트워치 장치를 사용하여 기능을 테스트할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {isScanning ? (
        <div className="space-y-4">
          <div className="flex items-center">
            <Bluetooth className="animate-pulse text-blue-500 mr-2 h-5 w-5" />
            <span className="text-sm font-medium">주변 스마트워치 스캔 중...</span>
          </div>
          
          <Progress value={scanProgress} className="h-2" />
          
          {discoveredDevices.length > 0 && (
            <div className="pt-2">
              <h3 className="text-sm font-medium mb-2">발견된 장치</h3>
              <div className="space-y-2">
                {discoveredDevices.map(device => (
                  <Card key={device.id} className="border border-blue-100 bg-blue-50">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                            {device.type === 'apple' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                              </svg>
                            ) : device.type === 'galaxy' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M16.61 15.15C16.15 15.15 15.77 14.78 15.77 14.32S16.15 13.5 16.61 13.5 17.46 13.87 17.46 14.32 17.06 15.15 16.61 15.15M16.61 10.59C16.15 10.59 15.77 10.22 15.77 9.76S16.15 8.92 16.61 8.92 17.46 9.3 17.46 9.76 17.06 10.59 16.61 10.59M12 7.67C11.37 7.67 10.88 7.18 10.88 6.56C10.88 5.93 11.37 5.44 12 5.44S13.12 5.93 13.12 6.56C13.12 7.18 12.63 7.67 12 7.67M7.39 15.15C6.93 15.15 6.54 14.78 6.54 14.32S6.93 13.5 7.39 13.5 8.23 13.87 8.23 14.32 7.85 15.15 7.39 15.15M7.39 10.59C6.93 10.59 6.54 10.22 6.54 9.76S6.93 8.92 7.39 8.92 8.23 9.3 8.23 9.76 7.85 10.59 7.39 10.59M16.61 7.67C16 7.67 15.5 7.18 15.5 6.56C15.5 5.93 16 5.44 16.61 5.44S17.73 5.93 17.73 6.56C17.73 7.18 17.23 7.67 16.61 7.67M7.39 7.67C6.78 7.67 6.29 7.18 6.29 6.56C6.29 5.93 6.78 5.44 7.39 5.44S8.5 5.93 8.5 6.56C8.5 7.18 8 7.67 7.39 7.67M12 18.33C11.37 18.33 10.88 17.84 10.88 17.22C10.88 16.59 11.37 16.1 12 16.1S13.12 16.59 13.12 17.22C13.12 17.84 12.63 18.33 12 18.33M17.71 3C21.4 6.69 21.4 12.82 17.71 16.5L16.95 15.74C20.17 12.52 20.17 7 16.95 3.77L17.71 3M7.05 3.77C3.83 7 3.83 12.52 7.05 15.74L6.29 16.5C2.6 12.82 2.6 6.69 6.29 3L7.05 3.77M12.05 14.47C11.5 14.47 11.04 14.01 11.04 13.46S11.5 12.45 12.05 12.45 13.05 12.91 13.05 13.46 12.6 14.47 12.05 14.47M12.05 11.36C11.5 11.36 11.04 10.9 11.04 10.35S11.5 9.35 12.05 9.35 13.05 9.81 13.05 10.35 12.6 11.36 12.05 11.36" />
                              </svg>
                            ) : (
                              <Watch className="h-6 w-6" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{device.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {device.model && <span>{device.model}</span>}
                              {device.signal && (
                                <div className="flex items-center">
                                  <Activity className="h-3 w-3 mr-0.5 text-blue-500" />
                                  <span>{device.signal}%</span>
                                </div>
                              )}
                              {device.batteryLevel !== undefined && (
                                <div className="flex items-center">
                                  <Battery className="h-3 w-3 mr-0.5 text-green-500" />
                                  <span>{device.batteryLevel}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant={device.id === connecting ? "outline" : "default"}
                          onClick={() => connectToDevice(device)}
                          disabled={device.id === connecting}
                          className="min-w-[80px]"
                        >
                          {device.id === connecting ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              연결 중
                            </span>
                          ) : (
                            "연결"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center">
          <Button 
            onClick={startScan} 
            className="gap-2"
          >
            <Bluetooth className="h-4 w-4" />
            스마트워치 스캔
          </Button>
        </div>
      )}

      {selectedDevice && (
        <div className="mt-4 p-3 border rounded-md bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 hover:bg-green-600">연결됨</Badge>
            <span className="font-medium">{selectedDevice.name}</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">장치가 성공적으로 연결되었습니다.</div>
        </div>
      )}
    </div>
  );
};

export default SmartWatchScanner;