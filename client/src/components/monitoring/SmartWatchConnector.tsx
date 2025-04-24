import React, { useState } from 'react';
import { useSmartWatch } from '@/contexts/SmartWatchContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Watch, Bluetooth, Battery, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const SmartWatchConnector = () => {
  const { isConnected, isConnecting, deviceInfo, data, connect, disconnect, error } = useSmartWatch();
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  
  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      console.error('스마트워치 연결 오류:', err);
      toast({
        title: '연결 오류',
        description: err instanceof Error ? err.message : '스마트워치 연결에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDisconnect = () => {
    disconnect();
    toast({
      title: '연결 해제',
      description: '스마트워치와의 연결이 해제되었습니다.',
    });
  };
  
  // 배터리 수준에 따른 색상
  const getBatteryColor = (level: number | null) => {
    if (level === null) return 'text-gray-400';
    if (level < 20) return 'text-red-500';
    if (level < 50) return 'text-amber-500';
    return 'text-green-500';
  };
  
  return (
    <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center font-suite">
            <Watch className="w-4 h-4 mr-1.5 text-[#FF0000]" />
            스마트워치 연결
          </CardTitle>
          <Badge 
            className={isConnected ? 'bg-[#21C55D] text-white' : 'bg-gray-400 text-white'}
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center">
              <Bluetooth className="h-4 w-4 mr-1" />
              {isConnected ? '연결됨' : '연결 안됨'}
            </div>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>연결 오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isConnected ? (
          <>
            <div className="bg-gray-50 p-3 rounded-md mb-3">
              <div className="flex items-center mb-2">
                <Watch className="h-5 w-5 mr-2 text-[#FF0000]" />
                <div>
                  <div className="font-medium">{deviceInfo.name || '연결된 기기'}</div>
                  <div className="text-xs text-gray-500">{deviceInfo.model || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Battery className={`h-4 w-4 mr-1 ${getBatteryColor(data.batteryLevel)}`} />
                  <span className={getBatteryColor(data.batteryLevel)}>
                    {data.batteryLevel !== null ? `${data.batteryLevel}%` : '정보 없음'}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <RefreshCw className="h-3 w-3 mr-1 text-gray-500" />
                  <span className="text-gray-500 text-xs">
                    {data.lastUpdated 
                      ? `${Math.floor((Date.now() - data.lastUpdated.getTime()) / 1000)}초 전 갱신`
                      : '갱신 정보 없음'}
                  </span>
                </div>
              </div>
            </div>
            
            {expanded && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">심박수</div>
                  <div className="font-bold">
                    {data.heartRate !== null ? `${data.heartRate} bpm` : '-'}
                  </div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">산소포화도</div>
                  <div className="font-bold">
                    {data.oxygenLevel !== null ? `${data.oxygenLevel}%` : '-'}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-4">
            <div className="text-gray-500 mb-2">
              <Watch className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>연결된 스마트워치가 없습니다</p>
              <p className="text-sm mt-1">
                {isConnecting ? '연결 시도 중...' : '연결 버튼을 눌러 스마트워치를 연결하세요'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button
          variant="outline"
          className={`w-full ${isConnected 
            ? 'border-red-200 hover:bg-red-50 text-red-500' 
            : 'border-[#FFD6D6] hover:bg-[#FFF0F0] text-[#FF0000]'}`}
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
        >
          {isConnecting 
            ? '연결 중...' 
            : isConnected 
              ? '연결 해제' 
              : '스마트워치 연결하기'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SmartWatchConnector;