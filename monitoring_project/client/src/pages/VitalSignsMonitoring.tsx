import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, LabelList } from 'recharts';
import { generateEcgData, analyzeEcgData } from '../lib/ecgSimulatorAdapter';
import { generatePPGData, generateMultiplePPGData, analyzePPGData } from '../lib/ppgSimulator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, ActivityIcon, HeartIcon, AlertTriangleIcon, BellIcon, XIcon, RefreshCcwIcon, ClockIcon, FileTextIcon, PlayIcon, CircleOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface AIAnalysisResult {
  timestamp: string;
  ecgData: {
    status: string;
    heartRate: number;
    hrv: string;
    qtInterval: string;
    stDeviation: string;
    patternProbabilities: {
      name: string;
      probability: number;
    }[];
    abnormalities: string[];
    recommendation: string;
  };
  ppgData?: {
    status: string;
    oxygenLevel: number;
    perfusionIndex: number;
    peripheralResistance: string;
    abnormalities: string[];
  };
  combinedRisk: {
    level: string;
    score: number;
    factors: string[];
    shortTermRisk: number;
    longTermRisk: number;
  };
  summary: string;
  recommendation: string;
}

// 분석 결과를 위한 배지 컬러 헬퍼 함수
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'normal':
      return 'bg-[#FF6D70] bg-opacity-80 text-white';
    case 'warning':
      return 'bg-[#FF6D70] bg-opacity-90 text-white';
    case 'critical':
      return 'bg-[#FF6D70] text-white';
    default:
      return 'bg-[#FF6D70] bg-opacity-80 text-white';
  }
};

// 위험도 점수를 위한 배지 컬러 헬퍼 함수
const getRiskColor = (score: number) => {
  if (score < 30) return 'bg-[#FF6D70] bg-opacity-70 text-white';
  if (score < 60) return 'bg-[#FF6D70] bg-opacity-85 text-white';
  return 'bg-[#FF6D70] text-white';
};

const VitalSignsMonitoring = () => {
  const { toast } = useToast();
  const [ecgStatus, setEcgStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [ppgStatus, setPpgStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [ecgData, setEcgData] = useState<any[]>([]);
  const [ppgData, setPpgData] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showAbnormalDetails, setShowAbnormalDetails] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [showAiAnalysisDialog, setShowAiAnalysisDialog] = useState(false);
  const [showRecordingWarningDialog, setShowRecordingWarningDialog] = useState(false);

  const ecgIntervalRef = useRef<number | null>(null);
  const ppgIntervalRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // 스마트워치 연결 정보 가져오기
  const { data: smartwatchData } = useQuery({
    queryKey: ['smartwatch-connections', 1],
    queryFn: async () => {
      const response = await fetch('/api/users/1/smartwatch-connections');
      return response.json();
    }
  });

  // 심전도 데이터 생성 함수
  const generateEcgPoint = () => {
    const newPoint = generateEcgData(ecgStatus);
    setEcgData(prevData => {
      const newData = [...prevData, { ...newPoint, time: Date.now() }];
      if (newData.length > 100) {
        return newData.slice(newData.length - 100);
      }
      return newData;
    });
  };

  // PPG 데이터 생성 함수
  const generatePpgPoint = () => {
    const newPoint = generatePPGData(ppgStatus);
    setPpgData(prevData => {
      const newData = [...prevData, { ...newPoint, time: Date.now() }];
      if (newData.length > 100) {
        return newData.slice(newData.length - 100);
      }
      return newData;
    });
  };

  // 녹화 완료 및 분석 처리 함수
  const completeRecording = () => {
    // AI 분석 결과 생성
    const result = generateAiAnalysisResult();
    setAiAnalysisResult(result);
    setShowAiAnalysisDialog(true);
    
    // 상태 초기화
    toast({
      title: "녹화 완료",
      description: `${elapsedTime}초 동안의 활력징후 데이터를 분석했습니다.`,
      variant: "default",
      style: { backgroundColor: "#FFE2E9", borderColor: "#FF6D70" },
    });
    
    setIsRecording(false);
  };
  
  // 부족한 녹화 시간으로 계속 진행 처리
  const proceedWithShortRecording = () => {
    setShowRecordingWarningDialog(false);
    completeRecording();
  };
  
  // 녹화 재시작 처리
  const restartRecording = () => {
    setShowRecordingWarningDialog(false);
    // 타이머 재시작
    ecgIntervalRef.current = window.setInterval(generateEcgPoint, 100);
    ppgIntervalRef.current = window.setInterval(generatePpgPoint, 100);
    timerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    setIsRecording(true);
  };

  // 녹화 시작/중지 처리
  const handleRecordToggle = () => {
    if (isRecording) {
      // 녹화 중지
      if (ecgIntervalRef.current) {
        clearInterval(ecgIntervalRef.current);
        ecgIntervalRef.current = null;
      }
      if (ppgIntervalRef.current) {
        clearInterval(ppgIntervalRef.current);
        ppgIntervalRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // 최소 녹화 시간 확인 (30초 미만이면 경고)
      if (elapsedTime < 30) {
        setShowRecordingWarningDialog(true);
        return;
      }
      
      // 충분한 녹화 시간이면 처리 진행
      completeRecording();
    } else {
      // 녹화 시작
      setEcgData([]);
      setPpgData([]);
      setElapsedTime(0);
      setShowAbnormalDetails(false);
      setAiAnalysisResult(null);
      
      // 초기 데이터 생성
      const initialEcgData = Array.from({ length: 50 }, () => ({
        ...generateEcgData(ecgStatus),
        time: Date.now() - (50 - Math.floor(Math.random() * 50))
      }));
      setEcgData(initialEcgData);
      
      const initialPpgData = Array.from({ length: 50 }, () => ({
        ...generatePPGData(ppgStatus),
        time: Date.now() - (50 - Math.floor(Math.random() * 50))
      }));
      setPpgData(initialPpgData);
      
      // 타이머 시작
      ecgIntervalRef.current = window.setInterval(generateEcgPoint, 100);
      ppgIntervalRef.current = window.setInterval(generatePpgPoint, 100);
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "녹화 시작",
        description: "ECG와 PPG 데이터 녹화 및 모니터링을 시작합니다. 정확한 분석을 위해 최소 30초 이상 녹화해 주세요.",
        variant: "default",
        style: { backgroundColor: "#FFE2E9", borderColor: "#FF6D70" },
      });
      
      setIsRecording(true);
    }
  };

  // 심전도 상태 변경 핸들러
  const handleEcgStatusChange = (newStatus: 'normal' | 'warning' | 'critical') => {
    setEcgStatus(newStatus);
    
    toast({
      title: "ECG 상태 변경",
      description: `심전도 시뮬레이션 상태가 '${newStatus}'으로 변경되었습니다.`,
      variant: "default",
      style: { backgroundColor: "#FFE2E9", borderColor: "#FF6D70" },
    });
  };

  // PPG 상태 변경 핸들러
  const handlePpgStatusChange = (newStatus: 'normal' | 'warning' | 'critical') => {
    setPpgStatus(newStatus);
    
    toast({
      title: "PPG 상태 변경",
      description: `혈류량 측정 시뮬레이션 상태가 '${newStatus}'으로 변경되었습니다.`,
      variant: "default",
      style: { backgroundColor: "#FFE2E9", borderColor: "#FF6D70" },
    });
  };

  // AI 분석 결과 생성 함수
  const generateAiAnalysisResult = (): AIAnalysisResult => {
    // ECG 분석 결과
    const ecgAnalysis = analyzeEcgData(ecgStatus);
    
    // PPG 분석 결과
    const ppgAnalysis = analyzePPGData(ppgStatus);
    
    // 위험도 계산 (ECG와 PPG 상태에 따라 결정)
    let riskScore = 0;
    let riskLevel = 'low';
    
    if (ecgStatus === 'normal' && ppgStatus === 'normal') {
      riskScore = Math.floor(Math.random() * 20) + 5; // 5-25
      riskLevel = 'low';
    } else if (ecgStatus === 'critical' || ppgStatus === 'critical') {
      riskScore = Math.floor(Math.random() * 20) + 70; // 70-90
      riskLevel = 'high';
    } else {
      riskScore = Math.floor(Math.random() * 20) + 40; // 40-60
      riskLevel = 'moderate';
    }
    
    // 위험 요인 결정
    const riskFactors = [];
    
    if (ecgAnalysis.abnormalities.length > 0) {
      riskFactors.push(...ecgAnalysis.abnormalities);
    }
    
    if (ppgAnalysis.abnormalities.length > 0) {
      riskFactors.push(...ppgAnalysis.abnormalities);
    }
    
    // 평균 및 단기/장기 위험
    const shortTermRisk = riskScore * (Math.random() * 0.2 + 0.9); // ±10% 변동
    const longTermRisk = riskScore * (Math.random() * 0.3 + 0.85); // ±15% 변동
    
    // 요약 메시지 생성
    let summary = '';
    let recommendation = '';
    
    if (riskLevel === 'low') {
      summary = "활력징후가 정상 범위 내에 있습니다. 심장 리듬과 혈류량이 건강한 패턴을 보입니다.";
      recommendation = "현재의 건강한 생활 습관을 유지하시고, 정기적인 건강 검진을 계속하세요.";
    } else if (riskLevel === 'moderate') {
      summary = "활력징후에 약간의 이상이 감지되었습니다. 주의가 필요하지만 즉각적인 조치는 필요하지 않습니다.";
      recommendation = "몇 시간 후에 재측정해보시고, 증상이 지속되면 의료 전문가와 상담하세요.";
    } else {
      summary = "활력징후에 심각한 이상이 감지되었습니다. 의료적 평가가 필요합니다.";
      recommendation = "가능한 빨리 의료진의 진료를 받으시기 바랍니다. 증상이 악화되면 응급 의료 서비스에 연락하세요.";
    }
    
    return {
      timestamp: new Date().toISOString(),
      ecgData: {
        status: ecgStatus,
        heartRate: ecgAnalysis.heartRate,
        hrv: ecgAnalysis.hrv,
        qtInterval: ecgAnalysis.qtInterval,
        stDeviation: ecgAnalysis.stDeviation,
        patternProbabilities: ecgAnalysis.patternProbabilities,
        abnormalities: ecgAnalysis.abnormalities,
        recommendation: ecgAnalysis.recommendation,
      },
      ppgData: {
        status: ppgStatus,
        oxygenLevel: ppgAnalysis.oxygenLevel,
        perfusionIndex: ppgAnalysis.perfusionIndex,
        peripheralResistance: ppgAnalysis.peripheralResistance,
        abnormalities: ppgAnalysis.abnormalities,
      },
      combinedRisk: {
        level: riskLevel,
        score: riskScore,
        factors: riskFactors,
        shortTermRisk: shortTermRisk,
        longTermRisk: longTermRisk,
      },
      summary,
      recommendation,
    };
  };

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (ecgIntervalRef.current) clearInterval(ecgIntervalRef.current);
      if (ppgIntervalRef.current) clearInterval(ppgIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 시간 형식 헬퍼 함수
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 위험도 라벨 한글 변환
  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'low': return '낮음';
      case 'moderate': return '중간';
      case 'high': return '높음';
      default: return level;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">활력징후 모니터링</h1>
          <div className="flex items-center space-x-2">
            {smartwatchData && smartwatchData.length > 0 && (
              <div className="flex items-center bg-[#FF8FAB] bg-opacity-20 text-[#FF8FAB] px-3 py-1 rounded-full text-sm">
                <ActivityIcon className="w-4 h-4 mr-1" />
                {smartwatchData[0].name} 연결됨
              </div>
            )}
            <Button 
              onClick={handleRecordToggle}
              variant={isRecording ? "destructive" : "default"}
              className="button-sm py-1.5 px-3 text-xs font-suite rounded-full bg-[#FF8FAB] hover:bg-[#FF8FAB] hover:bg-opacity-90 text-white"
              size="sm"
            >
              {isRecording ? "녹화 중지" : "녹화 시작"}
            </Button>
          </div>
        </div>

        {isRecording && (
          <div className="flex justify-between items-center bg-slate-100 p-3 rounded-md">
            <div className="flex items-center">
              <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="font-medium">녹화 중: {formatTime(elapsedTime)}</span>
            </div>
            <div className="flex space-x-2">
              <Badge className={getStatusColor(ecgStatus)}>심전도: {ecgStatus === 'normal' ? '정상' : ecgStatus === 'warning' ? '주의' : '위험'}</Badge>
              <Badge className={getStatusColor(ppgStatus)}>산소포화도: {ppgStatus === 'normal' ? '정상' : ppgStatus === 'warning' ? '주의' : '위험'}</Badge>
            </div>
          </div>
        )}

        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm rounded p-2">
            <TabsTrigger 
              value="monitoring" 
              className="rounded text-sm"
              data-state={!showAiAnalysisDialog ? "active" : "inactive"}
            >
              실시간 모니터링
            </TabsTrigger>
            <TabsTrigger 
              value="simulation" 
              className="rounded text-sm"
            >
              시뮬레이션 설정
            </TabsTrigger>
            <TabsTrigger 
              value="analysis" 
              disabled={!aiAnalysisResult} 
              className="rounded text-sm"
            >
              분석 결과
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="monitoring" className="space-y-4">
            {!isRecording && (
              <Alert className="alert-pink mb-2">
                <InfoIcon className="h-4 w-4 text-[#FF6D70]" />
                <AlertTitle className="text-md font-semibold">모니터링 가이드라인</AlertTitle>
                <AlertDescription className="text-sm">
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li>정확한 분석을 위해 최소 30초 이상 녹화해 주세요.</li>
                    <li>측정 중에는 몸을 움직이지 않고 안정된 상태를 유지하세요.</li>
                    <li>실제 스마트워치 연결 시 손목에 장비를 올바르게 착용하세요.</li>
                    <li>시뮬레이션 설정 탭에서 다양한 상태를 테스트해볼 수 있습니다.</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {isRecording && (
              <div className="flex items-center mb-2 bg-slate-50 p-2 rounded-md">
                <ClockIcon className="w-5 h-5 text-[#FF6D70] mr-2" />
                <span className="text-sm text-slate-700 mr-3">녹화 진행률:</span>
                <Progress 
                  value={Math.min(elapsedTime / 30 * 100, 100)} 
                  className="flex-1"
                  style={{ 
                    backgroundColor: "rgba(255, 109, 148, 0.2)",
                    "--tw-progress-bar-color": "#FF6D70"
                  } as React.CSSProperties}
                />
                <span className="ml-3 text-sm font-medium">{elapsedTime >= 30 ? "충분한 데이터" : "데이터 수집 중"}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ECG 차트 카드 */}
              <Card className="rounded-2xl border border-[#FFD6D6]">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center font-suite">
                      <HeartIcon className="w-4 h-4 mr-1.5 text-[#FF8FAB]" />
                      심전도 측정
                    </CardTitle>
                    <Badge className={getStatusColor(ecgStatus)}>
                      {ecgStatus === 'normal' ? '정상' : ecgStatus === 'warning' ? '주의' : '위험'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={ecgData}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          type="number" 
                          domain={['dataMin', 'dataMax']} 
                          tickFormatter={() => ''} 
                          hide 
                        />
                        <YAxis domain={[-1, 2]} hide />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const value = payload[0].value;
                              const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
                              return (
                                <div className="bg-white p-2 border rounded shadow text-sm">
                                  <p>값: {formattedValue}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#FF8FAB" 
                          strokeWidth={2}
                          dot={false} 
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* ECG 분석 정보 */}
                  {aiAnalysisResult && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">심박수:</span>
                        <span>{aiAnalysisResult.ecgData.heartRate} BPM</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">심박 변이도:</span>
                        <span>{aiAnalysisResult.ecgData.hrv}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">QT 간격:</span>
                        <span>{aiAnalysisResult.ecgData.qtInterval}</span>
                      </div>
                      
                      {aiAnalysisResult.ecgData.abnormalities.length > 0 && (
                        <Alert className="mt-3 bg-yellow-50 text-yellow-800 border-yellow-200">
                          <AlertTriangleIcon className="h-4 w-4" />
                          <AlertTitle className="text-xs font-semibold">심전도 이상 감지됨</AlertTitle>
                          <AlertDescription className="text-xs">
                            {aiAnalysisResult.ecgData.abnormalities[0]}
                            {aiAnalysisResult.ecgData.abnormalities.length > 1 && '...'}
                            
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-xs"
                              onClick={() => setShowAiAnalysisDialog(true)}
                            >
                              상세 보기
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* PPG 차트 카드 */}
              <Card className="rounded-2xl border border-[#FFD6D6]">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center font-suite">
                      <ActivityIcon className="w-4 h-4 mr-1.5 text-[#FF8FAB]" />
                      산소포화도 측정
                    </CardTitle>
                    <Badge className={getStatusColor(ppgStatus)}>
                      {ppgStatus === 'normal' ? '정상' : ppgStatus === 'warning' ? '주의' : '위험'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={ppgData}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          type="number" 
                          domain={['dataMin', 'dataMax']} 
                          tickFormatter={() => ''} 
                          hide 
                        />
                        <YAxis domain={[0, 1.2]} hide />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const value = payload[0].value;
                              const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
                              return (
                                <div className="bg-white p-2 border rounded shadow text-sm">
                                  <p>값: {formattedValue}</p>
                                  <p>산소포화도: {payload[0].payload.oxygen}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#FF8FAB" 
                          strokeWidth={2}
                          dot={false} 
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* PPG 분석 정보 */}
                  {aiAnalysisResult && aiAnalysisResult.ppgData && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">산소포화도:</span>
                        <span>{aiAnalysisResult.ppgData.oxygenLevel}%</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">관류 지수:</span>
                        <span>{aiAnalysisResult.ppgData.perfusionIndex}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">말초 저항:</span>
                        <span>{aiAnalysisResult.ppgData.peripheralResistance}</span>
                      </div>
                      
                      {aiAnalysisResult.ppgData.abnormalities && aiAnalysisResult.ppgData.abnormalities.length > 0 && (
                        <Alert className="mt-3 bg-yellow-50 text-yellow-800 border-yellow-200">
                          <AlertTriangleIcon className="h-4 w-4" />
                          <AlertTitle className="text-xs font-semibold">산소포화도 이상 감지됨</AlertTitle>
                          <AlertDescription className="text-xs">
                            {aiAnalysisResult.ppgData.abnormalities[0]}
                            {aiAnalysisResult.ppgData.abnormalities.length > 1 && '...'}
                            
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-xs"
                              onClick={() => setShowAiAnalysisDialog(true)}
                            >
                              상세 보기
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* 실시간 측정 데이터 (녹화 중일 때만 보임) */}
            {isRecording && (
              <Card className="bg-gradient-to-r from-[#FFE2E9] to-white border-[#FF6D70] border-opacity-50 rounded-2xl">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-base mb-3 flex items-center font-suite">
                    <ActivityIcon className="w-4 h-4 mr-1.5 text-[#FF6D70]" />
                    실시간 활력징후
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">심박수</span>
                        <HeartIcon className="w-4 h-4 text-[#FF6D70]" />
                      </div>
                      <div className="text-xl font-bold font-suite">
                        {ecgData.length > 0 ? Math.round(60 + (ecgStatus === 'warning' ? 15 : ecgStatus === 'critical' ? 30 : 0) + Math.random() * 5) : '--'} 
                        <span className="text-sm font-normal ml-1">BPM</span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">산소포화도</span>
                        <div className="w-4 h-4 bg-[#FF6D70] rounded-full"></div>
                      </div>
                      <div className="text-xl font-bold font-suite">
                        {ppgData.length > 0 ? Math.round(98 - (ppgStatus === 'warning' ? 3 : ppgStatus === 'critical' ? 8 : 0) + Math.random() * 2) : '--'}
                        <span className="text-sm font-normal ml-1">%</span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">HRV</span>
                        <RefreshCcwIcon className="w-4 h-4 text-[#FF8FAB]" />
                      </div>
                      <div className="text-xl font-bold">
                        {ecgData.length > 0 ? Math.round(45 - (ecgStatus === 'warning' ? 10 : ecgStatus === 'critical' ? 25 : 0) + Math.random() * 5) : '--'}
                        <span className="text-sm font-normal ml-1">ms</span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">관류 지수</span>
                        <ActivityIcon className="w-4 h-4 text-[#FF8FAB]" />
                      </div>
                      <div className="text-xl font-bold">
                        {ppgData.length > 0 ? (1.5 + (ppgStatus === 'warning' ? -0.5 : ppgStatus === 'critical' ? -0.8 : 0) + Math.random() * 0.3).toFixed(1) : '--'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="simulation" className="space-y-4">
            <Card className="rounded-2xl border border-[#FFD6D6]">
              <CardHeader>
                <CardTitle className="text-lg font-suite">시뮬레이션 제어</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-md font-semibold mb-2 flex items-center">
                    <HeartIcon className="w-4 h-4 mr-2 text-[#FF8FAB]" />
                    심전도(ECG) 상태 설정
                  </h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant={ecgStatus === 'normal' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleEcgStatusChange('normal')}
                      className={ecgStatus === 'normal' ? 'bg-[#FF8FAB] hover:bg-[#FF7A9C]' : ''}
                    >
                      정상
                    </Button>
                    <Button 
                      variant={ecgStatus === 'warning' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleEcgStatusChange('warning')}
                      className={ecgStatus === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    >
                      경고
                    </Button>
                    <Button 
                      variant={ecgStatus === 'critical' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleEcgStatusChange('critical')}
                      className={ecgStatus === 'critical' ? 'bg-red-500 hover:bg-red-600' : ''}
                    >
                      위험
                    </Button>
                  </div>
                  
                  <div className="mt-4 p-3 bg-slate-50 rounded-md text-sm">
                    <p className="font-medium mb-2">심전도 상태 설명:</p>
                    {ecgStatus === 'normal' && (
                      <p>정상 심전도 패턴입니다. 심장 리듬이 일정하고 P, QRS, T 파형이 모두 정상 범위 내에 있습니다.</p>
                    )}
                    {ecgStatus === 'warning' && (
                      <p>경미한 이상이 감지된 심전도 패턴입니다. 불규칙한 심장 박동이나 약간의 ST 분절 변화가 나타날 수 있습니다.</p>
                    )}
                    {ecgStatus === 'critical' && (
                      <p>심각한 이상이 감지된 심전도 패턴입니다. 심실세동, 심실빈맥, 또는 심근경색 패턴과 유사한 급격한 ST 분절 변화가 나타날 수 있습니다.</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-semibold mb-2 flex items-center">
                    <ActivityIcon className="w-4 h-4 mr-2 text-[#FF8FAB]" />
                    산소포화도(PPG) 상태 설정
                  </h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant={ppgStatus === 'normal' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handlePpgStatusChange('normal')}
                      className={ppgStatus === 'normal' ? 'bg-[#FF8FAB] hover:bg-[#FF7A9C]' : ''}
                    >
                      정상
                    </Button>
                    <Button 
                      variant={ppgStatus === 'warning' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handlePpgStatusChange('warning')}
                      className={ppgStatus === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    >
                      경고
                    </Button>
                    <Button 
                      variant={ppgStatus === 'critical' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handlePpgStatusChange('critical')}
                      className={ppgStatus === 'critical' ? 'bg-red-500 hover:bg-red-600' : ''}
                    >
                      위험
                    </Button>
                  </div>
                  
                  <div className="mt-4 p-3 bg-slate-50 rounded-md text-sm">
                    <p className="font-medium mb-2">산소포화도 상태 설명:</p>
                    {ppgStatus === 'normal' && (
                      <p>정상 산소포화도 패턴입니다. 산소포화도가 95-100% 범위 내에 있으며, 혈류량이 적절합니다.</p>
                    )}
                    {ppgStatus === 'warning' && (
                      <p>경미한 이상이 감지된 산소포화도 패턴입니다. 산소포화도가 90-94% 범위이거나 불규칙한 혈류 패턴이 감지됩니다.</p>
                    )}
                    {ppgStatus === 'critical' && (
                      <p>심각한 이상이 감지된 산소포화도 패턴입니다. 산소포화도가 90% 미만이거나 관류 지수가 매우 낮아 혈액 순환에 문제가 있을 수 있습니다.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4">
            {aiAnalysisResult && (
              <>
                <Card className="rounded-2xl border border-[#FFD6D6]">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileTextIcon className="w-5 h-5 mr-2" />
                      활력징후 분석 결과
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">종합 위험도</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(aiAnalysisResult.timestamp).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} 측정
                          </p>
                        </div>
                        <Badge className={`${getRiskColor(aiAnalysisResult.combinedRisk.score)} text-lg px-3 py-1`}>
                          {getRiskLevelText(aiAnalysisResult.combinedRisk.level)} ({aiAnalysisResult.combinedRisk.score}/100)
                        </Badge>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm mb-2">위험도 점수</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${getRiskColor(aiAnalysisResult.combinedRisk.score)}`}
                            style={{ width: `${aiAnalysisResult.combinedRisk.score}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>낮음</span>
                          <span>중간</span>
                          <span>높음</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">단기 위험도:</span>
                          <span className="font-semibold">{Math.round(aiAnalysisResult.combinedRisk.shortTermRisk)}/100</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">장기 위험도:</span>
                          <span className="font-semibold">{Math.round(aiAnalysisResult.combinedRisk.longTermRisk)}/100</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <h3 className="text-md font-semibold mb-2">주요 지표 요약</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">심박수</div>
                          <div className="text-xl font-bold flex items-center">
                            {aiAnalysisResult.ecgData.heartRate} <span className="text-sm font-normal ml-1">BPM</span>
                            <div className={`w-2 h-2 rounded-full ml-2 ${
                              aiAnalysisResult.ecgData.heartRate > 100 || aiAnalysisResult.ecgData.heartRate < 50
                              ? 'bg-red-500' : aiAnalysisResult.ecgData.heartRate > 90 || aiAnalysisResult.ecgData.heartRate < 60
                              ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">산소포화도</div>
                          <div className="text-xl font-bold flex items-center">
                            {aiAnalysisResult.ppgData?.oxygenLevel}% 
                            <div className={`w-2 h-2 rounded-full ml-2 ${
                              (aiAnalysisResult.ppgData?.oxygenLevel || 0) < 90
                              ? 'bg-red-500' : (aiAnalysisResult.ppgData?.oxygenLevel || 0) < 95
                              ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                          <div className="text-xs text-gray-500 mb-1 flex items-center">
                            <span>ST 분절 편차</span>
                            <div className="relative ml-1 group">
                              <InfoIcon className="h-3.5 w-3.5 text-[#FF8FAB] cursor-help" />
                              <div className="absolute z-10 invisible group-hover:visible bg-slate-800 text-white p-2 rounded text-xs w-48 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                                심전도에서 심장 혈류 상태를 나타내는 지표입니다. 정상은 0mm이며, 상승 또는 하강 시 심근 경색 등 심장 문제를 나타낼 수 있습니다.
                              </div>
                            </div>
                          </div>
                          <div className="text-xl font-bold">
                            {aiAnalysisResult.ecgData.stDeviation}
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                          <div className="text-xs text-gray-500 mb-1 flex items-center">
                            <span>QT 간격</span>
                            <div className="relative ml-1 group">
                              <InfoIcon className="h-3.5 w-3.5 text-[#FF8FAB] cursor-help" />
                              <div className="absolute z-10 invisible group-hover:visible bg-slate-800 text-white p-2 rounded text-xs w-48 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                                심전도에서 심장의 전기적 활동 기간을 나타냅니다. 정상 범위는 350-430ms이며, 연장 시 부정맥 위험이 증가합니다.
                              </div>
                            </div>
                          </div>
                          <div className="text-xl font-bold">
                            {aiAnalysisResult.ecgData.qtInterval}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-md font-semibold">활력징후 패턴 분석</h3>
                      
                      {aiAnalysisResult.ecgData.patternProbabilities.length > 0 && (
                        <div className="p-3 bg-white border rounded-md">
                          <h4 className="text-sm font-medium mb-2">ECG 패턴 확률</h4>
                          <div className="space-y-2">
                            {aiAnalysisResult.ecgData.patternProbabilities.map((pattern, idx) => (
                              <div key={idx} className="flex flex-col">
                                <div className="flex justify-between text-xs">
                                  <span>{pattern.name}</span>
                                  <span>{(pattern.probability * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                  <div 
                                    className="h-1.5 rounded-full bg-[#FF8FAB]"
                                    style={{ width: `${pattern.probability * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {aiAnalysisResult.combinedRisk.factors.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <h4 className="text-sm font-medium mb-2 flex items-center">
                            <AlertTriangleIcon className="w-4 h-4 mr-1 text-yellow-600" />
                            감지된 이상 징후
                          </h4>
                          <ul className="list-disc pl-5 text-sm space-y-1">
                            {aiAnalysisResult.combinedRisk.factors.map((factor, idx) => (
                              <li key={idx}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 bg-[#FFE2E9] border border-[#FF8FAB] border-opacity-40 rounded-md">
                      <h3 className="text-md font-semibold mb-2">임상 요약 및 권장사항</h3>
                      <p className="text-sm mb-3">{aiAnalysisResult.summary}</p>
                      <p className="text-sm font-medium">{aiAnalysisResult.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      toast({
                        title: "분석 저장됨",
                        description: "활력징후 분석 결과가 건강 기록에 저장되었습니다.",
                        variant: "default",
                        style: { backgroundColor: "#FFE2E9", borderColor: "#FF8FAB" },
                      });
                    }}
                  >
                    분석 결과 저장
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
        
        {/* 녹화 시간 부족 경고 대화 상자 */}
        <Dialog open={showRecordingWarningDialog} onOpenChange={setShowRecordingWarningDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-yellow-600">
                <AlertTriangleIcon className="w-5 h-5 mr-2" />
                녹화 시간 부족
              </DialogTitle>
            </DialogHeader>
            <div className="py-3">
              <p className="mb-2">
                정확한 분석을 위해서는 최소 30초 이상의 데이터가 필요합니다. 
                현재 녹화 시간은 {elapsedTime}초 입니다.
              </p>
              <p className="text-sm text-gray-500">
                짧은 녹화 시간으로 계속 진행하시면 분석 결과의 정확도가 떨어질 수 있습니다.
              </p>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" onClick={restartRecording}>
                녹화 계속하기
              </Button>
              <Button variant="default" onClick={proceedWithShortRecording}>
                그래도 진행하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* AI 분석 결과 대화 상자 */}
        <Dialog open={showAiAnalysisDialog} onOpenChange={setShowAiAnalysisDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>활력징후 분석 결과</DialogTitle>
              <button 
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAiAnalysisDialog(false);
                }}
              >
                <XIcon className="h-4 w-4" />
                <span className="sr-only">닫기</span>
              </button>
            </DialogHeader>
            
            {aiAnalysisResult && (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">종합 위험도</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(aiAnalysisResult.timestamp).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} 측정
                        </p>
                      </div>
                      <Badge className={`${getRiskColor(aiAnalysisResult.combinedRisk.score)} text-lg px-3 py-1`}>
                        {getRiskLevelText(aiAnalysisResult.combinedRisk.level)} ({aiAnalysisResult.combinedRisk.score}/100)
                      </Badge>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm mb-2">위험도 점수</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${getRiskColor(aiAnalysisResult.combinedRisk.score)}`}
                          style={{ width: `${aiAnalysisResult.combinedRisk.score}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>낮음</span>
                        <span>중간</span>
                        <span>높음</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">단기 위험도:</span>
                        <span className="font-semibold">{Math.round(aiAnalysisResult.combinedRisk.shortTermRisk)}/100</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">장기 위험도:</span>
                        <span className="font-semibold">{Math.round(aiAnalysisResult.combinedRisk.longTermRisk)}/100</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <h3 className="text-md font-semibold mb-2">주요 지표 요약</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">심박수</div>
                        <div className="text-xl font-bold flex items-center">
                          {aiAnalysisResult.ecgData.heartRate} <span className="text-sm font-normal ml-1">BPM</span>
                          <div className={`w-2 h-2 rounded-full ml-2 ${
                            aiAnalysisResult.ecgData.heartRate > 100 || aiAnalysisResult.ecgData.heartRate < 50
                            ? 'bg-red-500' : aiAnalysisResult.ecgData.heartRate > 90 || aiAnalysisResult.ecgData.heartRate < 60
                            ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">산소포화도</div>
                        <div className="text-xl font-bold flex items-center">
                          {aiAnalysisResult.ppgData?.oxygenLevel}% 
                          <div className={`w-2 h-2 rounded-full ml-2 ${
                            (aiAnalysisResult.ppgData?.oxygenLevel || 0) < 90
                            ? 'bg-red-500' : (aiAnalysisResult.ppgData?.oxygenLevel || 0) < 95
                            ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1 flex items-center">
                          <span>ST 분절 편차</span>
                          <div className="relative ml-1 group">
                            <InfoIcon className="h-3.5 w-3.5 text-[#FF8FAB] cursor-help" />
                            <div className="absolute z-10 invisible group-hover:visible bg-slate-800 text-white p-2 rounded text-xs w-48 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                              심전도에서 심장 혈류 상태를 나타내는 지표입니다. 정상은 0mm이며, 상승 또는 하강 시 심근 경색 등 심장 문제를 나타낼 수 있습니다.
                            </div>
                          </div>
                        </div>
                        <div className="text-xl font-bold">
                          {aiAnalysisResult.ecgData.stDeviation}
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1 flex items-center">
                          <span>QT 간격</span>
                          <div className="relative ml-1 group">
                            <InfoIcon className="h-3.5 w-3.5 text-[#FF8FAB] cursor-help" />
                            <div className="absolute z-10 invisible group-hover:visible bg-slate-800 text-white p-2 rounded text-xs w-48 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                              심전도에서 심장의 전기적 활동 기간을 나타냅니다. 정상 범위는 350-430ms이며, 연장 시 부정맥 위험이 증가합니다.
                            </div>
                          </div>
                        </div>
                        <div className="text-xl font-bold">
                          {aiAnalysisResult.ecgData.qtInterval}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-md font-semibold">활력징후 패턴 분석</h3>
                    
                    {aiAnalysisResult.ecgData.patternProbabilities.length > 0 && (
                      <div className="p-3 bg-white border rounded-md">
                        <h4 className="text-sm font-medium mb-2">ECG 패턴 확률</h4>
                        <div className="space-y-2">
                          {aiAnalysisResult.ecgData.patternProbabilities.map((pattern, idx) => (
                            <div key={idx} className="flex flex-col">
                              <div className="flex justify-between text-xs">
                                <span>{pattern.name}</span>
                                <span>{(pattern.probability * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="h-1.5 rounded-full bg-[#FF8FAB]"
                                  style={{ width: `${pattern.probability * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {aiAnalysisResult.combinedRisk.factors.length > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <AlertTriangleIcon className="w-4 h-4 mr-1 text-yellow-600" />
                          감지된 이상 징후
                        </h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {aiAnalysisResult.combinedRisk.factors.map((factor, idx) => (
                            <li key={idx}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-[#FFE2E9] border border-[#FF8FAB] border-opacity-40 rounded-md">
                    <h3 className="text-md font-semibold mb-2">임상 요약 및 권장사항</h3>
                    <p className="text-sm mb-3">{aiAnalysisResult.summary}</p>
                    <p className="text-sm font-medium">{aiAnalysisResult.recommendation}</p>
                  </div>
                </div>
              </ScrollArea>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowAiAnalysisDialog(false)}
              >
                닫기
              </Button>
              <Button
                onClick={() => {
                  setShowAiAnalysisDialog(false);
                  toast({
                    title: "분석 저장됨",
                    description: "활력징후 분석 결과가 건강 기록에 저장되었습니다.",
                    variant: "default",
                    style: { backgroundColor: "#FFE2E9", borderColor: "#FF8FAB" },
                  });
                }}
              >
                결과 저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VitalSignsMonitoring;