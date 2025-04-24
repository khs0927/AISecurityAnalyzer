import React, { useState, useEffect, useRef } from 'react';
import { useSmartWatch } from '@/contexts/SmartWatchContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Activity, AlertTriangle, AlertCircle, Clock, Check } from 'lucide-react';
import { analyzeEcgData } from '@/lib/ecgSimulatorAdapter';

type ECGStatus = 'normal' | 'warning' | 'critical' | 'checking';

interface ECGAnalysis {
  status: ECGStatus;
  heartRate: number;
  heartRateVariability: number;
  abnormalities: string[];
}

const ECGMonitor = () => {
  const { data, isConnected } = useSmartWatch();
  const [ecgData, setEcgData] = useState<{ value: number, timestamp: number }[]>([]);
  const [ecgStatus, setEcgStatus] = useState<ECGStatus>('checking');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [analysis, setAnalysis] = useState<ECGAnalysis | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  // 심전도 데이터 갱신
  useEffect(() => {
    if (data.ecgData && data.ecgData.length > 0) {
      const timestamp = Date.now();
      const newDataPoints = data.ecgData.map((value, index) => ({
        value,
        timestamp: timestamp + (index * 10) // 10ms 간격으로 타임스탬프 생성
      }));
      
      setEcgData(prevData => {
        // 최대 300개 데이터 포인트 유지 (약 30초)
        const newData = [...prevData, ...newDataPoints];
        return newData.length > 300 ? newData.slice(-300) : newData;
      });
      
      // 상태 분석
      if (ecgData.length >= 100) {
        const ecgSimData = ecgData.map(d => d.value);
        const analysisResult = analyzeEcgData(ecgSimData);
        
        // 상태 업데이트
        setEcgStatus(analysisResult.status as ECGStatus);
        setAnalysis({
          status: analysisResult.status as ECGStatus,
          heartRate: analysisResult.heartRate,
          heartRateVariability: parseFloat(analysisResult.hrv),
          abnormalities: analysisResult.abnormalities
        });
        
        // 위험 상태일 경우 알림
        if (analysisResult.status === 'critical' && !isRecording) {
          toast({
            title: '심전도 이상 감지',
            description: '심각한 심전도 이상이 감지되었습니다. 측정을 기록하세요.',
            variant: 'destructive',
          });
        }
      }
    }
  }, [data.ecgData]);
  
  // 녹화 타이머
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = window.setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordDuration(0);
    }
    
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);
  
  const startRecording = () => {
    setIsRecording(true);
    setEcgData([]); // 새로운 녹화 시작 시 데이터 초기화
    toast({
      title: '심전도 기록 시작',
      description: '심전도 기록을 시작합니다. 측정 중 움직이지 마세요.',
    });
  };
  
  const stopRecording = async () => {
    setIsRecording(false);
    
    if (recordDuration < 10) {
      toast({
        title: '측정 시간 부족',
        description: '정확한 분석을 위해 최소 10초 이상 측정해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    // 서버에 데이터 저장
    try {
      // 실제 앱에서는 API 호출로 대체
      toast({
        title: '심전도 기록 완료',
        description: `${recordDuration}초 동안의 심전도 기록이 저장되었습니다.`,
      });
    } catch (err) {
      console.error('ECG 기록 저장 오류:', err);
      toast({
        title: '기록 저장 실패',
        description: '심전도 기록을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };
  
  // 상태에 따른 스타일 및 메시지
  const getStatusDetails = () => {
    switch (ecgStatus) {
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
  
  // 시간 형식 변환 (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center font-suite">
            <Heart className="w-4 h-4 mr-1.5 text-[#FF0000]" />
            심전도 측정
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
        {isRecording && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-[#FF0000]" />
                <span className="text-sm font-medium">녹화 시간: {formatTime(recordDuration)}</span>
              </div>
              <span className="text-xs text-gray-500">
                {recordDuration < 10 ? '최소 10초 이상 측정 필요' : '충분한 데이터'}
              </span>
            </div>
            <Progress 
              value={Math.min(recordDuration / 30 * 100, 100)} 
              className="h-1.5"
            />
          </div>
        )}
        
        <div className="h-40 w-full">
          {ecgData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={ecgData.slice(-100)} // 최근 100개 데이터만 표시
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <YAxis domain={[-2, 2]} hide />
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
        
        {/* 심박수 정보 표시 */}
        {analysis && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-sm text-gray-500">심박수</div>
              <div className="flex items-center justify-center">
                <Heart className="w-4 h-4 mr-1 text-[#FF0000]" />
                <span className="text-xl font-bold">{analysis.heartRate}</span>
                <span className="text-sm ml-1">bpm</span>
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded text-center">
              <div className="text-sm text-gray-500">심박 변이도</div>
              <div className="flex items-center justify-center">
                <Activity className="w-4 h-4 mr-1 text-[#FF0000]" />
                <span className="text-xl font-bold">{analysis.heartRateVariability.toFixed(1)}</span>
                <span className="text-sm ml-1">ms</span>
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
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button
          variant="outline"
          className="w-full border-[#FFD6D6] hover:bg-[#FFF0F0] text-[#FF0000]"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isConnected && !data.ecgData}
        >
          {isRecording ? '녹화 중지 및 분석' : '심전도 녹화 시작'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ECGMonitor;