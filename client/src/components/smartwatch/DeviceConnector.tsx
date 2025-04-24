import { useState, useEffect } from "react";
import { Watch, AppleIcon, Smartphone, Check, Clock, Download, RefreshCw } from "lucide-react";
import { SiSamsung } from "react-icons/si";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface DeviceConnectorProps {
  trigger: React.ReactNode;
}

// 연결 가능한 장치 목록
const availableDevices = [
  {
    id: "apple-watch-se",
    name: "Apple Watch SE",
    type: "apple",
    batteryLevel: 78,
    lastSync: "10분 전",
    firmwareVersion: "9.2.1",
    hasUpdate: true,
    connected: true,
  },
  {
    id: "apple-watch-8",
    name: "Apple Watch Series 8",
    type: "apple",
    batteryLevel: 32,
    lastSync: "2시간 전",
    firmwareVersion: "9.1.0",
    hasUpdate: false,
    connected: false,
  },
  {
    id: "galaxy-watch-4",
    name: "Galaxy Watch 5",
    type: "samsung",
    batteryLevel: 65,
    lastSync: "1시간 전",
    firmwareVersion: "5.0.2",
    hasUpdate: true,
    connected: false,
  },
  {
    id: "galaxy-watch-active",
    name: "Galaxy Watch Active 2",
    type: "samsung",
    batteryLevel: 42,
    lastSync: "3일 전",
    firmwareVersion: "4.8.3",
    hasUpdate: false,
    connected: false,
  },
];

// 앱 연동 정보
const healthApps = [
  {
    id: "apple-health",
    name: "Apple Health",
    type: "apple",
    connected: true,
    data: ["심박수", "혈압", "운동", "걸음수", "수면", "산소포화도"],
    icon: <AppleIcon className="h-6 w-6" />,
  },
  {
    id: "samsung-health",
    name: "Samsung Health",
    type: "samsung",
    connected: false,
    data: ["심박수", "혈압", "운동", "걸음수", "수면", "산소포화도"],
    icon: <SiSamsung className="h-6 w-6" />,
  },
  {
    id: "google-fit",
    name: "Google Fit",
    type: "google",
    connected: false,
    data: ["심박수", "운동", "걸음수", "수면"],
    icon: <Smartphone className="h-6 w-6" />,
  },
];

export default function DeviceConnector({ trigger }: DeviceConnectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("watches");
  const [devices, setDevices] = useState(availableDevices);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const { toast } = useToast();

  // 새 기기 검색 시뮬레이션
  const scanForDevices = () => {
    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          toast({
            title: "기기 검색 완료",
            description: "주변에서 2개의 기기를 찾았습니다.",
          });
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };

  // 기기 연결 상태 토글
  const toggleDeviceConnection = (deviceId: string) => {
    setDevices(
      devices.map(device => 
        device.id === deviceId 
          ? { ...device, connected: !device.connected } 
          : device
      )
    );
    
    const device = devices.find(d => d.id === deviceId);
    
    toast({
      title: device?.connected ? "기기 연결 해제" : "기기 연결 완료",
      description: `${device?.name}이(가) ${device?.connected ? '연결 해제' : '연결'}되었습니다.`,
      variant: device?.connected ? "destructive" : "default",
    });
  };

  // 앱 연결 토글
  const toggleAppConnection = (appId: string) => {
    const updatedApps = healthApps.map(app => 
      app.id === appId ? { ...app, connected: !app.connected } : app
    );
    
    const app = healthApps.find(a => a.id === appId);
    
    toast({
      title: app?.connected ? "앱 연결 해제" : "앱 연결 완료",
      description: `${app?.name}이(가) ${app?.connected ? '연결 해제' : '연결'}되었습니다.`,
      variant: app?.connected ? "destructive" : "default",
    });
  };

  // 배터리 레벨에 따른 색상 클래스
  const getBatteryColorClass = (level: number) => {
    if (level < 20) return "text-red-500";
    if (level < 50) return "text-orange-500";
    return "text-green-500";
  };

  // 업데이트 상태에 따른 뱃지
  const getUpdateBadge = (hasUpdate: boolean) => {
    return hasUpdate ? (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Download className="h-3 w-3 mr-1" /> 
        업데이트 있음
      </Badge>
    ) : (
      <Badge variant="outline" className="text-green-800">
        <Check className="h-3 w-3 mr-1" /> 
        최신 버전
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>기기 및 앱 연동</DialogTitle>
          <DialogDescription>
            스마트워치 및 건강 앱을 연결하여 실시간 건강 데이터를 수집합니다.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="watches" className="text-base">스마트워치</TabsTrigger>
            <TabsTrigger value="health-apps" className="text-base">건강 앱</TabsTrigger>
          </TabsList>
          
          <TabsContent value="watches" className="max-h-[50vh] overflow-y-auto">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium">연결 가능한 기기</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={scanForDevices}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    기기 검색
                  </>
                )}
              </Button>
            </div>
            
            {isScanning && (
              <div className="my-4">
                <div className="text-sm text-gray-500 mb-2">주변 기기 검색 중...</div>
                <Progress value={scanProgress} className="h-2" />
              </div>
            )}
            
            <div className="space-y-4">
              {devices.map(device => (
                <Card key={device.id} className={`${device.connected ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        {device.type === "apple" ? (
                          <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                            <AppleIcon className="h-6 w-6" />
                          </div>
                        ) : (
                          <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                            <SiSamsung className="h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium">{device.name}</h4>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            마지막 동기화: {device.lastSync}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant={device.connected ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleDeviceConnection(device.id)}
                      >
                        {device.connected ? "연결 해제" : "연결"}
                      </Button>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">배터리</div>
                        <div className="flex items-center">
                          <div className={`font-medium ${getBatteryColorClass(device.batteryLevel)}`}>
                            {device.batteryLevel}%
                          </div>
                          <Progress 
                            value={device.batteryLevel} 
                            className={`h-2 ml-2 ${
                              device.batteryLevel < 20 ? 'bg-red-500' : 
                              device.batteryLevel < 50 ? 'bg-orange-500' : 
                              'bg-green-500'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">펌웨어</div>
                        <div className="flex flex-col gap-1">
                          <div className="text-sm">{device.firmwareVersion}</div>
                          {getUpdateBadge(device.hasUpdate)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="health-apps" className="max-h-[50vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">건강 데이터 앱</h3>
            <div className="space-y-4">
              {healthApps.map(app => (
                <Card key={app.id} className={`${app.connected ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                          {app.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{app.name}</h4>
                          <div className="text-sm text-gray-500">
                            {app.connected ? "연결됨" : "연결되지 않음"}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant={app.connected ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleAppConnection(app.id)}
                      >
                        {app.connected ? "연결 해제" : "연결"}
                      </Button>
                    </div>
                    
                    <div className="mt-4">
                      <div className="text-sm text-gray-500 mb-2">수집 가능한 데이터</div>
                      <div className="flex flex-wrap gap-2">
                        {app.data.map(item => (
                          <Badge key={item} variant="outline">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button onClick={() => setOpen(false)}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}