import React, { useState, useEffect, useRef } from 'react';
import { useSmartWatch } from '@/contexts/SmartWatchContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Activity, Check, AlertTriangle, AlertCircle, Droplet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzePPGData } from '@/lib/ppgSimulator';

type PPGStatus = 'normal' | 'warning' | 'critical' | 'checking';

interface PPGAnalysis {
  status: PPGStatus;
  oxygenLevel: number;
  perfusionIndex: number;
  peripheralResistance: string;
  abnormalities: string[];
}

const PPGMonitor = () => {
  const { data, isConnected } = useSmartWatch();
  const [ppgData, setPpgData] = useState<{ value: number, timestamp: number }[]>([]);
  const [ppgStatus, setPpgStatus] = useState<PPGStatus>('checking');
  const [analysis, setAnalysis] = useState<PPGAnalysis | null>(null);
  const { toast } = useToast();
  
  // 산소포화도 데이터 갱신
  useEffect(() => {
    if (data.ppgData && data.ppgData.length > 0) {
      const timestamp = Date.now();
      const newDataPoints = data.ppgData.map((value, index) => ({
        value,
        timestamp: timestamp + (index * 10) // 10ms 간격으로 타임스탬프 생성
      }));
      
      setPpgData(prevData => {
        // 최대 300개 데이터 포인트 유지 (약 30초)
        const newData = [...prevData, ...newDataPoints];
        return newData.length > 300 ? newData.slice(-300) : newData;
      });
    }
    
    // 산소포화도 값 갱신
    if (data.oxygenLevel !== null) {
      // 데이터가 충분할 때 분석 실행
      if (ppgData.length >= 50) {
        const ppgValues = ppgData.map(d => d.value);
        const analysisResult = analyzePPGData(ppgData.length > 0 ? 'normal' : 'checking');
        
        // 산소포화도 값 덮어쓰기
        analysisResult.oxygenLevel = data.oxygenLevel;
        
        // 산소포화도 기반 상태 판단
        let status: PPGStatus = 'normal';
        if (data.oxygenLevel < 90) {
          status = 'critical';
        } else if (data.oxygenLevel < 95) {
          status = 'warning';
        }
        
        setPpgStatus(status);
        setAnalysis({
          status,
          oxygenLevel: data.oxygenLevel,
          perfusionIndex: analysisResult.perfusionIndex,
          peripheralResistance: analysisResult.peripheralResistance,
          abnormalities: analysisResult.abnormalities
        });
        
        // 위험 상태일 경우 알림
        if (status === 'critical' && !lastAlertRef.current) {
          toast({
            title: '산소포화도 위험',
            description: '산소포화도가 매우 낮습니다. 즉시 의료진에게 연락하세요.',
            variant: 'destructive',
          });
          
          lastAlertRef.current = Date.now();
          setTimeout(() => {
            lastAlertRef.current = null;
          }, 60000); // 1분에 한 번만 알림
        }
      }
    }
  }, [data.ppgData, data.oxygenLevel]);
  
  // 상태에 따른 스타일 및 메시지
  const getStatusDetails = () => {
    switch (ppgStatus) {
      case 'normal':
        return {
          color: 'bg-[#21C55D] text-white',
          icon: <Check className="h-4 w-4 mr-1.5" />,
          text: '정상'
        };
      case 'warning':
        return {
          color: 'bg-[#F59E0B] text-white',
          icon: <AlertTriangle className="h-4 w-4 mr-1.5" />,
          text: '주의'
        };
      case 'critical':
        return {
          color: 'bg-[#FF0000] text-white',
          icon: <AlertCircle className="h-4 w-4 mr-1.5" />,
          text: '위험'
        };
      default:
        return {
          color: 'bg-[#6B7280] text-white',
          icon: <Activity className="h-4 w-4 mr-1.5" />,
          text: '측정 중'
        };
    }
  };
  
  const statusDetails = getStatusDetails();
  
  // 알림 중복 방지를 위한 ref
  const lastAlertRef = React.useRef<number | null>(null);
  
  // 산소포화도 색상
  const getOxygenLevelColor = (level: number) => {
    if (level < 90) return 'text-[#FF0000]';
    if (level < 95) return 'text-[#F59E0B]';
    return 'text-[#21C55D]';
  };
  
  return (
    <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center font-suite">
            <Droplet className="w-4 h-4 mr-1.5 text-[#FF0000]" />
            산소포화도 측정
          </CardTitle>
          <Badge className={statusDetails.color}>
            <div className="flex items-center">
              {statusDetails.icon}
              {statusDetails.text}
            </div>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="h-40 w-full">
          {ppgData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={ppgData.slice(-100)} // 최근 100개 데이터만 표시
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <YAxis domain={[0, 2]} hide />
                <XAxis dataKey="timestamp" hide />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#FF0000"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <p>연결된 기기가 없거나 데이터를 수신 중입니다...</p>
            </div>
          )}
        </div>
        
        {/* 산소포화도 정보 표시 */}
        {analysis && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-sm text-gray-500">산소포화도</div>
              <div className="flex items-center justify-center">
                <Droplet className="w-4 h-4 mr-1 text-[#FF0000]" />
                <span className={`text-xl font-bold ${getOxygenLevelColor(analysis.oxygenLevel)}`}>
                  {analysis.oxygenLevel}
                </span>
                <span className="text-sm ml-1">%</span>
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-sm text-gray-500">관류 지수</div>
              <div className="flex items-center justify-center">
                <Activity className="w-4 h-4 mr-1 text-[#FF0000]" />
                <span className="text-xl font-bold">{analysis.perfusionIndex.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 이상 징후 표시 */}
        {analysis && analysis.abnormalities.length > 0 && (
          <div className="mt-3 p-2 bg-[#FFF0F0] rounded-md">
            <div className="text-sm font-medium text-[#FF0000] mb-1">감지된 이상 징후:</div>
            <ul className="text-xs text-gray-700 pl-2">
              {analysis.abnormalities.slice(0, 2).map((abnormality, idx) => (
                <li key={idx} className="flex items-start">
                  <AlertCircle className="w-3 h-3 mr-1 mt-0.5 text-[#FF0000]" />
                  {abnormality}
                </li>
              ))}
              {analysis.abnormalities.length > 2 && (
                <li className="text-xs text-[#FF0000] mt-1">
                  + {analysis.abnormalities.length - 2}개 더 발견됨
                </li>
              )}
            </ul>
          </div>
        )}
        
        {/* 산소포화도 가이드 */}
        <div className="mt-3 p-2 bg-gray-50 rounded-md text-xs">
          <div className="font-medium mb-1">산소포화도 가이드:</div>
          <div className="grid grid-cols-3 gap-1">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#21C55D] mr-1.5"></div>
              <span>정상: 95~100%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#F59E0B] mr-1.5"></div>
              <span>주의: 90~94%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#FF0000] mr-1.5"></div>
              <span>위험: &lt;90%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PPGMonitor;