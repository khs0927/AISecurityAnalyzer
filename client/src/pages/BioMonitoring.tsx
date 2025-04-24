import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ECGMonitor from '@/components/monitoring/ECGMonitor';
import PPGMonitor from '@/components/monitoring/PPGMonitor';
import BioMonitoring from '@/components/monitoring/BioMonitoring';
import RiskStatusCard from '@/components/risk/RiskStatusCard';
import { useSmartWatch } from '@/contexts/SmartWatchContext';
import { useSocket } from '@/lib/websocket';
import { Heart, Droplet, Activity, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BioMonitoringPage = () => {
  const { data, isConnected } = useSmartWatch();
  const socket = useSocket();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('integrated');
  const [riskStatus, setRiskStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [riskScore, setRiskScore] = useState(0);
  const [riskExplanation, setRiskExplanation] = useState<string[]>([]);
  const [riskRecommendations, setRiskRecommendations] = useState<string[]>([]);
  
  // 실시간 위험도 업데이트를 위한 소켓 연결
  useEffect(() => {
    if (socket) {
      // 위험도 업데이트 이벤트 리스너
      socket.on('risk_update', (riskData) => {
        console.log('Risk update received:', riskData);
        
        setRiskScore(riskData.riskScore);
        setRiskExplanation(riskData.explanation || []);
        setRiskRecommendations(riskData.recommendations || []);
        
        // 위험도 수준 결정
        if (riskData.riskScore >= 70) {
          setRiskStatus('critical');
          // 위험 알림
          toast({
            variant: "destructive",
            title: "위험 상태 감지",
            description: "심각한 위험이 감지되었습니다. 즉시 조치가 필요합니다.",
          });
        } else if (riskData.riskScore >= 40) {
          setRiskStatus('warning');
        } else {
          setRiskStatus('normal');
        }
      });
      
      // 컴포넌트 언마운트 시 리스너 제거
      return () => {
        socket.off('risk_update');
      };
    }
  }, [socket, toast]);
  
  // 위험도 API 수동 호출
  const fetchRiskAnalysis = () => {
    fetch('/api/analysis/risk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sensorData: {
          heartRate: data.heartRate,
          oxygenLevel: data.oxygenLevel,
          ecgData: data.ecgData || [],
        },
        userProfile: {
          age: 45, // 실제로는 사용자 정보에서 가져와야 함
          gender: 'male',
          medications: ['amlodipine'],
          conditions: ['hypertension'],
        },
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setRiskScore(data.riskScore);
          setRiskExplanation(data.explanation || []);
          setRiskRecommendations(data.recommendations || []);
          
          // 위험도 수준 결정
          if (data.riskScore >= 70) {
            setRiskStatus('critical');
          } else if (data.riskScore >= 40) {
            setRiskStatus('warning');
          } else {
            setRiskStatus('normal');
          }
        } else {
          console.error('위험도 분석 오류:', data.error);
        }
      })
      .catch(error => {
        console.error('위험도 API 호출 오류:', error);
      });
  };
  
  // 페이지 로드 시 초기 위험도 분석
  useEffect(() => {
    if (data.heartRate || data.oxygenLevel) {
      fetchRiskAnalysis();
    }
  }, []);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">생체신호 모니터링</h1>
      
      {!isConnected && (
        <Card className="mb-4 border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <div>
                <h3 className="font-medium text-amber-700">스마트워치 연결 안됨</h3>
                <p className="text-sm text-amber-600">
                  정확한 모니터링을 위해 스마트워치를 연결하세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-medium flex items-center">
              <Heart className="h-5 w-5 mr-2 text-red-500" />
              심박수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end">
              <span className="text-3xl font-bold">
                {data.heartRate || '–'}
              </span>
              <span className="text-sm ml-1 mb-1 text-gray-500">bpm</span>
            </div>
            <Badge variant={data.heartRate && (data.heartRate < 60 || data.heartRate > 100) ? "destructive" : "outline"}>
              {data.heartRate ? (data.heartRate < 60 ? '서맥' : data.heartRate > 100 ? '빈맥' : '정상') : '측정 중'}
            </Badge>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-medium flex items-center">
              <Droplet className="h-5 w-5 mr-2 text-blue-500" />
              산소포화도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end">
              <span className="text-3xl font-bold">
                {data.oxygenLevel || '–'}
              </span>
              <span className="text-sm ml-1 mb-1 text-gray-500">%</span>
            </div>
            <Badge variant={data.oxygenLevel && data.oxygenLevel < 95 ? "destructive" : "outline"}>
              {data.oxygenLevel ? (data.oxygenLevel < 90 ? '위험' : data.oxygenLevel < 95 ? '주의' : '정상') : '측정 중'}
            </Badge>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-medium flex items-center">
              <Activity className="h-5 w-5 mr-2 text-orange-500" />
              위험도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end">
              <span className="text-3xl font-bold">
                {riskScore}
              </span>
              <span className="text-sm ml-1 mb-1 text-gray-500">/100</span>
            </div>
            <Badge 
              variant={
                riskStatus === 'critical' ? "destructive" : 
                riskStatus === 'warning' ? "default" : "outline"
              }
            >
              {riskStatus === 'critical' ? '위험' : riskStatus === 'warning' ? '주의' : '정상'}
            </Badge>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue={activeTab} className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="integrated">통합 모니터링</TabsTrigger>
          <TabsTrigger value="ecg">ECG</TabsTrigger>
          <TabsTrigger value="ppg">SpO₂ / PPG</TabsTrigger>
          <TabsTrigger value="risk">위험도 분석</TabsTrigger>
        </TabsList>
        
        <TabsContent value="integrated" className="space-y-4">
          <BioMonitoring />
        </TabsContent>
        
        <TabsContent value="ecg" className="space-y-4">
          <ECGMonitor />
        </TabsContent>
        
        <TabsContent value="ppg" className="space-y-4">
          <PPGMonitor />
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-4">
          <RiskStatusCard 
            riskScore={riskScore}
            riskStatus={riskStatus}
            explanations={riskExplanation}
            recommendations={riskRecommendations}
            onRefresh={fetchRiskAnalysis}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BioMonitoringPage;