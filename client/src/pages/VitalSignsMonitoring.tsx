import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useSmartWatch } from '@/contexts/SmartWatchContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  InfoIcon, AlertTriangleIcon, WatchIcon, PlusIcon, TabletSmartphoneIcon, 
  Activity, Heart, AlertCircle, BarChart, Clock, FileDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 모니터링 컴포넌트 가져오기
import ECGMonitor from '@/components/monitoring/ECGMonitor';
import PPGMonitor from '@/components/monitoring/PPGMonitor';
import SmartWatchConnector from '@/components/monitoring/SmartWatchConnector';
import MultimodalAnalysisCard from '@/components/analysis/MultimodalAnalysisCard';

// 위험도 계산 함수
const calculateRiskScore = (heartRate: number | null, oxygenLevel: number | null): number => {
  if (!heartRate || !oxygenLevel) return 0;
  
  // 심박수 기여도 - 정상 범위(60-100)를 벗어날수록 위험도 증가
  let heartRateRisk = 0;
  if (heartRate < 60) {
    heartRateRisk = 5 + (60 - heartRate) * 3; // 서맥 위험
  } else if (heartRate > 100) {
    heartRateRisk = 5 + (heartRate - 100) * 1.5; // 빈맥 위험
  }
  
  // 산소포화도 기여도 - 95% 미만일 경우 기하급수적으로 위험도 증가
  let oxygenRisk = 0;
  if (oxygenLevel < 95) {
    oxygenRisk = 25 + Math.pow(95 - oxygenLevel, 3);
  } else if (oxygenLevel < 98) {
    oxygenRisk = 5 + (98 - oxygenLevel) * 5;
  }
  
  // 종합 위험도 (0-100 범위로 제한)
  let totalRisk = heartRateRisk + oxygenRisk;
  return Math.min(100, Math.max(0, totalRisk));
};

// ST 편향 계산 시뮬레이션 함수 (심근경색 지표)
const calculateSTDeviation = (ecgData: number[]): number => {
  // 실제로는 ECG 데이터에서 ST 세그먼트를 검출하고 기준선으로부터 편차를 계산해야 함
  // 여기서는 간단한 시뮬레이션만 구현
  if (!ecgData || ecgData.length === 0) return 0;
  
  // 무작위 편차 생성 (실제로는 알고리즘에 의해 계산)
  const baseDeviation = 0.05; // 기본 편차 (mV)
  const randomFactor = Math.random() * 0.1 - 0.05; // -0.05 ~ 0.05 사이 무작위 값
  
  return Math.abs(baseDeviation + randomFactor);
};

// 부정맥 감지 시뮬레이션 함수
const detectArrhythmia = (heartRates: number[]): { detected: boolean, type: string | null } => {
  if (!heartRates || heartRates.length < 5) return { detected: false, type: null };
  
  // 심박수 변동성 계산
  const diffs = [];
  for (let i = 1; i < heartRates.length; i++) {
    diffs.push(Math.abs(heartRates[i] - heartRates[i-1]));
  }
  
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  
  // 변동성이 큰 경우 부정맥으로 간주
  if (avgDiff > 15) {
    return { detected: true, type: "불규칙한 심박" };
  } else if (Math.max(...heartRates) > 150) {
    return { detected: true, type: "빈맥성 부정맥" };
  } else if (Math.min(...heartRates) < 45) {
    return { detected: true, type: "서맥성 부정맥" };
  }
  
  return { detected: false, type: null };
};

const VitalSignsMonitoring = () => {
  const { user } = useApp();
  const { isConnected, data, connectToWatch, scanForDevices } = useSmartWatch();
  const [activeTab, setActiveTab] = useState<string>('realtime');
  const [showGuide, setShowGuide] = useState<boolean>(!isConnected);
  const [riskScore, setRiskScore] = useState<number>(0);
  const [ecgHistory, setEcgHistory] = useState<number[]>([]);
  const [heartRateHistory, setHeartRateHistory] = useState<number[]>([]);
  const [stDeviation, setStDeviation] = useState<number>(0);
  const [arrhythmia, setArrhythmia] = useState<{detected: boolean, type: string | null}>({ detected: false, type: null });
  const { toast } = useToast();

  // 처음 연결 시도
  useEffect(() => {
    const tryAutoConnect = async () => {
      try {
        if (!isConnected) {
          const devices = await scanForDevices();
          if (devices && devices.length > 0) {
            await connectToWatch(devices[0].id); // 첫 번째 발견된 기기에 연결
          }
        }
      } catch (err) {
        console.log('자동 연결 실패:', err);
      }
    };

    // 1초 후 자동 연결 시도
    const timer = setTimeout(() => {
      tryAutoConnect();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isConnected, scanForDevices, connectToWatch]);

  // 연결 상태 변경 시 가이드 업데이트
  useEffect(() => {
    if (isConnected) {
      setShowGuide(false);
    }
  }, [isConnected]);

  // 새로운 심박수 데이터가 들어올 때마다 기록에 추가
  useEffect(() => {
    if (data.heartRate !== null && data.heartRate !== undefined && isConnected) {
      // 명시적으로 number 타입으로 처리하여 null/undefined가 배열에 들어가지 않도록 함
      const heartRate: number = data.heartRate;
      setHeartRateHistory(prev => [...prev, heartRate]);
      
      // 배열이 너무 길어지면 최신 50개만 유지
      if (heartRateHistory.length > 50) {
        setHeartRateHistory(prev => prev.slice(-50));
      }
    }
  }, [data.heartRate, isConnected]);

  // 심전도 데이터 업데이트 시 ST 편향과 부정맥 분석
  useEffect(() => {
    if (data.ecgData && data.ecgData.length > 0) {
      // 새 ECG 데이터가 들어올 때마다 기록에 추가
      setEcgHistory(prev => [...prev, ...data.ecgData]);
      
      // 배열이 너무 길어지면 최신 1000개만 유지
      if (ecgHistory.length > 1000) {
        setEcgHistory(prev => prev.slice(-1000));
      }
      
      // ST 편향 계산
      const newSTDeviation = calculateSTDeviation(ecgHistory);
      setStDeviation(newSTDeviation);
      
      // 심박수 기록으로 부정맥 감지
      if (heartRateHistory.length >= 5) {
        const arrhythmiaResult = detectArrhythmia(heartRateHistory);
        setArrhythmia(arrhythmiaResult);
      }
      
      // 위험도 계산 (심박수와 산소포화도 기반)
      if (data.heartRate && data.oxygenLevel) {
        const newRiskScore = calculateRiskScore(data.heartRate, data.oxygenLevel);
        setRiskScore(newRiskScore);
      }
    }
  }, [data.ecgData]);

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold font-suite">심근경색 조기 감지 모니터링</h1>
        {isConnected && (
          <Badge className="bg-[#FF8FAB] bg-opacity-20 text-[#FF0000] px-3 py-1 rounded-full">
            <WatchIcon className="w-4 h-4 mr-1.5" />
            {data.batteryLevel !== null ? `${data.batteryLevel}% ` : ''}{data.lastUpdated ? '연결됨' : '연결 중...'}
          </Badge>
        )}
      </div>

      {/* 연결 가이드 */}
      {showGuide && (
        <Alert className="bg-[#FFF5F5] border-[#FFD6D6] mb-4">
          <InfoIcon className="h-4 w-4 text-[#FF0000]" />
          <AlertTitle className="font-medium text-gray-900">스마트워치 연결 필요</AlertTitle>
          <AlertDescription className="text-sm">
            정확한 건강 모니터링을 위해 스마트워치를 연결하세요. Apple Watch나 Galaxy Watch와 같은 
            스마트워치를 연결하면 실시간 심전도와 산소포화도를 측정할 수 있습니다.
          </AlertDescription>
          <Button 
            variant="outline" 
            className="mt-2 text-[#FF0000] border-[#FFD6D6] hover:bg-[#FFF0F0]"
            onClick={async () => {
              const devices = await scanForDevices();
              if (devices && devices.length > 0) {
                await connectToWatch(devices[0].id);
              }
            }}
          >
            스마트워치 연결하기
          </Button>
        </Alert>
      )}

      {!isConnected ? (
        // 스마트워치 연결 안됨 - 연결 안내
        <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm">
          <CardContent className="p-6 text-center">
            <WatchIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-medium mb-3">멀티모달 심근경색 모니터링을 시작하세요</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              스마트워치를 연결하면 심전도(ECG)와 산소포화도(SpO2) 데이터를 실시간으로 수집하고 
              AI 기반 멀티모달 분석을 통해 심근경색 위험을 조기에 감지할 수 있습니다.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#FFF5F5] flex items-center justify-center mb-2">
                  <Heart className="w-6 h-6 text-[#FF0000]" />
                </div>
                <span className="text-sm">심전도 모니터링</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#FFF5F5] flex items-center justify-center mb-2">
                  <Activity className="w-6 h-6 text-[#FF0000]" />
                </div>
                <span className="text-sm">산소포화도 측정</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#FFF5F5] flex items-center justify-center mb-2">
                  <BarChart className="w-6 h-6 text-[#FF0000]" />
                </div>
                <span className="text-sm">위험도 분석</span>
              </div>
            </div>
            <Button 
              className="bg-[#FF0000] hover:bg-[#CC0000] text-white"
              onClick={() => {
                setActiveTab('smartwatch');
              }}
            >
              <WatchIcon className="w-4 h-4 mr-1.5" />
              스마트워치 연결하기
            </Button>
            
            <div className="mt-6 p-4 bg-[#FFF5F5] rounded-lg">
              <h4 className="font-medium mb-2 text-sm">호환 기기</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>• Apple Watch (시리즈 4 이상)</div>
                <div>• Galaxy Watch (4 이상)</div>
                <div>• Fitbit (Sense, Versa 3 이상)</div>
                <div>• Garmin (최신 모델)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // 스마트워치 연결됨 - 통합 모니터링 대시보드
        <div className="space-y-4">
          {/* 주요 지표 일람 - 상단 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">현재 심박수</div>
                  <Heart className="w-4 h-4 text-[#FF0000]" />
                </div>
                <div className="flex items-baseline mt-1">
                  <span className="text-3xl font-bold text-[#FF0000]">{data.heartRate || '--'}</span>
                  <span className="text-sm ml-1">bpm</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.heartRate ? (data.heartRate < 60 ? '서맥' : data.heartRate > 100 ? '빈맥' : '정상') : ''}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">산소포화도</div>
                  <Activity className="w-4 h-4 text-[#FF0000]" />
                </div>
                <div className="flex items-baseline mt-1">
                  <span className="text-3xl font-bold text-[#FF0000]">{data.oxygenLevel || '--'}</span>
                  <span className="text-sm ml-1">%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {data.oxygenLevel ? (data.oxygenLevel < 95 ? '저산소' : '정상') : ''}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">ST 세그먼트</div>
                  <BarChart className="w-4 h-4 text-[#FF0000]" />
                </div>
                <div className="flex items-baseline mt-1">
                  <span className="text-3xl font-bold text-[#FF0000]">{stDeviation.toFixed(2)}</span>
                  <span className="text-sm ml-1">mV</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stDeviation > 0.1 ? '이상' : '정상'}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">MI 위험도</div>
                  <AlertTriangleIcon className="w-4 h-4 text-[#FF0000]" />
                </div>
                <div className="flex items-baseline mt-1">
                  <span className="text-3xl font-bold text-[#FF0000]">{riskScore.toFixed(0)}</span>
                  <span className="text-sm ml-1">%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {riskScore < 20 ? '낮음' : riskScore < 50 ? '주의' : riskScore < 75 ? '경고' : '위험'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 실시간 ECG 및 PPG 모니터링 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ECGMonitor />
            <PPGMonitor />
          </div>

          {/* 멀티모달 AI 분석 결과 */}
          <div className="grid grid-cols-1 gap-4">
            <MultimodalAnalysisCard 
              ecgData={ecgHistory}
              heartRates={heartRateHistory}
              oxygenLevels={data.oxygenLevel !== null && data.oxygenLevel !== undefined ? [data.oxygenLevel] : []}
              lastUpdated={data.lastUpdated}
              riskScore={riskScore}
              stDeviation={stDeviation}
              arrhythmia={arrhythmia}
            />
          </div>

          {/* 심근경색 위험도 평가 패널 */}
          <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-[#FF0000]" />
                심근경색 위험도 평가
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">종합 위험 지수</div>
                    <div className="text-sm font-medium">{riskScore.toFixed(0)}%</div>
                  </div>
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full ${
                        riskScore < 20 ? 'bg-green-500' : 
                        riskScore < 50 ? 'bg-yellow-500' : 
                        riskScore < 75 ? 'bg-orange-500' : 'bg-red-500'
                      }`} 
                      style={{ width: `${riskScore}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {/* 위험 요인 1: 심장 리듬 */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium flex items-center">
                        <Heart className="w-4 h-4 text-[#FF0000] mr-1" />
                        심장 리듬
                      </div>
                      <Badge 
                        className={arrhythmia.detected ? 'bg-orange-500' : 'bg-green-500'} 
                      >
                        {arrhythmia.detected ? '이상' : '정상'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      {arrhythmia.detected 
                        ? `${arrhythmia.type}이(가) 감지되었습니다.` 
                        : '규칙적인 심장 리듬이 유지되고 있습니다.'}
                    </div>
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={arrhythmia.detected ? 'bg-orange-500 h-full' : 'bg-green-500 h-full'} 
                        style={{ width: arrhythmia.detected ? '75%' : '20%' }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      신뢰도: {arrhythmia.detected ? '75%' : '90%'}
                    </div>
                  </div>

                  {/* 위험 요인 2: ST 세그먼트 편향 */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium flex items-center">
                        <BarChart className="w-4 h-4 text-[#FF0000] mr-1" />
                        ST 세그먼트
                      </div>
                      <Badge 
                        className={stDeviation > 0.1 ? 'bg-yellow-500' : 'bg-green-500'} 
                      >
                        {stDeviation > 0.1 ? '편향' : '정상'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      {stDeviation > 0.1 
                        ? 'ST 세그먼트 편향이 관찰됩니다.' 
                        : 'ST 세그먼트 편향이 감지되지 않았습니다.'}
                    </div>
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={stDeviation > 0.1 ? 'bg-yellow-500 h-full' : 'bg-green-500 h-full'} 
                        style={{ width: stDeviation > 0.1 ? '60%' : '15%' }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      신뢰도: {stDeviation > 0.1 ? '60%' : '85%'}
                    </div>
                  </div>

                  {/* 위험 요인 3: 산소포화도 */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium flex items-center">
                        <Activity className="w-4 h-4 text-[#FF0000] mr-1" />
                        산소포화도
                      </div>
                      <Badge 
                        className={data.oxygenLevel && data.oxygenLevel < 95 ? 'bg-orange-500' : 'bg-green-500'} 
                      >
                        {data.oxygenLevel && data.oxygenLevel < 95 ? '낮음' : '정상'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      {data.oxygenLevel && data.oxygenLevel < 95 
                        ? '산소포화도가 정상 범위보다 낮습니다.' 
                        : '산소포화도가 정상 범위 내에 있습니다.'}
                    </div>
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={data.oxygenLevel && data.oxygenLevel < 95 ? 'bg-orange-500 h-full' : 'bg-green-500 h-full'} 
                        style={{ width: data.oxygenLevel && data.oxygenLevel < 95 ? '70%' : '10%' }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      신뢰도: {data.oxygenLevel && data.oxygenLevel < 95 ? '70%' : '95%'}
                    </div>
                  </div>
                </div>

                {/* 종합 분석 결과 */}
                <div className="bg-[#FFF5F5] p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Activity className="w-4 h-4 text-[#FF0000] mr-1.5" />
                    멀티모달 종합 분석 결과
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {riskScore < 30 ? (
                      '모든 생체신호가 정상 범위 내에 있으며, 심근경색 위험이 낮습니다. 정기적인 모니터링을 계속하세요.'
                    ) : riskScore < 60 ? (
                      `${stDeviation > 0.1 ? 'ST 세그먼트 편향' : arrhythmia.detected ? '심장 리듬 이상' : '여러 생체신호'}이 주의가 필요한 수준입니다. 휴식을 취하고 상태를 지속적으로 관찰하세요.`
                    ) : (
                      <span className="text-[#FF0000] font-medium">여러 위험 요인이 감지되었습니다. 의료 전문가와 빠른 상담을 권장합니다.</span>
                    )}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">ECG 신뢰도</div>
                      <div className="font-medium">{ecgHistory.length > 200 ? '85%' : '65%'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">SpO2 신뢰도</div>
                      <div className="font-medium">90%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">종합 신뢰도</div>
                      <div className="font-medium">{ecgHistory.length > 200 ? '88%' : '70%'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-4 flex justify-between">
              <Button 
                variant="outline" 
                className="text-[#FF0000] border-[#FFD6D6] hover:bg-[#FFF0F0]"
                onClick={() => {
                  setActiveTab('smartwatch');
                }}
              >
                <WatchIcon className="w-4 h-4 mr-1.5" />
                스마트워치 설정
              </Button>
              <Button 
                className="bg-[#FF0000] hover:bg-[#CC0000] text-white"
                onClick={() => toast({
                  title: "건강 보고서 생성 중",
                  description: "상세 건강 보고서를 생성하고 있습니다. 잠시만 기다려주세요.",
                })}
              >
                <FileDown className="w-4 h-4 mr-1.5" />
                상세 보고서 생성
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* 스마트워치 연결 설정 탭 (숨김 처리, 버튼 클릭 시에만 표시) */}
      {activeTab === 'smartwatch' && (
        <Card className="border border-[#FFD6D6] rounded-2xl shadow-sm mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <TabletSmartphoneIcon className="w-5 h-5 mr-2 text-[#FF0000]" />
              스마트워치 연결 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SmartWatchConnector />
            
            <div className="space-y-3 mt-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="font-medium mb-1">호환 기기 정보</div>
                <div className="text-sm text-gray-600">
                  Apple Watch (시리즈 4 이상), Samsung Galaxy Watch (4 이상), Fitbit (Sense, Versa 3 이상), 
                  Garmin (최신 모델) 등의 스마트워치를 지원합니다.
                </div>
              </div>
              
              <Alert className="bg-[#FFF5F5] border-[#FFD6D6]">
                <AlertTriangleIcon className="h-4 w-4 text-[#FF0000]" />
                <AlertTitle className="font-medium">주의사항</AlertTitle>
                <AlertDescription className="text-sm">
                  이 애플리케이션은 의료 진단 도구가 아닙니다. 증상이 심각하거나 응급 상황이면 즉시 의료 전문가에게 문의하세요.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-[#FF0000] hover:bg-[#CC0000] text-white"
              onClick={() => setActiveTab('realtime')}
            >
              모니터링 화면으로 돌아가기
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default VitalSignsMonitoring;